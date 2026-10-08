#!/usr/bin/env python3
"""Build a .docx report that follows the thesis writing guide.

The template in templates/ is the style base: its styles.xml already encodes the
guide's rules (Times New Roman 12 pt, 1.5 line spacing, 6 pt before/after, the six
heading levels, A4 with a 3.5 cm binding margin), so the generated document keeps
them without a single hard-coded measurement here.

Input is a JSON spec (see examples/sample-report.json); output is a .docx.
No third-party packages: a .docx is a ZIP of XML and the stdlib can write both.

    python3 build_report.py spec.json -o report.docx [--template path.docx]
"""

import argparse
import json
import os
import re
import shutil
import zipfile
from xml.sax.saxutils import escape

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

# Style ids as the template defines them (Word strips non-ASCII from Turkish names).
STYLE = {
    'h1': 'Balk1',                  # BÜYÜK HARF, 14 pt, bold, starts a new page
    'h2': 'Balk2',                  # BÜYÜK HARF, 12 pt, bold
    'h3': 'Balk3',                  # Title Case, 12 pt, bold
    'h4': 'Balk4',                  # Title Case, 12 pt, italic
    'front_heading': 'LKBALIKLAR',  # front-matter headings (ABSTRACT, CONTENTS, ...)
    'body': 'PARAGRAFMETN',         # 12 pt, 1.5 spacing, 6 pt before/after, no indent
    'figure_caption': 'ekilYazs',   # caption under a figure
    'table_caption': 'izelgeYazs',  # caption above a table
    'cover_title': 'nsayfalarbalkstili',
    'cover_text': 'nsayfalarmetinstili',
}

EMU_PER_CM = 360000
TWIP_PER_CM = 566.9
BREAK_BEFORE = '<w:pageBreakBefore/>'


def t(text):
    """One run of text, preserving spaces."""
    return f'<w:r><w:t xml:space="preserve">{escape(str(text))}</w:t></w:r>'


def para(text='', style=None, runs=None, align=None, extra_ppr=''):
    ppr = ''
    if style or align or extra_ppr:
        ppr = '<w:pPr>'
        if style:
            ppr += f'<w:pStyle w:val="{style}"/>'
        ppr += extra_ppr
        if align:
            ppr += f'<w:jc w:val="{align}"/>'
        ppr += '</w:pPr>'
    body = runs if runs is not None else (t(text) if text != '' else '')
    return f'<w:p>{ppr}{body}</w:p>'



def field(instr, placeholder='Right-click and choose Update Field'):
    """A Word field (TOC, PAGE, ...). Word fills it in when the field is updated."""
    return (
        '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
        f'<w:r><w:instrText xml:space="preserve"> {instr} </w:instrText></w:r>'
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
        f'<w:r><w:t xml:space="preserve">{escape(placeholder)}</w:t></w:r>'
        '<w:r><w:fldChar w:fldCharType="end"/></w:r>'
    )


def attach_section(paragraph, sect_xml):
    """Put a section break inside an existing paragraph's properties."""
    if not sect_xml:
        return paragraph
    if '<w:pPr>' in paragraph:
        return paragraph.replace('</w:pPr>', f'{sect_xml}</w:pPr>', 1)
    return paragraph.replace('<w:p>', f'<w:p><w:pPr>{sect_xml}</w:pPr>', 1)


class Report:
    def __init__(self, spec, template, style_names=None):
        self.spec = spec
        self.template = template
        self.style_names = style_names or {}   # style id -> display name, from styles.xml
        self.parts = []          # extra media parts: (zip path, bytes)
        self.rels = []           # extra document relationships
        self.figures = []        # (number, caption)
        self.tables = []         # (number, caption)
        self._rid = 1000

    # ---- relationships / media ------------------------------------------------
    def add_image(self, path):
        ext = os.path.splitext(path)[1].lstrip('.').lower() or 'png'
        if ext == 'jpeg':
            ext = 'jpg'
        self._rid += 1
        rid = f'rId{self._rid}'
        name = f'media/report{self._rid}.{ext}'
        with open(path, 'rb') as fh:
            self.parts.append((f'word/{name}', fh.read()))
        self.rels.append(
            f'<Relationship Id="{rid}" Type="{R}/image" Target="{name}"/>')
        return rid, ext

    # ---- blocks ---------------------------------------------------------------
    def heading(self, level, text):
        style = STYLE.get(f'h{level}', STYLE['h4'])
        # The guide starts every first-level heading on a new page. pageBreakBefore
        # does that without the empty page an explicit break run leaves behind when
        # the heading already follows a section break.
        extra = '<w:pageBreakBefore/>' if level == 1 else ''
        return para(text, style, extra_ppr=extra)

    def figure(self, fig):
        """Image centred, caption under it — 'Figure 2.1. Caption.' per the guide."""
        out = []
        number = fig['number']
        rid, _ = self.add_image(fig['image'])
        width_cm = float(fig.get('width_cm', 14))
        height_cm = float(fig.get('height_cm', width_cm * 0.62))
        cx, cy = int(width_cm * EMU_PER_CM), int(height_cm * EMU_PER_CM)
        drawing = (
            '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
            f'<wp:extent cx="{cx}" cy="{cy}"/><wp:docPr id="{self._rid}" name="Figure {number}"/>'
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:nvPicPr><pic:cNvPr id="{self._rid}" name="Figure {number}"/><pic:cNvPicPr/></pic:nvPicPr>'
            f'<pic:blipFill><a:blip xmlns:r="{R}" r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
            f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
            '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'
        )
        out.append(para(runs=drawing, align='center'))
        caption = f"{self.spec.get('labels', {}).get('figure', 'Figure')} {number}. {fig['caption']}"
        out.append(para(caption, STYLE['figure_caption'], align='center'))
        self.figures.append((number, fig['caption']))
        return ''.join(out)

    def table(self, tbl):
        """Caption above the table, then a bordered table sized to the text width."""
        out = []
        number = tbl['number']
        caption = f"{self.spec.get('labels', {}).get('table', 'Table')} {number}. {tbl['caption']}"
        out.append(para(caption, STYLE['table_caption']))
        rows = tbl['rows']
        cols = max(len(r) for r in rows)
        total = int(float(tbl.get('width_cm', 15)) * TWIP_PER_CM)
        width = total // cols
        grid = ''.join(f'<w:gridCol w:w="{width}"/>' for _ in range(cols))
        borders = ''.join(
            f'<w:{side} w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
            for side in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'))
        body = ''
        for i, row in enumerate(rows):
            cells = ''
            for j in range(cols):
                text = row[j] if j < len(row) else ''
                runs = (f'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{escape(str(text))}</w:t></w:r>'
                        if i == 0 and tbl.get('header', True) else t(text))
                cells += (f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/></w:tcPr>'
                          f'{para(runs=runs, style=STYLE["body"], extra_ppr="<w:spacing w:before=\'0\' w:after=\'0\' w:line=\'240\' w:lineRule=\'auto\'/>")}</w:tc>')
            body += f'<w:tr>{cells}</w:tr>'
        out.append(f'<w:tbl><w:tblPr><w:tblW w:w="{total}" w:type="dxa"/>'
                   f'<w:tblBorders>{borders}</w:tblBorders></w:tblPr>'
                   f'<w:tblGrid>{grid}</w:tblGrid>{body}</w:tbl>')
        out.append(para())
        self.tables.append((number, tbl['caption']))
        return ''.join(out)

    # ---- document -------------------------------------------------------------
    def front_matter(self):
        meta = self.spec.get('meta', {})
        labels = self.spec.get('labels', {})
        out = [
            para(meta.get('organisation', ''), STYLE['cover_title'], align='center'),
            para(),
            para(meta.get('title', ''), STYLE['cover_title'], align='center'),
            para(meta.get('subtitle', ''), STYLE['cover_text'], align='center'),
            para(),
            para(meta.get('author', ''), STYLE['cover_text'], align='center'),
            para(meta.get('document_number', ''), STYLE['cover_text'], align='center'),
            para(meta.get('date', ''), STYLE['cover_text'], align='center'),
        ]
        # The figure and table lists are built from the caption *styles*: the captions
        # are ordinary paragraphs, so a \c list (which needs Word caption fields) would
        # come out empty. \t picks them up, but by the style's display name, not its id.
        fig_style = self.style_names.get(STYLE['figure_caption'], STYLE['figure_caption'])
        tbl_style = self.style_names.get(STYLE['table_caption'], STYLE['table_caption'])
        for key, instr in (('contents', 'TOC \\o "1-3" \\h \\z \\u'),
                           ('figures', f'TOC \\h \\z \\t "{fig_style};1"'),
                           ('tables', f'TOC \\h \\z \\t "{tbl_style};1"')):
            title = labels.get(key)
            if not title:
                continue
            out.append(para(title, STYLE['front_heading'], extra_ppr=BREAK_BEFORE))
            out.append(para(runs=field(instr)))
        for block in self.spec.get('front_sections', []):
            out.append(para(block['heading'], STYLE['front_heading'], extra_ppr=BREAK_BEFORE))
            for p in block.get('paragraphs', []):
                out.append(para(p, STYLE['body']))
        return out

    def body(self):
        out = []
        for block in self.spec.get('sections', []):
            if 'heading' in block:
                out.append(self.heading(int(block.get('level', 1)), block['heading']))
            for item in block.get('content', []):
                if isinstance(item, str):
                    out.append(para(item, STYLE['body']))
                elif 'figure' in item:
                    out.append(self.figure(item['figure']))
                elif 'table' in item:
                    out.append(self.table(item['table']))
                elif 'list' in item:
                    for li in item['list']:
                        out.append(para('•  ' + li, STYLE['body']))
        refs = self.spec.get('references', [])
        if refs:
            out.append(self.heading(1, self.spec.get('labels', {}).get('references', 'REFERENCES')))
            # APA reference list: alphabetical, hanging indent of 1.25 cm.
            hanging = '<w:ind w:left="709" w:hanging="709"/>'
            for ref in sorted(refs):
                out.append(para(ref, STYLE['body'], extra_ppr=hanging))
        return ''.join(out)

    def document_xml(self, template_body):
        """Wrap the generated body in the template's own <w:document> + sectPr."""
        sect = re.search(r'<w:sectPr[ >].*?</w:sectPr>', template_body, re.S)
        sect_xml = sect.group(0) if sect else ''
        # The template already carries a page-number format; the first one in a
        # sectPr wins, so it has to go before the per-section format is added.
        sect_xml = re.sub(r'<w:pgNumType[^>]*/>', '', sect_xml)
        # Roman numerals for the front matter, Arabic restarting at 1 for the body —
        # both bottom-centre, as the guide's page-number table prescribes.
        front_sect = sect_xml.replace('</w:sectPr>', '<w:pgNumType w:fmt="lowerRoman" w:start="1"/></w:sectPr>')
        body_sect = sect_xml.replace('</w:sectPr>', '<w:pgNumType w:fmt="decimal" w:start="1"/></w:sectPr>')
        head = re.search(r'<w:document[^>]*>', template_body).group(0)
        front = self.front_matter()
        # The section break belongs in the last front-matter paragraph; giving it a
        # paragraph of its own would leave an empty page between the two sections.
        front[-1] = attach_section(front[-1], front_sect)
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            f'{head}<w:body>'
            f'{"".join(front)}'
            f'{self.body()}'
            f'{body_sect}'
            '</w:body></w:document>'
        )


def build(spec_path, out_path, template):
    with open(spec_path, encoding='utf-8') as fh:
        spec = json.load(fh)

    with zipfile.ZipFile(template) as zin:
        template_body = zin.read('word/document.xml').decode('utf-8')
        names = zin.namelist()
        keep = {n: zin.read(n) for n in names}

    style_names = dict(re.findall(
        r'<w:style [^>]*w:styleId="([^"]+)"[^>]*>\s*<w:name w:val="([^"]+)"',
        keep.get('word/styles.xml', b'').decode('utf-8')))
    report = Report(spec, template, style_names)

    document = report.document_xml(template_body)

    # Add the image relationships to the document's rels part.
    rels_name = 'word/_rels/document.xml.rels'
    rels = keep[rels_name].decode('utf-8')
    if report.rels:
        rels = rels.replace('</Relationships>', ''.join(report.rels) + '</Relationships>')

    # Ask the reader to refresh fields on open, so the contents and the figure/table
    # lists fill themselves — in Word, and in the headless LibreOffice conversion.
    settings_name = 'word/settings.xml'
    settings = keep.get(settings_name, b'').decode('utf-8')
    if settings and '<w:updateFields' not in settings:
        settings = re.sub(r'(<w:settings[^>]*>)', r'\1<w:updateFields w:val="true"/>', settings, count=1)

    # Make sure every media extension has a content-type override.
    ct = keep['[Content_Types].xml'].decode('utf-8')
    for ext, mime in (('png', 'image/png'), ('jpg', 'image/jpeg'), ('gif', 'image/gif')):
        if f'Extension="{ext}"' not in ct:
            ct = ct.replace('</Types>', f'<Default Extension="{ext}" ContentType="{mime}"/></Types>')

    shutil.rmtree(out_path, ignore_errors=True)
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name, data in keep.items():
            if name == 'word/document.xml':
                data = document.encode('utf-8')
            elif name == rels_name:
                data = rels.encode('utf-8')
            elif name == '[Content_Types].xml':
                data = ct.encode('utf-8')
            elif name == settings_name and settings:
                data = settings.encode('utf-8')
            zout.writestr(name, data)
        for name, data in report.parts:
            zout.writestr(name, data)
    return out_path, report


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('spec', help='JSON spec describing the report')
    ap.add_argument('-o', '--output', default='report.docx')
    ap.add_argument('--template', default=os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'templates', 'thesis-template.docx'))
    args = ap.parse_args()
    out, report = build(args.spec, args.output, args.template)
    print(f'wrote {out}')
    print(f'  figures: {len(report.figures)} | tables: {len(report.tables)} | '
          f'references: {len(json.load(open(args.spec, encoding="utf-8")).get("references", []))}')
    print('  open it in Word/LibreOffice and update fields (F9) to fill the contents lists')


if __name__ == '__main__':
    main()
