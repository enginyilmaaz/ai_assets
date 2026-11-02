---
description: Bir Claude Code oturumunu (transcript) başka bir proje dizinine taşı — proje klasörü taşındığında --resume çalışsın diye
allowed-tools: Bash, AskUserQuestion
---

Kullanıcının bir Claude Code oturumunu başka bir proje dizinine taşımasına yardım et.
Proje klasörü diskte taşındığında oturum eski `~/.claude/projects/<encoded-eski-yol>/`
altında kalır ve yeni dizinden `claude --resume` ile görünmez. Bu komut onu düzeltir.

Tüm iş `~/.claude/commands/claude/move-session.js` scriptinde — Linux, macOS
ve Windows'ta aynı komut. Sen sadece sürücüsüsün: oturumu sor, göster, onay
al, çalıştır, sonucu bildir.

Yanındaki `move-session.sh` eski bash karşılığıdır; bash, python3 ve GNU
araçları ister, Windows'ta ona uzanma.

Argüman olarak verilen (varsa): $ARGUMENTS

## Adım 1 — Hangi oturum?

$ARGUMENTS içinde bir session id verilmişse onu kullan, kullanıcıya sorma.

Verilmemişse önce mevcut oturumları listele:

```bash
find ~/.claude/projects -maxdepth 2 -name '*.jsonl' -printf '%TY-%Tm-%Td %TH:%TM  %10s  %p\n' | sort -r | head -15
```

Çıktıyı **okunur bir tablo** hâline getir (tarih, boyut, proje dizini, session id) ve
`AskUserQuestion` ile hangisini taşımak istediğini sor. En son değiştirileni ilk
seçenek yap ve sonuna "(Önerilen)" ekle.

## Adım 2 — Nereye?

Hedef, kullanıcı başka bir şey söylemedikçe **mevcut çalışma dizini**dir.
$ARGUMENTS içinde bir hedef yol verilmişse onu kullan.

## Adım 3 — Göster ve onay al

Yazmadan önce dry-run ile eski/yeni konumu çıkar:

```bash
node ~/.claude/commands/claude/move-session.js <session-id> <hedef-dizin> --dry-run
```

PowerShell'de aynı komut, yalnızca ev dizini farklı yazılır:

```powershell
node "$HOME/.claude/commands/claude/move-session.js" <session-id> <hedef-dizin> --dry-run
```

Çıktıyı kullanıcıya net biçimde sun:

```
Oturum      : <session-id>
Eski konum  : <kaynak dizin>   (proje yolu: <eski yol>)
Yeni konum  : <hedef dizin>    (proje yolu: <yeni yol>)
```

Ardından `AskUserQuestion` ile onay iste — seçenekler:
- **Taşı (orijinali koru)** — kopyalar, eski dosya yedek olarak kalır *(Önerilen)*
- **Taşı ve orijinali sil** — `--delete` ile eskisini temizler
- **Vazgeç** — hiçbir şey yapma

Onay gelmeden **hiçbir şey yazma**.

## Adım 4 — Taşı

Seçime göre çalıştır:

```bash
node ~/.claude/commands/claude/move-session.js <session-id> <hedef-dizin>
# veya orijinali silmek istediyse:
node ~/.claude/commands/claude/move-session.js <session-id> <hedef-dizin> --delete
```

Script transcript'i satır satır doğrular (bozuk JSON + kalıntı eski yol kontrolü).
Doğrulama başarısız olursa script sıfırdan farklı kod döner — bunu **başarı gibi
gösterme**, hatayı olduğu gibi bildir.

## Adım 5 — Sonucu bildir

Başarılıysa kullanıcıya kısaca şunu ver:

```
✅ Taşıma bitti — <N> satır, 0 bozuk JSON, yollar güncellendi.

Devam etmek için:
  cd <hedef-dizin> && claude --resume <session-id>
```

Orijinal korunduysa yedeğin nerede durduğunu tek satırla ekle.

## Notlar

- Script eski proje yolunu **transcript'in kendi `cwd` alanlarından** okur; kullanıcıya sormaz.
- Yol değişimi transcript gövdesine de uygulanır (tool çağrılarındaki dosya yolları da düzelir).
- Varsa `<session-id>/` (tool-results) ve `memory/` klasörleri de taşınır; memory dosyaları üzerine yazılmaz.
- Script'i doğrulamak için: `node ~/.claude/commands/claude/move-session.js --selftest`
- Yollar transcript'e JSON olarak yazıldığı için yeniden yazma kayıt kayıt yapılır, ham metin üzerinde değil; Windows yollarındaki ters bölü işaretleri aksi hâlde hiç eşleşmez ve taşıma sessizce hiçbir yolu düzeltmez.
- Eski bash akışı (`bash ~/.claude/commands/claude/move-session.sh --selftest`) Linux'ta durur; `python3` yoksa `py -3` kullanır.