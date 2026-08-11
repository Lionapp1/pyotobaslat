# PyOtoBaşlat

> Türkçe, otomatik ve güvenli Python proje yardımcısı for VS Code.

[![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)
[![Python](https://img.shields.io/badge/Python-3.7%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![CI](https://github.com/Lionapp1/pyotobaslat/actions/workflows/ci.yml/badge.svg)](https://github.com/Lionapp1/pyotobaslat/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-111827.svg)](LICENSE)

PyOtoBaşlat, Python projelerini VS Code içinde hazırlamak, çalıştırmak, teşhis etmek ve güvenli şekilde iyileştirmek için tasarlanmış bir yardımcıdır. `.venv` oluşturma, bağımlılık onarımı, Project Doctor, güvenlik taraması, test ve kod kalitesi kontrollerini tek akışta birleştirir.

## Özellikler

| Özellik | Ne yapar? |
| --- | --- |
| **Projeyi Hazırla ve Çalıştır** | `.venv` oluşturur, pip araçlarını günceller, bağımlılıkları kurar, eksik importları onarır ve projeyi başlatır. |
| **Project Doctor** | Python dosyalarını, framework'ü, ortamı, manifestleri, importları ve temel proje risklerini raporlar. |
| **Eksik Paket Onarımı** | Gerçek `.venv` içinde import kontrolü yapar; güvenli import → PyPI eşleşmelerini otomatik kurar. |
| **Python Kodunu Güvenli Düzelt** | Ruff ile güvenli otomatik düzeltmeleri uygular ve ardından `compileall` ile syntax kontrolü yapar. |
| **Çalışma Zamanı Onarımı** | `ModuleNotFoundError` oluştuğunda güvenli eşleşme varsa `.venv` içine paketi kurup tekrar dener. |
| **Güvenlik Taraması** | `pip-audit` ile bağımlılık güvenlik kontrolleri yapar. |
| **Test Çalıştırıcı** | Projenin `.venv` Python'u üzerinden pytest veya unittest çalıştırır. |
| **Kod Kalitesi** | Ruff, Flake8 veya Pylint ile kod kalitesini kontrol eder. |
| **Performans Analizi** | cProfile ile performans verisi toplar. |
| **Framework Algılama** | Django, Flask, FastAPI ve Streamlit projelerini algılar. |

## Güvenli otomatik düzeltme

PyOtoBaşlat her Python dosyasını rastgele değiştirmez. Otomatik düzeltme yalnızca güvenli ve deterministik araçlarla yapılır:

1. Proje ve `.venv` hazırlanır.
2. Import edilen bağımlılıklar gerçek Python yorumlayıcısıyla kontrol edilir.
3. Bilinen paket eşleşmeleri `.venv` içine kurulur.
4. Ruff `--fix` ile güvenli düzeltmeler uygulanır.
5. `python -m compileall` ile syntax tekrar doğrulanır.
6. Çalıştırma sırasında eksik modül hatası oluşursa güvenli paket eşleşmesiyle onarım denenir.

Proje içindeki yerel modüller PyPI'ya gönderilmez; yalnızca tanımlı güvenli paket eşleşmeleri otomatik kurulur.

## Kurulum

1. VS Code'da **Extensions** panelini açın.
2. **PyOtoBaşlat** aratın ve eklentiyi kurun.
3. Bir Python proje klasörü açın.
4. Python dosyanız açıkken `F5` ile hazırlama ve çalıştırmayı başlatın.

### Komutlar

- `PyOtoBaşlat: Projeyi Hazırla ve Çalıştır`
- `PyOtoBaşlat: Python Kodunu Güvenli Düzelt`
- `PyOtoBaşlat: Project Doctor Raporu`
- `PyOtoBaşlat: Eksik Paketleri Kur`
- `PyOtoBaşlat: Güvenlik Açığı Tara`
- `PyOtoBaşlat: Testleri Çalıştır`
- `PyOtoBaşlat: Kod Kalitesi Kontrolü`

Komutlardaki görseller emoji değil, VS Code'un yerleşik **Codicon** ikonlarıdır. Bu sayede açık/koyu temalarda ve farklı platformlarda tutarlı görünürler.

## Bağımlılık ve `.venv` davranışı

PyOtoBaşlat mümkün olduğunda proje için oluşturduğu `.venv` Python yorumlayıcısını kullanır. `requirements.txt` varsa onu kurar; ardından kaynak kodundaki bilinen üçüncü taraf importlarını gerçek ortamda kontrol eder. Eksik paketler yalnızca bu `.venv` içine kurulur.

PyOtoBaşlat global Python ortamını gereksiz yere kirletmemeye çalışır.

## Sürüm ve VSIX

Sürümleme `main` build'inde otomatik patch artırımıyla yapılır. `package.json` ve `package-lock.json` birlikte güncellenir. Ardından aynı sürümle VSIX paketlenir ve doğrulanır.

Örnek:

`2.1.7` → `2.1.8` → `pyotobaslat-2.1.8.vsix` → `v2.1.8` Release

PR build'leri doğrulama içindir; sürüm artırmaz.

## Gereksinimler

- VS Code `1.85+`
- Python `3.7+`
- İnternet bağlantısı, eksik Python paketlerinin PyPI'dan kurulması gerektiğinde

## Lisans

MIT License. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.

## Proje

Kaynak kodu, sorun bildirme ve geliştirme süreci için [GitHub deposuna](https://github.com/Lionapp1/pyotobaslat) göz atabilirsiniz.
