/**
* Fetches the transcript stream, parses it and appends it to the body
* of the document
* comparing with "endTime" which is a property stored at script level
* via https://developers.google.com/apps-script/guides/properties
*
* @private
* @param {Object[]} items Array of SRT objects
* @returns {String[]} Array of new SRT texts received on the stream
*/
function _getTranscriptStream(lastCaptionID) {
  PersistLog.debug('_getTranscriptStream start');
  var api_srt_url = props.getProperty('api_srt_url');
  // Transcript stream url
  if (!api_srt_url) {
    var msg = "did not find api_srt_url in script properties"
    PersistLog.severe(msg);
    throw new Error(msg);
  }
  var transcript_url;
  if (lastCaptionID !== null) {
    transcript_url = api_srt_url + '?lastCaptionID=' + lastCaptionID;
  } else {
    transcript_url = api_srt_url + '?lastCaptionID=0';
  }
  try {
    PersistLog.debug('transcript_url: %s', transcript_url);
    var response = UrlFetchApp.fetch(transcript_url,{muteHttpExceptions: true});
  } catch(e) {
    e = (typeof e === 'string') ? new Error(e): e;
    var msg =  Utilities.formatString('Exception ocurred while invoking UrlFetchApp for %s', transcript_url);
    PersistLog.severe(msg);
    throw e;
  }
  var responseCode = response.getResponseCode();

  if (responseCode !== 200 && responseCode !== 204) {
    var msg =  Utilities.formatString('Request failed to %s. Expected 200 or 204, got %s', transcript_url, responseCode);
    PersistLog.severe(msg);
    throw new Error(msg);
  }
  return response;
}

/**
* Fetches the transcript start time to set a timestamp to each speaker
* combined with the offset in milliseconds on the start caption
*
* @private
* @returns {String} Start transcript date
*/
function _getTranscriptStartTime() {
  PersistLog.debug('_getTranscriptStartTime start');
  try {
    var api_timestamp_url = props.getProperty('api_timestamp_url');
    if (!api_timestamp_url) {
      var msg = "did not find api_timestamp_url in script properties"
      PersistLog.severe(msg);
      throw new Error(msg);
    }
    var response = UrlFetchApp.fetch(api_timestamp_url, {muteHttpExceptions: true});
  } catch(e) {
    e = (typeof e === 'string') ? new Error(e): e;
    var msg =  Utilities.formatString('Exception ocurred while invoking UrlFetchApp for %s', transcript_url);
    PersistLog.severe(msg);
    throw e;
  }
  var responseCode = response.getResponseCode();

  if (responseCode === 409) {
    PersistLog.debug('Show StartTime not set yet: %s', responseCode);
    return null;
  }
  else if (responseCode !== 200 && responseCode !== 204) {
    var msg =  Utilities.formatString('Request failed to %s. Expected 200 or 204, got %s', transcript_url, responseCode);
    PersistLog.severe(msg);
    throw new Error(msg);
  }
  return response;
}

/**
* Appends freshly received new texts from the transcript into the google doc
*
* @private
* @param {String[]} items Array of SRT texts
*/
function _appendNewTranscripts(texts, newParagraph) {
  try {
    PersistLog.debug('appendNewTranscriptData start');
    var body = doc.getBody();
    // We need to append to the last element on the document
    if (!newParagraph) {
      // Remove the first element
      var textToAppend = texts.shift();
      var merge_p = body.appendParagraph(" "+textToAppend);
      merge_p.merge();
      // If after removing the first paragraph we do not have more
      // We will not remove the markers just leave them down there
      if (!texts.length) {
        return;
      }
    }

    var p = null;
    var text = null;
    var soundbite_detected = false;
    for (var i = 0; i < texts.length; i++) {
      if (texts[i].trim() === ':[(SOUNDBITE)]') {
        soundbite_detected = true;
        continue;
      }
      else if (soundbite_detected) {
        soundbite_detected = false;
        text = texts[i].replace(/^.+?:/, '');
      }
      else {
        text = texts[i];
      }
      body.appendParagraph('');
      p = body.appendParagraph(text);
    }
    var idx = body.getChildIndex(p);
    var marker = _detachMarkerParagraph(body);
    if (marker) {
      _moveMarker(body, marker, idx);
    } else {
      var msg =  Utilities.formatString('No Horizontal Rule Paragraph found');
      PersistLog.severe(msg);
    }
  } catch (e) {
    e = (typeof e === 'string') ? new Error(e): e;
    var msg =  Utilities.formatString('Exception ocurred while appending new transcripts to doc. texts: %s', texts);
    PersistLog.severe(msg);
    throw e;
  }
}

/**
* Gets executed after receiving no data on the stream
* checks if we have reached the threshold of consecutive no data events
* and stops the live update by removing the time based triggers
*
* @private
* @param {String[]} items Array of SRT texts
*/
function _checkTranscriptEnd() {
  try {
    PersistLog.debug('_checkTranscriptEnd start');
    var cnt = _getNumProperty('noDataCounter');
    var pattern = '^.*' + WARNING_TEXT + '.*$';
    // If cnt is null then no data was ever received
    // so we have not yet started the live transcript session
    if (cnt !== null) {
      if (cnt >= (IDLE_STOP_THRESHOLD - 1)) {
        // Stop live updates
        PersistLog.debug('Remove all triggers: looks like the live transcript session has ended');
        _removeTrigger();
        // Add end marker
        var body = doc.getBody();
        if (body.findText(pattern) !== null) {
          body.appendParagraph('');
          var marker = _detachMarkerParagraph(body);
          if (marker) {
            _moveMarker(body, marker, null);
          } else {
            var msg =  Utilities.formatString('No Horizontal Rule Paragraph found');
            PersistLog.severe(msg);
          }
          marker.replaceText(pattern, LIVE_TRANSCRIPT_END_MSG);
        }
      } else {
        cnt += 1;
        props.setProperty('noDataCounter', cnt);
      }
    }
  } catch (e) {
    e = (typeof e === 'string') ? new Error(e): e;
    var msg =  Utilities.formatString('Exception ocurred while checking if live transcript has ended');
    PersistLog.severe(msg);
    throw e;
  }
}

/**
* Detach the marker to guide fact checkers on where not to write to avoid conflicts
* with the time based updates, scheduled to be each minute
*
* @private
* @param {Object} body Google Apps Scripts Body class
*/
function _detachMarkerParagraph(body) {

  PersistLog.debug('_getMarkerParagraphPos start');
  var markerParagraph = null;
  var searchHR = body.findElement(DocumentApp.ElementType.HORIZONTAL_RULE);
  if (searchHR) {
    markerParagraph = searchHR.getElement().getParent().removeFromParent();
    if (markerParagraph.getNumChildren() === 1) {
      PersistLog.info("has the DO NOT WRITE message been wiped? restoring");
      // do not write message was wiped, we need to restore it
      // first delete any orphan warning messages
      var pattern = '^.*' + WARNING_TEXT + '.*$';
      body.replaceText(pattern, '');
      // Append the new warning message again
      markerParagraph.appendText(WARNING_MSG);
    }
  }
  return markerParagraph;
}

/**
* Insert the marker at the end of the document body to guide fact checkers
* on where not to write to avoid conflicts with the time based updates
*
* @private
* @param {Object} body Google Apps Scripts Body class
*/
function _initMarker(body) {
  PersistLog.debug('_appendMarker start');
  var hr = body.appendHorizontalRule();
  var marker = hr.getParent();
  marker.appendText(WARNING_MSG);
}

/**
* Insert the marker at a given position of the document body to guide fact checkers
* on where not to write to avoid conflicts
*
* @private
* @param {Object} body Google Apps Scripts Body class
*/
function _moveMarker(body, paragraph, pos) {
  PersistLog.debug('_insertMarker start');
  if (pos) {
    body.insertParagraph(pos-1, paragraph)
  } else {
    body.appendParagraph(paragraph)
    PersistLog.debug("no position passed so appending the marker to the bottom of the document");
  }
}
