// Import adı -> güvenli PyPI paket adı eşleştirmesi.
// Yalnızca açıkça bilinen eşleştirmeler otomatik kurulur; proje içi modüller asla gönderilmez.
export const IMPORT_TO_PACKAGE: Record<string, string> = {
    // Görüntü / veri
    cv2: 'opencv-python', skimage: 'scikit-image', PIL: 'Pillow',
    sklearn: 'scikit-learn', numpy: 'numpy', pandas: 'pandas', scipy: 'scipy',
    matplotlib: 'matplotlib', mpl_toolkits: 'matplotlib', seaborn: 'seaborn',
    plotly: 'plotly', bokeh: 'bokeh', dash: 'dash', networkx: 'networkx',
    sympy: 'sympy', statsmodels: 'statsmodels', h5py: 'h5py', tables: 'PyTables',
    zarr: 'zarr', netCDF4: 'netCDF4',
    // ML / AI
    torch: 'torch', torchvision: 'torchvision', torchaudio: 'torchaudio',
    tensorflow: 'tensorflow', keras: 'keras', transformers: 'transformers',
    datasets: 'datasets', tokenizers: 'tokenizers', sentencepiece: 'sentencepiece',
    accelerate: 'accelerate', peft: 'peft', diffusers: 'diffusers',
    huggingface_hub: 'huggingface-hub', openai: 'openai', anthropic: 'anthropic',
    langchain: 'langchain', chromadb: 'chromadb', faiss: 'faiss-cpu',
    spacy: 'spacy', nltk: 'nltk', gensim: 'gensim', scikit_learn: 'scikit-learn',
    joblib: 'joblib', numba: 'numba', optuna: 'optuna', mlflow: 'mlflow',
    wandb: 'wandb', tensorboard: 'tensorboard', onnx: 'onnx', onnxruntime: 'onnxruntime',
    xgboost: 'xgboost', lightgbm: 'lightgbm', catboost: 'catboost',
    // Web / HTTP / config
    requests: 'requests', httpx: 'httpx', aiohttp: 'aiohttp', websockets: 'websockets',
    fastapi: 'fastapi', flask: 'Flask', django: 'Django', streamlit: 'streamlit',
    uvicorn: 'uvicorn', gunicorn: 'gunicorn', jinja2: 'Jinja2', werkzeug: 'Werkzeug',
    pydantic: 'pydantic', yaml: 'PyYAML', dotenv: 'python-dotenv', toml: 'toml',
    tomllib: 'tomli', bs4: 'beautifulsoup4', lxml: 'lxml', scrapy: 'Scrapy',
    selenium: 'selenium', playwright: 'playwright',
    // Veritabanı
    sqlalchemy: 'SQLAlchemy', psycopg2: 'psycopg2-binary', pymysql: 'PyMySQL',
    MySQLdb: 'mysqlclient', pymongo: 'pymongo', motor: 'motor', redis: 'redis',
    sqlite_utils: 'sqlite-utils', alembic: 'alembic',
    // Framework eklentileri
    rest_framework: 'djangorestframework', django_filters: 'django-filter',
    django_cors_headers: 'django-cors-headers', allauth: 'django-allauth',
    drf_spectacular: 'drf-spectacular', flask_cors: 'flask-cors',
    flask_sqlalchemy: 'flask-sqlalchemy', flask_login: 'flask-login',
    flask_migrate: 'flask-migrate', flask_wtf: 'flask-wtf',
    // Auth / kripto
    jwt: 'PyJWT', jose: 'python-jose', bcrypt: 'bcrypt', passlib: 'passlib',
    cryptography: 'cryptography', Crypto: 'pycryptodome', nacl: 'PyNaCl',
    OpenSSL: 'pyOpenSSL',
    // PDF / ofis
    fitz: 'PyMuPDF', pypdf: 'pypdf', PyPDF2: 'PyPDF2', pdfplumber: 'pdfplumber',
    reportlab: 'reportlab', docx: 'python-docx', pptx: 'python-pptx',
    openpyxl: 'openpyxl', xlsxwriter: 'XlsxWriter', weasyprint: 'weasyprint',
    // Araçlar / test / kalite
    pytest: 'pytest', coverage: 'coverage', mypy: 'mypy', ruff: 'ruff',
    flake8: 'flake8', pylint: 'pylint', black: 'black', isort: 'isort',
    bandit: 'bandit', pip_audit: 'pip-audit', tox: 'tox', nox: 'nox',
    // GUI
    PyQt5: 'PyQt5', PyQt6: 'PyQt6', PySide6: 'PySide6', PySide2: 'PySide2',
    kivy: 'kivy', wx: 'wxPython', customtkinter: 'customtkinter',
    pyautogui: 'pyautogui', pynput: 'pynput',
    // Diğer yaygın paketler
    tqdm: 'tqdm', rich: 'rich', click: 'click', typer: 'typer', colorama: 'colorama',
    psutil: 'psutil', dateutil: 'python-dateutil', pytz: 'pytz', arrow: 'arrow',
    serial: 'pyserial', paramiko: 'paramiko', boto3: 'boto3', docker: 'docker',
    celery: 'celery', attrs: 'attrs', magic: 'python-magic', git: 'GitPython',
    whisper: 'openai-whisper', gtts: 'gTTS', speech_recognition: 'SpeechRecognition',
    qrcode: 'qrcode', pillow: 'Pillow'
};

export function normalizePackageName(name: string): string {
    return name.trim().toLowerCase().replace(/_/g, '-');
}

export function safePackageName(name: string): boolean {
    return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) && !name.startsWith('-');
}

// Python standart kütüphanesi (taramada üçüncü taraf sanılmaması için).
export const STDLIB_MODULES = new Set([
    'abc', 'argparse', 'array', 'ast', 'asyncio', 'base64', 'binascii', 'bisect',
    'builtins', 'bz2', 'calendar', 'cgi', 'cgitb', 'cmath', 'codecs', 'collections',
    'concurrent', 'configparser', 'contextlib', 'contextvars', 'copy', 'copyreg',
    'csv', 'ctypes', 'curses', 'dataclasses', 'datetime', 'decimal', 'difflib',
    'dis', 'email', 'encodings', 'enum', 'faulthandler', 'fcntl', 'filecmp',
    'fileinput', 'fnmatch', 'fractions', 'ftplib', 'functools', 'gc', 'getpass',
    'gettext', 'glob', 'graphlib', 'grp', 'gzip', 'hashlib', 'heapq', 'hmac',
    'html', 'http', 'imaplib', 'importlib', 'inspect', 'io', 'ipaddress',
    'itertools', 'json', 'keyword', 'linecache', 'locale', 'logging', 'lzma',
    'mailbox', 'marshal', 'math', 'mimetypes', 'mmap', 'modulefinder', 'multiprocessing',
    'netrc', 'numbers', 'operator', 'os', 'pathlib', 'pdb', 'pickle', 'pickletools',
    'pkgutil', 'platform', 'pprint', 'profile', 'pstats', 'pty', 'pwd', 'py_compile',
    'pyclbr', 'pydoc', 'queue', 'quopri', 'random', 're', 'readline', 'reprlib',
    'resource', 'runpy', 'sched', 'secrets', 'select', 'selectors', 'shelve',
    'shlex', 'shutil', 'signal', 'site', 'smtplib', 'socket', 'socketserver',
    'sqlite3', 'ssl', 'stat', 'statistics', 'string', 'stringprep', 'struct',
    'subprocess', 'sys', 'sysconfig', 'tarfile', 'tempfile', 'termios', 'textwrap',
    'threading', 'time', 'timeit', 'token', 'tokenize', 'trace', 'traceback',
    'tracemalloc', 'tty', 'types', 'typing', 'unicodedata', 'unittest', 'urllib',
    'uuid', 'uu', 'venv', 'warnings', 'wave', 'weakref', 'webbrowser', 'wsgiref',
    'xdrlib', 'xml', 'xmlrpc', 'zipapp', 'zipfile', 'zipimport', 'zlib', 'zoneinfo',
    '__future__', '_thread'
]);
