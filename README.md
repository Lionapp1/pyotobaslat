# 🐍 PyOtoBaşlat - Türkçe Python Sihirbazı

Python projelerini tek tuşla otomatik kurar, venv oluşturur, hataları Türkçeleştirir, görsel performans analizi yapar, .env sihirbazı sunar, güvenlik taraması yapar ve bağımlılıkları akıllıca yönetir.

## ✨ Özellikler

- 🚀 **Tek Tuşla Başlatma** (F5) — Django, Flask, FastAPI otomatik algılama
- 🩺 **Project Doctor** — proje yapısını, ortamı, bağımlılıkları ve temel sorunları tek raporda kontrol eder
- 📦 **Akıllı Paket Yönetimi** — Import edilen ama kurulu olmayan paketleri bulur
- 🇹🇷 **Türkçe Hata Sözlüğü** — hata açıklaması + çözüm önerileri
- ⚡ **Görsel Performans Analizi** — cProfile sonuçlarını Webview'de gösterir
- 🌍 **.env Sihirbazı** — koddaki ortam değişkenlerini tarar, şablon oluşturur
- 🔒 **Güvenlik Taraması** — pip-audit ile CVE kontrolü
- 📝 **Otomatik .gitignore** — Python standartlarını uygular
- 🧪 **Test Çalıştırıcı** — pytest veya unittest
- ✨ **Kod Kalitesi** — Ruff, Flake8 veya Pylint

## 🚀 Kurulum

1. VS Code Eklentiler panelinde "PyOtoBaşlat" arayın
2. Kurun ve bir Python klasörü açın
3. F5'e basın veya PyOtoBaşlat komutlarını kullanın

## 📦 Sürüm ve VSIX

`main` dalına yapılan yayınlanabilir değişikliklerde CI patch sürümünü otomatik artırır. Örneğin `2.1.5` → `2.1.6`.

CI aynı sürümü üç yerde doğrular:

- `package.json`
- VSIX dosya adı
- VSIX içindeki `extension/package.json`

Başarılı `main` build'i ayrıca `vX.Y.Z` Git tag'i ve GitHub Release oluşturur; VSIX Release'e eklenir.

Pull request build'leri sürüm artırmaz. PR artifact'ı yalnızca doğrulama amaçlıdır; gerçek sürüm `main` yayınında üretilir.

## ⚙️ Ayarlar

VS Code ayarlarından `PyOtoBaşlat` araması yaparak tüm seçenekleri özelleştirebilirsiniz.

## 📋 Gereksinimler

- Python 3.7+
- VS Code 1.85+

## 📝 Lisans

[MIT](LICENSE)
