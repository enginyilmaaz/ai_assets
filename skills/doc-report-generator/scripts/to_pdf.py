#!/usr/bin/env python3
"""Render a .docx to PDF, with the fields actually updated.

Copied, as is, from the sibling doc-report-generator skill: the problem is the same
one (a PAGE / NUMPAGES field that `soffice --convert-to` leaves on its placeholder)
and the fix does not change with the document it is applied to. Keep the two copies
in step if either is corrected.

The engines, best first:

  * WordCraft — `wordcraft-cli run` refreshes the fields and the contents lists
    (`references.updateFields`, `references.updateToc`) and exports the PDF
    (`file.exportPdf`) in one pass; no extra packages needed.
  * LibreOffice through UNO — `soffice --convert-to pdf` alone does not refresh
    fields, so a generated contents list or list of figures comes out holding its
    placeholder line; driving the office through UNO makes it possible to refresh
    the fields and update every index before the export.
  * plain `soffice --convert-to` — last resort when python3-uno is missing too:
    the conversion still works, but the fields keep their placeholder text.

The engines paginate DIFFERENTLY (the sample manual: 66 pages in LibreOffice,
59 in WordCraft), so measure the finished pages — and `pdffonts` them — with
whichever engine rendered them.

    python3 to_pdf.py report.docx [-o out.pdf] [--images outdir]

Needs WordCraft (wordcraft-cli), or LibreOffice with python3-uno
(Debian/Ubuntu: libreoffice-writer python3-uno).
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import uuid

PORT = 2104  # unlikely to collide with a desktop LibreOffice or the sibling skill


def _uno():
    try:
        import uno  # noqa: F401
        from com.sun.star.beans import PropertyValue  # noqa: F401
        return True
    except ImportError:
        return False


def wordcraft_convert(docx, pdf):
    """WordCraft refreshes the fields and the contents lists, then exports the PDF."""
    cli = shutil.which('wordcraft-cli')
    if not cli:
        return False
    export = 'file.exportPdf=' + json.dumps({'path': os.path.abspath(pdf)})
    try:
        r = subprocess.run(
            [cli, 'run', '--file', os.path.abspath(docx),
             '--cmd', 'references.updateFields={}',
             '--cmd', 'references.updateToc={}',
             '--cmd', export],
            capture_output=True, text=True, timeout=300)
    except subprocess.TimeoutExpired:
        print('wordcraft-cli timed out; falling back to LibreOffice', file=sys.stderr)
        return False
    if r.returncode != 0 or not os.path.isfile(pdf):
        detail = (r.stderr or r.stdout or '').strip().splitlines()
        why = detail[-1] if detail else f'exit {r.returncode}'
        print(f'wordcraft-cli failed ({why}); falling back to LibreOffice', file=sys.stderr)
        return False
    return True


def start_soffice(profile):
    binary = shutil.which('soffice') or shutil.which('libreoffice')
    if not binary:
        sys.exit('Neither WordCraft (wordcraft-cli) nor LibreOffice (soffice) found')
    proc = subprocess.Popen([
        binary, '--headless', '--norestore', '--invisible', '--nologo', '--nodefault',
        f'-env:UserInstallation=file://{profile}',
        f'--accept=socket,host=127.0.0.1,port={PORT};urp;',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return proc


def connect(timeout=60):
    import uno
    ctx = uno.getComponentContext()
    resolver = ctx.ServiceManager.createInstanceWithContext(
        'com.sun.star.bridge.UnoUrlResolver', ctx)
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            return resolver.resolve(
                f'uno:socket,host=127.0.0.1,port={PORT};urp;StarOffice.ComponentContext')
        except Exception as exc:                     # the office is still starting
            last = exc
            time.sleep(0.5)
    sys.exit(f'could not reach LibreOffice on port {PORT}: {last}')


def prop(name, value):
    from com.sun.star.beans import PropertyValue
    p = PropertyValue()
    p.Name, p.Value = name, value
    return p


def convert(docx, pdf):
    import uno  # noqa: F401
    profile = f'/tmp/lo-manual-{uuid.uuid4().hex[:8]}'
    proc = start_soffice(profile)
    try:
        ctx = connect()
        desktop = ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', ctx)
        url = uno.systemPathToFileUrl(os.path.abspath(docx))
        doc = desktop.loadComponentFromURL(url, '_blank', 0, (prop('Hidden', True),))
        if doc is None:
            sys.exit(f'LibreOffice could not open {docx}')
        try:
            doc.refresh()                                  # plain fields (PAGE, dates …)
            indexes = doc.getDocumentIndexes()              # contents, figure and table lists
            for i in range(indexes.getCount()):
                indexes.getByIndex(i).update()
            doc.storeToURL(uno.systemPathToFileUrl(os.path.abspath(pdf)),
                           (prop('FilterName', 'writer_pdf_Export'),))
        finally:
            doc.close(False)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=20)
        except subprocess.TimeoutExpired:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)
    return pdf


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('docx')
    ap.add_argument('-o', '--output')
    ap.add_argument('--images', metavar='OUTDIR', help='also render page-*.jpg for eyeballing')
    args = ap.parse_args()

    pdf = args.output or os.path.splitext(args.docx)[0] + '.pdf'
    if wordcraft_convert(args.docx, pdf):
        engine = 'wordcraft'
    elif _uno():
        convert(args.docx, pdf)
        engine = 'libreoffice + uno'
    else:
        # Without UNO the plain conversion still works, but fields keep their
        # placeholder text — say so rather than handing over a half-filled document.
        print('python3-uno is missing: converting without updating fields.\n'
              '  the contents and figure/table lists will show their placeholder line.\n'
              '  install it with: sudo apt-get install python3-uno', file=sys.stderr)
        binary = shutil.which('soffice') or shutil.which('libreoffice')
        if not binary:
            sys.exit('Neither WordCraft (wordcraft-cli) nor LibreOffice (soffice) found')
        subprocess.run([binary, '--headless', '--norestore', '--convert-to', 'pdf',
                        '--outdir', os.path.dirname(os.path.abspath(pdf)) or '.', args.docx],
                       check=True, stdout=subprocess.DEVNULL)
        produced = os.path.join(os.path.dirname(os.path.abspath(pdf)),
                                os.path.splitext(os.path.basename(args.docx))[0] + '.pdf')
        if os.path.abspath(produced) != os.path.abspath(pdf):
            shutil.move(produced, pdf)
        engine = 'libreoffice, fields NOT updated'
    pages = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    pages = next((l.split()[1] for l in pages.splitlines() if l.startswith('Pages:')), '?')
    print(f'{pdf} ({pages} pages, {engine})')

    if args.images:
        os.makedirs(args.images, exist_ok=True)
        subprocess.run(['pdftoppm', '-jpeg', '-r', '60', pdf, os.path.join(args.images, 'page')], check=True)
        print(os.path.join(args.images, 'page-*.jpg'))


if __name__ == '__main__':
    main()
