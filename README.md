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

## 📦 Sürüm sistemi

Pull request Actions çalışmaları sürüm artırmaz; bunlar yalnızca doğrulama build'leridir. Gerçek sürümleme `main` dalına geçişte yapılır.

`main` build'i patch sürümünü artırır. `package.json` ve `package-lock.json` birlikte güncellenir. Aynı sürümle VSIX oluşturulur ve CI, VSIX dosya adını ve içindeki `extension/package.json` sürümünü doğrular.

Başarılı bir `main` build'i `vX.Y.Z` Git tag'i ve GitHub Release oluşturur; VSIX release'e eklenir.

Örnek: `2.1.5` → `2.1.6` → `pyotobaslat-2.1.6.vsix`.

## 🚀 Kurulum

1. VS Code Eklentiler panelinde "PyOtoBaşlat" arayın
2. Kurun ve bir Python klasörü açın
3. F5'e basın veya PyOtoBaşlat komutlarını kullanın

## 📋 Gereksinimler

- Python 3.7+
- VS Code 1.85+

## 📝 Lisans

[MIT](LICENSE)
