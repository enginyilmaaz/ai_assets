---
name: doc-report-generator
description: Produce a Word report that follows a formal writing guide — A4 with a 3.5 cm binding margin, Times New Roman 12 pt, 1.5 line spacing, numbered headings, numbered figure and table captions, roman-then-arabic page numbers and an APA reference list — from a JSON spec, then verify the result against those rules and render it to PDF. Use when asked for a report, thesis, manual or technical document in a formal/academic layout, when a .docx must match a style guide, or when an existing document has to be rebuilt to that standard. Triggers - "rapor üret", "tez formatında", "APA stilinde", "şablona göre doküman", "akademik format", "kılavuza uygun rapor", "generate a report", "APA style document", "format this to the thesis guide", "rebuild this manual".
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Report generator (writing-guide layout)

Builds a `.docx` whose layout follows `templates/writing-guide.docx`, checks the result
against that guide, and renders it to PDF so it can be looked at.

The rules are not re-implemented here: `templates/thesis-template.docx` already carries
them in its styles (page setup, Times New Roman 12 pt, 1.5 spacing, the six heading
levels, caption styles), so every generated document inherits them by construction.
`reference/format-rules.md` states the same rules in prose for checking or for rebuilding
the layout elsewhere.

## Workflow

1. **Collect the content** into a JSON spec — see `examples/sample-report.json` and the
   spec shape in `reference/structure.md`. Headings carry no numbers of their own; the
   template numbers them. Figure and table numbers are written in the spec.
2. **Build**
   ```bash
   python3 scripts/build_report.py spec.json -o report.docx
   ```
3. **Verify** — never claim the layout is right without this:
   ```bash
   python3 scripts/verify_report.py report.docx          # --labels "Şekil,Çizelge" for Turkish
   ```
   It reads the page setup, styles and captions out of the file and prints a PASS/FAIL
   line per rule, exiting non-zero on any failure.
4. **Render and look at it**
   ```bash
   python3 scripts/to_pdf.py report.docx --images out/   # PDF + page-*.jpg
   ```
   Then read a few of the page images. A document that passes every check can still look
   wrong — a figure that does not render, or a page that breaks badly, only shows here.

   Contents and the figure/table lists are Word fields, and `soffice --convert-to` does
   **not** refresh them: converted that way they keep their placeholder line. `to_pdf.py`
   drives LibreOffice through UNO instead and updates every field and index before
   exporting. Opening the `.docx` in Word fills them too — the document carries
   `updateFields`, so Word refreshes on open.

## Scripts

| Script | What it does |
|---|---|
| `scripts/build_report.py` | JSON spec → `.docx`, using the template as the style base |
| `scripts/verify_report.py` | checks a `.docx` against the guide (22 rules), exit code 0/1 |
| `scripts/to_pdf.py` | LibreOffice → PDF with fields updated, optionally page images |

Building and verifying use only the Python standard library — nothing to install.
Rendering needs LibreOffice (`soffice`) plus `python3-uno` for the field update; without
UNO the script still converts but says that the lists will stay unfilled. LibreOffice is
the only converter used here because it is the one that converts from the command line on
every platform: SoftMaker FreeOffice/TextMaker's command-line parameters are Windows-only
(its own manual says so), and OnlyOffice needs its document server.

```bash
sudo apt-get install libreoffice-writer python3-uno    # Debian/Ubuntu
```

## Things that bite

- **A white logo on a transparent background is invisible on white paper.** If a figure
  comes out blank, check the image itself before suspecting the document.
- **Page-number formats do not stack.** A `sectPr` keeps the first `pgNumType` it holds, so
  the template's own value is stripped before the per-section format is applied.
- **A section break already starts a page.** Use `pageBreakBefore` on a first-level
  heading rather than a break run, or an empty page appears between the two sections.
- The template is a university thesis: it has an approval page and a jury. For a manual,
  keep the ordering and drop what does not apply (`reference/structure.md`).

## Files

```
templates/thesis-template.docx   style base — page setup, heading and caption styles
templates/writing-guide.docx     the guide itself, for anything this skill does not cover
reference/format-rules.md        the layout rules in prose
reference/apa-citations.md       APA in-text citations and reference-list shapes
reference/structure.md           section order, spec shape, mapping onto a manual
examples/sample-report.json      a spec that exercises every feature
```
