#!/usr/bin/env python

import app_config
import subprocess
import os
import boto
import json
import webbrowser
import logging

from distutils.util import strtobool
from distutils.spawn import find_executable
from boto.s3.connection import OrdinaryCallingFormat
from fabric.api import local, task, prompt
from oauth import get_credentials
from time import sleep
from urlparse import urlparse

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)

"""
Utilities used by multiple commands.
"""

from fabric.api import prompt

def confirm(message):
    """
    Verify a users intentions.
    """
    answer = prompt(message, default="Not at all")

    if answer.lower() not in ('y', 'yes', 'buzz off', 'screw you'):
        exit()


def get_bucket(bucket_name):
    """
    Established a connection and gets s3 bucket
    """

    if '.' in bucket_name:
        s3 = boto.connect_s3(calling_format=OrdinaryCallingFormat())
    else:
        s3 = boto.connect_s3()

    return s3.get_bucket(bucket_name)

@task
def install_font(force='true'):
    """
    Install font
    """
    print 'Installing font'
    if force != 'true':
        try:
            with open('www/css/icon/npr-app-template.css') and open('www/css/font/npr-app-template.svg'):
                logger.info('Font installed, skipping.')
                return
        except IOError:
            pass

    local('node_modules/fontello-cli/bin/fontello-cli install --config fontello/config.json --css www/css/icon --font www/css/font/')


def prep_bool_arg(arg):
    return bool(strtobool(str(arg)))


def check_credentials():
    """
    Check credentials and spawn server and browser if not
    """
    credentials = get_credentials()
    if not credentials:
        try:
            with open(os.devnull, 'w') as fnull:
                logger.info('Credentials were not found or permissions were not correct. Automatically opening a browser to authenticate with Google.')
                gunicorn = find_executable('gunicorn')
                process = subprocess.Popen([gunicorn, '-b', '127.0.0.1:8888', 'app:wsgi_app'], stdout=fnull, stderr=fnull)
                webbrowser.open_new('http://127.0.0.1:8888/oauth')
                logger.info('Waiting...')
                while not credentials:
                    try:
                        credentials = get_credentials()
                        sleep(1)
                    except ValueError:
                        continue
                logger.info('Successfully authenticated!')
                process.terminate()
        except KeyboardInterrupt:
            logger.info('\nCtrl-c pressed. Later, skater!')
            exit()
    return credentials

@task
def open_font():
    """
    Open font in Fontello GUI in your browser
    """
    local('node_modules/fontello-cli/bin/fontello-cli open --config fontello/config.json')


@task
def generate_dict():
    """
    generate dict from csv
    """
    local('csvjson -i 4 -k initials data/dict.csv > data/dict.json')


@task
def generate_station_list():
    """
    generate station list json for whitelist
    """
    local('in2csv data/org_homepages.xlsx | csvcut -c 4 > data/org_homepages.csv')
    domains = _parse_stationlist()
    with open('www/js/station_domains.json', 'w') as f:
        json.dump({'domains': domains}, f)
    print('wrote www/js/station_domains.json')


def _parse_stationlist():

    parsed_urls = ['npr.org']

    with open('data/org_homepages.csv') as f:
        urls = f.read().splitlines()

    for url in urls[1:]:
        parsed = urlparse(url)
        domain = '.'.join(parsed.netloc.split('.')[-2:]).lower()
        if domain != '' and domain not in parsed_urls:
            parsed_urls.append(domain)

    return sorted(parsed_urls)
