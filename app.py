#!/usr/bin/env python
"""
Example application views.

Note that `render_template` is wrapped with `make_response` in all application
routes. While not necessary for most Flask apps, it is required in the
App Template for static publishing.
"""

import app_config
import logging
import oauth
import os
import parse_doc
import static

from copydoc import CopyDoc
from flask import Flask, make_response, render_template
from flask_cors import CORS, cross_origin
from render_utils import flatten_app_config, make_context, smarty_filter, urlencode_filter
from werkzeug.debug import DebuggedApplication

app = Flask(__name__)
app.debug = app_config.DEBUG
CORS(app)

app.add_template_filter(smarty_filter, name='smarty')
app.add_template_filter(urlencode_filter, name='urlencode')

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)

@app.route('/copydoc.html', methods=['GET', 'OPTIONS'])
@oauth.oauth_required
def _copydoc():
    """
    Example view demonstrating rendering a simple HTML page.
    """
    with open(app_config.TRANSCRIPT_HTML_PATH) as f:
        html = f.read()

    context = parse_document(html)

    return make_response(render_template('copy.html', **context))

@app.route('/child.html')
@oauth.oauth_required
def child():
    """
    Example view demonstrating rendering a simple HTML page.
    """
    context = make_context()

    return make_response(render_template('child.html', **context))

@app.route('/share.html')
def _share():
    with open(app_config.TRANSCRIPT_HTML_PATH) as f:
        html = f.read()

    parsed = parse_document(html)

    context = flatten_app_config()
    context['fact_checks'] = parsed['fact_checks']

    return make_response(render_template('share_list.html', **context))

@app.route('/')
@oauth.oauth_required
def index():
    """
    Example view demonstrating rendering a simple HTML page.
    """
    context = make_context()

    return make_response(render_template('parent.html', **context))

app.register_blueprint(static.static)
app.register_blueprint(oauth.oauth)

def parse_document(html):
    doc = CopyDoc(html)
    fact_check_state, fact_checks = parse_doc.parse(doc)

    parsed_document = {
        'doc': doc,
        'fact_check_state': fact_check_state,
        'fact_checks': fact_checks
    }

    return parsed_document

# Enable Werkzeug debug pages
if app_config.DEBUG:
    wsgi_app = DebuggedApplication(app, evalex=False)
else:
    wsgi_app = app

# Catch attempts to run the app directly
if __name__ == '__main__':
    logging.error('This command has been removed! Please run "fab app" instead!')
