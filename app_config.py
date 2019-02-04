#!/usr/bin/env python
# _*_ coding:utf-8 _*_

"""
Project-wide application configuration.

DO NOT STORE SECRETS, PASSWORDS, ETC. IN THIS FILE.
They will be exposed to users. Use environment variables instead.
See get_secrets() below for a fast way to access them.
"""

import logging
import os
import json

from authomatic.providers import oauth2
from authomatic import Authomatic

with open("app_config.json") as f:
    raw = f.read();
    json_config = json.loads(raw)


"""
NAMES
"""
# Project name to be used in urls
# Use dashes, not underscores!
PROJECT_SLUG = 'anno-docs'

# Project name to be used in file paths
PROJECT_FILENAME = 'anno_docs'

# The name of the repository containing the source
REPOSITORY_NAME = 'anno-docs'
GITHUB_USERNAME = 'nprapps'
REPOSITORY_URL = 'git@github.com:%s/%s.git' % (
    GITHUB_USERNAME, REPOSITORY_NAME)
REPOSITORY_ALT_URL = None  # 'git@bitbucket.org:nprapps/%s.git' % REPOSITORY_NAME'

# Project name used for assets rig
# Should stay the same, even if PROJECT_SLUG changes
ASSETS_SLUG = 'anno-docs'

# DEPLOY SETUP CONFIG
FACTCHECKS_DIRECTORY_PREFIX = 'factchecks/'
CURRENT_FACTCHECK = '20190205-sotu-trump'
try:
    # Override CURRENT FACTCHECK
    from local_settings import CURRENT_FACTCHECK
except ImportError:
    pass

"""
DEPLOYMENT
"""
AWS_S3_REGION = 'us-east-1'

PRODUCTION_S3_BUCKET = 'apps.npr.org'

STAGING_S3_BUCKET = 'stage-apps.npr.org'

ASSETS_S3_BUCKET = 'assets.apps.npr.org'

ARCHIVE_S3_BUCKET = 'election-backup.apps.npr.org'

DEFAULT_MAX_AGE = 20

RELOAD_TRIGGER = False
RELOAD_CHECK_INTERVAL = 60

PRODUCTION_SERVERS = ['34.200.31.147']
STAGING_SERVERS = ['34.198.159.219']

# Should code be deployed to the web/cron servers?
DEPLOY_TO_SERVERS = True
try:
    # Override whether we should deploy to a cutom webserver
    from local_settings import DEPLOY_TO_SERVERS
except ImportError:
    pass

DEPLOY_STATIC_FACTCHECK = False
try:
    # Override whether we are going to deploy a static factcheck
    # from our local environment. Useful for non-live factchecks
    from local_settings import DEPLOY_STATIC_FACTCHECK
except ImportError:
    pass


SERVER_USER = 'ubuntu'
SERVER_PYTHON = 'python2.7'
SERVER_PROJECT_PATH = '/home/%s/apps/%s' % (SERVER_USER, PROJECT_FILENAME)
SERVER_REPOSITORY_PATH = '%s/repository' % SERVER_PROJECT_PATH
SERVER_VIRTUALENV_PATH = '%s/virtualenv' % SERVER_PROJECT_PATH

# Should the crontab file be installed on the servers?
# If True, DEPLOY_TO_SERVERS must also be True
DEPLOY_CRONTAB = False

# Should the service configurations be installed on the servers?
# If True, DEPLOY_TO_SERVERS must also be True
DEPLOY_SERVICES = False

UWSGI_SOCKET_PATH = '/tmp/%s.uwsgi.sock' % PROJECT_FILENAME

# Services are the server-side services we want to enable and configure.
# A three-tuple following this format:
# (service name, service deployment path, service config file extension)
SERVER_SERVICES = [
    ('deploy', '/etc/init', 'conf'),
]

# These variables will be set at runtime. See configure_targets() below
S3_BUCKET = None
S3_BASE_URL = None
S3_DEPLOY_URL = None
SERVERS = []
SERVER_BASE_URL = None
SERVER_LOG_PATH = None
DEBUG = True
LOG_LEVEL = None

"""
AUTHORS DICTIONARY
"""
# Complete
AUTHORS_GOOGLE_DOC_KEY = json_config['authors_doc']

try:
    # Override AUTHORS SPREADSHEET
    from local_settings import AUTHORS_GOOGLE_DOC_KEY
except ImportError:
    pass
AUTHORS_PATH = 'data/authors.xlsx'

TRANSCRIPT_HTML_PATH = 'data/transcript.html'
LOAD_COPY_INTERVAL = 10
# Number of cycles needed to refresh the author excel file
REFRESH_AUTHOR_CYCLES = 6

"""
GOOGLE APPS SCRIPTS
"""

PARENT_FOLDER_ID = '0B6C-jdxmvrJoM3JnZ1ZZUkhVQTg'
GAS_LOG_KEY = json_config['log_sheet'] # Google app script logs spreadsheet key
TRANSCRIPT_GDOC_KEY = json_config['transcript'] # Google app script google doc key
SCRIPT_PROJECT_NAME = 'factcheck_scripts' # Google app scripts project name
CSPAN = True
"""
SHARING
"""
SHARE_URL = 'http://%s/%s/' % (PRODUCTION_S3_BUCKET, PROJECT_SLUG)
EMBEDDING_PAGE = 'https://www.npr.org/templates/story/story.php?storyId=690345256'

"""
SERVICES
"""
NPR_GOOGLE_ANALYTICS = {
    'ACCOUNT_ID': 'UA-5828686-4',
    'DOMAIN': PRODUCTION_S3_BUCKET,
    'TOPICS': ''  # e.g. '[1014,3,1003,1002,1001]'
}

VIZ_GOOGLE_ANALYTICS = {
    'ACCOUNT_ID': 'UA-5828686-75'
}

"""
OAUTH
"""

GOOGLE_OAUTH_CREDENTIALS_PATH = '~/.google_oauth_credentials'

authomatic_config = {
    'google': {
        'id': 1,
        'class_': oauth2.Google,
        'consumer_key': os.environ.get('GOOGLE_OAUTH_CLIENT_ID'),
        'consumer_secret': os.environ.get('GOOGLE_OAUTH_CONSUMER_SECRET'),
        'scope': ['https://www.googleapis.com/auth/drive',
                  'https://www.googleapis.com/auth/userinfo.email',
                  'https://www.googleapis.com/auth/drive.scripts',
                  'https://www.googleapis.com/auth/documents',
                  'https://www.googleapis.com/auth/script.external_request',
                  'https://www.googleapis.com/auth/script.scriptapp',
                  'https://www.googleapis.com/auth/script.send_mail',
                  'https://www.googleapis.com/auth/script.storage',
                  'https://www.googleapis.com/auth/spreadsheets'],
        'offline': True,
    },
}

authomatic = Authomatic(authomatic_config, os.environ.get('AUTHOMATIC_SALT'))

"""
Logging
"""
LOG_FORMAT = '%(levelname)s:%(name)s:%(asctime)s: %(message)s'

"""
Utilities
"""
SPEAKERS = {
    'HILLARY CLINTON': 'speaker dem',
    'TIM KAINE': 'speaker dem',
    'DONALD TRUMP': 'speaker gop',
    'MIKE PENCE': 'speaker gop'
}

def get_secrets():
    """
    A method for accessing our secrets.
    """
    secrets_dict = {}

    for k, v in os.environ.items():
        if k.startswith(PROJECT_FILENAME):
            k = k[len(PROJECT_FILENAME) + 1:]
            secrets_dict[k] = v

    return secrets_dict


def configure_targets(deployment_target):
    """
    Configure deployment targets. Abstracted so this can be
    overriden for rendering before deployment.
    """
    global S3_BUCKET
    global S3_BASE_URL
    global S3_DEPLOY_URL
    global SERVERS
    global SERVER_BASE_URL
    global SERVER_LOG_PATH
    global DEBUG
    global DEPLOYMENT_TARGET
    global LOG_LEVEL
    global ASSETS_MAX_AGE
    global TRANSCRIPT_GDOC_KEY
    global GAS_LOG_KEY
    global CSPAN

    if deployment_target == 'production':
        S3_BUCKET = PRODUCTION_S3_BUCKET
        S3_BASE_URL = 'https://%s/%s%s' % (
            S3_BUCKET,
            FACTCHECKS_DIRECTORY_PREFIX,
            CURRENT_FACTCHECK)
        S3_DEPLOY_URL = 's3://%s/%s' % (S3_BUCKET, PROJECT_SLUG)
        SERVERS = PRODUCTION_SERVERS
        SERVER_BASE_URL = '//%s/%s' % (SERVERS[0], PROJECT_SLUG)
        SERVER_LOG_PATH = '/var/log/%s' % PROJECT_FILENAME
        LOG_LEVEL = logging.INFO
        DEBUG = False
        ASSETS_MAX_AGE = 86400
        # PRODUCTION DOCUMENT
        # TRANSCRIPT_GDOC_KEY = '1gibir_r26oZ0gi3ujlXHtzuzNusQZUUj0KCuhYCdJSk'
        # PRODUCTION TEST DOCUMENT
        # TRANSCRIPT_GDOC_KEY = '1sK3FQ1VGh2bZZHoI2ontZWy_32UchVyIOZ2X5vbWJIo'
        # PRODUCTION LOGS
        # GAS_LOG_KEY = '1tUxTFa2J5IKIlOMLop9IA9eaZ6uDDhgh6KwxeLdgQGU'
    elif deployment_target == 'staging':
        S3_BUCKET = STAGING_S3_BUCKET
        S3_BASE_URL = 'https://s3.amazonaws.com/%s/%s%s' % (
            S3_BUCKET,
            FACTCHECKS_DIRECTORY_PREFIX,
            CURRENT_FACTCHECK)
        S3_DEPLOY_URL = 's3://%s/%s' % (S3_BUCKET, PROJECT_SLUG)
        SERVERS = STAGING_SERVERS
        SERVER_BASE_URL = 'https://%s/%s' % (SERVERS[0], PROJECT_SLUG)
        SERVER_LOG_PATH = '/var/log/%s' % PROJECT_FILENAME
        LOG_LEVEL = logging.INFO
        DEBUG = True
        ASSETS_MAX_AGE = 20
        # STAGING DOCUMENT
        # TRANSCRIPT_GDOC_KEY = '1gibir_r26oZ0gi3ujlXHtzuzNusQZUUj0KCuhYCdJSk'
        # STAGING LOGS
        # GAS_LOG_KEY = '1vpRgWpqGqW1p3yMv6nCixAjczc8cJr_TlMCTg52Ch9I'
    else:
        S3_BUCKET = None
        S3_BASE_URL = '//127.0.0.1:8000'
        S3_DEPLOY_URL = None
        SERVERS = []
        SERVER_BASE_URL = 'http://127.0.0.1:8001/%s' % PROJECT_SLUG
        SERVER_LOG_PATH = '/tmp'
        LOG_LEVEL = logging.INFO
        DEBUG = True
        ASSETS_MAX_AGE = 20
        # DEVELOPMENT DOCUMENT
        # TRANSCRIPT_GDOC_KEY = '1gibir_r26oZ0gi3ujlXHtzuzNusQZUUj0KCuhYCdJSk'
        # DEVELOPMENT LOGS
        # GAS_LOG_KEY = '1I7IUCUJHIWLW3c_E-ukfqIp4QxuvUoHqbEQIlKQFC7w'
        # Override S3_BASE_URL to use another port locally for fab app
        try:
            from local_settings import S3_BASE_URL
        except ImportError:
            pass
        try:
            from local_settings import TRANSCRIPT_GDOC_KEY
        except ImportError:
            pass
        # Override GAS_LOG_KEY to point to a different google app script log
        try:
            from local_settings import GAS_LOG_KEY
        except ImportError:
            pass
        # Override CSPAN if we need to
        try:
            from local_settings import CSPAN
        except ImportError:
            pass

    # If we are deploying a non live fact check:
    if DEPLOY_STATIC_FACTCHECK:
        # Override TRANSCRIPT_GDOC_KEY to point ALL environments to google doc
        try:
            from local_settings import TRANSCRIPT_GDOC_KEY
        except ImportError:
            pass
        # Override GAS_LOG_KEY to point to a different google app script log
        try:
            from local_settings import GAS_LOG_KEY
        except ImportError:
            pass

    DEPLOYMENT_TARGET = deployment_target


"""
Run automated configuration
"""
DEPLOYMENT_TARGET = os.environ.get('DEPLOYMENT_TARGET', None)

configure_targets(DEPLOYMENT_TARGET)
