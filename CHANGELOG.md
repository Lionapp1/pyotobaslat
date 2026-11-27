# Changelog

## [Unreleased]

### Düzeltmeler
- Kullanılmayan 1300 satırlık eski `extension.ts` kaldırıldı; tek extension giriş noktası kaldı.
- `collectPythonFiles` artık atlanan dizinlerde `break` yerine `continue` kullanıyor; tarama yarım kalmıyor.
- `python -m flake8 check .` / `python -m pylint check .` hataları düzeltildi; araca özgü doğru argümanlar kullanılıyor.
- Güvenlik taraması `pip-audit` ve testler `pytest` eksikse otomatik kuruluyor.
- cProfile ayrıştırıcısı beşinci sütunu doğru işliyor; webview verileri HTML/script enjeksiyonuna karşı kaçılıyor.
- Eksik paket onarımı yalnızca eşleştirme listesindeki paketleri kuruyor; bilinmeyen modüller PyPI'a gönderilmiyor.
- Sanal ortam yoksa global Python'a paket kurulması engellendi.

### Değişiklikler
- Tüm komutlar `execFile` ile kabuk yorumlaması olmadan çalıştırılıyor; özel pip kaynağı http/https ile sınırlanıyor.
- VS Code varsayılanlarıyla çakışan `F5`, `Ctrl+Shift+S/T/H/F5` kısayolları kaldırıldı; `Ctrl+Alt+R` ve `Ctrl+Alt+D` eklendi.
- `.gitignore` ve Python yorumlayıcısı güncellemeleri ayarla kontrol ediliyor ve çıktı panelinde loglanıyor.
- Hata istatistikleri komutu artık gerçek istatistik panelini açıyor; Project Doctor ayrı bir komut.
- Görsel sağlık raporu ve .env şablon sihirbazı etkin implementasyona taşındı.
- CI: testler sürüm artışından önce çalışıyor, release job yalnızca doğrulama sonrası tetikleniyor; VSIX test dosyaları içermediği de doğrulanıyor.
- Birim testler eklendi (`npm test`).

## [1.3.2] - 2026-08-09
### Eklenenler
- ⚡ Görsel performans raporu (Webview panel)
- 🌍 .env sihirbazı (ortam değişkeni tarama)
- 🔒 Güvenlik açığı taraması (pip-audit)
- 📝 Otomatik .gitignore oluşturma
- 🖥️ Terminal yeniden kullanım desteği

### Düzeltmeler
- JSON anahtarlarındaki boşluk hataları giderildi
- Paket taraması artık alt klasörleri de tarıyor (asenkron)
- Ctrl+Shift+P kısayol çakışması giderildi

### Genişletilen Hata Sözlüğü
- RecursionError, MemoryError, UnicodeDecodeError, TimeoutError eklendi

## [1.2.1] - 2026-08-01
- İlk kararlı sürüm
