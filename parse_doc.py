# _*_ coding:utf-8 _*_
import logging
import re
import copy
import app_config
import doc_config
from bs4 import BeautifulSoup

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)

end_transcript_regex = re.compile(ur'.*LIVE\sTRANSCRIPT\sHAS\sENDED.*',
                                  re.UNICODE)
do_not_write_regex = re.compile(ur'.*DO\s*NOT\s*WRITE\s*BELOW\s*THIS\s*LINE.*',
                                re.UNICODE)
end_fact_check_regex = re.compile(ur'^\s*[Ee][Nn][Dd]\s*$',
                                  re.UNICODE)

fact_check_regex = re.compile(ur'^\s*NPR\s*:', re.UNICODE)
continuation_regex = re.compile(ur'^\s*CONT\s*:', re.UNICODE)
speaker_regex = re.compile(ur'^[A-Z\s.-]+(\s\[.*\])?:', re.UNICODE)
soundbite_regex = re.compile(ur'^\s*:', re.UNICODE)

extract_fact_metadata_regex = re.compile(
    ur'^\s*(<.*?>)?NPR\s*:\s*(([A-Za-z0-9]{2,3})-[A-Za-z0-9-]+):?\W(.*)',
    re.UNICODE)
extract_cont_metadata_regex = re.compile(
    ur'^\s*(<.*?>)?CONT\s*:\s*(.*)', re.UNICODE)
extract_speaker_metadata_regex = re.compile(
    ur'^\s*(<.*?>)?([A-Z\s.-]+)\s*(?:\[(.*)\]\s*)?:\s*(.*)', re.UNICODE)
extract_soundbite_metadata_regex = re.compile(
    ur'^\s*(?:<.*?>)?\s*:\[\((.*)\)\]', re.UNICODE)

FACT_CHECK_TPL = '''
<div class="annotation" id="%(slug)s">
    %(fact_check_text)s
    <div class="annotation-header">
        <img class="%(annotation_label_class)s" src="%(author_img)s"></img>
        <div class="annotation-byline">
            <a class="byline-name" href="%(author_page)s">%(author_name)s</a>
            <span class="byline-role">%(author_role)s</span>
        </div>
    </div>
    <div class="annotation-nav">
        <a href="#" class="previousNav"><span class="triangleIcon">&#9650;</span> <span class="navText">Previous annotation</span></a><a href="#" class="nextNav" ><span class="navText">Next annotation</span> <span class="triangleIcon">&#9660;</span></a>
    </div>
</div>
'''

FACT_CHECK_TPL_NO_PAGE = '''
<div class="annotation" id="%(slug)s">
    %(fact_check_text)s
    <div class="annotation-header">
        <img class="%(annotation_label_class)s" src="%(author_img)s"></img>
        <div class="annotation-byline">
            <span class="byline-name">%(author_name)s</span>
            <span class="byline-role">%(author_role)s</span>
        </div>
    </div>
    <div class="annotation-nav">
        <a href="#" class="previousNav"><span class="triangleIcon">&#9650;</span> <span class="navText">Previous annotation</span></a><a href="#" class="nextNav" ><span class="navText">Next annotation</span> <span class="triangleIcon">&#9660;</span></a>
    </div>
</div>
'''

PARAGRAPH_TPL = '<p>%s</p>'

SPEAKER_TPL = '''
<div class="speaker_wrapper">
    <h4 class="%(speaker_class)s">%(speaker)s</h4>
    <span class="timestamp">%(timestamp)s</span>
</div>
%(transcript_text)s
'''

SOUNDBITE_TPL = '''
<p class="soundbite">%(soundbite)s</p>
'''

# Handle duplicate slugs warning
slugs = []


def transform_fact_check(paragraphs, doc):
    """
    adds markup to each fact check
    """

    # This will wrap all the fact check paragraphs
    fact_check_wrapper = doc.soup.new_tag('div')
    fact_check_wrapper['class'] = 'annotations-wrapper'

    for paragraph in paragraphs:
        # We need to recreate the contents since copyDoc
        # is stripping the spans but leaving the child structure untouched
        combined_contents = ''
        for content in paragraph.contents:
            combined_contents += unicode(content)

        m = extract_cont_metadata_regex.match(combined_contents)

        if m:
            # Append paragraph contents to the wrapper
            # Check to see if the slug is on this child tag
            if m.group(1):
                clean_text = m.group(1) + m.group(2)
            else:
                clean_text = m.group(2)
            new_paragraph = BeautifulSoup(
                PARAGRAPH_TPL % (clean_text), "html.parser")
            fact_check_wrapper.append(new_paragraph)
        else:
            # Check to see if the slug is on this child tag
            m = extract_fact_metadata_regex.match(combined_contents)
            if m:
                slug = m.group(2).lower()
                slugs.append(slug)
                annotation_label_class = 'annotation-label'
                author = m.group(3).lower()
                if m.group(1):
                    clean_text = m.group(1) + m.group(4)
                else:
                    clean_text = m.group(4)

                # Grab info from dictionary
                try:
                    author_name = doc_config.FACT_CHECKERS[author]['name']
                    author_role = doc_config.FACT_CHECKERS[author]['role']
                    author_page = doc_config.FACT_CHECKERS[author]['page']
                    author_img = doc_config.FACT_CHECKERS[author]['img']
                except KeyError:
                    logger.warning(
                        'did not find author in app_config %s' % author)
                    author_name = 'NPR Staff'
                    author_role = 'NPR'
                    author_page = 'http://www.npr.org/'
                    author_img = ''

                # Handle author images, which some authors may not have
                if author_img == '':
                    annotation_label_class += ' no-img'
            else:
                logger.error("ERROR: Unexpected metadata format %s" %
                             combined_contents)
                return None
            new_paragraph = BeautifulSoup(
                PARAGRAPH_TPL % (clean_text), "html.parser")
            fact_check_wrapper.append(new_paragraph)

    tpl = FACT_CHECK_TPL if author_page != '' else FACT_CHECK_TPL_NO_PAGE

    fact_check_markup = tpl % {
        'slug': slug,
        'annotation_label_class': annotation_label_class,
        'author_page': author_page,
        'author_name': author_name,
        'author_role': author_role,
        'author_img': author_img,
        'fact_check_text': fact_check_wrapper}
    markup = BeautifulSoup(fact_check_markup, "html.parser")

    return markup


def transform_speaker(paragraph):
    """
    parses speaker paragraphs.
    transforming into the desired output markup
    """
    combined_contents = ''
    for content in paragraph.contents:
        combined_contents += unicode(content)
    m = extract_speaker_metadata_regex.match(combined_contents)
    if m:
        speaker = m.group(2).strip()
        try:
            speaker_class = doc_config.SPEAKERS[speaker]
        except KeyError:
            logger.debug('did not find speaker in app_config %s' % speaker)
            speaker_class = 'speaker'

        timestamp = m.group(3)
        if m.group(1):
            clean_text = m.group(1) + m.group(4)
        else:
            clean_text = m.group(4)
    else:
        logger.error("ERROR: Unexpected metadata format %s" %
                     combined_contents)
        return paragraph

    new_paragraph = BeautifulSoup(PARAGRAPH_TPL % (clean_text), "html.parser")
    speaker_markup = SPEAKER_TPL % {
        'speaker_class': speaker_class,
        'speaker': speaker,
        'timestamp': timestamp,
        'transcript_text': new_paragraph}

    # Change strong tags
    speaker_markup = replace_strong_tags(speaker_markup)
    markup = BeautifulSoup(speaker_markup, "html.parser")
    return markup


def transform_soundbite(paragraph):
    """
    parses speaker paragraphs.
    transforming into the desired output markup
    """
    combined_contents = ''
    for content in paragraph.contents:
        combined_contents += unicode(content)

    m = extract_soundbite_metadata_regex.match(combined_contents)
    if m:
        clean_text = '(%s)' % m.group(1)
    else:
        logger.error("ERROR: Unexpected metadata format %s" %
                     combined_contents)
        return paragraph

    soundbite_markup = SOUNDBITE_TPL % {'soundbite': clean_text}
    soundbite_markup = replace_strong_tags(soundbite_markup)
    markup = BeautifulSoup(soundbite_markup, "html.parser")

    return markup


def transform_other_text(paragraph):
    """
    parses speaker paragraphs.
    transforming into the desired output markup
    """
    combined_contents = ''
    for content in paragraph.contents:
        combined_contents += unicode(content)

    clean_text = combined_contents
    other_markup = PARAGRAPH_TPL % (clean_text)
    other_markup = replace_strong_tags(other_markup)
    markup = BeautifulSoup(other_markup, "html.parser")
    return markup


def replace_strong_tags(markup):
    """
    Replaces strong tags with
    spans with class fact_checked
    """
    markup = markup.replace('<strong>', '<span class="fact-checked">')
    markup = markup.replace('</strong>', '</span>')
    return markup


def parse(doc):
    """
    Custom parser for the debates google doc format
    returns boolean marking if the transcript is live or has ended
    """
    global slugs
    # Counters for checking number of fact checks and speaker tags
    parsed_document = {}
    number_of_fact_checks = 0
    number_of_speakers = 0

    fact_checks = []
    slugs = []
    # Stores the state of the transcript
    # before, during or after needed on the front end
    fact_check_status = None
    logger.info('-------------start------------')
    hr = doc.soup.hr
    # If we see an h1 with that starts with END
    if hr.find("p", text=end_fact_check_regex):
        fact_check_status = 'after'
        # Get rid of everything after the Horizontal Rule
        hr.extract()
    elif hr.find("p", text=end_transcript_regex):
        fact_check_status = 'transcript-end'
        # Get rid of everything after the Horizontal Rule
        hr.extract()
    else:
        # Get rid of the marker but keep the last paragraph
        for child in hr.children:
            if (child.string):
                after_hr_text = child.string
            else:
                after_hr_text = child.get_text()
            m = do_not_write_regex.match(after_hr_text)
            if m:
                child.extract()
        hr.unwrap()

    paragraphs = doc.soup.findAll('p')
    logger.debug("Number of paragraphs: %s" % len(paragraphs))
    for paragraph in paragraphs:
        text = paragraph.get_text()
        # Ignore empty paragraphs
        if (len(paragraph.contents) == 0) or (text.strip() == ""):
            logger.debug("found empty or just spaces paragraph")
            paragraph.extract()
            continue
        logger.debug('Paragraph text: %s' % text)
        # Fact check continuation paragraphs are handled with
        # the fact check paragraph itself so remove from the tree
        if continuation_regex.match(text):
            logger.debug('Fact Check Continuation Paragraph. Remove it')
            paragraph.extract()
        # TODO Remove CONT paragraphs
        elif fact_check_regex.match(text):
            number_of_fact_checks += 1
            logger.debug('FactCheck Paragraph. Add cont & transform')
            # We need to create a copy of the elements
            paragraphs = [copy.copy(paragraph)]
            for sibling in paragraph.next_siblings:
                # Ignore empty paragraphs
                sibling_text = sibling.get_text().strip()
                if (len(sibling.contents) == 0) or (sibling_text == ""):
                    continue
                if continuation_regex.match(sibling.get_text()):
                    paragraphs.append(copy.copy(sibling))
                else:
                    break
            markup = transform_fact_check(paragraphs, doc)
            # Replace the paragraph with the new markup
            if markup:
                paragraph.replace_with(markup)
                fact_checks.append(markup)
            else:
                # Delete non complaint fact check paragraph
                paragraph.extract()
        elif speaker_regex.match(text):
            number_of_speakers += 1
            logger.debug('Speaker Paragraph. Transform')
            markup = transform_speaker(paragraph)
            paragraph.replace_with(markup)
            if not fact_check_status:
                fact_check_status = 'during'
        elif soundbite_regex.match(text):
            logger.debug('SoundBites Paragraph. Transform')
            markup = transform_soundbite(paragraph)
            paragraph.replace_with(markup)
            if not fact_check_status:
                fact_check_status = 'during'
        else:
            markup = transform_other_text(paragraph)
            paragraph.replace_with(markup)
            logger.debug('Did not find paragraph metadata in: %s' % (
                paragraph.contents))

    # If we have not detected a speaker, a soundbite or the end
    # Then we mark the status as not started
    if not fact_check_status:
        fact_check_status = 'before'

    # Test for duplicates on slugs
    # via:
    # http://stackoverflow.com/questions/1541797/check-for-duplicates-in-a-flat-list
    s = set()
    duplicates = set(slug for slug in slugs if slug in s or s.add(slug))
    if len(duplicates):
        logger.error('Found duplicates in generated slugs: %s' % (
                     ', '.join(duplicates)))

    logger.info('Fact Checks: %s, Speaker Paragraphs: %s' % (
                number_of_fact_checks,
                number_of_speakers))
    logger.info('Application state: %s' % fact_check_status)

    parsed_document['doc'] = doc
    parsed_document['fact_check_status'] = fact_check_status
    parsed_document['fact_checks'] = fact_checks
    logger.info('-------------end------------')
    return parsed_document
