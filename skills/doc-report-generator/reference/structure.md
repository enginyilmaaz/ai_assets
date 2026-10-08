# Document structure

## Order of sections (thesis, as the guide prescribes)

1. Outer cover
2. Inner cover
3. Approval page
4. Declaration page
5. Acknowledgements
6. Contents
7. List of figures / visuals
8. List of tables
9. Symbols and abbreviations
10. Abstract (required)
11. Abstract in English (required)
12. Extended abstract (required for a doctorate)
13. Introduction (required)
14. Material and method
15. Findings and discussion
16. Conclusions and recommendations (required)
17. References (required)
18. Appendices (required when they exist)
19. Curriculum vitae (required)

Items 14 and 15 are mandatory in health sciences and optional elsewhere; in social
sciences and the arts the body is instead a theoretical framework followed by at least
two chapters.

## Mapping it onto a technical report or manual

A product manual has no jury or CV, but the skeleton carries over. The generator's spec
fields map like this:

| Spec field | Thesis equivalent | In a manual |
|---|---|---|
| `meta` | outer/inner cover | title page: product, document number, revision, date |
| `labels.contents` / `figures` / `tables` | contents and lists | same, generated as Word fields |
| `front_sections` | abstract, abbreviations | purpose, scope, abbreviations, safety notice |
| `sections` | introduction, method, findings, conclusions | the chapters of the manual |
| `references` | references | standards, regulations, related documents |

Keep what the reader needs and drop what does not apply — but do not reorder: contents
before the lists, lists before the text, references after the text, appendices last.

## Spec shape

```json
{
  "labels":  { "figure": "Figure", "table": "Table", "contents": "CONTENTS",
               "figures": "LIST OF FIGURES", "tables": "LIST OF TABLES",
               "references": "REFERENCES" },
  "meta":    { "organisation": "...", "title": "...", "subtitle": "...",
               "author": "...", "document_number": "...", "date": "..." },
  "front_sections": [ { "heading": "ABSTRACT", "paragraphs": ["..."] } ],
  "sections": [
    { "level": 1, "heading": "INTRODUCTION", "content": [
        "a paragraph",
        { "list": ["bullet", "bullet"] },
        { "figure": { "number": "1.1", "caption": "...", "image": "a.png", "width_cm": 12 } },
        { "table":  { "number": "1.1", "caption": "...", "rows": [["h1","h2"],["a","b"]] } }
    ] }
  ],
  "references": ["Surname, A. (2020). Title. Place: Publisher."]
}
```

`level` 1–4 maps to the four heading styles. Numbering of headings is automatic: the
template's styles carry the list definition, so a heading must **not** include its own
"1.2." prefix. Figure and table numbers, on the other hand, are written by hand in the
spec so that they can follow the chapter they belong to.
