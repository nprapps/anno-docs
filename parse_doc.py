#!/usr/bin/env python
# _*_ coding:utf-8 _*_
import logging
import re
import app_config
import xlrd
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader('templates/transcript'))

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)

# REGULAR EXPRESSIONS
end_transcript_regex = re.compile(ur'.*LIVE\sTRANSCRIPT\sHAS\sENDED.*',
                                  re.UNICODE)
do_not_write_regex = re.compile(ur'.*DO\s*NOT\s*WRITE\s*BELOW\s*THIS\s*LINE\s*([Ee][Rr]{2}[Oo][Rr])?.*',
                                re.UNICODE)
end_fact_check_regex = re.compile(ur'^\s*[Ee][Nn][Dd]\s*$',
                                  re.UNICODE)

anno_start_marker_regex = re.compile(ur'^\s*\+{50,}\s*$',
                                     re.UNICODE)
anno_end_marker_regex = re.compile(ur'^\s*-{50,}\s*$',
                                   re.UNICODE)

frontmatter_marker_regex = re.compile(ur'^\s*-{3}\s*$',
                                      re.UNICODE)

extract_metadata_regex = re.compile(ur'^(.*?):(.*)$',
                                    re.UNICODE)

speaker_regex = re.compile(ur'^[A-Z\s\.,-]+(\s\[.*\])?:', re.UNICODE)
soundbite_regex = re.compile(ur'^\s*:', re.UNICODE)

extract_speaker_metadata_regex = re.compile(
    ur'^\s*(<.*?>)?([A-Z0-9\s\.,-]+)\s*(?:\[(.*)\]\s*)?:\s*(.*)', re.UNICODE)
extract_soundbite_metadata_regex = re.compile(
    ur'^\s*(?:<.*?>)?\s*:\[\((.*)\)\]', re.UNICODE)
extract_author_metadata_regex = re.compile(
    ur'^.*\((.+)\)\s*$', re.UNICODE)


def is_anno_start_marker(tag):
    """
    Checks for the beginning of a new post
    """
    text = tag.get_text()
    m = anno_start_marker_regex.match(text)
    if m:
        return True
    else:
        return False


def is_anno_end_marker(tag):
    """
    Checks for the beginning of a new post
    """
    text = tag.get_text()
    m = anno_end_marker_regex.match(text)
    if m:
        return True
    else:
        return False


def replace_strong_tags(markup):
    """
    Replaces strong tags with
    spans with class fact_checked
    """
    markup = markup.replace('<strong>', '<span class="fact-checked">')
    markup = markup.replace('</strong>', '</span>')
    return markup


def transform_transcript_markup(transcript):
    """
    Transform factcheck markup to final format
    """
    template = env.get_template('%s.html' % transcript['type'])
    transcript_markup = template.render(**transcript['context'])
    markup = replace_strong_tags(transcript_markup)
    return markup


def transform_annotation_markup(context):
    """
    Transform factcheck markup to final format
    """
    template = env.get_template('annotation.html')
    annotation_markup = template.render(**context)
    return annotation_markup


def process_speaker_transcript(contents):
    """
    parses speaker paragraphs.
    transforming into the desired output markup
    """
    m = extract_speaker_metadata_regex.match(contents)
    if m:
        speaker = m.group(2).strip()
        try:
            speaker_class = app_config.SPEAKERS[speaker]
        except KeyError:
            logger.debug('did not find speaker: %s' % speaker)
            speaker_class = 'speaker'
        timestamp = m.group(3)
        if m.group(1):
            clean_text = m.group(1) + m.group(4)
        else:
            clean_text = m.group(4)
    else:
        logger.error("ERROR: Unexpected metadata format %s" % contents)
        return contents

    context = {'speaker_class': speaker_class,
               'speaker': speaker,
               'timestamp': timestamp,
               'transcript_text': clean_text}
    return context


def process_soundbite_transcript(contents):
    """
    parses speaker paragraphs.
    transforming into the desired output markup
    """
    m = extract_soundbite_metadata_regex.match(contents)
    if m:
        clean_text = '(%s)' % m.group(1)
    else:
        logger.error("ERROR: Unexpected metadata format %s" % contents)
        return contents
    context = {'soundbite': clean_text}
    return context


def process_other_transcript(contents):
    """
    process all other transcript output
    """
    context = {'text': contents}
    return context


def process_metadata(contents):
    logger.debug('--process_metadata start--')
    metadata = {}
    for tag in contents:
        text = tag.get_text()
        m = extract_metadata_regex.match(text)
        if m:
            key = m.group(1).strip().lower()
            value = m.group(2).strip()
            if key == 'published':
                value = value.lower()
            metadata[key] = value
        else:
            logger.error('Could not parse metadata. Text: %s' % text)
    logger.debug("metadata: %s" % metadata)
    return metadata


def add_author_metadata(metadata, authors):
    """
    extract author data from dict and add to metadata
    """

    # Set default
    author_name = metadata['author']
    author_role = None
    author_page = None
    author_img = None

    m = extract_author_metadata_regex.match(metadata['author'])
    if m:
        key = m.group(1)
        # Grab info from dictionary
        try:
            author_name = authors[key]['name']
            author_role = authors[key]['role']
            author_page = authors[key]['page']
            author_img = authors[key]['img']
        except KeyError:
            logger.warning('did not find author in dictionary %s' % key)
            author_name = author_name.split('(')[0].strip()
    else:
        logger.warning("Could not parse author data initials: %s" % (
                       author_name))
    # Push data into metadata
    metadata['author'] = author_name
    metadata['role'] = author_role
    metadata['page'] = author_page
    metadata['image'] = author_img


def process_annotation_contents(contents):
    """
    Process post copy content
    In particular parse and generate HTML from shortcodes
    """
    logger.debug('--process_annotation_contents start--')
    parsed = [unicode(tag) for tag in contents]
    post_contents = ''.join(parsed)
    return post_contents


def process_transcript_content(tag):
    """
    TODO
    """
    text = tag.get_text()
    combined_contents = unicode(tag)
    # for content in tag.contents:
    #     combined_contents += unicode(content)
    if speaker_regex.match(text):
        typ = 'speaker'
        logger.info(text)
        context = process_speaker_transcript(combined_contents)
    elif soundbite_regex.match(text):
        typ = 'soundbite'
        context = process_soundbite_transcript(combined_contents)
    else:
        typ = 'other'
        context = process_other_transcript(combined_contents)
    return typ, context


def parse_raw_contents(data, status, authors):
    """
    parse raw contents into an array of parsed transcript & annotation objects
    """

    # Divide each annotation into its subparts
    # - FrontMatter
    # - Contents
    # Parse rest of doc content, i.e., transcript contents
    contents = []
    if not status:
        if len(data):
            status = 'during'
        else:
            status = 'before'
    for r in data:
        if r['type'] == 'annotation':
            annotation = {}
            marker_counter = 0
            raw_metadata = []
            raw_contents = []
            for tag in r['contents']:
                text = tag.get_text()
                m = frontmatter_marker_regex.match(text)
                if m:
                    marker_counter += 1
                else:
                    if not marker_counter:
                        continue
                    if (marker_counter == 1):
                        raw_metadata.append(tag)
                    else:
                        raw_contents.append(tag)
            metadata = process_metadata(raw_metadata)
            add_author_metadata(metadata, authors)
            for k, v in metadata.iteritems():
                annotation[k] = v
            annotation[u'contents'] = process_annotation_contents(raw_contents)
            annotation[u'markup'] = transform_annotation_markup(annotation)
            annotation[u'type'] = "annotation"
            contents.append(annotation)
        else:
            transcript = {'type': 'other'}
            typ, context = process_transcript_content(r['content'])
            transcript['type'] = typ
            transcript['context'] = context
            transcript['markup'] = transform_transcript_markup(transcript)
            transcript['published'] = 'yes'
            contents.append(transcript)
    return contents, status


def categorize_doc_content(doc):
    """
    Identifies and bundles together annotations leaving the rest of the
    transcript content untouched
    """
    fact_check_status = None
    hr = doc.soup.hr
    if hr:
        # Remove div elements after hr to solve issue #63
        # Comments where there are links pasted in from another source
        # got poured into the final document. since there's no way to create
        # divs natively inside the google doc, we clear those out.
        for comment in hr.find_all('div'):
            comment.decompose()
        # If we see an h1 with that starts with END
        if hr.find("p", text=end_fact_check_regex):
            fact_check_status = 'after'
            # Get rid of everything after the Horizontal Rule
            hr.decompose()
        elif hr.find("p", text=end_transcript_regex):
            fact_check_status = 'transcript-end'
            # Get rid of everything after the Horizontal Rule
            hr.decompose()
        else:
            # Get rid of the marker but keep the last paragraph
            for child in hr.children:
                if (child.string):
                    after_hr_text = child.string
                else:
                    after_hr_text = child.get_text()
                m = do_not_write_regex.match(after_hr_text)
                if m:
                    child.decompose()
                    if m.group(1):
                        # Force before and error status on transcript
                        fact_check_status = 'error'
                    break
            hr.unwrap()

    result = []
    body = doc.soup.body
    inside_annotation = False
    annotation_contents = []
    for child in body.children:
        logger.debug("child: %s" % child)
        if is_anno_start_marker(child):
            inside_annotation = True
            annotation_contents = []
        elif is_anno_end_marker(child):
            inside_annotation = False
            result.append({'type': 'annotation',
                           'contents': annotation_contents})
        else:
            if inside_annotation:
                annotation_contents.append(child)
            else:
                result.append({'type': 'transcript',
                               'content': child})
    return result, fact_check_status


def getAuthorsData():
    """
    Transforms the authors excel file
    into a format like this
    "dm": {
        "initials": "dm",
        "name": "Domenico Montanaro",
        "role": "NPR Political Editor & Digital Audience",
        "page": "http://www.npr.org/people/xxxx",
        "img": "http://media.npr.org/assets/img/yyy.jpg"
    }
    """
    authors = {}
    try:
        book = xlrd.open_workbook(app_config.AUTHORS_PATH)
        sheet = book.sheet_by_index(0)
        header = True
        for row in sheet.get_rows():
            # Ignore header row
            if header:
                header = False
                continue
            initials = row[0].value
            if initials in authors:
                logger.warning("Duplicate initials on authors dict: %s" % (
                               initials))
                continue
            author = {}
            author['initials'] = row[0].value
            author['name'] = row[1].value
            author['role'] = row[2].value
            author['page'] = row[3].value
            author['img'] = row[4].value
            authors[initials] = author
    except Exception, e:
        logger.error("Could not process the authors excel file: %s" % (e))
    finally:
        return authors


def parse(doc, authors=None):
    """
    Custom parser for the debates google doc format
    """
    context = {}
    logger.info('-------------start------------')
    if not authors:
        authors = getAuthorsData()
    # Categorize content of original doc into transcript and annotations
    raw_contents, status = categorize_doc_content(doc)
    contents, status = parse_raw_contents(raw_contents, status, authors)
    number_of_fact_checks = len([x for x in raw_contents
                                if x['type'] == 'annotation'])
    number_of_transcript = len([x for x in raw_contents
                                if x['type'] == 'transcript'])
    logger.info('Fact Checks: %s, Transcript Paragraphs: %s' % (
                number_of_fact_checks,
                number_of_transcript))
    logger.info('Application state: %s' % status)

    context['contents'] = contents
    context['status'] = status
    logger.info('-------------end------------')
    return context
