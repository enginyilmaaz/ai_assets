#!/usr/bin/env python3
"""Check a .docx against the writing guide and report what fails.

Reads the rules out of the document itself — page setup from sectPr, type sizes
and spacing from styles.xml, caption numbering from the text — so the same script
verifies a generated report and a hand-written one.

    python3 verify_report.py report.docx [--labels Figure,Table]

Exit status is 0 when every check passes, 1 otherwise.
"""

import argparse
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
TWIP_PER_CM = 566.9

# What the guide prescribes. Twips where Word counts twips, half-points for sizes.
EXPECTED = {
    'margin_left_cm': 3.5,
    'margin_right_cm': 2.5,
    'margin_top_cm': 2.5,
    'margin_bottom_cm': 2.5,
    'page_w_cm': 21.0,
    'page_h_cm': 29.7,
    'body_size_halfpt': 24,      # 12 pt
    'body_line_twips': 360,      # 1.5 lines
    'body_before_twips': 120,    # 6 pt
    'body_after_twips': 120,     # 6 pt
    'h1_size_halfpt': 28,        # 14 pt
    'h1_before_twips': 960,      # 48 pt
    'h1_after_twips': 480,       # 24 pt
    'h2_before_twips': 480,      # 24 pt
    'h2_after_twips': 240,       # 12 pt
}

STYLE_IDS = {'body': 'PARAGRAFMETN', 'h1': 'Balk1', 'h2': 'Balk2', 'h3': 'Balk3', 'h4': 'Balk4'}


class Checker:
    def __init__(self):
        self.results = []

    def check(self, name, ok, detail=''):
        self.results.append((bool(ok), name, detail))

    @property
    def failed(self):
        return [r for r in self.results if not r[0]]

    def report(self):
        for ok, name, detail in self.results:
            print(f'  {"PASS" if ok else "FAIL"}  {name}' + (f'  —  {detail}' if detail else ''))
        total, bad = len(self.results), len(self.failed)
        print(f'\n{total - bad}/{total} checks passed')
        return 0 if bad == 0 else 1


def parse_xml(data):
    """Parse a document part, refusing the one construct that makes XML dangerous.

    A .docx can come from anywhere, and entity-expansion attacks ("billion laughs")
    need a DTD to declare the entities. Office never writes one, so rejecting any
    part that carries a DOCTYPE removes the attack without pulling in defusedxml.
    """
    head = data[:2048].lstrip()
    if b'<!DOCTYPE' in head.upper():
        raise ValueError('refusing to parse a document part that declares a DOCTYPE')
    return ET.fromstring(data)


def attr(el, name, default=None):
    return el.get(W + name, default) if el is not None else default


def style_props(styles, style_id):
    """(rPr, pPr) of one style, or (None, None)."""
    for st in styles.findall(W + 'style'):
        if st.get(W + 'styleId') == style_id:
            return st.find(W + 'rPr'), st.find(W + 'pPr')
    return None, None


def spacing(ppr, key):
    sp = ppr.find(W + 'spacing') if ppr is not None else None
    value = attr(sp, key)
    return int(value) if value is not None else None


def verify(path, labels):
    z = zipfile.ZipFile(path)
    doc = parse_xml(z.read('word/document.xml'))
    styles = parse_xml(z.read('word/styles.xml'))
    c = Checker()

    # --- page setup -----------------------------------------------------------
    sects = doc.iter(W + 'sectPr')
    sect = next(sects, None)
    pg_sz, pg_mar = (sect.find(W + 'pgSz'), sect.find(W + 'pgMar')) if sect is not None else (None, None)
    cm = lambda v: round(int(v) / TWIP_PER_CM, 2) if v else None
    c.check('A4 page size', pg_sz is not None
            and abs(cm(attr(pg_sz, 'w')) - EXPECTED['page_w_cm']) < 0.15
            and abs(cm(attr(pg_sz, 'h')) - EXPECTED['page_h_cm']) < 0.15,
            f"{cm(attr(pg_sz, 'w'))} x {cm(attr(pg_sz, 'h'))} cm" if pg_sz is not None else 'no sectPr')
    for side, key in (('left', 'margin_left_cm'), ('right', 'margin_right_cm'),
                      ('top', 'margin_top_cm'), ('bottom', 'margin_bottom_cm')):
        got = cm(attr(pg_mar, side))
        c.check(f'{side} margin {EXPECTED[key]} cm', got is not None and abs(got - EXPECTED[key]) < 0.06, f'{got} cm')

    # --- default font ---------------------------------------------------------
    dd = styles.find(W + 'docDefaults/' + W + 'rPrDefault/' + W + 'rPr')
    font = attr(dd.find(W + 'rFonts') if dd is not None else None, 'ascii')
    c.check('default font is Times New Roman', font == 'Times New Roman', str(font))

    # --- body text ------------------------------------------------------------
    rpr, ppr = style_props(styles, STYLE_IDS['body'])
    size = attr(rpr.find(W + 'sz') if rpr is not None else None, 'val')
    c.check('body text 12 pt', size == str(EXPECTED['body_size_halfpt']), f'{int(size)/2 if size else "?"} pt')
    c.check('body line spacing 1.5', spacing(ppr, 'line') == EXPECTED['body_line_twips'], str(spacing(ppr, 'line')))
    c.check('body 6 pt before and after',
            spacing(ppr, 'before') == EXPECTED['body_before_twips'] and spacing(ppr, 'after') == EXPECTED['body_after_twips'],
            f"before={spacing(ppr, 'before')} after={spacing(ppr, 'after')}")
    ind = ppr.find(W + 'ind') if ppr is not None else None
    c.check('body has no first-line indent', ind is None or attr(ind, 'firstLine') in (None, '0'),
            attr(ind, 'firstLine') or 'none')

    # --- headings -------------------------------------------------------------
    h1r, h1p = style_props(styles, STYLE_IDS['h1'])
    c.check('heading 1 is 14 pt bold capitals',
            attr(h1r.find(W + 'sz') if h1r is not None else None, 'val') == str(EXPECTED['h1_size_halfpt'])
            and h1r is not None and h1r.find(W + 'b') is not None and h1r.find(W + 'caps') is not None)
    c.check('heading 1 spacing 48 pt / 24 pt',
            spacing(h1p, 'before') == EXPECTED['h1_before_twips'] and spacing(h1p, 'after') == EXPECTED['h1_after_twips'],
            f"before={spacing(h1p, 'before')} after={spacing(h1p, 'after')}")
    _, h2p = style_props(styles, STYLE_IDS['h2'])
    c.check('heading 2 spacing 24 pt / 12 pt',
            spacing(h2p, 'before') == EXPECTED['h2_before_twips'] and spacing(h2p, 'after') == EXPECTED['h2_after_twips'],
            f"before={spacing(h2p, 'before')} after={spacing(h2p, 'after')}")

    # --- document body: headings start a page, captions are numbered ----------
    paragraphs = []
    for p in doc.iter(W + 'p'):
        pr = p.find(W + 'pPr')
        sid = attr(pr.find(W + 'pStyle') if pr is not None else None, 'val')
        text = ''.join(t.text or '' for t in p.iter(W + 't')).strip()
        brk = pr is not None and pr.find(W + 'pageBreakBefore') is not None
        paragraphs.append((sid, text, brk))

    h1s = [(t, brk) for sid, t, brk in paragraphs if sid == STYLE_IDS['h1']]
    c.check('every first-level heading starts a new page',
            bool(h1s) and all(brk for _, brk in h1s), f'{sum(1 for _, b in h1s if b)}/{len(h1s)}')

    for kind, label in (('figure', labels[0]), ('table', labels[1])):
        pattern = re.compile(rf'^{re.escape(label)}\s+(\d+)\.(\d+)\.\s+\S')
        found = [pattern.match(t) for _, t, _ in paragraphs if t.startswith(label + ' ')]
        hits = [m for m in found if m]
        ordered = True
        seen = {}
        for m in hits:
            chapter, index = int(m.group(1)), int(m.group(2))
            if seen.get(chapter, 0) + 1 != index:
                ordered = False
            seen[chapter] = index
        c.check(f'{kind} captions numbered "{label} N.M."', bool(hits), f'{len(hits)} caption(s)')
        c.check(f'{kind} numbering is sequential per chapter', ordered)

    # --- front matter and page numbering --------------------------------------
    instr = ' '.join(i.text or '' for i in doc.iter(W + 'instrText'))
    c.check('contents field present', 'TOC' in instr)
    fmts = [attr(s.find(W + 'pgNumType'), 'fmt') for s in doc.iter(W + 'sectPr')]
    fmts = [f for f in fmts if f]
    c.check('front matter numbered in roman, body in arabic',
            'lowerRoman' in fmts and 'decimal' in fmts, ' then '.join(fmts) or 'no pgNumType')

    # --- references -----------------------------------------------------------
    refs_started = False
    refs = []
    for sid, text, _ in paragraphs:
        if sid == STYLE_IDS['h1'] and re.search(r'KAYNAK|REFERENCE', text, re.I):
            refs_started = True
            continue
        if refs_started and sid == STYLE_IDS['body'] and text:
            refs.append(text)
    if refs:
        c.check('reference list is alphabetical', refs == sorted(refs), f'{len(refs)} entries')
        apa = re.compile(r'^[^(]+\(\d{4}[a-z]?\)\.')
        bad = [r for r in refs if not apa.match(r)]
        c.check('references look like APA (Author, A. (Year). …)', not bad,
                f'{len(refs) - len(bad)}/{len(refs)} match')
    return c


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('docx')
    ap.add_argument('--labels', default='Figure,Table',
                    help='caption labels, e.g. "Şekil,Çizelge" for Turkish documents')
    args = ap.parse_args()
    labels = [s.strip() for s in args.labels.split(',')]
    print(f'verifying {args.docx} against the writing guide\n')
    sys.exit(verify(args.docx, labels).report())


if __name__ == '__main__':
    main()
