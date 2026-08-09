import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ==================== LOGGING ====================
let logChannel: vscode.OutputChannel;
function log(mesaj: string, seviye: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
    const zaman = new Date().toLocaleTimeString('tr-TR');
    if (logChannel) { logChannel.appendLine(`[${zaman}] [${seviye}] ${mesaj}`); }
}

// ==================== PAKET EŞLEŞTİRME (TEKRARSIZ) ====================
const PAKET_ESLESTIRME: Record<string, string> = {
    // PyQt6 ailesi
    'PyQt6': 'PyQt6',
    'PyQt6.QtWebEngineWidgets': 'PyQt6-WebEngine',
    'PyQt6.QtWebEngineCore': 'PyQt6-WebEngine',
    'PyQt6.QtWebChannel': 'PyQt6-WebEngine',
    'PyQt6.QtMultimedia': 'PyQt6-Multimedia',
    'PyQt6.QtCharts': 'PyQt6-Charts',
    'PyQt6.Qt3DCore': 'PyQt6-3D',
    'PyQt6.QtDataVisualization': 'PyQt6-DataVisualization',
    'PyQt6.QtNetworkAuth': 'PyQt6-NetworkAuth',
    'PyQt6.QtQuick3D': 'PyQt6-Quick3D',
    'PyQt6.QtRemoteObjects': 'PyQt6-RemoteObjects',
    'PyQt6.QtScxml': 'PyQt6-Scxml',
    'PyQt6.QtSensors': 'PyQt6-Sensors',
    'PyQt6.QtSerialPort': 'PyQt6-SerialPort',
    // PyQt5 / PySide
    'PyQt5': 'PyQt5',
    'PyQt5.QtWebEngineWidgets': 'PyQtWebEngine',
    'PySide6': 'PySide6',
    'PySide2': 'PySide2',
    // Görüntü işleme
    'cv2': 'opencv-python',
    'cv': 'opencv-python',
    'skimage': 'scikit-image',
    'PIL': 'Pillow',
    // Makine öğrenmesi
    'sklearn': 'scikit-learn',
    'np': 'numpy',
    'pd': 'pandas',
    'tf': 'tensorflow',
    'torch': 'torch',
    'torchvision': 'torchvision',
    'torchaudio': 'torchaudio',
    'keras': 'keras',
    'xgboost': 'xgboost',
    'lightgbm': 'lightgbm',
    'catboost': 'catboost',
    // Web kazıma
    'bs4': 'beautifulsoup4',
    'lxml': 'lxml',
    'scrapy': 'Scrapy',
    'selenium': 'selenium',
    'playwright': 'playwright',
    // Config/env
    'yaml': 'pyyaml',
    'dotenv': 'python-dotenv',
    'toml': 'toml',
    'tomllib': 'tomli',
    // Auth/JWT
    'jwt': 'PyJWT',
    'jose': 'python-jose',
    'Crypto': 'pycryptodome',
    'Cryptodome': 'pycryptodome',
    'OpenSSL': 'pyOpenSSL',
    'nacl': 'PyNaCl',
    'bcrypt': 'bcrypt',
    'passlib': 'passlib',
    // Serial/USB
    'serial': 'pyserial',
    'usb': 'pyusb',
    // GUI
    'gi': 'PyGObject',
    'wx': 'wxPython',
    'kivy': 'kivy',
    'customtkinter': 'customtkinter',
    'PySimpleGUI': 'PySimpleGUI',
    'streamlit': 'streamlit',
    'gradio': 'gradio',
    // PDF/Doc/Excel
    'fitz': 'PyMuPDF',
    'docx': 'python-docx',
    'pptx': 'python-pptx',
    'openpyxl': 'openpyxl',
    'xlrd': 'xlrd',
    'xlsxwriter': 'XlsxWriter',
    'reportlab': 'reportlab',
    'fpdf': 'fpdf2',
    'weasyprint': 'weasyprint',
    'pdfkit': 'pdfkit',
    'xhtml2pdf': 'xhtml2pdf',
    'pikepdf': 'pikepdf',
    'PyPDF2': 'PyPDF2',
    'pypdf': 'pypdf',
    'pdfminer': 'pdfminer.six',
    'pdfplumber': 'pdfplumber',
    'camelot': 'camelot-py',
    'tabula': 'tabula-py',
    // Bio
    'Bio': 'biopython',
    // Tarih/saat
    'dateutil': 'python-dateutil',
    'pytz': 'pytz',
    'arrow': 'arrow',
    'pendulum': 'pendulum',
    // Ağ/HTTP
    'requests': 'requests',
    'httpx': 'httpx',
    'aiohttp': 'aiohttp',
    'urllib3': 'urllib3',
    'dns': 'dnspython',
    'socks': 'PySocks',
    'paramiko': 'paramiko',
    'fabric': 'fabric',
    'scp': 'scp',
    'netmiko': 'netmiko',
    // Veritabanı
    'psycopg2': 'psycopg2-binary',
    'MySQLdb': 'mysqlclient',
    'pymysql': 'PyMySQL',
    'cx_Oracle': 'cx_Oracle',
    'redis': 'redis',
    'pymongo': 'pymongo',
    'motor': 'motor',
    'elasticsearch': 'elasticsearch',
    'sqlalchemy': 'SQLAlchemy',
    'peewee': 'peewee',
    // Django eklentileri
    'rest_framework': 'djangorestframework',
    'django_filters': 'django-filter',
    'django_cors_headers': 'django-cors-headers',
    'django_extensions': 'django-extensions',
    'django_debug_toolbar': 'django-debug-toolbar',
    'django_storages': 'django-storages',
    'django_redis': 'django-redis',
    'allauth': 'django-allauth',
    'drf_yasg': 'drf-yasg',
    'drf_spectacular': 'drf-spectacular',
    // Flask eklentileri
    'flask_restx': 'flask-restx',
    'flask_cors': 'flask-cors',
    'flask_sqlalchemy': 'flask-sqlalchemy',
    'flask_migrate': 'flask-migrate',
    'flask_login': 'flask-login',
    'flask_wtf': 'flask-wtf',
    'flask_mail': 'flask-mail',
    'flask_jwt_extended': 'flask-jwt-extended',
    'sqlmodel': 'sqlmodel',
    // Windows
    'win32api': 'pywin32',
    'win32com': 'pywin32',
    'win32gui': 'pywin32',
    'win32con': 'pywin32',
    'pythoncom': 'pywin32',
    'wmi': 'WMI',
    'comtypes': 'comtypes',
    'keyboard': 'keyboard',
    'mouse': 'mouse',
    'pyautogui': 'pyautogui',
    'pynput': 'pynput',
    // Git
    'git': 'GitPython',
    // Diğer popüler paketler
    'attr': 'attrs',
    'magic': 'python-magic',
    'telegram': 'python-telegram-bot',
    'socketio': 'python-socketio',
    'engineio': 'python-engineio',
    'apscheduler': 'APScheduler',
    'prometheus_client': 'prometheus-client',
    'sentry_sdk': 'sentry-sdk',
    'googletrans': 'googletrans',
    'speech_recognition': 'SpeechRecognition',
    'gtts': 'gTTS',
    'whisper': 'openai-whisper',
    'openai': 'openai',
    'anthropic': 'anthropic',
    'langchain': 'langchain',
    'huggingface_hub': 'huggingface-hub',
    'transformers': 'transformers',
    'datasets': 'datasets',
    'sentence_transformers': 'sentence-transformers',
    'chromadb': 'chromadb',
    'pinecone': 'pinecone-client',
    'faiss': 'faiss-cpu',
    'spacy': 'spacy',
    'nltk': 'nltk',
    'gensim': 'gensim',
    'textblob': 'textblob',
    'tqdm': 'tqdm',
    'rich': 'rich',
    'click': 'click',
    'typer': 'typer',
    'fire': 'fire',
    'colorama': 'colorama',
    'psutil': 'psutil',
    'GPUtil': 'GPUtil',
    'pynvml': 'nvidia-ml-py',
    'cpuinfo': 'py-cpuinfo',
    'distro': 'distro',
    'babel': 'babel',
    'polib': 'polib',
    'curses': 'windows-curses',
    'mpl_toolkits': 'matplotlib',
    'matplotlib': 'matplotlib',
    'seaborn': 'seaborn',
    'plotly': 'plotly',
    'bokeh': 'bokeh',
    'dash': 'dash',
    'networkx': 'networkx',
    'igraph': 'python-igraph',
    'graphviz': 'graphviz',
    'sympy': 'sympy',
    'scipy': 'scipy',
    'statsmodels': 'statsmodels',
    'prophet': 'prophet',
    'h5py': 'h5py',
    'tables': 'tables',
    'zarr': 'zarr',
    'netCDF4': 'netCDF4',
    'geopandas': 'geopandas',
    'shapely': 'shapely',
    'fiona': 'fiona',
    'rasterio': 'rasterio',
    'folium': 'folium',
    'geopy': 'geopy',
    'librosa': 'librosa',
    'soundfile': 'soundfile',
    'pydub': 'pydub',
    'pygame': 'pygame',
    'arcade': 'arcade',
    'pyglet': 'pyglet',
    'moderngl': 'moderngl',
    'vispy': 'vispy',
    'docker': 'docker',
    'kubernetes': 'kubernetes',
    'boto3': 'boto3',
    'botocore': 'botocore',
    'celery': 'celery',
    'pika': 'pika',
    'rq': 'rq',
    'huey': 'huey',
    'dramatiq': 'dramatiq',
    'arq': 'arq',
    'prefect': 'prefect',
    'airflow': 'apache-airflow',
    'luigi': 'luigi',
    'mlflow': 'mlflow',
    'wandb': 'wandb',
    'optuna': 'optuna',
    'hyperopt': 'hyperopt',
    'ray': 'ray',
    'dask': 'dask',
    'joblib': 'joblib',
    'numba': 'numba',
    'cython': 'cython',
    'cffi': 'cffi',
    'pybind11': 'pybind11',
    'pytest': 'pytest',
    'mock': 'mock',
    'coverage': 'coverage',
    'tox': 'tox',
    'nox': 'nox',
    'mypy': 'mypy',
    'pylint': 'pylint',
    'flake8': 'flake8',
    'ruff': 'ruff',
    'black': 'black',
    'autopep8': 'autopep8',
    'isort': 'isort',
    'bandit': 'bandit',
    'pip_audit': 'pip-audit',
    'safety': 'safety',
    'jupyter': 'jupyter',
    'notebook': 'notebook',
    'ipywidgets': 'ipywidgets',
    'nbformat': 'nbformat',
    'papermill': 'papermill',
    'sphinx': 'sphinx',
    'mkdocs': 'mkdocs',
    'pelican': 'pelican',
    'websockets': 'websockets',
    'uvloop': 'uvloop',
    'trio': 'trio',
    'anyio': 'anyio',
    'gevent': 'gevent',
    'eventlet': 'eventlet',
    'twisted': 'twisted',
    'scapy': 'scapy',
    'nmap': 'python-nmap',
    'whois': 'python-whois',
    'qrcode': 'qrcode',
    'segno': 'segno',
    'pyzbar': 'pyzbar',
    'barcode': 'python-barcode',
    'mediapipe': 'mediapipe',
    'dlib': 'dlib',
    'face_recognition': 'face-recognition',
    'deepface': 'deepface',
    'ultralytics': 'ultralytics',
    'detectron2': 'detectron2',
    'mmdet': 'mmdet',
    'yolov5': 'yolov5',
    'stable_baselines3': 'stable-baselines3',
    'gym': 'gymnasium',
    'gymnasium': 'gymnasium',
    'pettingzoo': 'pettingzoo',
    'jax': 'jax',
    'jaxlib': 'jaxlib',
    'flax': 'flax',
    'optax': 'optax',
    'haiku': 'dm-haiku',
    'sonnet': 'dm-sonnet',
    'tensorboard': 'tensorboard',
    'tensorboardX': 'tensorboardX',
    'onnx': 'onnx',
    'onnxruntime': 'onnxruntime',
    'openvino': 'openvino',
    'tflite_runtime': 'tflite-runtime',
    'sentencepiece': 'sentencepiece',
    'tokenizers': 'tokenizers',
    'accelerate': 'accelerate',
    'peft': 'peft',
    'trl': 'trl',
    'diffusers': 'diffusers',
    'cohere': 'cohere',
    'elevenlabs': 'elevenlabs',
    'vosk': 'vosk',
    'deepspeech': 'deepspeech',
    'faster_whisper': 'faster-whisper',
    'TTS': 'TTS',
    'bark': 'bark'
};

// Ters eşleştirme: pip paket adı -> import adı (TEKRARSIZ)
const TERS_ESLESTIRME: Record<string, string> = {
    'opencv-python': 'cv2',
    'opencv-python-headless': 'cv2',
    'scikit-image': 'skimage',
    'Pillow': 'PIL',
    'scikit-learn': 'sklearn',
    'beautifulsoup4': 'bs4',
    'Scrapy': 'scrapy',
    'pyyaml': 'yaml',
    'python-dotenv': 'dotenv',
    'tomli': 'tomllib',
    'PyJWT': 'jwt',
    'python-jose': 'jose',
    'pycryptodome': 'Crypto',
    'pyOpenSSL': 'OpenSSL',
    'PyNaCl': 'nacl',
    'pyserial': 'serial',
    'pyusb': 'usb',
    'PyGObject': 'gi',
    'wxPython': 'wx',
    'PyMuPDF': 'fitz',
    'python-docx': 'docx',
    'python-pptx': 'pptx',
    'XlsxWriter': 'xlsxwriter',
    'fpdf2': 'fpdf',
    'pdfminer.six': 'pdfminer',
    'camelot-py': 'camelot',
    'tabula-py': 'tabula',
    'biopython': 'Bio',
    'python-dateutil': 'dateutil',
    'dnspython': 'dns',
    'PySocks': 'socks',
    'psycopg2-binary': 'psycopg2',
    'mysqlclient': 'MySQLdb',
    'PyMySQL': 'pymysql',
    'SQLAlchemy': 'sqlalchemy',
    'djangorestframework': 'rest_framework',
    'django-filter': 'django_filters',
    'django-cors-headers': 'django_cors_headers',
    'django-extensions': 'django_extensions',
    'django-debug-toolbar': 'django_debug_toolbar',
    'django-storages': 'django_storages',
    'django-redis': 'django_redis',
    'django-allauth': 'allauth',
    'drf-yasg': 'drf_yasg',
    'drf-spectacular': 'drf_spectacular',
    'flask-restx': 'flask_restx',
    'flask-cors': 'flask_cors',
    'flask-sqlalchemy': 'flask_sqlalchemy',
    'flask-migrate': 'flask_migrate',
    'flask-login': 'flask_login',
    'flask-wtf': 'flask_wtf',
    'flask-mail': 'flask_mail',
    'flask-jwt-extended': 'flask_jwt_extended',
    'pywin32': 'win32api',
    'WMI': 'wmi',
    'GitPython': 'git',
    'attrs': 'attr',
    'python-magic': 'magic',
    'python-telegram-bot': 'telegram',
    'python-socketio': 'socketio',
    'python-engineio': 'engineio',
    'APScheduler': 'apscheduler',
    'prometheus-client': 'prometheus_client',
    'sentry-sdk': 'sentry_sdk',
    'SpeechRecognition': 'speech_recognition',
    'gTTS': 'gtts',
    'openai-whisper': 'whisper',
    'huggingface-hub': 'huggingface_hub',
    'sentence-transformers': 'sentence_transformers',
    'pinecone-client': 'pinecone',
    'faiss-cpu': 'faiss',
    'py-cpuinfo': 'cpuinfo',
    'nvidia-ml-py': 'pynvml',
    'windows-curses': 'curses',
    'python-igraph': 'igraph',
    'python-nmap': 'nmap',
    'python-whois': 'whois',
    'python-barcode': 'barcode',
    'face-recognition': 'face_recognition',
    'stable-baselines3': 'stable_baselines3',
    'dm-haiku': 'haiku',
    'dm-sonnet': 'sonnet',
    'faster-whisper': 'faster_whisper',
    'tflite-runtime': 'tflite_runtime',
    'apache-airflow': 'airflow',
    'PyQt6-WebEngine': 'PyQt6.QtWebEngineWidgets',
    'PyQtWebEngine': 'PyQt5.QtWebEngineWidgets',
    'PyQt6-Multimedia': 'PyQt6.QtMultimedia',
    'PyQt6-Charts': 'PyQt6.QtCharts',
    'PyQt6-3D': 'PyQt6.Qt3DCore',
    'PyQt6-DataVisualization': 'PyQt6.QtDataVisualization',
    'PyQt6-NetworkAuth': 'PyQt6.QtNetworkAuth',
    'PyQt6-Quick3D': 'PyQt6.QtQuick3D',
    'PyQt6-RemoteObjects': 'PyQt6.QtRemoteObjects',
    'PyQt6-Scxml': 'PyQt6.QtScxml',
    'PyQt6-Sensors': 'PyQt6.QtSensors',
    'PyQt6-SerialPort': 'PyQt6.QtSerialPort',
    'pip-audit': 'pip_audit'
};

// ==================== STANDART KÜTÜPHANE ====================
const STANDART_KUTUPHANE = new Set([
    'os', 'sys', 'json', 'math', 'datetime', 'time', 'random', 're',
    'collections', 'itertools', 'functools', 'pathlib', 'typing',
    'unittest', 'logging', 'argparse', 'csv', 'sqlite3', 'threading',
    'multiprocessing', 'subprocess', 'shutil', 'glob', 'hashlib',
    'abc', 'io', 'string', 'decimal', 'fractions', 'copy', 'pprint',
    'textwrap', 'struct', 'codecs', 'unicodedata', 'locale', 'gettext',
    'enum', 'dataclasses', 'contextlib', 'warnings', 'traceback',
    'inspect', 'dis', 'ast', 'token', 'tokenize', 'platform', 'signal',
    'socket', 'http', 'urllib', 'email', 'html', 'xml', 'configparser',
    'secrets', 'uuid', 'base64', 'binascii', 'array', 'bisect', 'heapq',
    'queue', 'weakref', 'types', 'pdb', 'profile', 'cProfile', 'timeit',
    'trace', 'gc', 'site', 'builtins', '__future__', 'asyncio', 'concurrent',
    'selectors', 'mmap', 'readline', 'rlcompleter', 'operator', 'keyword',
    'linecache', 'pickle', 'shelve', 'marshal', 'dbm', 'gzip', 'bz2',
    'lzma', 'zipfile', 'tarfile', 'tempfile', 'fnmatch', 'fileinput',
    'stat', 'filecmp', 'fcntl', 'grp', 'pwd', 'resource', 'pty', 'termios',
    'tty', 'crypt', 'ssl', 'ctypes', 'faulthandler', 'symtable',
    'compileall', 'py_compile', 'zipimport', 'pkgutil', 'modulefinder',
    'runpy', 'importlib', 'code', 'codeop', 'numbers', 'statistics',
    'calendar', 'zoneinfo', 'cmath', 'hmac', 'encodings', 'quopri', 'uu',
    'webbrowser', 'cgi', 'cgitb', 'wsgiref', 'xmlrpc', 'ipaddress',
    'mailbox', 'mimetypes', 'smtplib', 'poplib', 'imaplib', 'nntplib',
    'smtpd', 'telnetlib', 'socketserver', 'ftplib', 'sched', 'contextvars',
    'graphlib', 'reprlib', 'difflib', 'stringprep', 'tkinter', 'turtle'
]);

// ==================== HATA SÖZLÜĞÜ & SELF-HEALING ====================
interface HataCozum {
    aciklama: string;
    cozum: string;
    komut?: string;
    healingType?: 'pip_install' | 'pip_upgrade' | 'venv_recreate' | 'build_deps' | 'cache_clear' | 'force_reinstall';
}

const HATA_SOZLUGU: Record<string, HataCozum> = {
    "ModuleNotFoundError": { aciklama: "📦 Eksik Modül: Bu paket/modül yüklü değil.", cozum: "Otomatik kuruyorum...", healingType: 'pip_install' },
    "ImportError": { aciklama: "📥 İçe Aktarma Hatası: Modül bozuk veya eksik.", cozum: "Yeniden kuruyorum...", healingType: 'force_reinstall' },
    "subprocess-exited-with-error": { aciklama: "🔨 Build Hatası: Paket derlenemedi.", cozum: "Build araçlarını güncelliyorum...", healingType: 'build_deps' },
    "Getting requirements to build wheel": { aciklama: "⚙️ Wheel Build Hatası.", cozum: "setuptools/pip güncelleniyor...", healingType: 'build_deps' },
    "Failed building wheel": { aciklama: "🔧 Wheel Derleme Hatası.", cozum: "Build bağımlılıkları kuruluyor...", healingType: 'build_deps' },
    "PermissionError": { aciklama: "🔒 İzin Hatası.", cozum: "Sanal ortam sıfırlanıyor...", healingType: 'venv_recreate' },
    "No matching distribution found": { aciklama: "🔍 Uyumsuz Sürüm.", cozum: "Python sürümünüzü kontrol edin." },
    "Could not find a version that satisfies": { aciklama: "🔍 Uyumsuz Sürüm.", cozum: "Python sürümünüzü kontrol edin." },
    "ReadTimeoutError": { aciklama: "⏱️ Ağ Zaman Aşımı.", cozum: "Ağ bağlantınızı kontrol edin." },
    "ConnectionError": { aciklama: "🌐 Bağlantı Hatası.", cozum: "İnternet bağlantınızı kontrol edin." },
    "ConnectionResetError": { aciklama: "🔄 Bağlantı Sıfırlandı.", cozum: "Sunucu yanıt vermiyor olabilir." },
    "SyntaxError": { aciklama: "✍️ Söz Dizimi Hatası.", cozum: "Satır numarasını kontrol edin." },
    "IndentationError": { aciklama: "↔️ Girinti Hatası.", cozum: "Hizalamayı düzeltin." },
    "NameError": { aciklama: "🏷️ Tanımsız İsim.", cozum: "Değişkeni tanımlayın." },
    "TypeError": { aciklama: "🔄 Tür Hatası.", cozum: "Veri türlerini kontrol edin." },
    "ValueError": { aciklama: "⚠️ Değer Hatası.", cozum: "Doğru değer verin." },
    "FileNotFoundError": { aciklama: "📁 Dosya Bulunamadı.", cozum: "Dosya yolunu kontrol edin." },
    "ZeroDivisionError": { aciklama: "➗ Sıfıra Bölme.", cozum: "Bölen değeri kontrol edin." },
    "AttributeError": { aciklama: "🔧 Nitelik Hatası.", cozum: "Nesne metodlarını kontrol edin." },
    "IndexError": { aciklama: "📋 Liste İndeksi Hatası.", cozum: "Liste uzunluğunu kontrol edin." },
    "KeyError": { aciklama: "🔑 Anahtar Hatası.", cozum: "Anahtarı kontrol edin." },
    "Address already in use": { aciklama: "🚪 Port Meşgul.", cozum: "Farklı portta başlatıyorum...", komut: "port_degistir" },
    "RecursionError": { aciklama: "🔁 Özyineleme Hatası.", cozum: "Sonsuz döngüyü kontrol edin." },
    "MemoryError": { aciklama: "💾 Bellek Yetersiz.", cozum: "RAM kullanımını optimize edin." },
    "UnicodeDecodeError": { aciklama: "🔤 Karakter Kodlama Hatası.", cozum: "encoding='utf-8' kullanın." },
    "UnicodeEncodeError": { aciklama: "🔤 Karakter Kodlama Hatası.", cozum: "encoding='utf-8' kullanın." },
    "TimeoutError": { aciklama: "⏱️ Zaman Aşımı.", cozum: "Bağlantı mantığını kontrol edin." },
    "BrokenPipeError": { aciklama: "🔌 Kırık Boru Hatası.", cozum: "Bağlantıyı kontrol edin." },
    "OSError": { aciklama: "💽 İşletim Sistemi Hatası.", cozum: "Dosya/izin kontrolü yapın." },
    "IOError": { aciklama: "💽 G/Ç Hatası.", cozum: "Dosya yolunu kontrol edin." },
    "EOFError": { aciklama: "🔚 Dosya Sonu Hatası.", cozum: "Girdi akışını kontrol edin." },
    "KeyboardInterrupt": { aciklama: "⌨️ Klavye Kesmesi.", cozum: "Kullanıcı işlemi iptal etti." },
    "StopIteration": { aciklama: "🛑 İterasyon Sonu.", cozum: "Döngü sona erdi." },
    "ArithmeticError": { aciklama: "🔢 Aritmetik Hatası.", cozum: "Matematiksel işlemi kontrol edin." },
    "OverflowError": { aciklama: "🔢 Taşma Hatası.", cozum: "Sayı çok büyük." },
    "LookupError": { aciklama: "🔍 Arama Hatası.", cozum: "İndeks/anahtar kontrolü." },
    "RuntimeError": { aciklama: "⚙️ Çalışma Zamanı Hatası.", cozum: "Kod mantığını kontrol edin." },
    "NotImplementedError": { aciklama: "🚧 Uygulanmamış.", cozum: "Bu metod henüz yazılmamış." },
    "AssertionError": { aciklama: "❓ Doğrulama Hatası.", cozum: "Assert koşulunu kontrol edin." }
};

function turkceHataCozum(hataMesaji: string): { hataTur: string; cozum: HataCozum } | null {
    for (const [hataTur, cozum] of Object.entries(HATA_SOZLUGU)) {
        if (hataMesaji.includes(hataTur)) { return { hataTur, cozum }; }
    }
    return null;
}

// ==================== YARDIMCI FONKSİYONLAR ====================
function runCommand(cmd: string, cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, {
            cwd,
            maxBuffer: 1024 * 1024 * 10,
            shell: process.platform === 'win32' ? undefined : '/bin/bash',
            timeout: 300000
        }, (error, stdout, stderr) => {
            if (error) { reject(new Error(stderr || error.message)); }
            else { resolve(stdout); }
        });
    });
}

function getActivateCmd(isWindows: boolean): string {
    return isWindows ? '.venv\\Scripts\\activate' : '. .venv/bin/activate';
}

function dosyaIcerikKontrol(dizin: string, dosyaAdi: string, kelime: string): boolean {
    try { return fs.readFileSync(path.join(dizin, dosyaAdi), 'utf-8').includes(kelime); }
    catch { return false; }
}

async function importEdilenPaketleriBul(rootPath: string): Promise<string[]> {
    const paketler = new Set<string>();
    try {
        const files = await vscode.workspace.findFiles('**/*.py', '**/{.venv,node_modules,__pycache__,.git,build,dist,env,ENV,site-packages}/**');
        await Promise.all(files.map(async (file) => {
            try {
                const content = await fs.promises.readFile(file.fsPath, 'utf-8');
                const matches = content.match(/^(?:import|from)\s+([\w.]+)/gm) || [];
                for (const match of matches) {
                    const fullMod = match.replace(/^(?:import|from)\s+/, '');
                    const rootPkg = fullMod.split('.')[0];
                    if (!STANDART_KUTUPHANE.has(rootPkg)) {
                        if (PAKET_ESLESTIRME[fullMod]) {
                            paketler.add(PAKET_ESLESTIRME[fullMod]);
                        } else if (PAKET_ESLESTIRME[rootPkg]) {
                            paketler.add(PAKET_ESLESTIRME[rootPkg]);
                        } else {
                            paketler.add(rootPkg);
                        }
                    }
                }
            } catch { /* dosya okunamazsa atla */ }
        }));
    } catch { /* workspace yoksa atla */ }
    return Array.from(paketler);
}

async function eksikPaketleriKontrolEt(rootPath: string, pythonCmd: string): Promise<string[]> {
    const importEdilen = await importEdilenPaketleriBul(rootPath);
    const eksikler: string[] = [];
    for (let i = 0; i < importEdilen.length; i += 5) {
        const chunk = importEdilen.slice(i, i + 5);
        const results = await Promise.allSettled(
            chunk.map(paket => {
                const importAdi = TERS_ESLESTIRME[paket] || paket;
                return runCommand(`${pythonCmd} -c "import ${importAdi}"`, rootPath);
            })
        );
        results.forEach((r, idx) => {
            if (r.status === 'rejected') { eksikler.push(chunk[idx]); }
        });
    }
    return eksikler;
}

function getOrCreateTerminal(name: string): vscode.Terminal {
    return vscode.window.terminals.find(t => t.name === name) || vscode.window.createTerminal(name);
}

function gitignoreOlustur(rootPath: string) {
    const p = path.join(rootPath, '.gitignore');
    if (fs.existsSync(p)) { return; }
    fs.writeFileSync(p, `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Virtual Environment
.venv/
venv/
ENV/
env/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Environment
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db
Desktop.ini

# Logs
*.log

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/
.mypy_cache/
.ruff_cache/

# Jupyter
.ipynb_checkpoints/
`);
}

async function envDegiskenleriniTara(rootPath: string): Promise<string[]> {
    const degiskenler = new Set<string>();
    try {
        const files = await vscode.workspace.findFiles('**/*.py', '**/{.venv,node_modules,__pycache__,.git}/**');
        for (const file of files) {
            try {
                const content = await fs.promises.readFile(file.fsPath, 'utf-8');
                const patterns = [
                    /os\.getenv\(['"](\w+)['"]/g,
                    /os\.environ\.get\(['"](\w+)['"]/g,
                    /os\.environ\[['"](\w+)['"]\]/g,
                    /config\(['"](\w+)['"]\)/g
                ];
                for (const pattern of patterns) {
                    let m;
                    while ((m = pattern.exec(content)) !== null) { degiskenler.add(m[1]); }
                }
            } catch { /* atla */ }
        }
    } catch { /* atla */ }
    return Array.from(degiskenler);
}

// ==================== SELF-HEALING MOTORU ====================
async function otomatikDuzelt(rootPath: string, tip: string, pipCmd: string, pythonCmd: string, progress: vscode.Progress<{ message?: string }>, hataMesaji?: string): Promise<boolean> {
    const ozelPipKaynagi = vscode.workspace.getConfiguration('pyotobaslat').get('ozelPipKaynagi') as string;
    const pipIndexUrl = ozelPipKaynagi ? `--index-url ${ozelPipKaynagi}` : '';
    try {
        switch (tip) {
            case 'pip_install': {
                const paketMatch = hataMesaji?.match(/No module named '([\w.]+)'/);
                if (paketMatch) {
                    const mod = paketMatch[1];
                    const pipPaket = PAKET_ESLESTIRME[mod] || PAKET_ESLESTIRME[mod.split('.')[0]] || mod.split('.')[0];
                    progress.report({ message: `📦 ${pipPaket} kuruluyor...` });
                    log(`${pipPaket} kuruluyor (otomatik düzeltme)`);
                    await runCommand(`${pipCmd} install ${pipPaket} ${pipIndexUrl}`, rootPath);
                    log(`${pipPaket} başarıyla kuruldu`);
                    return true;
                }
                return false;
            }
            case 'force_reinstall': {
                const paketMatch = hataMesaji?.match(/No module named '([\w.]+)'/);
                if (paketMatch) {
                    const mod = paketMatch[1];
                    const pipPaket = PAKET_ESLESTIRME[mod] || PAKET_ESLESTIRME[mod.split('.')[0]] || mod.split('.')[0];
                    progress.report({ message: `🔄 ${pipPaket} yeniden kuruluyor...` });
                    await runCommand(`${pipCmd} install --force-reinstall ${pipPaket} ${pipIndexUrl}`, rootPath);
                    return true;
                }
                return false;
            }
            case 'build_deps':
                progress.report({ message: "🔧 Build araçları güncelleniyor..." });
                await runCommand(`${pipCmd} install --upgrade pip setuptools wheel ${pipIndexUrl}`, rootPath);
                progress.report({ message: "🧹 Pip cache temizleniyor..." });
                await runCommand(`${pipCmd} cache purge`, rootPath);
                return true;
            case 'venv_recreate': {
                progress.report({ message: "♻️ Sanal ortam sıfırlanıyor..." });
                const venvPath = path.join(rootPath, '.venv');
                if (fs.existsSync(venvPath)) { fs.rmSync(venvPath, { recursive: true, force: true }); }
                await runCommand(`${pythonCmd} -m venv .venv`, rootPath);
                progress.report({ message: "📦 Temel paketler kuruluyor..." });
                await runCommand(`${pipCmd} install --upgrade pip setuptools wheel ${pipIndexUrl}`, rootPath);
                return true;
            }
            case 'cache_clear':
                progress.report({ message: "🧹 Pip cache temizleniyor..." });
                await runCommand(`${pipCmd} cache purge`, rootPath);
                return true;
            default:
                return false;
        }
    } catch (e) {
        log(`Self-healing hatası (${tip}): ${e}`, 'ERROR');
        return false;
    }
}

// ==================== HATA İSTATİSTİKLERİ ====================
function hataKaydet(context: vscode.ExtensionContext, hataTur: string, proje: string) {
    if (!vscode.workspace.getConfiguration('pyotobaslat').get('hataIstatistikleriKaydet')) { return; }
    const istatistikler = context.globalState.get<Record<string, { sayi: number; sonTarih: string; proje: string }>>('hataIstatistikleri') || {};
    if (!istatistikler[hataTur]) {
        istatistikler[hataTur] = { sayi: 0, sonTarih: '', proje: '' };
    }
    istatistikler[hataTur].sayi++;
    istatistikler[hataTur].sonTarih = new Date().toLocaleString('tr-TR');
    istatistikler[hataTur].proje = proje;
    context.globalState.update('hataIstatistikleri', istatistikler);
    log(`Hata kaydedildi: ${hataTur} (toplam: ${istatistikler[hataTur].sayi})`);
}

// ==================== WEBVIEW: PERFORMANS RAPORU ====================
function performansRaporuOlustur(profilVerisi: string) {
    const panel = vscode.window.createWebviewPanel('pyotobaslatPerformans', '⚡ Performans Raporu', vscode.ViewColumn.One, { enableScripts: true });
    const satirlar = profilVerisi.split('\n').filter(s => s.trim());
    const baslikIdx = satirlar.findIndex(s => s.includes('ncalls') && s.includes('tottime'));
    const veri = baslikIdx > -1 ? satirlar.slice(baslikIdx + 1).map(s => {
        const p = s.trim().split(/\s+/);
        return p.length >= 5 ? { ncalls: p[0], tottime: parseFloat(p[1]), percall: parseFloat(p[2]), cumtime: parseFloat(p[3]), filename: p.slice(4).join(' ') } : null;
    }).filter(Boolean) : [];

    panel.webview.html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><style>
body{font-family:var(--vscode-font-family);padding:20px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
h2{color:var(--vscode-textLink-foreground)}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:var(--vscode-editorGroupHeader-tabsBackground);padding:10px;text-align:left;cursor:pointer;position:sticky;top:0;user-select:none}
th:hover{background:var(--vscode-list-hoverBackground)}
td{padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border)}
tr:hover{background:var(--vscode-list-hoverBackground)}
.bar{height:6px;background:var(--vscode-progressBar-background);border-radius:3px;margin-top:4px}
.slow{color:var(--vscode-errorForeground);font-weight:bold}
.info{margin-bottom:15px;padding:10px;background:var(--vscode-textBlockQuote-background);border-left:3px solid var(--vscode-textLink-foreground);border-radius:4px}
</style></head><body>
<h2>⚡ Performans Analiz Raporu</h2>
<div class="info">💡 Sütun başlıklarına tıklayarak sıralama yapabilirsiniz. Kırmızı satırlar en çok zaman harcayan fonksiyonlardır.</div>
<table><thead><tr>
<th onclick="sort(0)">📞 Çağrı</th>
<th onclick="sort(1)">⏱️ Toplam (s)</th>
<th onclick="sort(2)">📊 Çağrı Başı (s)</th>
<th onclick="sort(3)">📈 Kümülatif (s)</th>
<th>📄 Dosya / Fonksiyon</th>
</tr></thead><tbody id="tb"></tbody></table>
<script>
const d=${JSON.stringify(veri)};
const mx=Math.max(...d.map(r=>r.cumtime),0.001);
let dir={};
function render(c,a){c=c===undefined?3:c;a=a===undefined?false:a;const s=d.slice().sort(function(x,y){const k=['ncalls','tottime','percall','cumtime'][c];return a?x[k]-y[k]:y[k]-x[k];});
document.getElementById('tb').innerHTML=s.map(function(r){const w=(r.cumtime/mx*100).toFixed(1);const sl=r.tottime>0.1?'slow':'';
return '<tr><td>'+r.ncalls+'</td><td class="'+sl+'">'+r.tottime.toFixed(4)+'</td><td>'+r.percall.toFixed(4)+'</td><td>'+r.cumtime.toFixed(4)+'<div class="bar" style="width:'+w+'%"></div></td><td>'+r.filename+'</td></tr>';}).join('');}
function sort(c){dir[c]=!dir[c];render(c,dir[c]);}
render();
</script></body></html>`;
}

// ==================== WEBVIEW: HATA İSTATİSTİKLERİ ====================
function hataIstatistikleriGoster(context: vscode.ExtensionContext) {
    const istatistikler = context.globalState.get<Record<string, { sayi: number; sonTarih: string; proje: string }>>('hataIstatistikleri') || {};
    const panel = vscode.window.createWebviewPanel('pyotobaslatHataIstatistikleri', '📊 Hata İstatistikleri', vscode.ViewColumn.One, { enableScripts: true });
    const veri = Object.entries(istatistikler).sort((a, b) => b[1].sayi - a[1].sayi);
    let tabloIcerik = '<p>🎉 Henüz kaydedilmiş hata yok!</p>';
    if (veri.length > 0) {
        tabloIcerik = '<table><thead><tr><th>Hata Türü</th><th>Sayı</th><th>Son Tarih</th><th>Proje</th></tr></thead><tbody>' +
            veri.map(([tur, bilgi]) => `<tr><td>${tur}</td><td class="sayi">${bilgi.sayi}</td><td>${bilgi.sonTarih}</td><td>${bilgi.proje}</td></tr>`).join('') +
            '</tbody></table>';
    }
    panel.webview.html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><style>
body{font-family:var(--vscode-font-family);padding:20px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
h2{color:var(--vscode-textLink-foreground)}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:15px}
th{background:var(--vscode-editorGroupHeader-tabsBackground);padding:10px;text-align:left}
td{padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border)}
.sayi{font-weight:bold;color:var(--vscode-textLink-foreground);font-size:16px}
.info{margin:15px 0;padding:10px;background:var(--vscode-textBlockQuote-background);border-left:3px solid var(--vscode-textLink-foreground);border-radius:4px}
</style></head><body>
<h2>📊 Hata İstatistikleri</h2>
<div class="info">💡 En sık karşılaşılan hatalar üstte listelenir. Veriler sadece yerel olarak saklanır.</div>
${tabloIcerik}
</body></html>`;
}

// ==================== WEBVIEW: PROJE SAĞLIK RAPORU ====================
function saglikRaporuGoster(veriler: { kategori: string; durum: 'ok' | 'uyari' | 'hata'; mesaj: string }[]) {
    const panel = vscode.window.createWebviewPanel('pyotobaslatSaglik', '🏥 Proje Sağlık Raporu', vscode.ViewColumn.One, { enableScripts: true });
    const ikonlar: Record<string, string> = { ok: '✅', uyari: '⚠️', hata: '❌' };
    panel.webview.html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><style>
body{font-family:var(--vscode-font-family);padding:20px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
h2{color:var(--vscode-textLink-foreground)}
.item{padding:12px;margin:8px 0;border-radius:6px;border-left:4px solid;display:flex;align-items:center;gap:10px}
.ok{border-color:#4caf50;background:rgba(76,175,80,0.08)}
.uyari{border-color:#ff9800;background:rgba(255,152,0,0.08)}
.hata{border-color:#f44336;background:rgba(244,67,54,0.08)}
.ikon{font-size:20px}
.kategori{font-weight:bold;min-width:160px}
</style></head><body>
<h2>🏥 Proje Sağlık Raporu</h2>
${veriler.map(v => `<div class="item ${v.durum}"><span class="ikon">${ikonlar[v.durum]}</span><span class="kategori">${v.kategori}</span><span>${v.mesaj}</span></div>`).join('')}
</body></html>`;
}

// ==================== ANA EXTENSION ====================
export function activate(context: vscode.ExtensionContext) {
    logChannel = vscode.window.createOutputChannel('🐍 PyOtoBaşlat');
    context.subscriptions.push(logChannel);
    log('PyOtoBaşlat v2.1.3 başlatıldı');

    const config = vscode.workspace.getConfiguration('pyotobaslat');

    // SADECE VENV GÖSTERGESİ (Başlat butonu kaldırıldı)
    const venvGostergesi = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    venvGostergesi.text = "$(loading) Python kontrol ediliyor...";
    venvGostergesi.tooltip = "PyOtoBaşlat: Sanal Ortam Durumu";
    venvGostergesi.command = "pyotobaslat.hazirlaVeCalistir";
    venvGostergesi.show();
    context.subscriptions.push(venvGostergesi);

    async function venvDurumunuGuncelle() {
        const wf = vscode.workspace.workspaceFolders?.[0];
        if (!wf) { venvGostergesi.text = "$(circle-slash) Klasör yok"; return; }
        const rp = wf.uri.fsPath;
        const vp = path.join(rp, '.venv');
        const win = process.platform === 'win32';
        const pc = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
        if (fs.existsSync(vp)) {
            try {
                const v = (await runCommand(`${pc} --version`, rp)).trim().replace('Python ', '');
                venvGostergesi.text = `$(beaker) Python ${v}`;
                venvGostergesi.backgroundColor = undefined;
            } catch {
                venvGostergesi.text = "$(warning) .venv bozuk";
                venvGostergesi.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            }
        } else {
            venvGostergesi.text = "$(circle-slash) venv yok";
            venvGostergesi.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
    }
    venvDurumunuGuncelle();
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => venvDurumunuGuncelle()));
    const wf = vscode.workspace.workspaceFolders?.[0];
    if (wf) { gitignoreOlustur(wf.uri.fsPath); }

    // ==================== 1. HAZIRLA VE ÇALIŞTIR ====================
    const hazirlaKomutu = vscode.commands.registerCommand('pyotobaslat.hazirlaVeCalistir', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Lütfen önce bir Python proje klasörü açın!'); return; }
        const rp = w.uri.fsPath;
        const win = process.platform === 'win32';
        const pc = win ? 'python' : 'python3';
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const vp = path.join(rp, '.venv');
        const req = path.join(rp, 'requirements.txt');
        const act = getActivateCmd(win);

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🐍 PyOtoBaşlat Çalışıyor...", cancellable: false }, async (progress) => {
            try {
                // 1. VENV OLUŞTURMA
                if (config.get('venvOtomatikOlustur') && !fs.existsSync(vp)) {
                    progress.report({ message: "Sanal ortam oluşturuluyor..." });
                    await runCommand(`${pc} -m venv .venv`, rp);
                    gitignoreOlustur(rp);
                    await runCommand(`${pip} install --upgrade pip setuptools wheel`, rp);
                    vscode.window.showInformationMessage('✅ Sanal ortam oluşturuldu!');
                    await venvDurumunuGuncelle();
                }

                // 2. REQUIREMENTS.TXT KURULUMU (SELF-HEALING)
                if (config.get('otomatikKurulum') && fs.existsSync(req)) {
                    progress.report({ message: "requirements.txt kuruluyor..." });
                    try {
                        await runCommand(`${pip} install -r requirements.txt`, rp);
                        vscode.window.showInformationMessage('✅ requirements.txt kuruldu!');
                    } catch (installError: any) {
                        const hm = installError.message || String(installError);
                        const hb = turkceHataCozum(hm);
                        hataKaydet(context, hb?.hataTur || 'Bilinmeyen', path.basename(rp));
                        if (hb?.cozum.healingType && config.get('selfHealingAktif')) {
                            vscode.window.showWarningMessage('⚠️ Kurulum hatası. Otomatik düzeltiliyor...');
                            const duzeltildi = await otomatikDuzelt(rp, hb.cozum.healingType, pip, pc, progress, hm);
                            if (duzeltildi) {
                                progress.report({ message: "🔄 Kurulum tekrar deneniyor..." });
                                await runCommand(`${pip} install -r requirements.txt`, rp);
                                vscode.window.showInformationMessage('✅ Hata düzeltildi, kurulum tamamlandı!');
                            } else { throw installError; }
                        } else { throw installError; }
                    }
                }

                // 3. DERİN PAKET TARAMASI (python -c "import" doğrulama)
                if (config.get('otomatikPaketKontrol')) {
                    progress.report({ message: "Eksik modüller taranıyor (derin tarama)..." });
                    const venvPython = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
                    const eksik = await eksikPaketleriKontrolEt(rp, venvPython);
                    if (eksik.length > 0) {
                        const sec = await vscode.window.showWarningMessage(
                            `📦 ${eksik.length} eksik modül: ${eksik.slice(0, 3).join(', ')}${eksik.length > 3 ? '...' : ''}`,
                            "Otomatik Kur", "Yoksay"
                        );
                        if (sec === "Otomatik Kur") {
                            progress.report({ message: "Eksik modüller kuruluyor..." });
                            await runCommand(`${pip} install ${eksik.join(' ')}`, rp);
                            let ri = fs.existsSync(req) ? fs.readFileSync(req, 'utf-8') : '';
                            eksik.forEach(p => { if (!ri.includes(p)) { ri += `\n${p}`; } });
                            fs.writeFileSync(req, ri.trim());
                            vscode.window.showInformationMessage(`✅ ${eksik.length} modül kuruldu!`);
                        }
                    }
                }

                // 4. .ENV SİHİRBAZI
                if (config.get('envSihirbaziAktif')) {
                    const envVars = await envDegiskenleriniTara(rp);
                    const envPath = path.join(rp, '.env');
                    if (envVars.length > 0 && !fs.existsSync(envPath)) {
                        const sec = await vscode.window.showInformationMessage(
                            `🌍 ${envVars.length} ortam değişkeni tespit edildi. .env oluşturulsun mu?`,
                            "Şablon Oluştur", "Sonra"
                        );
                        if (sec === "Şablon Oluştur") {
                            fs.writeFileSync(envPath, `# PyOtoBaşlat tarafından oluşturuldu\n\n${envVars.map(v => `${v}=\n`).join('')}`);
                            vscode.window.showInformationMessage('✅ .env şablonu oluşturuldu!');
                            const doc = await vscode.workspace.openTextDocument(envPath);
                            await vscode.window.showTextDocument(doc);
                        }
                    }
                }

                // 5. PROJE TÜRÜ ALGILAMA VE ÇALIŞTIRMA
                const mod = config.get('calistirmaModu') as string;
                const term = getOrCreateTerminal('🐍 PyOtoBaşlat');
                let cmd = '';
                if (mod === 'django' || (mod === 'otomatik' && fs.existsSync(path.join(rp, 'manage.py')))) {
                    cmd = `${act} && python manage.py runserver`;
                    progress.report({ message: "Django başlatılıyor..." });
                } else if (mod === 'flask' || (mod === 'otomatik' && fs.existsSync(path.join(rp, 'app.py')) && dosyaIcerikKontrol(rp, 'app.py', 'Flask'))) {
                    cmd = `${act} && flask run`;
                    progress.report({ message: "Flask başlatılıyor..." });
                } else if (mod === 'fastapi' || (mod === 'otomatik' && dosyaIcerikKontrol(rp, 'main.py', 'FastAPI'))) {
                    cmd = `${act} && uvicorn main:app --reload`;
                    progress.report({ message: "FastAPI başlatılıyor..." });
                } else {
                    const pyf = fs.readdirSync(rp).filter(f => f.endsWith('.py'));
                    const tf = pyf.find(f => ['main.py', 'app.py', 'run.py'].includes(f)) || pyf[0];
                    if (!tf) { throw new Error('Projede .py dosyası bulunamadı!'); }
                    cmd = `${act} && python ${tf}`;
                    progress.report({ message: `${tf} başlatılıyor...` });
                }
                term.sendText(cmd);
                term.show();
                vscode.window.showInformationMessage('🚀 Proje başarıyla başlatıldı!');

            } catch (error: any) {
                const hm = error.message || String(error);
                const hb = turkceHataCozum(hm);
                hataKaydet(context, hb?.hataTur || 'Bilinmeyen', path.basename(rp));

                if (hb?.cozum.healingType === 'pip_install' && config.get('selfHealingAktif')) {
                    vscode.window.showWarningMessage(`⚠️ ${hb.cozum.aciklama} Otomatik düzeltiliyor...`);
                    const sahteProgress = { report: (_m: { message?: string }) => { /* noop */ } };
                    const duzeltildi = await otomatikDuzelt(rp, 'pip_install', pip, pc, sahteProgress, hm);
                    if (duzeltildi) {
                        vscode.window.showInformationMessage('✅ Modül kuruldu! Projeyi tekrar başlatın.');
                        return;
                    }
                }

                if (hb && config.get('hataCevirmeniAktif')) {
                    const { hataTur, cozum } = hb;
                    const btns = ["Anladım"];
                    if (cozum.komut) { btns.push("Manuel Düzelt"); }
                    btns.push("Detaylı Yardım");
                    const sec = await vscode.window.showErrorMessage(`❌ ${hataTur}: ${cozum.aciklama}`, { modal: true, detail: cozum.cozum }, ...btns);
                    if (sec === "Manuel Düzelt" && cozum.komut) {
                        const term = getOrCreateTerminal('🐍 PyOtoBaşlat');
                        if (cozum.komut === "port_degistir") {
                            const port = await vscode.window.showInputBox({ prompt: "Yeni port:", value: "8001" });
                            if (port) { term.sendText(`${act} && python manage.py runserver ${port}`); term.show(); }
                        } else {
                            const pkg = hm.match(/No module named '([\w.]+)'/)?.[1] || 'paket';
                            const pipPaket = PAKET_ESLESTIRME[pkg] || PAKET_ESLESTIRME[pkg.split('.')[0]] || pkg.split('.')[0];
                            term.sendText(`${pip} install ${pipPaket}`);
                            term.show();
                        }
                    } else if (sec === "Detaylı Yardım") {
                        vscode.env.openExternal(vscode.Uri.parse(`https://docs.python.org/3/library/exceptions.html#${hataTur.toLowerCase()}`));
                    }
                } else {
                    vscode.window.showErrorMessage(`❌ Hata: ${hm}`);
                }
            }
        });
    });

    // ==================== 2. PERFORMANS ANALİZİ ====================
    const performansKomutu = vscode.commands.registerCommand('pyotobaslat.performansAnalizi', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath;
        const win = process.platform === 'win32';
        const act = getActivateCmd(win);
        const pyf = fs.readdirSync(rp).filter(f => f.endsWith('.py'));
        const tf = pyf.find(f => ['main.py', 'app.py', 'run.py'].includes(f)) || pyf[0];
        if (!tf) { vscode.window.showErrorMessage('❌ .py dosyası bulunamadı!'); return; }
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "⚡ Performans analizi...", cancellable: false }, async (progress) => {
            try {
                progress.report({ message: `${tf} profil ediliyor...` });
                const out = await runCommand(`${act} && python -m cProfile -s cumulative ${tf}`, rp);
                performansRaporuOlustur(out);
            } catch (e: any) {
                const msg = e.message || String(e);
                if (msg.includes('ncalls')) { performansRaporuOlustur(msg); }
                else { vscode.window.showErrorMessage(`❌ Performans hatası: ${msg}`); }
            }
        });
    });

    // ==================== 3. PAKET GÜNCELLEME ====================
    const paketGuncelleKomutu = vscode.commands.registerCommand('pyotobaslat.paketleriGuncelle', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath;
        const win = process.platform === 'win32';
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const venvPython = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "📦 Derin paket taraması...", cancellable: false }, async (progress) => {
            try {
                const eksik = await eksikPaketleriKontrolEt(rp, venvPython);
                if (eksik.length === 0) { vscode.window.showInformationMessage('✅ Tüm modüller kurulu!'); return; }
                const sec = await vscode.window.showWarningMessage(`📦 ${eksik.length} eksik modül: ${eksik.join(', ')}`, "Hepsini Kur", "İptal");
                if (sec === "Hepsini Kur") {
                    progress.report({ message: "Modüller kuruluyor..." });
                    await runCommand(`${pip} install ${eksik.join(' ')}`, rp);
                    const req = path.join(rp, 'requirements.txt');
                    let ri = fs.existsSync(req) ? fs.readFileSync(req, 'utf-8') : '';
                    eksik.forEach(p => { if (!ri.includes(p)) { ri += `\n${p}`; } });
                    fs.writeFileSync(req, ri.trim());
                    vscode.window.showInformationMessage(`✅ ${eksik.length} modül kuruldu!`);
                }
            } catch (e: any) { vscode.window.showErrorMessage(`❌ Paket hatası: ${e.message}`); }
        });
    });

    // ==================== 4. GÜVENLİK TARAMASI ====================
    const guvenlikKomutu = vscode.commands.registerCommand('pyotobaslat.guvenlikTaramasi', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath;
        const win = process.platform === 'win32';
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const act = getActivateCmd(win);
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🔒 Güvenlik taraması...", cancellable: false }, async (progress) => {
            try {
                try { await runCommand(`${pip} show pip-audit`, rp); }
                catch {
                    progress.report({ message: "pip-audit kuruluyor..." });
                    await runCommand(`${pip} install pip-audit`, rp);
                }
                progress.report({ message: "Bağımlılıklar taranıyor..." });
                const term = getOrCreateTerminal('🔒 PyOtoBaşlat Güvenlik');
                term.sendText(`${act} && pip-audit --desc on`);
                term.show();
                vscode.window.showInformationMessage('🔒 Güvenlik taraması başladı!');
            } catch (e: any) { vscode.window.showErrorMessage(`❌ Güvenlik hatası: ${e.message}`); }
        });
    });

    // ==================== 5. PROJE SAĞLIK KONTROLÜ ====================
    const saglikKomutu = vscode.commands.registerCommand('pyotobaslat.projeSaglikKontrolu', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath;
        const win = process.platform === 'win32';
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const venvPython = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
        const sonuclar: { kategori: string; durum: 'ok' | 'uyari' | 'hata'; mesaj: string }[] = [];

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🏥 Proje sağlık kontrolü...", cancellable: false }, async (progress) => {
            progress.report({ message: "Python sürümü kontrol ediliyor..." });
            try {
                const v = await runCommand(`${venvPython} --version`, rp);
                sonuclar.push({ kategori: 'Python Sürümü', durum: 'ok', mesaj: v.trim() });
            } catch { sonuclar.push({ kategori: 'Python Sürümü', durum: 'hata', mesaj: 'Python bulunamadı!' }); }

            progress.report({ message: "Sanal ortam kontrol ediliyor..." });
            if (fs.existsSync(path.join(rp, '.venv'))) {
                sonuclar.push({ kategori: 'Sanal Ortam', durum: 'ok', mesaj: '.venv mevcut' });
            } else {
                sonuclar.push({ kategori: 'Sanal Ortam', durum: 'uyari', mesaj: '.venv bulunamadı' });
            }

            progress.report({ message: "requirements.txt kontrol ediliyor..." });
            if (fs.existsSync(path.join(rp, 'requirements.txt'))) {
                sonuclar.push({ kategori: 'requirements.txt', durum: 'ok', mesaj: 'Mevcut' });
            } else {
                sonuclar.push({ kategori: 'requirements.txt', durum: 'uyari', mesaj: 'Bulunamadı (önerilir)' });
            }

            progress.report({ message: ".gitignore kontrol ediliyor..." });
            if (fs.existsSync(path.join(rp, '.gitignore'))) {
                sonuclar.push({ kategori: '.gitignore', durum: 'ok', mesaj: 'Mevcut' });
            } else {
                sonuclar.push({ kategori: '.gitignore', durum: 'uyari', mesaj: 'Bulunamadı (önerilir)' });
            }

            progress.report({ message: "Eksik paketler taranıyor..." });
            try {
                const eksik = await eksikPaketleriKontrolEt(rp, venvPython);
                if (eksik.length === 0) {
                    sonuclar.push({ kategori: 'Paketler', durum: 'ok', mesaj: 'Tüm paketler kurulu' });
                } else {
                    sonuclar.push({ kategori: 'Paketler', durum: 'hata', mesaj: `${eksik.length} eksik: ${eksik.slice(0, 3).join(', ')}` });
                }
            } catch { sonuclar.push({ kategori: 'Paketler', durum: 'uyari', mesaj: 'Tarama yapılamadı' }); }

            progress.report({ message: "Eski paketler kontrol ediliyor..." });
            try {
                const outdated = await runCommand(`${pip} list --outdated --format=columns`, rp);
                const lines = outdated.split('\n').filter(l => l.trim() && !l.includes('Package') && !l.includes('---'));
                if (lines.length === 0) {
                    sonuclar.push({ kategori: 'Güncellik', durum: 'ok', mesaj: 'Tüm paketler güncel' });
                } else {
                    sonuclar.push({ kategori: 'Güncellik', durum: 'uyari', mesaj: `${lines.length} paket güncellenebilir` });
                }
            } catch { sonuclar.push({ kategori: 'Güncellik', durum: 'uyari', mesaj: 'Kontrol yapılamadı' }); }

            progress.report({ message: "Docker kontrol ediliyor..." });
            if (fs.existsSync(path.join(rp, 'Dockerfile')) || fs.existsSync(path.join(rp, 'docker-compose.yml'))) {
                sonuclar.push({ kategori: 'Docker', durum: 'ok', mesaj: 'Docker yapılandırması bulundu' });
            } else {
                sonuclar.push({ kategori: 'Docker', durum: 'uyari', mesaj: 'Dockerfile yok (opsiyonel)' });
            }

            progress.report({ message: "Testler kontrol ediliyor..." });
            const testFiles = await vscode.workspace.findFiles('**/test_*.py', '**/{.venv,node_modules}/**');
            if (testFiles.length > 0) {
                sonuclar.push({ kategori: 'Testler', durum: 'ok', mesaj: `${testFiles.length} test dosyası bulundu` });
            } else {
                sonuclar.push({ kategori: 'Testler', durum: 'uyari', mesaj: 'Test dosyası bulunamadı' });
            }

            progress.report({ message: ".env kontrol ediliyor..." });
            const envVars = await envDegiskenleriniTara(rp);
            if (envVars.length > 0 && !fs.existsSync(path.join(rp, '.env'))) {
                sonuclar.push({ kategori: '.env', durum: 'hata', mesaj: `${envVars.length} değişken tanımlı ama .env yok!` });
            } else if (envVars.length > 0) {
                sonuclar.push({ kategori: '.env', durum: 'ok', mesaj: '.env mevcut' });
            }

            saglikRaporuGoster(sonuclar);
            vscode.window.showInformationMessage('🏥 Proje sağlık raporu hazır!');
        });
    });

    // ==================== 6. TEST ÇALIŞTIRICI ====================
    const testKomutu = vscode.commands.registerCommand('pyotobaslat.testleriCalistir', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath;
        const win = process.platform === 'win32';
        const act = getActivateCmd(win);
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const testAraci = config.get('testCalistirici') as string;
        const term = getOrCreateTerminal('🧪 PyOtoBaşlat Test');

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🧪 Testler hazırlanıyor...", cancellable: false }, async (progress) => {
            try {
                try { await runCommand(`${pip} show ${testAraci}`, rp); }
                catch {
                    progress.report({ message: `${testAraci} kuruluyor...` });
                    await runCommand(`${pip} install ${testAraci}`, rp);
                }
                progress.report({ message: "Testler çalıştırılıyor..." });
                const cmd = testAraci === 'pytest'
                    ? `${act} && python -m pytest -v --tb=short`
                    : `${act} && python -m unittest discover -v`;
                term.sendText(cmd);
                term.show();
                vscode.window.showInformationMessage('🧪 Testler terminalde başladı!');
            } catch (e: any) { vscode.window.showErrorMessage(`❌ Test hatası: ${e.message}`); }
        });
    });

    // ==================== 7. KOD KALİTESİ ====================
    const kaliteKomutu = vscode.commands.registerCommand('pyotobaslat.kodKalitesi', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath;
        const win = process.platform === 'win32';
        const act = getActivateCmd(win);
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const kaliteAraci = config.get('kodKalitesiAraci') as string;
        const term = getOrCreateTerminal('✨ PyOtoBaşlat Kalite');

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "✨ Kod kalitesi kontrolü...", cancellable: false }, async (progress) => {
            try {
                try { await runCommand(`${pip} show ${kaliteAraci}`, rp); }
                catch {
                    progress.report({ message: `${kaliteAraci} kuruluyor...` });
                    await runCommand(`${pip} install ${kaliteAraci}`, rp);
                }
                progress.report({ message: "Kod analiz ediliyor..." });
                let cmd = '';
                if (kaliteAraci === 'ruff') { cmd = `${act} && ruff check . --output-format=text`; }
                else if (kaliteAraci === 'flake8') { cmd = `${act} && flake8 . --max-line-length=120`; }
                else { cmd = `${act} && pylint **/*.py --disable=C0114,C0115,C0116`; }
                term.sendText(cmd);
                term.show();
                vscode.window.showInformationMessage('✨ Kod kalitesi raporu terminalde!');
            } catch (e: any) { vscode.window.showErrorMessage(`❌ Kalite kontrolü hatası: ${e.message}`); }
        });
    });

    // ==================== 8. HATA İSTATİSTİKLERİ ====================
    const istatistikKomutu = vscode.commands.registerCommand('pyotobaslat.hataIstatistikleri', () => {
        hataIstatistikleriGoster(context);
    });

    // ==================== 9. ORTAMI TEMİZLE ====================
    const temizleKomutu = vscode.commands.registerCommand('pyotobaslat.ortamiTemizle', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath;

        const sec = await vscode.window.showWarningMessage(
            '🧹 Ortam temizlenecek: __pycache__, .pyc, .pytest_cache, .mypy_cache silinecek. Devam edilsin mi?',
            { modal: true },
            "Evet, Temizle"
        );
        if (sec !== "Evet, Temizle") { return; }

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🧹 Ortam temizleniyor...", cancellable: false }, async (progress) => {
            let silinen = 0;
            const hedefler = ['__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.tox'];
            for (const hedef of hedefler) {
                progress.report({ message: `${hedef} temizleniyor...` });
                try {
                    const temizlenecekler = await vscode.workspace.findFiles(`**/${hedef}`, '**/node_modules/**');
                    for (const file of temizlenecekler) {
                        try {
                            if (fs.existsSync(file.fsPath)) {
                                fs.rmSync(file.fsPath, { recursive: true, force: true });
                                silinen++;
                            }
                        } catch { /* atla */ }
                    }
                } catch { /* atla */ }
            }
            try {
                const pycFiles = await vscode.workspace.findFiles('**/*.pyc', '**/node_modules/**');
                for (const file of pycFiles) {
                    try { fs.unlinkSync(file.fsPath); silinen++; } catch { /* atla */ }
                }
            } catch { /* atla */ }
            try {
                const pip = process.platform === 'win32' ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
                await runCommand(`${pip} cache purge`, rp);
            } catch { /* atla */ }
            vscode.window.showInformationMessage(`🧹 ${silinen} öğe temizlendi!`);
        });
    });

    // ==================== 10. AYARLAR ====================
    const ayarlarKomutu = vscode.commands.registerCommand('pyotobaslat.ayarlarAc', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'pyotobaslat');
    });

    context.subscriptions.push(
        hazirlaKomutu, performansKomutu, paketGuncelleKomutu, guvenlikKomutu,
        saglikKomutu, testKomutu, kaliteKomutu, istatistikKomutu, temizleKomutu, ayarlarKomutu
    );

    log('Tüm komutlar başarıyla kaydedildi');
}

export function deactivate() {
    log('PyOtoBaşlat kapatıldı');
}
