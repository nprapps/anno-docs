# _*_ coding:utf-8 _*_
import app_config
import datetime
import logging
import requests
import shortcodes

from PIL import Image
from StringIO import StringIO
from bs4 import BeautifulSoup
from functools import partial
from jinja2 import Environment, FileSystemLoader
# from pymongo import MongoClient

TWITTER_OEMBED_URL = 'https://api.twitter.com/1.1/statuses/oembed.json'
IMAGE_URL_TEMPLATE = 'https://media.npr.org/politics/election2016/%s'
IMAGE_TYPES = ['image', 'graphic']
SHORTCODE_DICT = {
    'tweet': {
        'show_media': 1,
        'show_thread': 0
    },
    'youtube': {
        'start_time': 0
    },
    'image': {
        'caption': '',
        'credit': 'Image credit',
        'width': '100%'
    },
    'facebook': {
    },
    'internal_link': {
        'link_text': 'Link to post'
    },
    'graphic': {
        'caption': 'Graphic caption',
        'credit': 'Graphic credit',
        'width': '100%'
    }
}

env = Environment(loader=FileSystemLoader('templates/shortcodes'))

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)


def _process_id(url, tag):
    """
    Extract an ID from a url (or just return the URL).
    """
    if tag == 'tweet':
        parts = url.split('/')
        return parts[5]
    else:
        return url


def _get_extra_context(id, tag):
    """
    Do some processing
    """
    extra = dict()
    if tag in IMAGE_TYPES:
        extra.update(_get_image_context(id))
    if tag == 'tweet':
        extra.update(_get_tweet_context(id))
    return extra


def _handler(context, content, pargs, kwargs, tag, defaults):
    """
    Default handler all other handlers inherit from.
    """
    id = _process_id(pargs[0], tag)
    template_context = dict(url=pargs[0],
                            id=id)
    extra_context = _get_extra_context(id, tag)

    template_context.update(defaults)
    template_context.update(kwargs)
    template_context.update(extra_context)
    template = env.get_template('%s.html' % tag)
    output = template.render(**template_context)
    return output


"""
Register handlers
"""
parser = shortcodes.Parser()
for tag, defaults in SHORTCODE_DICT.items():
    tag_handler = partial(_handler, tag=tag, defaults=defaults)
    parser.register(tag_handler, tag)


def process_shortcode(tag):
    """
    Generates html from shortcode
    """
    # Replace unicode <br>
    text = tag.get_text().replace(u'\xa0', u' ')
    try:
        return parser.parse(text)
    except shortcodes.RenderingError as e:
        logger.error('Could not render short code in: "%s"' % text)
        logger.error('cause: %s' % e.__cause__)
        return ''


def _get_image_context(id):
    """
    Download image and get/cache aspect ratio.
    """
    url = IMAGE_URL_TEMPLATE % id

    # client = MongoClient(app_config.MONGODB_URL)
    # database = client['factcheck']
    # collection = database.images
    # result = collection.find_one({'_id': id})
    result = None
    if not result:
        logger.info('image %s: uncached, downloading %s' % (id, url))
        response = requests.get(url)
        image = Image.open(StringIO(response.content))
        ratio = float(image.height) / float(image.width)
        # collection.insert({
        #     '_id': id,
        #     'date': datetime.datetime.utcnow(),
        #     'ratio': ratio,
        # })
    else:
        logger.info('image %s: retrieved from cache' % id)
        ratio = result['ratio']

    ratio = round(ratio * 100, 2)
    return dict(ratio=ratio)


def _get_tweet_context(id):
    """
    Try and figure out a tweet's aspect ratio har dee har.
    """
    layout = 'text'

    # client = MongoClient(app_config.MONGODB_URL)
    # database = client['liveblog']
    # collection = database.tweets
    # result = collection.find_one({'_id': id})
    result = None

    if not result:
        logger.info('tweet %s: uncached, downloading' % id)
        response = requests.get(TWITTER_OEMBED_URL, params=(('id', id),))
        response.raise_for_status()
        data = response.json()
        soup = BeautifulSoup(data['html'])
        links = soup.find_all('a')
        for link in links:
            logger.debug(link)
            if link.text == link.attrs['href']:
                layout = 'attached_link'
            if 'pic.twitter.com' in link.text:
                layout = 'image'

        logger.debug('tweet %s: is layout `%s`' % (id, layout))

        # collection.insert({
        #     '_id': id,
        #     'date': datetime.datetime.utcnow(),
        #     'layout': layout,
        # })
    else:
        layout = result['layout']
        logger.info('tweet %s: retrieved from cache, is layout `%s`' % (id, layout))

    return dict(layout=layout)
