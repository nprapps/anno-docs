Anno-docs
========================

* [What is this?](#what-is-this)
* [Assumptions](#assumptions)
* [What's in here?](#whats-in-here)
* [Bootstrap the project](#bootstrap-the-project)
* [Hide project secrets](#hide-project-secrets)
* [Save media assets](#save-media-assets)
* [Add a page to the site](#add-a-page-to-the-site)
* [Run the project](#run-the-project)
* [Run a Verb8tm transcript test](#run-verb8tm-transcript-test)
* [Overriding app configuration](#overriding-app-configuration)
* [Non live events](#non-live-events)
* [Google Apps Scripts configuration](#google-apps-scripts-configuration)
* [Google Apps Scripts development](#google-apps-scripts-development)
* [Google Apps Scripts Execution API](#google-apps-scripts-execution-api)
* [Run a CSPAN transcript test](#run-cspan-transcript-test)
* [Google Document Permissions](#google-document-permissions)
* [COPY configuration](#copy-configuration)
* [COPY editing](#copy-editing)
* [Open Linked Google Spreadsheet](#open-linked-google-spreadsheet)
* [Generating custom font](#generating-custom-font)
* [Arbitrary Google Docs](#arbitrary-google-docs)
* [Run Python tests](#run-python-tests)
* [Run Javascript tests](#run-javascript-tests)
* [Compile static assets](#compile-static-assets)
* [Test the rendered app](#test-the-rendered-app)
* [Deploy to S3](#deploy-to-s3)
* [Deploy to EC2](#deploy-to-ec2)
* [Install cron jobs](#install-cron-jobs)
* [Install web services](#install-web-services)
* [Run a remote fab command](#run-a-remote-fab-command)
* [Report analytics](#report-analytics)
* [License and credits](#license-and-credits)
* [Contributors](#contributors)

What is this?
-------------

A live transcription application with embedded fact checks and annotations.
For a detailed explanation of how this works, check out [this blog post](https://source.opennews.org/en-US/articles/how-npr-transcribes-and-fact-checks-debates-live/) by Tyler Fisher.

The architecture of this app is well summarized in this [tweet](https://twitter.com/eads/status/780578980957151232):

> transcription service ←→ google app script → google doc (+18 factcheckers) ←→ server → s3 → embedded widget

_Note: On February 2017 we have added the ability to use CSPAN through [openedcaptions.com](openedcaptions.com) by default this repo uses Verb8tm service as the transcript source, if you want to use CSPAN instead there's some configuration changes needed. take a look at the [CSPAN](#run-cspan-transcript-test) section._

Examples
--------

* [Fact Check: Trump And Clinton Debate For The First Time](http://www.npr.org/2016/09/26/495115346/fact-check-first-presidential-debate)

Assumptions
-----------

The following things are assumed to be true in this documentation.

* You are running OSX.
* You are using Python 2.7. (Probably the version that came OSX.)
* You have [virtualenv](https://pypi.python.org/pypi/virtualenv) and [virtualenvwrapper](https://pypi.python.org/pypi/virtualenvwrapper) installed and working.
* You have NPR's AWS credentials stored as environment variables locally.

For more details on the technology stack used with the app-template, see our [development environment blog post](http://blog.apps.npr.org/2013/06/06/how-to-setup-a-developers-environment.html).

What's in here?
---------------

The project contains the following folders and important files:

* ``confs`` -- Server configuration files for nginx and uwsgi. Edit the templates then ``fab <ENV> servers.render_confs``, don't edit anything in ``confs/rendered`` directly.
* ``cspan``-- Cspan intermediate cache system for [openedcaptions.com](https://openedcaptions.com/) developed by [vox team](https://github.com/voxmedia/c-span_opened_captions_server)
* ``data`` -- Data files, such as those used to generate HTML.
* ``fabfile`` -- [Fabric](http://docs.fabfile.org/en/latest/) commands for automating setup, deployment, data processing, etc.
* ``google_apps_script`` -- Folder that contains code for uploaded Google Apps Script.
* ``etc`` -- Miscellaneous scripts and metadata for project bootstrapping.
* ``jst`` -- Javascript ([Underscore.js](http://documentcloud.github.com/underscore/#template)) templates.
* ``less`` -- [LESS](http://lesscss.org/) files, will be compiled to CSS and concatenated for deployment.
* ``templates`` -- HTML ([Jinja2](http://jinja.pocoo.org/docs/)) templates, to be compiled locally.
* ``tests`` -- Python unit tests.
* ``www`` -- Static and compiled assets to be deployed. (a.k.a. "the output")
* ``www/assets`` -- A symlink to an S3 bucket containing binary assets (images, audio).
* ``www/live-data`` -- "Live" data deployed to S3 via cron jobs or other mechanisms. (Not deployed with the rest of the project.)
* ``www/test`` -- Javascript tests and supporting files.
* ``app.py`` -- A [Flask](http://flask.pocoo.org/) app for rendering the project locally.
* ``app_config.py`` -- Global project configuration for scripts, deployment, etc.
* ``crontab`` -- Cron jobs to be installed as part of the project.
* ``doc_config.py`` -- Configuration for the exported google doc HTML parsing: Authors, Speakers, etc.
* ``package.json`` -- Contains both server-side and client-side javascript dependencies and scripts for webpack
* ``parse_doc.py`` -- Main parser, input: google doc as html, output: html with annotations embedded.
* ``public_app.py`` -- A [Flask](http://flask.pocoo.org/) app for running server-side code.
* ``render_utils.py`` -- Code supporting template rendering.
* ``requirements.txt`` -- Python requirements.
* ``static.py`` -- Static Flask views used in both ``app.py`` and ``public_app.py``.
* ``webpack.config.js`` -- Webpack configuration for server-side/local
* ``webpack.production.config.js`` -- Webpack configuration for generating JS to go to staging/production


Bootstrap the project
---------------------

Node.js is required for the static asset pipeline. If you don't already have it, get it like this:

```
brew install node
curl https://npmjs.org/install.sh | sh
```

Then bootstrap the project:

```
cd anno-docs
mkvirtualenv anno-docs
pip install -r requirements.txt
npm install
```

Before you can run the next step of the bootstrap you will need to setup Google OAuth to be able to connect to your google drive documents & spreadsheets. Follow the instructions [here](http://blog.apps.npr.org/2015/03/02/app-template-oauth.html) and once you have created the need Oauth credentials run:

```
fab update
```

**Problems installing requirements?** You may need to run the pip command as ``ARCHFLAGS=-Wno-error=unused-command-line-argument-hard-error-in-future pip install -r requirements.txt`` to work around an issue with OSX.

Hide project secrets
--------------------

Project secrets should **never** be stored in ``app_config.py`` or anywhere else in the repository. They will be leaked to the client if you do. Instead, always store passwords, keys, etc. in environment variables and document that they are needed here in the README.

Any environment variable that starts with ``anno_docs`` will be automatically loaded when ``app_config.get_secrets()`` is called.

Save media assets
-----------------

Large media assets (images, videos, audio) are synced with an Amazon S3 bucket specified in ``app_config.ASSETS_S3_BUCKET`` in a folder with the name of the project. (This bucket should not be the same as any of your ``app_config.PRODUCTION_S3_BUCKETS`` or ``app_config.STAGING_S3_BUCKETS``.) This allows everyone who works on the project to access these assets without storing them in the repo, giving us faster clone times and the ability to open source our work.

Syncing these assets requires running a couple different commands at the right times. When you create new assets or make changes to current assets that need to get uploaded to the server, run ```fab assets.sync```. This will do a few things:

* If there is an asset on S3 that does not exist on your local filesystem it will be downloaded.
* If there is an asset on that exists on your local filesystem but not on S3, you will be prompted to either upload (type "u") OR delete (type "d") your local copy.
* You can also upload all local files (type "la") or delete all local files (type "da"). Type "c" to cancel if you aren't sure what to do.
* If both you and the server have an asset and they are the same, it will be skipped.
* If both you and the server have an asset and they are different, you will be prompted to take either the remote version (type "r") or the local version (type "l").
* You can also take all remote versions (type "ra") or all local versions (type "la"). Type "c" to cancel if you aren't sure what to do.

Unfortunantely, there is no automatic way to know when a file has been intentionally deleted from the server or your local directory. When you want to simultaneously remove a file from the server and your local environment (i.e. it is not needed in the project any longer), run ```fab assets.rm:"www/assets/file_name_here.jpg"```

Adding a page to the site
-------------------------

A site can have any number of rendered pages, each with a corresponding template and view. To create a new one:

* Add a template to the ``templates`` directory. Ensure it extends ``_base.html``.
* Add a corresponding view function to ``app.py``. Decorate it with a route to the page name, i.e. ``@app.route('/filename.html')``
* By convention only views that end with ``.html`` and do not start with ``_``  will automatically be rendered when you call ``fab render``.

Run the project
---------------

A flask app is used to run the project locally. It will automatically recompile templates and assets on demand.

```
workon anno-docs
fab app
```

Visit [localhost:8000](http://localhost:8000) in your browser.

If you want to live update a Google Doc locally, you will also need to run the daemon locally. You can do that with:

```
fab daemons.main
```

If you use iTerm2 v3 or above (3.0.10 is the latest as of 10th Nov. 2016) you can find an apple script on the `etc` folder named ` itermv3_annodocs.scpt` that will help you get up and running quickly. You'll need to tweak the paths on the apple script to suit your configuration and run it.

We recommend that you add it to your `.bash_profile` as an alias to make your life even easier, for example this is my `.bash_profile` alias for debates

```
alias annodocs="osascript ~/npr/aux_scripts/itermv3_annodocs.scpt"
```

Run Verb8tm Transcript Test
---------------------------

In order to run a transcript test from start you need to restart Verb8tm test API

```
fab verb8tm_run:2000
```

Once started you can stop the test transcript at any point by running:
```
fab verb8tm_stop
```

You can restart the test transcript at any point by running:

```
fab verb8tm_start
```

Then, go to the google app script in the desired enviroment:
* Development
    * [Google App Script](https://script.google.com/a/npr.org/d/1BwpfYBmS7iK3K9i3B0EObinw7PE6jKg9QRAKi82eVz9sMcMdbUqM5shM/edit?usp=drive_web)
* Staging
    * [Google App Script](https://script.google.com/a/npr.org/d/14VE1-ZzLYxoHRB7S2XBSXyA1ltIPVnjYvnC_IaHcEKj65T_Pb2uqBQEn/edit?usp=drive_web)
* Production
    * [Google App Script](https://script.google.com/a/npr.org/d/1mMSF3no0gLofIyuz187jDDHANsjXg-U5QPRO8L49HZLCaZxOrv-7ARGI/edit?usp=drive_web)

Select 'main.gs' on the right panel and then from the Menu select 'Run -> Reset'

This will clear out the associated document and the log and create a 1 minute trigger that will pull from the Verb8tm test API endpoint.

Overriding App Configuration
----------------------------

There was a lot of collaboration inside this project and during long periods of time we were all simultaneously working in different parts of the project's pipeline and required some stability on the rest of the pipeline to make some progress.

This was particularly true for the google document that we would use as source of the transcript, some of us were testing for quirks on the parsing side while other wanted to test navigation between annotations.

So we provided a way to override the app configuration locally. In order to do so you will need to create a file called `local_settings.py` on your project root.

The properties that you can override are:
* `TRANSCRIPT_GDOC_KEY`: The google doc key used as the input to our parsing process
* `GAS_LOG_KEY`: The google spreadsheet that stores the logs from the google app script execution
* `S3_BASE_URL`: Useful if you want to override the default port of the local server.

There are oher properties that you can set up but they will be better explained over the next section.

Non Live Events
---------------

Sometimes it is not a live event that you want to fact check but a straight-from-the-oven text that has just been released. This is a more static approach, but there's still a lot of value on the repo that can be used in a non-live situation, like the parsing and all the client code that generates the final embed with tracking of individual annotations, etc.

In this particular case we would not use the google app script side of this repo, since we are not going to need to be pulling a transcript periodically from an API, also we may want to generate the parsing locally and just sent the results to S3 to create a static version of the application.

By default, this repo is configured to be used for a live event situation, but using `local_settings.py` to override configuration we can turn it into a more static approach. Here are the properties that you can change:
* `DEPLOY_TO_SERVERS`: Turn it to `False` if you plan on deploying a static app
* `DEPLOY_STATIC_FACTCHECK`: Turn it to `True` so that the fabric `deploy` command will also issue the parsing of the last transcript and add it to the deploy process to S3.
* `CURRENT_DEBATE`: Bucket where you want to deploy the application
* `SEAMUS_ID`: In npr.org we need this to generate a share.html page that our editors can use to send our readers to specific annotations through social media.

Google Apps Scripts configuration
---------------------------------

For each given environment we have three parts regarding Google Apps Scripts:

* Google Apps Scripts: The codebase that gets the information from Verb8tm API and dumps it into an associated google doc.
* Google Apps Scripts Log: A google spreadsheet file that serves as a persistent execution log for the script.
* Debate Google Doc: The document where the script dumps information each time it receives new data from the Verb8tm API.

Here are those three files for each of our environments:
* Development
    * [Google App Script](https://script.google.com/a/npr.org/d/1BwpfYBmS7iK3K9i3B0EObinw7PE6jKg9QRAKi82eVz9sMcMdbUqM5shM/edit?usp=drive_web)
    * [Google App Script Log](https://docs.google.com/spreadsheets/d/1I7IUCUJHIWLW3c_E-ukfqIp4QxuvUoHqbEQIlKQFC7w/edit#gid=0)
    * [Fact Check Document](https://docs.google.com/document/d/1Fn3zEsGuvp0ot0Kamlc7_XR48QzoY4fSyRpO6BV1XsA/edit)
* Staging
    * [Google App Script](https://script.google.com/a/npr.org/d/14VE1-ZzLYxoHRB7S2XBSXyA1ltIPVnjYvnC_IaHcEKj65T_Pb2uqBQEn/edit?usp=drive_web)
    * [Google App Script Log](https://docs.google.com/spreadsheets/d/1vpRgWpqGqW1p3yMv6nCixAjczc8cJr_TlMCTg52Ch9I/edit#gid=0)
    * [Fact Check Document](https://docs.google.com/document/d/1SIdTMAjRhJkQVeUeBAxflSVidYIXPfpQIXDTpJEHvT4/edit)
* Production
    * [Google App Script](https://script.google.com/a/npr.org/d/1mMSF3no0gLofIyuz187jDDHANsjXg-U5QPRO8L49HZLCaZxOrv-7ARGI/edit?usp=drive_web)
    * [Google App Script Log](https://docs.google.com/spreadsheets/d/1tUxTFa2J5IKIlOMLop9IA9eaZ6uDDhgh6KwxeLdgQGU/edit#gid=0)
    * [Fact Check Document](https://docs.google.com/document/d/1822ydEmHAfvaNpSitPtrgGgAW_hcjHvbdR-qur6kjIQ/edit)

Google Apps Scripts Development
-------------------------------

We use our codebase stored on github as the master for the Google Apps Scripts code. We have created a series of Fabric commands to ease the workflow of updating the actual code run inside google drive.

## List projects

```
fab gs.list_projects
```

It will return a complete list of Google Apps Script projects. It accepts and optional owner parameter to filter out the results to a given owner. for example the following command will return only the projects that you have created:

```
fab gs.list_projects:me
```

## Upsert project

If you want to update local changes to a Google Apps Script Project you can run:

```
fab [ENVIRONMENT] gs.upsert
```

Where `ENVIRONMENT` can be: `development`, `staging` or `production`. Depending on the environment passed the command will update the appropriate Google App Script Project using `app_config` properties. For development it would be:

```
fab development gs.upsert
```

Google Apps Scripts Execution API
---------------------------------

Using Google Apps Scripts Execution API you can fire a function within a Google Apps Script Project externally. It has some restrictions, for example it can not take longer than 6 minutes to execute or it can not create a trigger (That is why we need to do that manually)

Anyhow, it is useful to setup the association between the script itself and the output doc and log. We use it that way in this project.

The process to set that up is a bit tricky, to say the least. There's a good [documentation](https://developers.google.com/apps-script/guides/rest/api) at least.

It is better to follow the documentation but let me throw in some tips that will make your life easier:
* You need to deploy your Google Apps Script Project as an API executable (may need to create a new version)
* We use OAuth to authenticate against Google Drive API and wanted to use those credentials for the execution API to do that the Google App Script Project has to be on the same Google Developer Console Project your credentials where issued on. More info [here](https://developers.google.com/apps-script/guides/services/authorization#using_a_different_google_developers_console_project)
* Enable the Google Apps Script Execution API in the developer console project
* Add all the required scope to the google authomatic config in `app_config`.

Done that? Phewww that was crazy, right....now let's enjoy our work.

Now we can run a fab command that will update the associated google doc key and associated log key to our Google Apps Script Project:

```
fab [ENVIRONMENT] gs.execute_setup
```

Where `ENVIRONMENT` can be: `development`, `staging` or `production`. Depending on the environment passed the command will update the appropriate Google App Script Project using `app_config` properties. For development it would be:

```
fab development gs.execute_setup
```

We use our codebase stored on github as the master for the Google Apps Scripts code. We have created a series of Fabric commands to ease the workflow of updating the actual code run inside google drive.

Run CSPAN Transcript Test
-------------------------

By default the repo is configured to use Verb8tm as a transcript service, but you can change that by executing a setup passing `cspan` to `True`

### Development

In development there's no server to serve as a API endpoint for the CSPAN transcript so we can use [ngrok] to tunnel our localhost instance to a public accesible URL.

First you'll need to install ngrok globally on your system
```
npm install -g ngrok
```

Then from the root of the project run:
```
node cpsan/index.js
```

Finally connect ngrok to that local node server by running
```
ngrok http 5000
```

That last command will start a ngrok server and output a public url that we need to communicate to our google app script on drive.

```
fab development gs.execute_setup:cspan=True,cspan_server="http://[SEED].ngrok.io"
```

### Staging && production

In staging and production we do have servers that have a public facing url that we can directly use for our CSPAN live transcript.

First we need to set cspan transcription on our google app script
```
fab [ENVIRONMENT] gs.execute_setup:cspan=True
```

After that, we just need to fire up the node server

```
fab [ENVRIRORNMENT] servers.cspan_start
```

*IMPORTANT Note: The cspan stream will not stop automatically so we need to be careful and stop the cspan server manually once the desired broadcast has ended*

In order to stop the CSPAN stream we need to run
```
fab [ENVIRONMENT] servers.cspan_stop
```

There's a mechanism in place on the google app script side that will automatically stop after a configurable number of calls with no new data.

Google Document Permissions
---------------------------

We are accessing the Live Fact Check document from the server to pull out its content using credentials associated with `nprappstumblr@gmail.com` we need to make sure that `nprappstumblr@gmail.com` has at least read access to the document in order to avoid a `403` response to the server.

COPY configuration
------------------

This app uses a Google Spreadsheet for a simple key/value store that provides an editing workflow.

To access the Google doc, you'll need to create a Google API project via the [Google developer console](http://console.developers.google.com).

Enable the Drive API for your project and create a "web application" client ID.

For the redirect URIs use:

* `http://localhost:8000/authenticate/`
* `http://127.0.0.1:8000/authenticate`
* `http://localhost:8888/authenticate/`
* `http://127.0.0.1:8888/authenticate`

For the Javascript origins use:

* `http://localhost:8000`
* `http://127.0.0.1:8000`
* `http://localhost:8888`
* `http://127.0.0.1:8888`

You'll also need to set some environment variables:

```
export GOOGLE_OAUTH_CLIENT_ID="something-something.apps.googleusercontent.com"
export GOOGLE_OAUTH_CONSUMER_SECRET="bIgLonGStringOfCharacT3rs"
export AUTHOMATIC_SALT="jAmOnYourKeyBoaRd"
```

Note that `AUTHOMATIC_SALT` can be set to any random string. It's just cryptographic salt for the authentication library we use.

Once set up, run `fab app` and visit `http://localhost:8000` in your browser. If authentication is not configured, you'll be asked to allow the application for read-only access to Google drive, the account profile, and offline access on behalf of one of your Google accounts. This should be a one-time operation across all app-template projects.

It is possible to grant access to other accounts on a per-project basis by changing `GOOGLE_OAUTH_CREDENTIALS_PATH` in `app_config.py`.


COPY editing
------------

View the [sample copy spreadsheet](https://docs.google.com/spreadsheet/pub?key=1z7TVK16JyhZRzk5ep-Uq5SH4lPTWmjCecvJ5vCp6lS0#gid=0).

This document is specified in ``app_config`` with the variable ``COPY_GOOGLE_DOC_KEY``. To use your own spreadsheet, change this value to reflect your document's key. (The long string of random looking characters in your Google Docs URL. For example: ``1DiE0j6vcCm55Dyj_sV5OJYoNXRRhn_Pjsndba7dVljo``)

A few things to note:

* If there is a column called ``key``, there is expected to be a column called ``value`` and rows will be accessed in templates as key/value pairs
* Rows may also be accessed in templates by row index using iterators (see below)
* You may have any number of worksheets
* This document must be "published to the web" using Google Docs' interface

The app template is outfitted with a few ``fab`` utility functions that make pulling changes and updating your local data easy.

To update the latest document, simply run:

```
fab text.update
```

Note: ``text.update`` runs automatically whenever ``fab render`` is called.

At the template level, Jinja maintains a ``COPY`` object that you can use to access your values in the templates. Using our example sheet, to use the ``byline`` key in ``templates/index.html``:

```
{{ COPY.attribution.byline }}
```

More generally, you can access anything defined in your Google Doc like so:

```
{{ COPY.sheet_name.key_name }}
```

You may also access rows using iterators. In this case, the column headers of the spreadsheet become keys and the row cells values. For example:

```
{% for row in COPY.sheet_name %}
{{ row.column_one_header }}
{{ row.column_two_header }}
{% endfor %}
```

When naming keys in the COPY document, please attempt to group them by common prefixes and order them by appearance on the page. For instance:

```
title
byline
about_header
about_body
about_url
download_label
download_url
```

Open Linked Google Spreadsheet
------------------------------
Want to edit/view the app's linked google spreadsheet, we got you covered.

We have created a simple Fabric task ```spreadsheet```. It will try to find and open the app's linked google spreadsheet on your default browser.

```
fab spreadsheet
```

If you are working with other arbitraty google docs that are not involved with the COPY rig you can pass a key as a parameter to have that spreadsheet opened instead on your browser

```
fab spreadsheet:$GOOGLE_DOC_KEY
```

For example:

```
fab spreadsheet:12_F0yhsXEPN1w3GOlQB4_NKGadXiRLOa9l-HQu5jSL8
// Will open 270 project number-crunching spreadsheet
```


Generating custom font
----------------------

This project uses a custom font build powered by [Fontello](http://fontello.com)
If the font does not exist, it will be created when running `fab update`.
To force generation of the custom font, run:

```
fab utils.install_font:true
```

Editing the font is a little tricky -- you have to use the Fontello web gui.
To open the gui with your font configuration, run:

```
fab utils.open_font
```

Now edit the font, download the font pack, copy the new config.json into this
project's `fontello` directory, and run `fab utils.install_font:true` again.

Arbitrary Google Docs
----------------------

Sometimes, our projects need to read data from a Google Doc that's not involved with the COPY rig. In this case, we've got a helper function for you to download an arbitrary Google spreadsheet.

This solution will download the uncached version of the document, unlike those methods which use the "publish to the Web" functionality baked into Google Docs. Published versions can take up to 15 minutes up update!

Make sure you're authenticated, then call `oauth.get_document(key, file_path)`.

Here's an example of what you might do:

```
from copytext import Copy
from oauth import get_document

def read_my_google_doc():
    file_path = 'data/extra_data.xlsx'
    get_document('1z7TVK16JyhZRzk5ep-Uq5SH4lPTWmjCecvJ5vCp6lS0', file_path)
    data = Copy(file_path)

    for row in data['example_list']:
        print '%s: %s' % (row['term'], row['definition'])

read_my_google_doc()
```

Run Python tests
----------------

Python unit tests are stored in the ``tests`` directory. Run them with ``fab tests``.

Run Javascript tests
--------------------

With the project running, visit [localhost:8000/test/SpecRunner.html](http://localhost:8000/test/SpecRunner.html).

Compile static assets
---------------------

Compile LESS to CSS, compile javascript templates to Javascript and minify all assets:

```
workon debates
fab render
```

(This is done automatically whenever you deploy to S3.)

Test the rendered app
---------------------

If you want to test the app once you've rendered it out, just use the Python webserver:

```
cd www
python -m SimpleHTTPServer
```

Deploy to S3
------------

```
fab staging master deploy
```

Deploy to EC2
-------------

You can deploy to EC2 for a variety of reasons. We cover two cases: Running a dynamic web application (`public_app.py`) and executing cron jobs (`crontab`).

Servers capable of running the app can be setup using our [servers](https://github.com/nprapps/servers) project.

For running a Web application:

* In ``app_config.py`` set ``DEPLOY_TO_SERVERS`` to ``True``.
* Also in ``app_config.py`` set ``DEPLOY_WEB_SERVICES`` to ``True``.
* Run ``fab staging master servers.setup`` to configure the server.
* Run ``fab staging master deploy`` to deploy the app.

For running cron jobs:

* In ``app_config.py`` set ``DEPLOY_TO_SERVERS`` to ``True``.
* Also in ``app_config.py``, set ``INSTALL_CRONTAB`` to ``True``
* Run ``fab staging master servers.setup`` to configure the server.
* Run ``fab staging master deploy`` to deploy the app.

You can configure your EC2 instance to both run Web services and execute cron jobs; just set both environment variables in the fabfile.

Install cron jobs
-----------------

Cron jobs are defined in the file `crontab`. Each task should use the `cron.sh` shim to ensure the project's virtualenv is properly activated prior to execution. For example:

```
* * * * * ubuntu bash /home/ubuntu/apps/debates/repository/cron.sh fab $DEPLOYMENT_TARGET cron_jobs.test
```

To install your crontab set `INSTALL_CRONTAB` to `True` in `app_config.py`. Cron jobs will be automatically installed each time you deploy to EC2.

The cron jobs themselves should be defined in `fabfile/cron_jobs.py` whenever possible.

Install web services
---------------------

Web services are configured in the `confs/` folder.

Running ``fab servers.setup`` will deploy your confs if you have set ``DEPLOY_TO_SERVERS`` and ``DEPLOY_WEB_SERVICES`` both to ``True`` at the top of ``app_config.py``.

To check that these files are being properly rendered, you can render them locally and see the results in the `confs/rendered/` directory.

```
fab servers.render_confs
```

You can also deploy only configuration files by running (normally this is invoked by `deploy`):

```
fab servers.deploy_confs
```

Run a  remote fab command
-------------------------

Sometimes it makes sense to run a fabric command on the server, for instance, when you need to render using a production database. You can do this with the `fabcast` fabric command. For example:

```
fab staging master servers.fabcast:deploy
```

If any of the commands you run themselves require executing on the server, the server will SSH into itself to run them.

Analytics
---------

The Google Analytics events tracked in this application are:

|Category|Action|Label|Value|
|--------|------|-----|-----|
|anno-docs|tweet|`location`||
|anno-docs|facebook|`location`||
|anno-docs|email|`location`||
|anno-docs|new-comment||
|anno-docs|open-share-discuss||
|anno-docs|close-share-discuss||
|anno-docs|summary-copied||
|anno-docs|featured-tweet-action|`action`|
|anno-docs|featured-facebook-action|`action`|

License and credits
-------------------
Released under the MIT open source license. See ``LICENSE`` for details.


Contributors
------------
`anno-docs` was built by the NPR Visuals team.

See ``CONTRIBUTORS`` for additional contributors
