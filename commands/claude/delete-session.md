---
description: Bir veya daha fazla Claude Code oturumunu (transcript) kalıcı sil — önce proje, sonra oturumları çoklu seç, dry-run + onay, sonra sil. Delete Claude Code session transcripts safely.
allowed-tools: Bash, AskUserQuestion
---

Kullanıcının Claude Code oturum transcript'lerini (`~/.claude/projects/<proje>/<id>.jsonl`)
güvenle silmesine yardım et. Akış: önce proje seç, sonra o projedeki oturumları çoklu seç,
dry-run ile ne silineceğini göster, ayrı bir "tamamen emin misin?" onayı al, sonra sil.

Silme motoru: `~/.claude/commands/claude/delete-session.sh`. Sen sürücüsün: listele,
seçtir, onay al, çalıştır, raporla. **Silme geri alınamaz** ve **aktif oturum asla silinmez.**

Argüman olarak verilen (varsa): $ARGUMENTS

## Adım 0 — Aktif oturumu belirle (silme dışı bırak)

Aktif (şu an içinde bulunduğun) oturumu asla silme. En olası aktif oturum: **geçerli
çalışma dizininin projesindeki en son değişen `.jsonl`**. Tespit:

```bash
CUR_PROJ=~/.claude/projects/$(printf '%s' "$PWD" | sed 's/[^a-zA-Z0-9]/-/g')
ACTIVE_ID=$(find "$CUR_PROJ" -maxdepth 1 -name '*.jsonl' -printf '%T@ %f\n' 2>/dev/null | sort -rn | awk 'NR==1{sub(/^[^ ]+ /,""); sub(/\.jsonl$/,""); print}')
echo "aktif olabilir: ${CLAUDE_SESSION_ID:-${ACTIVE_ID:-<yok>}}"
```

`$CLAUDE_SESSION_ID` set ise onu tercih et. Bu id'yi listede "aktif — silinemez" diye
işaretle ve **seçeneklerden çıkar**.

## Adım 1 — Hangi proje?

$ARGUMENTS içinde bir proje verilmişse onu kullan. Yoksa projeleri listele:

```bash
for d in ~/.claude/projects/*/; do
  n=$(find "$d" -maxdepth 1 -name '*.jsonl' 2>/dev/null | wc -l)
  [ "$n" -eq 0 ] && continue
  last=$(find "$d" -maxdepth 1 -name '*.jsonl' -printf '%TY-%Tm-%Td %TH:%TM\n' 2>/dev/null | sort -r | head -1)
  printf '%s\t%s oturum\tson: %s\n' "$(basename "$d")" "$n" "$last"
done | sort -t"$(printf '\t')" -k3 -r
```

Okunur bir tablo yap (proje dizini, oturum sayısı, son değişiklik). Proje dizin adı gerçek
yolun `/` → `-` kodlanmış hâlidir; istersen bir oturumun `cwd`'sinden gerçek yolu okuyup da
göster. `AskUserQuestion` ile hangi projeden sileceğini sor; en son değişeni ilk seçenek
yap, "(Önerilen)" ekle.

## Adım 2 — Hangi oturum(lar)?

Seçilen projedeki oturumları listele:

```bash
PDIR=~/.claude/projects/<seçilen-proje>
find "$PDIR" -maxdepth 1 -name '*.jsonl' -printf '%TY-%Tm-%Td %TH:%TM  %8s bayt  %f\n' 2>/dev/null | sort -r
```

Tarih, boyut ve session-id (dosya adından `.jsonl` çıkar) ile okunur bir tablo yap. Çok
küçük dosyaları (örn. < 2 KB) "boş olabilir" diye işaretle. Adım 0'daki **aktif id'yi
"aktif — silinemez" göster ve seçtirme**. Kalanları `AskUserQuestion` ile **çoklu seçim**
(`multiSelect: true`) olarak sun — kullanıcı silmek istediklerini seçsin. 4'ten fazla aday
varsa numaralı liste göster ve hangilerini (id/numara) sileceğini yaz demesini iste.

Hiç oturum seçilmezse dur ("silinecek oturum seçilmedi").

## Adım 3 — Dry-run + son onay

Seçilen id'lerle ne silineceğini göster:

```bash
bash ~/.claude/commands/claude/delete-session.sh <id1> <id2> ... --dry-run
```

Çıktıyı (silinecek dosya/dizinler + boyutlar) net sun. Sonra `AskUserQuestion` ile **son onay** iste:
- **Evet, kalıcı sil** — seçilenleri siler *(geri alınamaz)*
- **Vazgeç** — hiçbir şey yapma

Onay gelmeden **hiçbir şey silme**.

## Adım 4 — Sil

```bash
bash ~/.claude/commands/claude/delete-session.sh <id1> <id2> ...
```

Script bir şey atlarsa (aktif oturum / bulunamayan id) çıktıda görünür — bunu başarı gibi gizleme.

## Adım 5 — Raporla

```
✅ <N> oturum silindi (<toplam boyut>).
```

Atlanan/bulunamayan varsa tek satırla ekle.

## Notlar

- Motor yalnızca `~/.claude/projects/` altında çalışır; `$CLAUDE_SESSION_ID` set ise aktif oturumu reddeder.
- Her oturum için `<id>.jsonl` + varsa `<id>/` (tool-results) dizini birlikte silinir.
- Doğrulamak için: `bash ~/.claude/commands/claude/delete-session.sh --selftest`
- Silme geri alınamaz — mutlaka dry-run + ayrı onay adımından geç.
