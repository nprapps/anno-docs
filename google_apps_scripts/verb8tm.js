/**
 * Updates the google drive document with the new transcript data received through the SRT stream
 * called by the time based trigger launch in init
 * (defaults to 1 minute which is the minimum allowed by google)
 * via: https://developers.google.com/apps-script/guides/triggers/installable#time-driven_triggers
 */
function updateVerb8tm() {
  var response = null;
  var header = null;
  var content = null;
  var startTime = null;
  try {
    // get startTime from propeties
    startTime = _getNumProperty("startTime");
    if (startTime === null) {
      // get transcript start time from API if not found
      response = _getVerb8tmStartTime();
      if (response) {
        content = response.getContentText("UTF-8");
        startTime = Date.parse(content);
        PersistLog.debug("Setting startTime property: %s", startTime);
        // store transcript start time property
        props.setProperty("startTime", startTime);
      } else {
        PersistLog.warning("Did not find a startTime on the api endpoint");
        //Did not get a start time set the scheduled one as a default
        startTime = Date.parse("2/5/2019 9:00:00 PM EDT");
      }
    }

    // get cspan url
    var url = props.getProperty("api_srt_url");
    PersistLog.debug("url: %s", url);
    // get last processed lastCaption
    var lastCaptionID = _getNumProperty("lastCaptionID");
    PersistLog.debug("lastCaptionID: %s", lastCaptionID);
    // Get data from stream
    try {
      response = _getAPIData(url, "lastCaptionID", lastCaptionID);
    } catch (e) {
      e = typeof e === "string" ? new Error(e) : e;
      var msg = Utilities.formatString(
        "Exception ocurred while invoking UrlFetchApp for %s",
        url
      );
      PersistLog.severe(msg);
      throw e;
    }

    var responseCode = response.getResponseCode();
    if (responseCode !== 200 && responseCode !== 204) {
      var msg = Utilities.formatString(
        "Request failed to %s. Expected 200 or 204, got %s",
        url,
        responseCode
      );
      PersistLog.severe(msg);
      throw new Error(msg);
    }
    // Get the content from the response
    content = response.getContentText("UTF-8");
    headers = response.getHeaders();
    for (key in headers) {
      PersistLog.debug("key: %s, value: %s", key, headers[key]);
    }
    var newCaptionID = headers.lastCaptionID;
    if (newCaptionID === undefined) {
      newCaptionID = headers.lastcaptionid;
    }
    PersistLog.info("received captionID: %s", newCaptionID);

    // Parse SRT data
    var parsed = _fromSrt(content, true);
    PersistLog.debug("parsed_transcript_texts: %s", parsed.length);

    if (parsed.length === 0) {
      // No new data received
      _checkTranscriptEnd();
      PersistLog.info(
        "update process end: %s total lines, no new transcript texts found",
        parsed.length
      );
      return;
    }

    // New data received reset no data counter
    props.setProperty("noDataCounter", 0);

    // Format the received texts to count for line breaks and such
    var formattedParagraphs = _formatVerb8tmTranscript(parsed, startTime);
    PersistLog.debug(
      "New Formatted Paragraphs: %s",
      formattedParagraphs.length
    );

    // Check if the first chunk of new text starts with a new paragraph
    var pattern = /^\s*>>/;
    var newParagraph = pattern.test(parsed[0].text);
    PersistLog.debug("Starts with newParagraph?: %s", newParagraph);

    // Write to google drive document
    _appendNewText(formattedParagraphs, newParagraph);

    // Store the lastCaptionID we got from the header
    if (newCaptionID !== null) {
      PersistLog.debug("Setting lastCaptionID property: %s", newCaptionID);
      props.setProperty("lastCaptionID", newCaptionID);
    }
    PersistLog.info(
      "update process end: %s new transcript lines found.",
      parsed.length
    );
  } catch (e) {
    // Notify admins of the failure and propagate
    e = typeof e === "string" ? new Error(e) : e;
    var msg = Utilities.formatString(
      "%s: %s (line %s, file %s). Stack: %s .",
      e.name || "",
      e.message || "",
      e.lineNumber || "",
      e.fileName || "",
      e.stack || ""
    );
    PersistLog.severe(msg);
    throw e;
  }
}

/**
 * Transforms a time in srt format to ms to use in comparisons
 *
 * @private
 * @param {string} val The time in srt format ("00:01:28,468")
 * @returns {number} Time transformed in milliseconds
 */
function _timeMs(val) {
  var regex = /(\d+):(\d{2}):(\d{2}),(\d{3})/;
  var parts = regex.exec(val);

  if (parts === null) {
    return 0;
  }

  for (var i = 1; i < 5; i++) {
    parts[i] = parseInt(parts[i], 10);
    if (isNaN(parts[i])) parts[i] = 0;
  }

  // hours + minutes + seconds + ms
  return parts[1] * 3600000 + parts[2] * 60000 + parts[3] * 1000 + parts[4];
}

/**
 * Transforms a srt transcript into a list of objects
 *
 * @private
 * @param {String} data SRT file/stream stringified
 * @param {Boolean} ms
 * @returns {Object[]} Array of objects with id, startTime, endTime and text properties.
 */
function _fromSrt(data, ms) {
  PersistLog.debug("_fromSrt start");
  var useMs = ms ? true : false;

  data = data.replace(/\r/g, "");
  var regex = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g;
  data = data.split(regex);
  data.shift();

  var items = [];
  for (var i = 0; i < data.length; i += 4) {
    items.push({
      id: data[i].trim(),
      startTime: useMs ? _timeMs(data[i + 1].trim()) : data[i + 1].trim(),
      endTime: useMs ? _timeMs(data[i + 2].trim()) : data[i + 2].trim(),
      text: data[i + 3].trim()
    });
  }

  return items;
}

/**
 * Transforms the received srt text into a better formatted output
 *
 * @private
 * @param {String[]}  Array of text strings.
 * @returns {String[]} Array of formatted strings.
 */
function _formatVerb8tmTranscript(parsed, startTime) {
  PersistLog.debug("_formatDocTexts start");
  var formattedTexts = [];
  var text = null;
  var pattern = /^(>>\s*)([A-Z\s.-]+):\s*(.*)/;
  for (var i = 0; i < parsed.length; i++) {
    text = parsed[i].text;
    text = text.replace(/\n/g, " ");
    // Remove timestamps for the 4th debate
    // var m = text.match(pattern)
    // if (m) {
    //     computedUTCDate = _formatDate(startTime + parsed[i].startTime);
    //     PersistLog.debug('ComputedTime for %s is %s', text, computedUTCDate);
    //     text =  m[1] + m[2] + ' [' + computedUTCDate + ']: ' + m[3];
    // }
    formattedTexts.push(text);
  }
  PersistLog.debug(
    "formattedTexts: %s length: %s",
    formattedTexts,
    formattedTexts.length
  );
  var blob = formattedTexts.join(" ");
  // Remove newlines that do not come after a period
  // blob = blob.replace(/([^.]\s+)\n/g,"$1")
  // Remove all new lines, we can not infer if they are paragraphs or not
  // blob = blob.replace(/\n/g, '');
  blob = blob.replace(/\s{2,}/g, " ");
  blob += " ";
  // blob = blob.replace(/\[LB\]/g, '\n');
  var formattedParagraphs = blob.split(">>");
  // Ignore the empty initial in case it starts with a new paragraph
  if (!formattedParagraphs[0].length) formattedParagraphs.shift();
  PersistLog.debug(
    "formattedParagraphs: %s length: %s",
    formattedParagraphs,
    formattedParagraphs.length
  );
  for (var i = 0; i < formattedParagraphs.length; i += 1) {
    PersistLog.debug("Paragraph %s: %s", i + 1, formattedParagraphs[i]);
  }
  // If there's only one paragraph in a given chunk
  // and the paragraph under the Horizontal rule is too long
  // Find the first period and add an artificial paragraph so that
  // the factcheckers can start annotating.
  if (formattedParagraphs.length == 1) {
    if (_isParagraphUnderLineTooLong()) {
      var bits = formattedParagraphs[0].split(/(\w{3,}\.)/);
      if (bits.length > 1) {
        PersistLog.info("tweaked long paragraph");
        formattedParagraphs[0] = bits.shift();
        formattedParagraphs[0] += bits.shift();
        formattedParagraphs.push(bits.join("").trim());
      }
    }
  }
  return formattedParagraphs;
}
