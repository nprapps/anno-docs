#!/usr/bin/env python

"""
Commands for rendering various parts of the app stack.
"""

import codecs
from glob import glob
import logging
import os

from fabric.api import local, task

import app
import app_config

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)

def _fake_context(path):
    """
    Create a fact request context for a given path.
    """
    return app.app.test_request_context(path=path)

def _view_from_name(name):
    """
    Determine what module a view resides in, then get
    a reference to it.
    """
    bits = name.split('.')

    # Determine which module the view resides in
    if len(bits) > 1:
        module, name = bits
    else:
        module = 'app'

    return globals()[module].__dict__[name]

@task
def less():
    """
    Render LESS files to CSS.
    """
    for path in glob('less/*.less'):
        filename = os.path.split(path)[-1]
        name = os.path.splitext(filename)[0]
        out_path = 'www/css/%s.less.css' % name

        try:
            local('node_modules/less/bin/lessc %s %s' % (path, out_path))
        except:
            logger.error('It looks like "lessc" isn\'t installed. Try running: "npm install"')
            raise

@task
def jst():
    """
    Render Underscore templates to a JST package.
    """
    try:
        local('node_modules/universal-jst/bin/jst.js --template underscore jst www/js/templates.js')
    except:
        logger.error('It looks like "jst" isn\'t installed. Try running: "npm install"')

@task
def app_config_js():
    """
    Render app_config.js to file.
    """
    from static import _app_config_js

    with _fake_context('/js/app_config.js'):
        response = _app_config_js()

    with open('www/js/app_config.js', 'w') as f:
        f.write(response.data)

@task
def copytext_js():
    """
    Render COPY to copy.js.
    """
    from static import _copy_js

    with _fake_context('/js/copytext.js'):
        response = _copy_js()

    with open('www/js/copy.js', 'w') as f:
        f.write(response.data)

@task(default=True)
def render_all():
    """
    Render HTML templates and compile assets.
    """
    from flask import g

    less()
    jst()
    app_config_js()

    local('npm run build')

    compiled_includes = {}

    # Loop over all views in the app
    for rule in app.app.url_map.iter_rules():
        rule_string = rule.rule
        name = rule.endpoint

        # Skip utility views
        if name == 'static' or name.startswith('_'):
            logger.info('Skipping %s' % name)
            continue

        # Convert trailing slashes to index.html files
        if rule_string.endswith('/'):
            filename = 'www' + rule_string + 'index.html'
        elif rule_string.endswith('.html'):
            filename = 'www' + rule_string
        else:
            logger.info('Skipping %s' % name)
            continue

        # Create the output path
        dirname = os.path.dirname(filename)

        if not (os.path.exists(dirname)):
            os.makedirs(dirname)

        logger.info('Rendering %s' % (filename))

        # Render views, reusing compiled assets
        with _fake_context(rule_string):
            g.compile_includes = True
            g.compiled_includes = compiled_includes

            view = _view_from_name(name)

            content = view().data

            compiled_includes = g.compiled_includes

        # Write rendered view
        # NB: Flask response object has utf-8 encoded the data
        with open(filename, 'w') as f:
            f.write(content)
    render_embeds()


@task
def render_copydoc():
    from flask import url_for

    view_name = '_copydoc'

    with app.app.test_request_context():
        path = url_for(view_name)
        view = app.__dict__[view_name]
        response = view()

    try:
        os.makedirs('.copydoc/')
    except OSError:
        pass

    with codecs.open('.copydoc/{0}'.format(path), 'w', 'utf-8') as f:
        f.write(response.data.decode('utf-8'))


def generate_views(views, parsed_factcheck):
    from flask import url_for, g

    view_paths = []
    with app.app.test_request_context():
        for view_name in views:
            path = url_for(view_name)
            view_paths.append((view_name, path))

    for view_name, path in view_paths:
        logger.info("%s, %s" % (view_name, path))
        with _fake_context(path):
            # add parsed liveblog to g
            g.parsed_factcheck = parsed_factcheck
            logger.info(path)
            view = app.__dict__[view_name]
            response = view()

            try:
                os.makedirs('.factcheck/')
            except OSError:
                pass

            with codecs.open('.factcheck/{0}'.format(path), 'w', 'utf-8') as f:
                f.write(response.data.decode('utf-8'))


def parse_factcheck():
    with open(app_config.TRANSCRIPT_HTML_PATH) as f:
        html = f.read()
    parsed_factcheck = app.parse_document(html)
    return parsed_factcheck


@task
def render_factcheck():
    parsed_factcheck = parse_factcheck()
    generate_views(['_factcheck', '_preview', '_share'],
                   parsed_factcheck)

@task
def render_embeds():
    try:
        os.makedirs('./www/embeds')
    except OSError:
        pass

    parsed_factcheck = parse_factcheck()
    from flask import g, url_for
    view = app.__dict__['_embed']
    contents = parsed_factcheck['contents']
    annotations = [x for x in contents if x['type'] == 'annotation']
    published = [x for x in annotations if x['published'] == 'yes']
    slugs = [x['slug'] for x in published]
    with _fake_context('/embeds/'):
        g.slugs = slugs
        response = app.__dict__['_embedlist']()
        with open('./www/embeds/index.html', 'w') as f:
            f.write(response.data)
    for slug in slugs:
        path = '{0}/embed'.format(slug) #url_for('_embed', slug=slug)
        with _fake_context(path):
            g.parsed_factcheck = parsed_factcheck
            response = view(slug)
            with open('./www/embeds/{0}.html'.format(slug), 'w') as f:
                f.write(response.data)