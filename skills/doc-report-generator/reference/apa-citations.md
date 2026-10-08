# APA citations and reference list

The guide offers four referencing techniques (numeric, Harvard, Chicago footnote, APA).
This skill uses **APA**, as given in the guide's own examples. One technique must be used
consistently through the whole document.

## In text — author surname and year

| Case | Form |
|---|---|
| One author | `(Demirel, 2004: 130)` |
| Two authors | `(Gültekin and Satterfield, 1995: 391-394)` |
| More than two | `(Babakuş et al., 1996: 33-46)` |
| Several sources at once | `(Sönmez, 1995: 29; Demirel, 1998: 28-33)` |
| Cited in another work | `(as cited in: Akın, 1997: 57)` |
| Same author, same year | `(Demirel, 2000a: 10)`, `(Demirel, 2000b: 28)` |
| Same surname, different authors | `(Ö. Demirel, 2000: 16)`, `(M. Demirel, 2005: 86)` |
| Unknown author / web source | title or institution, then the year |

The citation may open or close the sentence. The reference list is **not numbered** and is
sorted alphabetically by surname.

## Reference list entries

```
Book, one author
    Author, A. (Year). Title of the Book (Edition). Place: Publisher.

Book, two or more authors
    Author, A, Author, B and Author, C (Year). Title of the Book (Edition). Place: Publisher.

Same author, same year
    Author, A (Year a, b, c). Title of the Book. Place: Publisher.

Corporate author
    Institution (Year). Title of the Book. Place: Publisher.

Chapter in an edited book
    Author, A (Year). Chapter title. (Editor: Name Surname). Book Title. Place: Publisher, pages.

Journal article
    Author, A. (Year). Article title. Journal Name, volume (issue), pages.

Journal article, three authors
    Author, A, Author, B and Author, C (Year). Article title. Journal Name, volume (issue), pages.

Thesis
    Author, A. (Year). Thesis title. (Master's thesis / PhD thesis). University, Institute, City.

Web source
    Author or institution (Year). Page title. URL (accessed: DD.MM.YYYY).
```

## What the verifier checks

`scripts/verify_report.py` checks that the reference list is alphabetical and that each
entry starts in the APA shape `Surname, A. (Year).`. It cannot judge whether a citation is
*correct* — only that the list is ordered and shaped like APA.

## Technical reports that cite standards

A manual or technical report usually cites standards and regulations rather than papers.
Keep the same shape:

```
International Electrotechnical Commission (2016). IEC 61108-1: Maritime navigation and
    radiocommunication equipment and systems — Global navigation satellite systems.
    Geneva: IEC.
```
