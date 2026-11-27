# PyOtoBaşlat

> Türkçe, otomatik ve güvenli Python proje yardımcısı for VS Code.

[![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/) [![Python](https://img.shields.io/badge/Python-3.7%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/) [![CI](https://github.com/Lionapp1/pyotobaslat/actions/workflows/ci.yml/badge.svg)](https://github.com/Lionapp1/pyotobaslat/actions/workflows/ci.yml) [![License](https://img.shields.io/badge/license-MIT-111827.svg)](LICENSE)

PyOtoBaşlat, Python projelerini VS Code içinde hazırlamak, çalıştırmak, teşhis etmek ve güvenli şekilde iyileştirmek için tasarlanmış bir yardımcıdır. `.venv` oluşturma, bağımlılık onarımı, Project Doctor, güvenlik taraması, test ve kod kalitesi kontrollerini tek akışta birleştirir.

## Özellikler

| Özellik | Ne yapar? |
| --- | --- |
| **Projeyi Hazırla ve Çalıştır** | `.venv` oluşturur, pip araçlarını günceller, `requirements.txt` kurar, eksik importları doğrular, güvenli düzeltmeleri uygular ve projeyi başlatır. |
| **Project Doctor** | Python dosyalarını, framework'ü, manifestleri, importları, ortam değişkenlerini ve temel proje risklerini Markdown raporu olarak açar. |
| **Proje Sağlık Raporu** | Python sürümü, sanal ortam, paketler, güncellik, testler ve `.env` durumunu görsel panelde gösterir. |
| **Eksik Paket Onarımı** | Gerçek `.venv` Python'u ile `importlib.util.find_spec` kontrolü yapar; yalnızca bilinen paket eşleşmelerini kurar. |
| **Python Kodunu Güvenli Düzelt** | Ruff ile güvenli otomatik düzeltmeleri uygular, ardından `compileall` ile syntax kontrolü yapar. |
| **Kurulum Hatası Onarımı** | Eksik modül veya derleme aracı hatalarında güvenli eşleşme varsa paketi kurar ya da pip araçlarını güncelleyip tekrar dener. |
| **Güvenlik Taraması** | `pip-audit` ile bağımlılık güvenlik kontrolleri yapar. |
| **Test Çalıştırıcı** | Projenin `.venv` Python'u üzerinden pytest veya unittest çalıştırır. |
| **Kod Kalitesi** | Ruff, Flake8 veya Pylint ile kod kalitesini kontrol eder (araca göre doğru komut kullanılır). |
| **Performans Analizi** | cProfile verisini sıralanabilir görsel rapora dönüştürür. |
| **Hata İstatistikleri** | Oluşan hataları yerel olarak kaydeder ve görsel panelde özetler. |
| **Framework Algılama** | Django, Flask, FastAPI ve Streamlit projelerini algılar. |

## Güvenli otomatik düzeltme

PyOtoBaşlat her Python dosyasını rastgele değiştirmez:

1. Proje ve `.venv` hazırlanır; pip, setuptools ve wheel güncellenir.
2. Importlar gerçek sanal ortam Python'u ile doğrulanır.
3. Yalnızca açık eşleştirme listesindeki paketler kurulur.
4. Ruff `--fix` ile güvenli düzeltmeler uygulanır.
5. `python -m compileall` ile syntax tekrar doğrulanır.
6. Bir kurulum hatası oluşursa güvenli eşleşme varsa onarım yapılıp işlem tekrarlanır.
7. Kaydedilmemiş Python dosyaları varsa düzeltme öncesi sorulur; dosyalar kaydedilip devam edilebilir.

Proje içindeki yerel modüller PyPI'a gönderilmez. Tüm süreçler `execFile` ile, kabuk yorumlaması olmadan çalıştırılır. FastAPI ve Flask için modül adı giriş dosyasından türetilir (`api.py` → `api:app`).

## Kurulum

1. VS Code'da **Extensions** panelini açın.
2. **PyOtoBaşlat** aratın ve eklentiyi kurun.
3. Bir Python proje klasörü açın.
4. Python dosyası açıkken **Ctrl+Alt+R** ile hazırlama ve çalıştırmayı başlatın.

### Komutlar

Komut Paleti (`Ctrl+Shift+P`) üzerinden erişilebilir:

- `PyOtoBaşlat: Projeyi Hazırla ve Çalıştır` — **Ctrl+Alt+R**
- `PyOtoBaşlat: Python Kodunu Güvenli Düzelt`
- `PyOtoBaşlat: Project Doctor Raporu` — **Ctrl+Alt+D**
- `PyOtoBaşlat: Proje Sağlık Raporu (Görsel)`
- `PyOtoBaşlat: Eksik Paketleri Kur`
- `PyOtoBaşlat: Güvenlik Açığı Tara`
- `PyOtoBaşlat: Testleri Çalıştır`
- `PyOtoBaşlat: Kod Kalitesi Kontrolü`
- `PyOtoBaşlat: Performans Analizi`
- `PyOtoBaşlat: Hata İstatistikleri`
- `PyOtoBaşlat: Ortamı Temizle`
- `PyOtoBaşlat: Ayarları Aç`

Komutlardaki görseller emoji değil, VS Code'un yerleşik **Codicon** ikonlarıdır. Kısayollar VS Code varsayılanlarıyla çakışmayacak şekilde seçilmiştir.

## Bağımlılık ve `.venv` davranışı

PyOtoBaşlat kurulum, test, kalite ve güvenlik araçlarını **yalnızca projenin sanal ortamında** çalıştırır. `.venv` yoksa oluşturur; `venvOtomatikOlustur` ayarı kapatılmışsa mevcut sanal ortam zorunludur ve global Python'a paket kurulmaz.

`requirements.txt` varsa kurulur; ardından kaynak koddaki bilinen üçüncü taraf importları gerçek ortamda kontrol edilir. Eksik paketler yalnızca bu `.venv` içine kurulur ve isteğe bağlı olarak `requirements.txt`'e eklenir.

`.gitignore` ve VS Code Python yorumlayıcısı ayarları, ilgili ayarlar açıksa güncellenir; her iki davranış da **PyOtoBaşlat Ayarları** üzerinden kapatılabilir.

## Geliştirme

```bash
npm ci
npm test        # TypeScript derleme + birim testler
npm run vsix    # Testleri paket dışında bırakıp VSIX oluşturur
```

CI, PR'larda derleme ve testleri çalıştırır; `main` üzerine gönderimde testler geçtikten sonra patch sürümü artırılır, VSIX paketlenir, doğrulanır ve aynı sürümle Release oluşturulur.

## Gereksinimler

- VS Code `1.85+`
- Python `3.7+`
- İnternet bağlantısı, eksik Python paketlerinin PyPI'dan kurulması gerektiğinde

## Lisans

MIT License. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.

## Proje

Kaynak kodu, sorun bildirme ve geliştirme süreci için [GitHub deposuna](https://github.com/Lionapp1/pyotobaslat) göz atabilirsiniz.
