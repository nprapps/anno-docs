#!/usr/bin/env python
# _*_ coding:utf-8 _*_

from time import sleep, time
from fabric.api import execute, require, settings, task

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
    cycle = 0

    if not app_config.LOAD_COPY_INTERVAL:
        logger.error('did not find LOAD_COPY_INTERVAL in app_config')
        exit()

    while True:
        now = time()
        if (now - copy_start) > app_config.LOAD_COPY_INTERVAL:
            cycle += 1
            copy_start = now
            logger.info('Update transcript')
            execute('text.get_transcript')
            if app_config.DEPLOYMENT_TARGET:
                execute('deploy_factcheck')
                execute('deploy_embeds')
            if (cycle % app_config.REFRESH_AUTHOR_CYCLES == 0):
                logger.info('Update authors file')
                cycle = 0
                execute('text.update')
        sleep(1)
