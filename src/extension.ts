import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ==================== LOGGING KANALI ====================
let logChannel: vscode.OutputChannel;

function log(mesaj: string, seviye: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
    const zaman = new Date().toLocaleTimeString('tr-TR');
    logChannel.appendLine(`[${zaman}] [${seviye}] ${mesaj}`);
}

// ==================== PAKET EŞLEŞTİRME TABLOSU ====================
const PAKET_ESLESTIRME: Record<string, string> = {
    'PyQt6': 'PyQt6',
    'PyQt6.QtWebEngineWidgets': 'PyQt6-WebEngine',
    'PyQt6.QtWebEngineCore': 'PyQt6-WebEngine',
    'PyQt6.QtWebChannel': 'PyQt6-WebEngine',
    'PyQt6.QtMultimedia': 'PyQt6-Multimedia',
    'PyQt6.Qt3DCore': 'PyQt6-3D',
    'PyQt6.QtCharts': 'PyQt6-Charts',
    'PyQt6.QtDataVisualization': 'PyQt6-DataVisualization',
    'PyQt6.QtNetworkAuth': 'PyQt6-NetworkAuth',
    'PyQt6.QtQuick3D': 'PyQt6-Quick3D',
    'PyQt6.QtQuickTimeline': 'PyQt6-QuickTimeline',
    'PyQt6.QtRemoteObjects': 'PyQt6-RemoteObjects',
    'PyQt6.QtScxml': 'PyQt6-Scxml',
    'PyQt6.QtSensors': 'PyQt6-Sensors',
    'PyQt6.QtSerialPort': 'PyQt6-SerialPort',
    'PyQt6.QtTest': 'PyQt6',
    'PyQt5': 'PyQt5',
    'PyQt5.QtWebEngineWidgets': 'PyQtWebEngine',
    'PyQt5.QtMultimedia': 'PyQt5',
    'PySide6': 'PySide6',
    'PySide6.QtWebEngineWidgets': 'PySide6',
    'cv2': 'opencv-python',
    'sklearn': 'scikit-learn',
    'skimage': 'scikit-image',
    'bs4': 'beautifulsoup4',
    'PIL': 'Pillow',
    'yaml': 'pyyaml',
    'dotenv': 'python-dotenv',
    'jwt': 'PyJWT',
    'serial': 'pyserial',
    'usb': 'pyusb',
    'gi': 'PyGObject',
    'wx': 'wxPython',
    'fitz': 'PyMuPDF',
    'Bio': 'biopython',
    'lxml': 'lxml',
    'np': 'numpy',
    'pd': 'pandas',
    'tf': 'tensorflow',
    'torch': 'torch',
    'mpl_toolkits': 'matplotlib',
    'google.protobuf': 'protobuf',
    'Crypto': 'pycryptodome',
    'OpenSSL': 'pyOpenSSL',
    'dateutil': 'python-dateutil',
    'attr': 'attrs',
    'dns': 'dnspython',
    'socks': 'PySocks',
    'win32api': 'pywin32',
    'win32com': 'pywin32',
    'pythoncom': 'pywin32',
    'winerror': 'pywin32',
    'git': 'GitPython',
    'jose': 'python-jose',
    'magic': 'python-magic',
    'docx': 'python-docx',
    'pptx': 'python-pptx',
    'telegram': 'python-telegram-bot',
    'telegram.ext': 'python-telegram-bot',
    'vk_api': 'vk-api',
    'cx_Oracle': 'cx_Oracle',
    'psycopg2': 'psycopg2-binary',
    'MySQLdb': 'mysqlclient',
    'pymysql': 'PyMySQL',
    'redis': 'redis',
    'pika': 'pika',
    'kombu': 'kombu',
    'celery': 'celery',
    'boto3': 'boto3',
    'botocore': 'botocore',
    'azure': 'azure-storage-blob',
    'google.cloud': 'google-cloud-storage',
    'kubernetes': 'kubernetes',
    'docker': 'docker',
    'fabric': 'fabric',
    'paramiko': 'paramiko',
    'scp': 'scp',
    'netmiko': 'netmiko',
    'scapy': 'scapy',
    'nmap': 'python-nmap',
    'whois': 'python-whois',
    'geoip': 'geoip2',
    'folium': 'folium',
    'geopy': 'geopy',
    'shapely': 'shapely',
    'fiona': 'fiona',
    'rasterio': 'rasterio',
    'xarray': 'xarray',
    'dask': 'dask',
    'ray': 'ray',
    'joblib': 'joblib',
    'tqdm': 'tqdm',
    'rich': 'rich',
    'click': 'click',
    'typer': 'typer',
    'fire': 'fire',
    'colorama': 'colorama',
    'termcolor': 'termcolor',
    'pyfiglet': 'pyfiglet',
    'asciimatics': 'asciimatics',
    'curses': 'windows-curses',
    'win32gui': 'pywin32',
    'win32con': 'pywin32',
    'pywinauto': 'pywinauto',
    'autopy': 'autopy',
    'pyautogui': 'pyautogui',
    'pynput': 'pynput',
    'keyboard': 'keyboard',
    'mouse': 'mouse',
    'speech_recognition': 'SpeechRecognition',
    'pyttsx3': 'pyttsx3',
    'gtts': 'gTTS',
    'pygame': 'pygame',
    'pyglet': 'pyglet',
    'arcade': 'arcade',
    'panda3d': 'panda3d',
    'ursina': 'ursina',
    'moderngl': 'moderngl',
    'vispy': 'vispy',
    'mayavi': 'mayavi',
    'plotly': 'plotly',
    'bokeh': 'bokeh',
    'dash': 'dash',
    'streamlit': 'streamlit',
    'gradio': 'gradio',
    'panel': 'panel',
    'voila': 'voila',
    'jupyter': 'jupyter',
    'notebook': 'notebook',
    'ipywidgets': 'ipywidgets',
    'nbformat': 'nbformat',
    'papermill': 'papermill',
    'sphinx': 'sphinx',
    'mkdocs': 'mkdocs',
    'pelican': 'pelican',
    'hugo': 'hugo',
    'flask_restx': 'flask-restx',
    'flask_cors': 'flask-cors',
    'flask_sqlalchemy': 'flask-sqlalchemy',
    'flask_migrate': 'flask-migrate',
    'flask_login': 'flask-login',
    'flask_wtf': 'flask-wtf',
    'flask_mail': 'flask-mail',
    'flask_jwt_extended': 'flask-jwt-extended',
    'django_rest_framework': 'djangorestframework',
    'rest_framework': 'djangorestframework',
    'django_filters': 'django-filter',
    'django_cors_headers': 'django-cors-headers',
    'django_extensions': 'django-extensions',
    'django_debug_toolbar': 'django-debug-toolbar',
    'django_storages': 'django-storages',
    'django_redis': 'django-redis',
    'django_celery_beat': 'django-celery-beat',
    'django_celery_results': 'django-celery-results',
    'allauth': 'django-allauth',
    'drf_yasg': 'drf-yasg',
    'drf_spectacular': 'drf-spectacular',
    'fastapi_users': 'fastapi-users',
    'sqlmodel': 'sqlmodel',
    'motor': 'motor',
    'pymongo': 'pymongo',
    'mongoengine': 'mongoengine',
    'elasticsearch': 'elasticsearch',
    'opensearchpy': 'opensearch-py',
    'cassandra': 'cassandra-driver',
    'neo4j': 'neo4j',
    'influxdb': 'influxdb',
    'influxdb_client': 'influxdb-client',
    'prometheus_client': 'prometheus-client',
    'statsd': 'statsd',
    'datadog': 'datadog',
    'sentry_sdk': 'sentry-sdk',
    'rollbar': 'rollbar',
    'bugsnag': 'bugsnag',
    'newrelic': 'newrelic',
    'opentelemetry': 'opentelemetry-api',
    'jaeger_client': 'jaeger-client',
    'zipkin': 'py-zipkin',
    'graphene': 'graphene',
    'strawberry': 'strawberry-graphql',
    'ariadne': 'ariadne',
    'websockets': 'websockets',
    'socketio': 'python-socketio',
    'engineio': 'python-engineio',
    'aiohttp': 'aiohttp',
    'httpx': 'httpx',
    'requests': 'requests',
    'urllib3': 'urllib3',
    'httpcore': 'httpcore',
    'twisted': 'twisted',
    'gevent': 'gevent',
    'eventlet': 'eventlet',
    'uvloop': 'uvloop',
    'trio': 'trio',
    'anyio': 'anyio',
    'curio': 'curio',
    'asyncio': 'asyncio',
    'concurrent': 'concurrent-log-handler',
    'multiprocess': 'multiprocess',
    'pathos': 'pathos',
    'pebble': 'pebble',
    'apscheduler': 'APScheduler',
    'schedule': 'schedule',
    'croniter': 'croniter',
    'rq': 'rq',
    'huey': 'huey',
    'dramatiq': 'dramatiq',
    'arq': 'arq',
    'temporalio': 'temporalio',
    'prefect': 'prefect',
    'airflow': 'apache-airflow',
    'luigi': 'luigi',
    'mlflow': 'mlflow',
    'wandb': 'wandb',
    'neptune': 'neptune-client',
    'comet_ml': 'comet-ml',
    'tensorboard': 'tensorboard',
    'tensorboardX': 'tensorboardX',
    'optuna': 'optuna',
    'hyperopt': 'hyperopt',
    'ray.tune': 'ray',
    'skopt': 'scikit-optimize',
    'bayes_opt': 'bayesian-optimization',
    'nni': 'nni',
    'keras': 'keras',
    'torchvision': 'torchvision',
    'torchaudio': 'torchaudio',
    'torchtext': 'torchtext',
    'tensorflow_datasets': 'tensorflow-datasets',
    'datasets': 'datasets',
    'transformers': 'transformers',
    'tokenizers': 'tokenizers',
    'accelerate': 'accelerate',
    'peft': 'peft',
    'trl': 'trl',
    'diffusers': 'diffusers',
    'stable_baselines3': 'stable-baselines3',
    'gym': 'gymnasium',
    'gymnasium': 'gymnasium',
    'pettingzoo': 'pettingzoo',
    'unityagents': 'mlagents',
    'mlagents': 'mlagents',
    'dopamine': 'dopamine-rl',
    'reverb': 'dm-reverb',
    'trfl': 'trfl',
    'acme': 'dm-acme',
    'sonnet': 'dm-sonnet',
    'haiku': 'dm-haiku',
    'jax': 'jax',
    'jaxlib': 'jaxlib',
    'flax': 'flax',
    'optax': 'optax',
    'chex': 'chex',
    'rlax': 'rlax',
    'tf_agents': 'tf-agents',
    'keras_rl': 'keras-rl2',
    'slim': 'tensorflow-slim',
    'object_detection': 'tensorflow-object-detection-api',
    'mmdetection': 'mmdet',
    'detectron2': 'detectron2',
    'yolov5': 'yolov5',
    'ultralytics': 'ultralytics',
    'mediapipe': 'mediapipe',
    'dlib': 'dlib',
    'face_recognition': 'face-recognition',
    'insightface': 'insightface',
    'deepface': 'deepface',
    'fer': 'fer',
    'emotion': 'emotion',
    'librosa': 'librosa',
    'soundfile': 'soundfile',
    'audioread': 'audioread',
    'pydub': 'pydub',
    'webrtcvad': 'webrtcvad',
    'vosk': 'vosk',
    'deepspeech': 'deepspeech',
    'whisper': 'openai-whisper',
    'faster_whisper': 'faster-whisper',
    'coqui': 'TTS',
    'TTS': 'TTS',
    'bark': 'bark',
    'elevenlabs': 'elevenlabs',
    'openai': 'openai',
    'anthropic': 'anthropic',
    'cohere': 'cohere',
    'huggingface_hub': 'huggingface-hub',
    'sentence_transformers': 'sentence-transformers',
    'langchain': 'langchain',
    'llama_index': 'llama-index',
    'chromadb': 'chromadb',
    'pinecone': 'pinecone-client',
    'weaviate': 'weaviate-client',
    'qdrant_client': 'qdrant-client',
    'milvus': 'pymilvus',
    'faiss': 'faiss-cpu',
    'annoy': 'annoy',
    'hnswlib': 'hnswlib',
    'nmslib': 'nmslib',
    'spacy': 'spacy',
    'nltk': 'nltk',
    'gensim': 'gensim',
    'textblob': 'textblob',
    'pattern': 'pattern3',
    'polyglot': 'polyglot',
    'flair': 'flair',
    'stanza': 'stanza',
    'allennlp': 'allennlp',
    'farm': 'farm',
    'simpletransformers': 'simpletransformers',
    'ktrain': 'ktrain',
    'textattack': 'textattack',
    'checklist': 'checklist',
    'nlpaug': 'nlpaug',
    'augly': 'augly',
    'albumentations': 'albumentations',
    'imgaug': 'imgaug',
    'kornia': 'kornia',
    'torchgeo': 'torchgeo',
    'rasterio': 'rasterio',
    'geopandas': 'geopandas',
    'osmnx': 'osmnx',
    'networkx': 'networkx',
    'igraph': 'python-igraph',
    'graph_tool': 'graph-tool',
    'pyvis': 'pyvis',
    'dash_cytoscape': 'dash-cytoscape',
    'pygraphviz': 'pygraphviz',
    'graphviz': 'graphviz',
    'diagrams': 'diagrams',
    'mingrammer': 'diagrams',
    'schemdraw': 'schemdraw',
    'drawsvg': 'drawsvg',
    'svgwrite': 'svgwrite',
    'cairosvg': 'cairosvg',
    'reportlab': 'reportlab',
    'fpdf': 'fpdf2',
    'weasyprint': 'weasyprint',
    'pdfkit': 'pdfkit',
    'xhtml2pdf': 'xhtml2pdf',
    'pikepdf': 'pikepdf',
    'PyPDF2': 'PyPDF2',
    'fitz': 'PyMuPDF',
    'pdfminer': 'pdfminer.six',
    'camelot': 'camelot-py',
    'tabula': 'tabula-py',
    'pdfplumber': 'pdfplumber',
    'openpyxl': 'openpyxl',
    'xlrd': 'xlrd',
    'xlwt': 'xlwt',
    'xlsxwriter': 'XlsxWriter',
    'pyexcel': 'pyexcel',
    'odf': 'odfpy',
    'pyxlsb': 'pyxlsb',
    'tables': 'tables',
    'h5py': 'h5py',
    'zarr': 'zarr',
    'netCDF4': 'netCDF4',
    'scipy': 'scipy',
    'statsmodels': 'statsmodels',
    'prophet': 'prophet',
    'pmdarima': 'pmdarima',
    'fbprophet': 'prophet',
    'greykite': 'greykite',
    'neuralprophet': 'neuralprophet',
    'tslearn': 'tslearn',
    'dtw': 'dtw-python',
    'fastdtw': 'fastdtw',
    'dtaidistance': 'dtaidistance',
    'sktime': 'sktime',
    'tsfresh': 'tsfresh',
    'catch22': 'pycatch22',
    'featuretools': 'featuretools',
    'tpot': 'tpot',
    'autogluon': 'autogluon',
    'auto_sklearn': 'auto-sklearn',
    'flaml': 'flaml',
    'h2o': 'h2o',
    'lightautoml': 'lightautoml',
    'catboost': 'catboost',
    'xgboost': 'xgboost',
    'lightgbm': 'lightgbm',
    'ngboost': 'ngboost',
    'sklearn_ex': 'scikit-learn-intelex',
    'cuml': 'cuml-cu11',
    'cugraph': 'cugraph-cu11',
    'cupy': 'cupy-cuda12x',
    'numba': 'numba',
    'cython': 'cython',
    'pybind11': 'pybind11',
    'cppyy': 'cppyy',
    'cffi': 'cffi',
    'ctypes': 'ctypes',
    'pyobjc': 'pyobjc',
    'comtypes': 'comtypes',
    'pywin32': 'pywin32',
    'wmi': 'WMI',
    'psutil': 'psutil',
    'GPUtil': 'GPUtil',
    'pynvml': 'nvidia-ml-py',
    'py3nvml': 'py3nvml',
    'cpuinfo': 'py-cpuinfo',
    'distro': 'distro',
    'platform': 'platform',
    'locale': 'locale',
    'gettext': 'gettext',
    'babel': 'babel',
    'polib': 'polib',
    'translate': 'translate',
    'googletrans': 'googletrans',
    'deep_translator': 'deep-translator',
    'argostranslate': 'argostranslate',
    'transformers': 'transformers',
    'sentencepiece': 'sentencepiece',
    'sacremoses': 'sacremoses',
    'subword_nmt': 'subword-nmt',
    'bpemb': 'bpemb',
    'fasttext': 'fasttext',
    'word2vec': 'gensim',
    'glove': 'glove-python-binary',
    'fasttext': 'fasttext-wheel',
    'starlark': 'starlark-pyo3',
    'rustimport': 'rustimport',
    'maturin': 'maturin',
    'setuptools_rust': 'setuptools-rust',
    'pyo3': 'pyo3',
    'cryptography': 'cryptography',
    'nacl': 'PyNaCl',
    'hashlib': 'hashlib',
    'hmac': 'hmac',
    'secrets': 'secrets',
    'passlib': 'passlib',
    'argon2': 'argon2-cffi',
    'bcrypt': 'bcrypt',
    'scrypt': 'scrypt',
    'pbkdf2': 'pbkdf2',
    'itsdangerous': 'itsdangerous',
    'jose': 'python-jose',
    'authlib': 'Authlib',
    'oauthlib': 'oauthlib',
    'requests_oauthlib': 'requests-oauthlib',
    'social_core': 'social-auth-core',
    'social_django': 'social-auth-app-django',
    'allauth': 'django-allauth',
    'pyotp': 'pyotp',
    'qrcode': 'qrcode',
    'segno': 'segno',
    'pyzbar': 'pyzbar',
    'zxing': 'zxing',
    'barcode': 'python-barcode',
    'treepoem': 'treepoem',
    'reportlab': 'reportlab',
    'fpdf': 'fpdf2',
    'weasyprint': 'weasyprint',
    'pdfkit': 'pdfkit',
    'xhtml2pdf': 'xhtml2pdf',
    'pikepdf': 'pikepdf',
    'PyPDF2': 'PyPDF2',
    'fitz': 'PyMuPDF',
    'pdfminer': 'pdfminer.six',
    'camelot': 'camelot-py',
    'tabula': 'tabula-py',
    'pdfplumber': 'pdfplumber',
};

// Ters eşleştirme: pip paket adı -> import adı
const TERS_ESLESTIRME: Record<string, string> = {
    'opencv-python': 'cv2',
    'scikit-learn': 'sklearn',
    'scikit-image': 'skimage',
    'beautifulsoup4': 'bs4',
    'Pillow': 'PIL',
    'pyyaml': 'yaml',
    'python-dotenv': 'dotenv',
    'PyJWT': 'jwt',
    'pyserial': 'serial',
    'pyusb': 'usb',
    'PyGObject': 'gi',
    'wxPython': 'wx',
    'PyMuPDF': 'fitz',
    'biopython': 'Bio',
    'PyQt6-WebEngine': 'PyQt6.QtWebEngineWidgets',
    'PyQtWebEngine': 'PyQt5.QtWebEngineWidgets',
    'pycryptodome': 'Crypto',
    'pyOpenSSL': 'OpenSSL',
    'python-dateutil': 'dateutil',
    'attrs': 'attr',
    'dnspython': 'dns',
    'PySocks': 'socks',
    'pywin32': 'win32api',
    'GitPython': 'git',
    'python-jose': 'jose',
    'python-magic': 'magic',
    'python-docx': 'docx',
    'python-pptx': 'pptx',
    'python-telegram-bot': 'telegram',
    'mysqlclient': 'MySQLdb',
    'PyMySQL': 'pymysql',
    'psycopg2-binary': 'psycopg2',
    'SpeechRecognition': 'speech_recognition',
    'gTTS': 'gtts',
    'python-socketio': 'socketio',
    'python-engineio': 'engineio',
    'APScheduler': 'apscheduler',
    'prometheus-client': 'prometheus_client',
    'sentry-sdk': 'sentry_sdk',
    'flask-restx': 'flask_restx',
    'flask-cors': 'flask_cors',
    'flask-sqlalchemy': 'flask_sqlalchemy',
    'flask-migrate': 'flask_migrate',
    'flask-login': 'flask_login',
    'flask-wtf': 'flask_wtf',
    'flask-mail': 'flask_mail',
    'flask-jwt-extended': 'flask_jwt_extended',
    'djangorestframework': 'rest_framework',
    'django-filter': 'django_filters',
    'django-cors-headers': 'django_cors_headers',
    'django-extensions': 'django_extensions',
    'django-debug-toolbar': 'django_debug_toolbar',
    'django-storages': 'django_storages',
    'django-redis': 'django_redis',
    'django-celery-beat': 'django_celery_beat',
    'django-celery-results': 'django_celery_results',
    'django-allauth': 'allauth',
    'drf-yasg': 'drf_yasg',
    'drf-spectacular': 'drf_spectacular',
    'apache-airflow': 'airflow',
    'tensorflow-datasets': 'tensorflow_datasets',
    'tensorflow-object-detection-api': 'object_detection',
    'tensorflow-slim': 'slim',
    'tf-agents': 'tf_agents',
    'keras-rl2': 'keras_rl',
    'dm-reverb': 'reverb',
    'dm-acme': 'acme',
    'dm-haiku': 'haiku',
    'dm-sonnet': 'sonnet',
    'stable-baselines3': 'stable_baselines3',
    'mlagents': 'mlagents',
    'dopamine-rl': 'dopamine',
    'openai-whisper': 'whisper',
    'faster-whisper': 'faster_whisper',
    'TTS': 'coqui',
    'python-nmap': 'nmap',
    'python-whois': 'whois',
    'python-barcode': 'barcode',
    'python-igraph': 'igraph',
    'graph-tool': 'graph_tool',
    'dash-cytoscape': 'dash_cytoscape',
    'scikit-optimize': 'skopt',
    'bayesian-optimization': 'bayes_opt',
    'neptune-client': 'neptune',
    'comet-ml': 'comet_ml',
    'sentry-sdk': 'sentry_sdk',
    'opentelemetry-api': 'opentelemetry',
    'jaeger-client': 'jaeger_client',
    'py-zipkin': 'zipkin',
    'strawberry-graphql': 'strawberry',
    'python-socketio': 'socketio',
    'python-engineio': 'engineio',
    'concurrent-log-handler': 'concurrent',
    'multiprocess': 'multiprocess',
    'windows-curses': 'curses',
    'py-cpuinfo': 'cpuinfo',
    'nvidia-ml-py': 'pynvml',
    'py3nvml': 'py3nvml',
    'googletrans': 'googletrans',
    'deep-translator': 'deep_translator',
    'argostranslate': 'argostranslate',
    'subword-nmt': 'subword_nmt',
    'fasttext-wheel': 'fasttext',
    'glove-python-binary': 'glove',
    'starlark-pyo3': 'starlark',
    'rustimport': 'rustimport',
    'setuptools-rust': 'setuptools_rust',
    'PyNaCl': 'nacl',
    'argon2-cffi': 'argon2',
    'social-auth-core': 'social_core',
    'social-auth-app-django': 'social_django',
    'python-barcode': 'barcode',
    'zxing': 'zxing',
    'pyzbar': 'pyzbar',
    'treepoem': 'treepoem',
    'pdfminer.six': 'pdfminer',
    'camelot-py': 'camelot',
    'tabula-py': 'tabula',
    'odfpy': 'odf',
    'pyxlsb': 'pyxlsb',
    'netCDF4': 'netCDF4',
    'dtw-python': 'dtw',
    'pycatch22': 'catch22',
    'auto-sklearn': 'auto_sklearn',
    'scikit-learn-intelex': 'sklearn_ex',
    'cuml-cu11': 'cuml',
    'cugraph-cu11': 'cugraph',
    'cupy-cuda12x': 'cupy',
    'cppyy': 'cppyy',
    'pyo3': 'pyo3',
    'maturin': 'maturin',
    'cffi': 'cffi',
    'comtypes': 'comtypes',
    'WMI': 'wmi',
    'GPUtil': 'GPUtil',
    'py-cpuinfo': 'cpuinfo',
    'distro': 'distro',
    'babel': 'babel',
    'polib': 'polib',
    'translate': 'translate',
    'sentencepiece': 'sentencepiece',
    'sacremoses': 'sacremoses',
    'bpemb': 'bpemb',
    'word2vec': 'gensim',
    'pattern3': 'pattern',
    'flair': 'flair',
    'stanza': 'stanza',
    'allennlp': 'allennlp',
    'farm': 'farm',
    'simpletransformers': 'simpletransformers',
    'ktrain': 'ktrain',
    'textattack': 'textattack',
    'checklist': 'checklist',
    'nlpaug': 'nlpaug',
    'augly': 'augly',
    'albumentations': 'albumentations',
    'imgaug': 'imgaug',
    'kornia': 'kornia',
    'torchgeo': 'torchgeo',
    'geopandas': 'geopandas',
    'osmnx': 'osmnx',
    'networkx': 'networkx',
    'pyvis': 'pyvis',
    'pygraphviz': 'pygraphviz',
    'graphviz': 'graphviz',
    'diagrams': 'diagrams',
    'schemdraw': 'schemdraw',
    'drawsvg': 'drawsvg',
    'svgwrite': 'svgwrite',
    'cairosvg': 'cairosvg',
    'reportlab': 'reportlab',
    'fpdf2': 'fpdf',
    'weasyprint': 'weasyprint',
    'pdfkit': 'pdfkit',
    'xhtml2pdf': 'xhtml2pdf',
    'pikepdf': 'pikepdf',
    'PyPDF2': 'PyPDF2',
    'PyMuPDF': 'fitz',
    'pdfminer.six': 'pdfminer',
    'camelot-py': 'camelot',
    'tabula-py': 'tabula',
    'pdfplumber': 'pdfplumber',
    'openpyxl': 'openpyxl',
    'xlrd': 'xlrd',
    'xlwt': 'xlwt',
    'XlsxWriter': 'xlsxwriter',
    'pyexcel': 'pyexcel',
    'odfpy': 'odf',
    'pyxlsb': 'pyxlsb',
    'tables': 'tables',
    'h5py': 'h5py',
    'zarr': 'zarr',
    'netCDF4': 'netCDF4',
    'scipy': 'scipy',
    'statsmodels': 'statsmodels',
    'prophet': 'prophet',
    'pmdarima': 'pmdarima',
    'greykite': 'greykite',
    'neuralprophet': 'neuralprophet',
    'tslearn': 'tslearn',
    'dtw-python': 'dtw',
    'fastdtw': 'fastdtw',
    'dtaidistance': 'dtaidistance',
    'sktime': 'sktime',
    'tsfresh': 'tsfresh',
    'pycatch22': 'catch22',
    'featuretools': 'featuretools',
    'tpot': 'tpot',
    'autogluon': 'autogluon',
    'auto-sklearn': 'auto_sklearn',
    'flaml': 'flaml',
    'h2o': 'h2o',
    'lightautoml': 'lightautoml',
    'catboost': 'catboost',
    'xgboost': 'xgboost',
    'lightgbm': 'lightgbm',
    'ngboost': 'ngboost',
    'scikit-learn-intelex': 'sklearn_ex',
    'cuml-cu11': 'cuml',
    'cugraph-cu11': 'cugraph',
    'cupy-cuda12x': 'cupy',
    'numba': 'numba',
    'cython': 'cython',
    'pybind11': 'pybind11',
    'cppyy': 'cppyy',
    'cffi': 'cffi',
    'ctypes': 'ctypes',
    'pyobjc': 'pyobjc',
    'comtypes': 'comtypes',
    'pywin32': 'pywin32',
    'WMI': 'wmi',
    'psutil': 'psutil',
    'GPUtil': 'GPUtil',
    'nvidia-ml-py': 'pynvml',
    'py3nvml': 'py3nvml',
    'py-cpuinfo': 'cpuinfo',
    'distro': 'distro',
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
    'tty', 'crypt', 'ssl', 'select', 'mmap', 'ctypes', 'faulthandler',
    'symtable', 'compileall', 'py_compile', 'zipimport', 'pkgutil',
    'modulefinder', 'runpy', 'importlib', 'parser', 'code', 'codeop',
    'numbers', 'statistics', 'fractions', 'random', 'math', 'cmath',
    'decimal', 'fractions', 'operator', 'array', 'bisect', 'heapq',
    'queue', 'types', 'copy', 'pprint', 'reprlib', 'enum', 'graphlib',
    'calendar', 'time', 'datetime', 'zoneinfo', 'math', 'random',
    'statistics', 'secrets', 'hmac', 'hashlib', 'itertools', 'functools',
    'operator', 'string', 're', 'difflib', 'textwrap', 'unicodedata',
    'stringprep', 'readline', 'rlcompleter', 'struct', 'codecs',
    'encodings', 'base64', 'binascii', 'quopri', 'uu', 'html', 'xml',
    'webbrowser', 'cgi', 'cgitb', 'wsgiref', 'xmlrpc', 'ipaddress',
    'mailbox', 'mimetypes', 'email', 'smtplib', 'poplib', 'imaplib',
    'nntplib', 'smtplib', 'smtpd', 'telnetlib', 'uuid', 'socketserver',
    'http', 'ftplib', 'poplib', 'imaplib', 'nntplib', 'smtplib', 'smtpd',
    'telnetlib', 'urllib', 'http', 'ftplib', 'xmlrpc', 'ipaddress',
    'socket', 'ssl', 'select', 'selectors', 'mmap', 'ctypes', 'concurrent',
    'asyncio', 'queue', 'sched', 'contextvars', 'threading', 'multiprocessing',
    'subprocess', 'sched', 'queue', 'contextvars', 'threading', 'multiprocessing',
    'subprocess', 'sched', 'queue', 'contextvars', 'threading', 'multiprocessing',
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
    "ConnectionError": { aciklama: "🌐 Bağlantı Hatası.", cozum: "İnternet bağlantınızı kontrol edin." },
    "ReadTimeoutError": { aciklama: "⏱️ Zaman Aşımı.", cozum: "Ağ bağlantınızı kontrol edin." },
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
    "ConnectionResetError": { aciklama: "🔄 Bağlantı Sıfırlandı.", cozum: "Sunucu yanıt vermiyor olabilir." },
    "OSError": { aciklama: "💽 İşletim Sistemi Hatası.", cozum: "Dosya/izin kontrolü yapın." },
    "IOError": { aciklama: "💽 G/Ç Hatası.", cozum: "Dosya yolunu kontrol edin." },
    "EOFError": { aciklama: "🔚 Dosya Sonu Hatası.", cozum: "Girdi akışını kontrol edin." },
    "KeyboardInterrupt": { aciklama: "⌨️ Klavye Kesmesi.", cozum: "Kullanıcı işlemi iptal etti." },
    "SystemExit": { aciklama: "🚪 Sistem Çıkışı.", cozum: "Program normal sonlandı." },
    "GeneratorExit": { aciklama: "🚪 Jeneratör Çıkışı.", cozum: "Jeneratör kapatıldı." },
    "StopIteration": { aciklama: "🛑 İterasyon Sonu.", cozum: "Döngü sona erdi." },
    "StopAsyncIteration": { aciklama: "🛑 Asenkron İterasyon Sonu.", cozum: "Asenkron döngü sona erdi." },
    "ArithmeticError": { aciklama: "🔢 Aritmetik Hatası.", cozum: "Matematiksel işlemi kontrol edin." },
    "FloatingPointError": { aciklama: "🔢 Kayan Nokta Hatası.", cozum: "Hassasiyeti kontrol edin." },
    "OverflowError": { aciklama: "🔢 Taşma Hatası.", cozum: "Sayı çok büyük." },
    "LookupError": { aciklama: "🔍 Arama Hatası.", cozum: "İndeks/anahtar kontrolü." },
    "RuntimeError": { aciklama: "⚙️ Çalışma Zamanı Hatası.", cozum: "Kod mantığını kontrol edin." },
    "NotImplementedError": { aciklama: "🚧 Uygulanmamış.", cozum: "Bu metod henüz yazılmamış." },
    "AssertionError": { aciklama: "❓ Doğrulama Hatası.", cozum: "Assert koşulunu kontrol edin." },
    "BufferError": { aciklama: "🔲 Tampon Hatası.", cozum: "Bellek tamponunu kontrol edin." },
    "ReferenceError": { aciklama: "🔗 Referans Hatası.", cozum: "Zayıf referans kontrolü." },
    "Exception": { aciklama: "❗ Genel Hata.", cozum: "Hata detayını kontrol edin." },
    "BaseException": { aciklama: "❗ Temel Hata.", cozum: "Hata detayını kontrol edin." },
};

function turkceHataCozum(hataMesaji: string): { hataTur: string; cozum: HataCozum } | null {
    for (const [hataTur, cozum] of Object.entries(HATA_SOZLUGU)) {
        if (hataMesaji.includes(hataTur)) return { hataTur, cozum };
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
            timeout: 300000 // 5 dakika zaman aşımı
        }, (error, stdout, stderr) => {
            if (error) reject(new Error(stderr || error.message));
            else resolve(stdout);
        });
    });
}

function getActivateCmd(isWindows: boolean): string {
    return isWindows ? '.venv\\Scripts\\activate.bat' : '. .venv/bin/activate';
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
            } catch {}
        }));
    } catch {}
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
            if (r.status === 'rejected') eksikler.push(chunk[idx]);
        });
    }
    return eksikler;
}

function getOrCreateTerminal(name: string): vscode.Terminal {
    return vscode.window.terminals.find(t => t.name === name) || vscode.window.createTerminal(name);
}

function gitignoreOlustur(rootPath: string) {
    const p = path.join(rootPath, '.gitignore');
    if (fs.existsSync(p)) return;
    fs.writeFileSync(p, `# Python\n__pycache__/\n*.py[cod]\n*$py.class\n*.so\n.Python\nbuild/\ndevelop-eggs/\ndist/\ndownloads/\neggs/\n.eggs/\nlib/\nlib64/\nparts/\nsdist/\nvar/\nwheels/\n*.egg-info/\n.installed.cfg\n*.egg\nMANIFEST\n\n# Virtual Environment\n.venv/\nvenv/\nENV/\nenv/\n\n# IDE\n.vscode/\n.idea/\n*.swp\n*.swo\n*~\n\n# Environment\n.env\n.env.local\n.env.*.local\n\n# OS\n.DS_Store\nThumbs.db\nDesktop.ini\n\n# Logs\n*.log\n\n# Testing\n.pytest_cache/\n.coverage\nhtmlcov/\n.tox/\n.mypy_cache/\n.ruff_cache/\n\n# Jupyter\n.ipynb_checkpoints/\n\n# Distribution\n*.egg-info/\n.eggs/\n`);
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
                    /os\.environ\[?['"](\w+)['"]\]?/g,
                    /os\.environ\.get\(['"](\w+)['"]/g,
                    /config\(['"](\w+)['"]\)/g,
                    /settings\.get\(['"](\w+)['"]/g,
                    /load_dotenv\(\)/g,
                ];
                for (const pattern of patterns) {
                    let m; while ((m = pattern.exec(content)) !== null) degiskenler.add(m[1]);
                }
            } catch {}
        }
    } catch {}
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
            case 'venv_recreate':
                progress.report({ message: "♻️ Sanal ortam sıfırlanıyor..." });
                const venvPath = path.join(rootPath, '.venv');
                if (fs.existsSync(venvPath)) fs.rmSync(venvPath, { recursive: true, force: true });
                await runCommand(`${pythonCmd} -m venv .venv`, rootPath);
                progress.report({ message: "📦 Temel paketler kuruluyor..." });
                await runCommand(`${pipCmd} install --upgrade pip setuptools wheel ${pipIndexUrl}`, rootPath);
                return true;
            case 'cache_clear':
                progress.report({ message: "🧹 Pip cache temizleniyor..." });
                await runCommand(`${pipCmd} cache purge`, rootPath);
                return true;
            default: return false;
        }
    } catch (e) { 
        log(`Self-healing hatası (${tip}): ${e}`, 'ERROR');
        return false; 
    }
}

// ==================== HATA İSTATİSTİKLERİ ====================
function hataKaydet(context: vscode.ExtensionContext, hataTur: string, proje: string) {
    if (!vscode.workspace.getConfiguration('pyotobaslat').get('hataIstatistikleriKaydet')) return;
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
function performansRaporuOlustur(context: vscode.ExtensionContext, profilVerisi: string) {
    const panel = vscode.window.createWebviewPanel('pyotobaslatPerformans', '⚡ Performans Raporu', vscode.ViewColumn.One, { enableScripts: true });
    const satirlar = profilVerisi.split('\n').filter(s => s.trim());
    const baslikIdx = satirlar.findIndex(s => s.includes('ncalls') && s.includes('tottime'));
    const veri = baslikIdx > -1 ? satirlar.slice(baslikIdx + 1).map(s => {
        const p = s.trim().split(/\s+/);
        return p.length >= 5 ? { ncalls: p[0], tottime: parseFloat(p[1]), percall: parseFloat(p[2]), cumtime: parseFloat(p[3]), filename: p.slice(4).join(' ') } : null;
    }).filter(Boolean) : [];

    panel.webview.html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><style>
body{font-family:var(--vscode-font-family);padding:20px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
h2{color:var(--vscode-textLink-foreground);margin-bottom:15px}
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
<div class="info">💡 Sütun başlıklarına tıklayarak sıralama yapabilirsiniz. Kırmızı renkli satırlar en çok zaman harcayan fonksiyonlardır.</div>
<table><thead><tr>
<th onclick="sort(0)">📞 Çağrı Sayısı</th>
<th onclick="sort(1)">⏱️ Toplam Süre (s)</th>
<th onclick="sort(2)">📊 Çağrı Başına (s)</th>
<th onclick="sort(3)">📈 Kümülatif Süre (s)</th>
<th>📄 Dosya / Fonksiyon</th>
</tr></thead><tbody id="tb"></tbody></table>
<script>const d=${JSON.stringify(veri)};const mx=Math.max(...d.map(r=>r.cumtime),0.001);let dir={};
function render(c=3,a=false){const s=[...d].sort((x,y)=>{const k=['ncalls','tottime','percall','cumtime'];return a?x[k[c]]-y[k[c]]:y[k[c]]-x[k[c]];});
document.getElementById('tb').innerHTML=s.map(r=>{const w=(r.cumtime/mx*100).toFixed(1);const sl=r.tottime>0.1?'slow':'';
return \`<tr><td>\${r.ncalls}</td><td class="\${sl}">\${r.tottime.toFixed(4)}</td><td>\${r.percall.toFixed(4)}</td><td>\${r.cumtime.toFixed(4)}<div class="bar" style="width:\${w}%"></div></td><td>\${r.filename}</td></tr>\`;}).join('');}
function sort(c){dir[c]=!dir[c];render(c,dir[c]);}render();</script></body></html>`;
}

// ==================== WEBVIEW: HATA İSTATİSTİKLERİ ====================
function hataIstatistikleriGoster(context: vscode.ExtensionContext) {
    const istatistikler = context.globalState.get<Record<string, { sayi: number; sonTarih: string; proje: string }>>('hataIstatistikleri') || {};
    const panel = vscode.window.createWebviewPanel('pyotobaslatHataIstatistikleri', '📊 Hata İstatistikleri', vscode.ViewColumn.One, { enableScripts: true });
    
    const veri = Object.entries(istatistikler).sort((a, b) => b[1].sayi - a[1].sayi);
    
    panel.webview.html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><style>
body{font-family:var(--vscode-font-family);padding:20px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
h2{color:var(--vscode-textLink-foreground)}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:15px}
th{background:var(--vscode-editorGroupHeader-tabsBackground);padding:10px;text-align:left}
td{padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border)}
tr:hover{background:var(--vscode-list-hoverBackground)}
.sayi{font-weight:bold;color:var(--vscode-textLink-foreground);font-size:16px}
.info{margin:15px 0;padding:10px;background:var(--vscode-textBlockQuote-background);border-left:3px solid var(--vscode-textLink-foreground);border-radius:4px}
</style></head><body>
<h2>📊 Hata İstatistikleri</h2>
<div class="info">💡 En sık karşılaşılan hatalar üstte listelenir. Bu veriler sadece yerel olarak saklanır.</div>
${veri.length === 0 ? '<p>🎉 Henüz kaydedilmiş hata yok!</p>' : `
<table><thead><tr><th>Hata Türü</th><th>Karşılaşma Sayısı</th><th>Son Tarih</th><th>Proje</th></tr></thead>
<tbody>${veri.map(([tur, bilgi]) => `<tr><td>${tur}</td><td class="sayi">${bilgi.sayi}</td><td>${bilgi.sonTarih}</td><td>${bilgi.proje}</td></tr>`).join('')}</tbody></table>`}
</body></html>`;
}

// ==================== WEBVIEW: PROJE SAĞLIK RAPORU ====================
function saglikRaporuGoster(veriler: { kategori: string; durum: 'ok' | 'uyari' | 'hata'; mesaj: string }[]) {
    const panel = vscode.window.createWebviewPanel('pyotobaslatSaglik', '🏥 Proje Sağlık Raporu', vscode.ViewColumn.One, { enableScripts: true });
    
    const ikonlar = { ok: '✅', uyari: '⚠️', hata: '❌' };
    const renkler = { ok: 'var(--vscode-testing-iconPassed)', uyari: 'var(--vscode-editorWarning-foreground)', hata: 'var(--vscode-errorForeground)' };
    
    panel.webview.html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><style>
body{font-family:var(--vscode-font-family);padding:20px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
h2{color:var(--vscode-textLink-foreground)}
.item{padding:12px;margin:8px 0;border-radius:6px;border-left:4px solid;display:flex;align-items:center;gap:10px}
.ok{border-color:var(--vscode-testing-iconPassed);background:rgba(0,255,0,0.05)}
.uyari{border-color:var(--vscode-editorWarning-foreground);background:rgba(255,255,0,0.05)}
.hata{border-color:var(--vscode-errorForeground);background:rgba(255,0,0,0.05)}
.ikon{font-size:20px}
.kategori{font-weight:bold;min-width:150px}
</style></head><body>
<h2>🏥 Proje Sağlık Raporu</h2>
${veriler.map(v => `<div class="item ${v.durum}"><span class="ikon">${ikonlar[v.durum]}</span><span class="kategori">${v.kategori}</span><span>${v.mesaj}</span></div>`).join('')}
</body></html>`;
}

// ==================== ANA EXTENSION ====================
export function activate(context: vscode.ExtensionContext) {
    logChannel = vscode.window.createOutputChannel('🐍 PyOtoBaşlat');
    context.subscriptions.push(logChannel);
    log('PyOtoBaşlat v2.1.0 başlatıldı');

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
        const rp = wf.uri.fsPath, vp = path.join(rp, '.venv'), win = process.platform === 'win32';
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
    if (wf) gitignoreOlustur(wf.uri.fsPath);

    // ==================== 1. HAZIRLA VE ÇALIŞTIR ====================
    const hazirlaKomutu = vscode.commands.registerCommand('pyotobaslat.hazirlaVeCalistir', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Lütfen önce bir Python proje klasörü açın!'); return; }
        const rp = w.uri.fsPath, win = process.platform === 'win32';
        const pc = win ? 'python' : 'python3';
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const vp = path.join(rp, '.venv'), req = path.join(rp, 'requirements.txt');
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
                            vscode.window.showWarningMessage(`⚠️ Kurulum hatası. Otomatik düzeltiliyor...`);
                            const duzeltildi = await otomatikDuzelt(rp, hb.cozum.healingType, pip, pc, progress, hm);
                            if (duzeltildi) {
                                progress.report({ message: "🔄 Kurulum tekrar deneniyor..." });
                                await runCommand(`${pip} install -r requirements.txt`, rp);
                                vscode.window.showInformationMessage('✅ Hata düzeltildi, kurulum tamamlandı!');
                            } else { throw installError; }
                        } else { throw installError; }
                    }
                }

                // 3. DERİN PAKET TARAMASI
                if (config.get('otomatikPaketKontrol')) {
                    progress.report({ message: "Eksik modüller taranıyor (derin tarama)..." });
                    const venvPython = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
                    const eksik = await eksikPaketleriKontrolEt(rp, venvPython);
                    if (eksik.length > 0) {
                        const sec = await vscode.window.showWarningMessage(
                            `📦 ${eksik.length} eksik modül: ${eksik.slice(0,3).join(', ')}`,
                            "Otomatik Kur", "Yoksay"
                        );
                        if (sec === "Otomatik Kur") {
                            progress.report({ message: "Eksik modüller kuruluyor..." });
                            await runCommand(`${pip} install ${eksik.join(' ')}`, rp);
                            let ri = fs.existsSync(req) ? fs.readFileSync(req, 'utf-8') : '';
                            eksik.forEach(p => { if (!ri.includes(p)) ri += `\n${p}`; });
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
                    const tf = pyf.find(f => ['main.py','app.py','run.py'].includes(f)) || pyf[0];
                    if (!tf) throw new Error('Projede .py dosyası bulunamadı!');
                    cmd = `${act} && python ${tf}`;
                    progress.report({ message: `${tf} başlatılıyor...` });
                }
                term.sendText(cmd); term.show();
                vscode.window.showInformationMessage('🚀 Proje başarıyla başlatıldı!');

            } catch (error: any) {
                const hm = error.message || String(error);
                const hb = turkceHataCozum(hm);
                hataKaydet(context, hb?.hataTur || 'Bilinmeyen', path.basename(rp));

                if (hb?.cozum.healingType === 'pip_install' && config.get('selfHealingAktif')) {
                    vscode.window.showWarningMessage(`⚠️ ${hb.cozum.aciklama} Otomatik düzeltiliyor...`);
                    const duzeltildi = await otomatikDuzelt(rp, 'pip_install', pip, pc, { report: () => {} } as any, hm);
                    if (duzeltildi) {
                        vscode.window.showInformationMessage('✅ Modül kuruldu! Projeyi tekrar başlatın.');
                        return;
                    }
                }

                if (hb && config.get('hataCevirmeniAktif')) {
                    const { hataTur, cozum } = hb;
                    const btns = ["Anladım"]; if (cozum.komut) btns.push("Manuel Düzelt"); btns.push("Detaylı Yardım");
                    const sec = await vscode.window.showErrorMessage(`❌ ${hataTur}: ${cozum.aciklama}`, { modal: true, detail: cozum.cozum }, ...btns);
                    if (sec === "Manuel Düzelt" && cozum.komut) {
                        const term = getOrCreateTerminal('🐍 PyOtoBaşlat');
                        if (cozum.komut === "port_degistir") {
                            const port = await vscode.window.showInputBox({ prompt: "Yeni port:", value: "8001" });
                            if (port) { term.sendText(`${act} && python manage.py runserver ${port}`); term.show(); }
                        } else {
                            const pkg = hm.match(/No module named '([\w.]+)'/)?.[1] || 'paket';
                            const pipPaket = PAKET_ESLESTIRME[pkg] || PAKET_ESLESTIRME[pkg.split('.')[0]] || pkg.split('.')[0];
                            term.sendText(`${pip} install ${pipPaket}`); term.show();
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
        const rp = w.uri.fsPath, win = process.platform === 'win32';
        const act = getActivateCmd(win);
        const pyf = fs.readdirSync(rp).filter(f => f.endsWith('.py'));
        const tf = pyf.find(f => ['main.py','app.py','run.py'].includes(f)) || pyf[0];
        if (!tf) { vscode.window.showErrorMessage('❌ .py dosyası bulunamadı!'); return; }
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "⚡ Performans analizi...", cancellable: false }, async (progress) => {
            try {
                progress.report({ message: `${tf} profil ediliyor...` });
                const out = await runCommand(`${act} && python -m cProfile -s cumulative ${tf}`, rp);
                performansRaporuOlustur(context, out);
            } catch (e: any) {
                const msg = e.message || String(e);
                if (msg.includes('ncalls')) performansRaporuOlustur(context, msg);
                else vscode.window.showErrorMessage(`❌ Performans hatası: ${msg}`);
            }
        });
    });

    // ==================== 3. PAKET GÜNCELLEME ====================
    const paketGuncelleKomutu = vscode.commands.registerCommand('pyotobaslat.paketleriGuncelle', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath, win = process.platform === 'win32';
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
                    eksik.forEach(p => { if (!ri.includes(p)) ri += `\n${p}`; });
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
        const rp = w.uri.fsPath, win = process.platform === 'win32';
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const act = getActivateCmd(win);
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🔒 Güvenlik taraması...", cancellable: false }, async (progress) => {
            try {
                try { await runCommand(`${pip} show pip-audit`, rp); } catch { progress.report({ message: "pip-audit kuruluyor..." }); await runCommand(`${pip} install pip-audit`, rp); }
                progress.report({ message: "Bağımlılıklar taranıyor..." });
                const term = getOrCreateTerminal('🔒 PyOtoBaşlat Güvenlik');
                term.sendText(`${act} && pip-audit --desc on`); term.show();
                vscode.window.showInformationMessage('🔒 Güvenlik taraması başladı!');
            } catch (e: any) { vscode.window.showErrorMessage(`❌ Güvenlik hatası: ${e.message}`); }
        });
    });

    // ==================== 5. PROJE SAĞLIK KONTROLÜ (YENİ) ====================
    const saglikKomutu = vscode.commands.registerCommand('pyotobaslat.projeSaglikKontrolu', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath, win = process.platform === 'win32';
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const venvPython = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
        const sonuclar: { kategori: string; durum: 'ok' | 'uyari' | 'hata'; mesaj: string }[] = [];

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🏥 Proje sağlık kontrolü...", cancellable: false }, async (progress) => {
            // 1. Python sürümü
            progress.report({ message: "Python sürümü kontrol ediliyor..." });
            try {
                const v = await runCommand(`${venvPython} --version`, rp);
                sonuclar.push({ kategori: 'Python Sürümü', durum: 'ok', mesaj: v.trim() });
            } catch { sonuclar.push({ kategori: 'Python Sürümü', durum: 'hata', mesaj: 'Python bulunamadı!' }); }

            // 2. Venv durumu
            progress.report({ message: "Sanal ortam kontrol ediliyor..." });
            if (fs.existsSync(path.join(rp, '.venv'))) {
                sonuclar.push({ kategori: 'Sanal Ortam', durum: 'ok', mesaj: '.venv mevcut' });
            } else {
                sonuclar.push({ kategori: 'Sanal Ortam', durum: 'uyari', mesaj: '.venv bulunamadı' });
            }

            // 3. requirements.txt
            progress.report({ message: "requirements.txt kontrol ediliyor..." });
            if (fs.existsSync(path.join(rp, 'requirements.txt'))) {
                sonuclar.push({ kategori: 'requirements.txt', durum: 'ok', mesaj: 'Mevcut' });
            } else {
                sonuclar.push({ kategori: 'requirements.txt', durum: 'uyari', mesaj: 'Bulunamadı (önerilir)' });
            }

            // 4. .gitignore
            progress.report({ message: ".gitignore kontrol ediliyor..." });
            if (fs.existsSync(path.join(rp, '.gitignore'))) {
                sonuclar.push({ kategori: '.gitignore', durum: 'ok', mesaj: 'Mevcut' });
            } else {
                sonuclar.push({ kategori: '.gitignore', durum: 'uyari', mesaj: 'Bulunamadı (önerilir)' });
            }

            // 5. Eksik paketler
            progress.report({ message: "Eksik paketler taranıyor..." });
            try {
                const eksik = await eksikPaketleriKontrolEt(rp, venvPython);
                if (eksik.length === 0) {
                    sonuclar.push({ kategori: 'Paketler', durum: 'ok', mesaj: 'Tüm paketler kurulu' });
                } else {
                    sonuclar.push({ kategori: 'Paketler', durum: 'hata', mesaj: `${eksik.length} eksik: ${eksik.slice(0,3).join(', ')}` });
                }
            } catch { sonuclar.push({ kategori: 'Paketler', durum: 'uyari', mesaj: 'Tarama yapılamadı' }); }

            // 6. Eski paketler
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

            // 7. Docker algılama
            progress.report({ message: "Docker kontrol ediliyor..." });
            if (fs.existsSync(path.join(rp, 'Dockerfile')) || fs.existsSync(path.join(rp, 'docker-compose.yml'))) {
                sonuclar.push({ kategori: 'Docker', durum: 'ok', mesaj: 'Docker yapılandırması bulundu' });
            } else {
                sonuclar.push({ kategori: 'Docker', durum: 'uyari', mesaj: 'Dockerfile yok (opsiyonel)' });
            }

            // 8. Conda algılama
            progress.report({ message: "Conda kontrol ediliyor..." });
            if (fs.existsSync(path.join(rp, 'environment.yml'))) {
                sonuclar.push({ kategori: 'Conda', durum: 'ok', mesaj: 'environment.yml bulundu' });
            }

            // 9. Test dosyaları
            progress.report({ message: "Testler kontrol ediliyor..." });
            const testFiles = await vscode.workspace.findFiles('**/test_*.py', '**/{.venv,node_modules}/**');
            if (testFiles.length > 0) {
                sonuclar.push({ kategori: 'Testler', durum: 'ok', mesaj: `${testFiles.length} test dosyası bulundu` });
            } else {
                sonuclar.push({ kategori: 'Testler', durum: 'uyari', mesaj: 'Test dosyası bulunamadı' });
            }

            // 10. .env dosyası
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

    // ==================== 6. TEST ÇALIŞTIRICI (YENİ) ====================
    const testKomutu = vscode.commands.registerCommand('pyotobaslat.testleriCalistir', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath, win = process.platform === 'win32';
        const act = getActivateCmd(win);
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const testAraci = config.get('testCalistirici') as string;
        const term = getOrCreateTerminal('🧪 PyOtoBaşlat Test');

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🧪 Testler hazırlanıyor...", cancellable: false }, async (progress) => {
            try {
                // Test aracı kurulu mu?
                try {
                    await runCommand(`${pip} show ${testAraci}`, rp);
                } catch {
                    progress.report({ message: `${testAraci} kuruluyor...` });
                    await runCommand(`${pip} install ${testAraci}`, rp);
                }
                progress.report({ message: "Testler çalıştırılıyor..." });
                const cmd = testAraci === 'pytest' 
                    ? `${act} && python -m pytest -v --tb=short`
                    : `${act} && python -m unittest discover -v`;
                term.sendText(cmd); term.show();
                vscode.window.showInformationMessage('🧪 Testler terminalde başladı!');
            } catch (e: any) { vscode.window.showErrorMessage(`❌ Test hatası: ${e.message}`); }
        });
    });

    // ==================== 7. KOD KALİTESİ (YENİ) ====================
    const kaliteKomutu = vscode.commands.registerCommand('pyotobaslat.kodKalitesi', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath, win = process.platform === 'win32';
        const act = getActivateCmd(win);
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const kaliteAraci = config.get('kodKalitesiAraci') as string;
        const term = getOrCreateTerminal('✨ PyOtoBaşlat Kalite');

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "✨ Kod kalitesi kontrolü...", cancellable: false }, async (progress) => {
            try {
                try {
                    await runCommand(`${pip} show ${kaliteAraci}`, rp);
                } catch {
                    progress.report({ message: `${kaliteAraci} kuruluyor...` });
                    await runCommand(`${pip} install ${kaliteAraci}`, rp);
                }
                progress.report({ message: "Kod analiz ediliyor..." });
                let cmd = '';
                if (kaliteAraci === 'ruff') cmd = `${act} && ruff check . --output-format=text`;
                else if (kaliteAraci === 'flake8') cmd = `${act} && flake8 . --max-line-length=120`;
                else cmd = `${act} && pylint **/*.py --disable=C0114,C0115,C0116`;
                term.sendText(cmd); term.show();
                vscode.window.showInformationMessage('✨ Kod kalitesi raporu terminalde!');
            } catch (e: any) { vscode.window.showErrorMessage(`❌ Kalite kontrolü hatası: ${e.message}`); }
        });
    });

    // ==================== 8. HATA İSTATİSTİKLERİ (YENİ) ====================
    const istatistikKomutu = vscode.commands.registerCommand('pyotobaslat.hataIstatistikleri', () => {
        hataIstatistikleriGoster(context);
    });

    // ==================== 9. ORTAMI TEMİZLE (YENİ) ====================
    const temizleKomutu = vscode.commands.registerCommand('pyotobaslat.ortamiTemizle', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath;

        const sec = await vscode.window.showWarningMessage(
            '🧹 Ortam temizlenecek: __pycache__, .pyc, .pytest_cache, .mypy_cache silinecek. Devam edilsin mi?',
            { modal: true },
            "Evet, Temizle"
        );
        if (sec !== "Evet, Temizle") return;

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🧹 Ortam temizleniyor...", cancellable: false }, async (progress) => {
            let silinen = 0;
            const hedefler = ['__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.tox'];
            for (const hedef of hedefler) {
                progress.report({ message: `${hedef} temizleniyor...` });
                const temizlenecekler = await vscode.workspace.findFiles(`**/${hedef}/**`, '**/node_modules/**');
                for (const file of temizlenecekler) {
                    try {
                        const dir = path.dirname(file.fsPath);
                        if (fs.existsSync(dir)) {
                            fs.rmSync(dir, { recursive: true, force: true });
                            silinen++;
                        }
                    } catch {}
                }
            }
            // .pyc dosyaları
            const pycFiles = await vscode.workspace.findFiles('**/*.pyc', '**/node_modules/**');
            for (const file of pycFiles) {
                try { fs.unlinkSync(file.fsPath); silinen++; } catch {}
            }
            // Pip cache
            try {
                const pip = process.platform === 'win32' ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
                await runCommand(`${pip} cache purge`, rp);
            } catch {}
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
