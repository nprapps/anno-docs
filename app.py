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
import copytext
from flask import Flask, make_response, render_template
from flask_cors import CORS, cross_origin
from render_utils import flatten_app_config, make_context
from render_utils import smarty_filter, urlencode_filter
from werkzeug.debug import DebuggedApplication

app = Flask(__name__)
app.debug = app_config.DEBUG
CORS(app)

app.add_template_filter(smarty_filter, name='smarty')
app.add_template_filter(urlencode_filter, name='urlencode')

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)


@app.route('/factcheck.html', methods=['GET', 'OPTIONS'])
def _factcheck():
    """
    Liveblog only contains published posts
    """
    context = get_factcheck_context()
    return make_response(render_template('factcheck.html', **context))


@app.route('/factcheck_preview.html', methods=['GET', 'OPTIONS'])
def _preview():
    """
    Preview contains published and draft posts
    """
    context = get_factcheck_context()
    return make_response(render_template('factcheck.html', **context))

@app.route('/embeds/<slug>.html', methods=['GET', 'OPTIONS'])
def _embed(slug):
    """
    Specific annotations can be embedded
    """
    context = get_factcheck_context();
    context['slug'] = slug
    contents = context['contents']
    annotations = [post for post in contents if post['type'] == 'annotation' and post['published'] == 'yes']
    filtered = [post for post in annotations if post['slug'] == slug]
    filtered = filtered[0]
    context['filtered'] = filtered

    index = contents.index(filtered)
    paragraphs = int(filtered.get('prior', 1))
    start = index - paragraphs;
    prior = contents[start:index]
    context['prior'] = prior
    return make_response(render_template('embed.html', **context))

@app.route('/embeds/', methods=['GET', 'OPTIONS'])
def _embedlist():
    """
    List out embeddable annotations
    """
    context = get_factcheck_context()
    contents = context['contents']
    annotations = [post for post in contents if post['type'] == 'annotation' and post['published'] == 'yes']
    published = [x for x in annotations if x['published'] == 'yes']
    slugs = [x['slug'] for x in published]
    context['slugs'] = slugs
    return make_response(render_template('embedlist.html', **context))

@app.route('/share.html', methods=['GET', 'OPTIONS'])
def _share():
    """
    Preview contains published and draft posts
    """
    context = get_factcheck_context()
    return make_response(render_template('share.html', **context))


@app.route('/copydoc.html', methods=['GET', 'OPTIONS'])
def _copydoc():
    """
    Example view demonstrating rendering a simple HTML page.
    """
    with open(app_config.TRANSCRIPT_HTML_PATH) as f:
        html = f.read()

    doc = CopyDoc(html)
    context = {
        'doc': doc
    }

    return make_response(render_template('copydoc.html', **context))


@app.route('/child.html')
def child():
    """
    Example view demonstrating rendering a simple HTML page.
    """
    context = make_context()

    return make_response(render_template('child.html', **context))


@app.route('/')
@app.route('/index.html')
@oauth.oauth_required
def index():
    """
    Example view demonstrating rendering a simple HTML page.
    """
    context = make_context()

    return make_response(render_template('parent.html', **context))


@app.route('/preview.html')
def preview():
    """
    Example view demonstrating rendering a simple HTML page.
    """
    context = make_context()

    return make_response(render_template('parent.html', **context))


app.register_blueprint(static.static)
app.register_blueprint(oauth.oauth)


def get_factcheck_context():
    """
    Get factcheck context
    for production we will reuse a fake g context
    in order not to perform the parsing twice
    """
    from flask import g
    context = make_context()
    context['config'] = flatten_app_config()
    parsed_factcheck_doc = getattr(g, 'parsed_factcheck', None)
    if parsed_factcheck_doc is None:
        logger.debug("did not find parsed_factcheck")
        with open(app_config.TRANSCRIPT_HTML_PATH) as f:
            html = f.read()
        context.update(parse_document(html))
    else:
        logger.debug("found parsed_factcheck in g")
        context.update(parsed_factcheck_doc)
    return context


def parse_document(html):
    doc = CopyDoc(html)
    parsed_document = parse_doc.parse(doc)

    return parsed_document


# Enable Werkzeug debug pages
if app_config.DEBUG:
    wsgi_app = DebuggedApplication(app, evalex=False)
else:
    wsgi_app = app

# Catch attempts to run the app directly
if __name__ == '__main__':
    logging.error('This command has been removed! Run "fab app" instead!')
