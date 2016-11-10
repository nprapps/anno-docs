#!/usr/bin/env python
# _*_ coding:utf-8 _*_

from time import sleep, time
from fabric.api import execute, require, settings, task
from fabric.state import env

import app_config
import logging
import sys

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)


@task
def deploy(run_once=False):
    """
    Harvest data and deploy cards
    """
    require('settings', provided_by=['production', 'staging'])
    try:
        with settings(warn_only=True):
            main(run_once)
    except KeyboardInterrupt:
        sys.exit(0)

@task
def main(run_once=False):
    """
    Main loop
    """
    copy_start = 0

    while True:
        now = time()

        if app_config.LOAD_COPY_INTERVAL and (now - copy_start) > app_config.LOAD_COPY_INTERVAL:
            copy_start = now
            logger.info('Update transcript')
            execute('text.get_transcript')
            if app_config.DEPLOYMENT_TARGET:
                execute('deploy_transcript')
                execute('deploy_share_list')

        sleep(1)
