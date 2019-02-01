/**
* Updates the google drive document with the new transcript data received through the SRT stream
* called by the time based trigger launch in init
* (defaults to 1 minute which is the minimum allowed by google)
* via: https://developers.google.com/apps-script/guides/triggers/installable#time-driven_triggers
*/
function updateCSPAN() {
  var response = null;
  var content = null;
  try {
    // get cspan url
    var url = props.getProperty('api_cspan_url');
    PersistLog.debug('url: %s', url);
    // get last processed lastCaption
    var lastCaptionID = _getNumProperty('lastCaptionID');
    PersistLog.debug('lastCaptionID: %s', lastCaptionID);

    // Get data from stream
    try {
      response = _getAPIData(url, 'since', lastCaptionID);
    } catch(e) {
      e = (typeof e === 'string') ? new Error(e): e;
      var msg =  Utilities.formatString('Exception ocurred while invoking UrlFetchApp for %s. Is the server stopped on purpose?', url);
      PersistLog.warning(msg);
        // Server stopped has the transcription ended?
        _checkTranscriptEnd();
        PersistLog.info('update process end: no new transcript texts found');
        return;
      }

      var responseCode = response.getResponseCode();
      if (responseCode === 404) {
        // Server stopped has the transcription ended?
        _checkTranscriptEnd();
        PersistLog.info('update process end: no new transcript texts found');
        return;
      }
      else if (responseCode !== 200 && responseCode !== 204) {
        var msg =  Utilities.formatString('Request failed to %s. Expected 200 or 204, got %s', url, responseCode);
        PersistLog.severe(msg);
        throw new Error(msg);
      }

    // Get the content from the response
    var json_response = JSON.parse(response.getContentText("UTF-8"));
    content = json_response.captions

    if (content.length === 0) {
        // No new data received
        _checkTranscriptEnd();
        PersistLog.info('update process end: no new transcript characters found.');
        return;
      }

    // New data received reset no data counter
    props.setProperty('noDataCounter', 0);

    var newCaptionID = json_response.now;
    if (newCaptionID === undefined) {
      newCaptionID = lastCaptionID;
    }
    PersistLog.info('received captionID: %s', newCaptionID);

    // Format the received texts to count for line breaks and such
    var formattedParagraphs = _formatCSPANTranscript(content);
    PersistLog.debug('New Formatted Paragraphs: %s', formattedParagraphs.length);

    // Check if the first chunk of new text starts with a new paragraph
    var pattern = /^\s*(>>|\[)/;
    var newParagraph = pattern.test(content);
    PersistLog.debug('Starts with newParagraph?: %s', newParagraph);

    // Write to google drive document
    // If this is the first text that we are seeing coming in then
    // it should count as a new paragraphs
    if (lastCaptionID === null) {
      newParagraph = true;
    }
    _appendNewText(formattedParagraphs, newParagraph);

    // Store the lastCaptionID we got from the header
    if (newCaptionID !== null) {
      PersistLog.debug('Setting lastCaptionID property: %s', newCaptionID);
      props.setProperty('lastCaptionID', newCaptionID);
    }
    PersistLog.info('update process end: %s new transcript characters found.', content.length);
  } catch(e) {
    // Notify admins of the failure and propagate
    e = (typeof e === 'string') ? new Error(e): e;
    var msg =  Utilities.formatString('%s: %s (line %s, file %s). Stack: %s .', e.name || '',
      e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
    PersistLog.severe(msg);
    throw e;
  }
}

function _formatCSPANTranscript(blob) {
  PersistLog.debug('_formatDocTexts start');
  var formattedTexts = [];
  // Transform soundbites to follow the same SRT format
  // [APPLAUSE] -> :[(APPLAUSE)] and a new paragraph break
  blob = blob.replace(/\[(.*?)\]\s*/g,"\n\n:[($1)]\n\n");
  // \n\n Seems to convey a change of speaker on CSPAN openedCaptions
  blob = blob.replace(/\n\n/g, '>>');
  // blob = blob.replace(/\[LB\]/g, '\n');
  var formattedParagraphs = blob.split('>>');
  // Ignore the empty initial in case it starts with a new paragraph
  if (!formattedParagraphs[0].length) formattedParagraphs.shift();
  PersistLog.debug('formattedParagraphs: %s length: %s',
   formattedParagraphs, formattedParagraphs.length);

  formattedParagraphs = formattedParagraphs.filter(String);
  for (var i = 0; i < formattedParagraphs.length; i += 1) {
    PersistLog.debug('Paragraph %s: %s', i+1, formattedParagraphs[i]);
    formattedParagraphs[i] = formattedParagraphs[i].trim();
      // Make speakers uppercase to mimic SRT format
      formattedParagraphs[i] = formattedParagraphs[i].replace(/^([ A-Za-z0-9.-]{2,30}?:)/, function(v) { return v.toUpperCase(); });
    }
  // If there's only one paragraph in a given chunk
  // and the paragraph under the Horizontal rule is too long
  // Find the first period and add an artificial paragraph so that
  // the factcheckers can start annotating.
  if (formattedParagraphs.length == 1) {
    if (_isParagraphUnderLineTooLong()) {
      var bits = formattedParagraphs[0].split(/(\w{3,}\.)/);
      if (bits.length > 1) {
        PersistLog.info('tweaked long paragraph');
        formattedParagraphs[0] = bits.shift();
        formattedParagraphs[0] += bits.shift();
        formattedParagraphs.push(bits.join('').trim());
      }
    }
  }
  return formattedParagraphs;
};
