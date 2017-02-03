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
};

/**
* Transforms a srt transcript into a list of objects
*
* @private
* @param {String} data SRT file/stream stringified
* @param {Boolean} ms
* @returns {Object[]} Array of objects with id, startTime, endTime and text properties.
*/
function _fromSrt(data, ms) {
    PersistLog.debug('_fromSrt start');
    var useMs = ms ? true : false;

    data = data.replace(/\r/g, '');
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
};

/**
* Transforms a srt transcript into a list of objects
*
* @private
* @param {String} data SRT file/stream stringified
* @param {Boolean} ms
* @returns {Object[]} Array of objects with id, startTime, endTime and text properties.
*/
function _fromVerb8tmSrt(data, ms) {
    PersistLog.debug('_fromVerb8tmSrt start');
    var useMs = ms ? true : false;

    data = data.replace(/\r/g, '');
    var regex = /(\d+)\n(\d+) --> (\d+)/g;
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
};

/**
* Transforms the received srt text into a better formatted output
*
* @private
* @param {String[]}  Array of text strings.
* @returns {String[]} Array of formatted strings.
*/
function _formatDocTexts(parsed, startTime) {
    PersistLog.debug('_formatDocTexts start');
    var formattedTexts = [];
    var text = null;
    var pattern = /^(>>\s*)([A-Z\s.-]+):\s*(.*)/
    for (var i = 0; i < parsed.length; i++) {
      text = parsed[i].text;
      text = text.replace(/\n/g, '');

      // Remove timestamps for the 4th debate
      // var m = text.match(pattern)
      // if (m) {
      //   computedUTCDate = _formatDate(startTime + parsed[i].startTime);
      //   PersistLog.debug('ComputedTime for %s is %s', text, computedUTCDate);
      //   text =  m[1] + m[2] + ' [' + computedUTCDate + ']: ' + m[3];
      // }

      formattedTexts.push(text);
    }
    PersistLog.debug('formattedTexts: %s length: %s',
                     formattedTexts, formattedTexts.length);
    var blob = formattedTexts.join(' ');
    // Remove newlines that do not come after a period
    //blob = blob.replace(/([^.]\s+)\n/g,"$1")
    // Remove all new lines, we can not infer if they are paragraphs or not
    blob = blob.replace(/\n/g, '');
    blob = blob.replace(/  /g, ' ');
    // blob = blob.replace(/\[LB\]/g, '\n');
    var formattedParagraphs = blob.split('>>');
    // Ignore the empty initial in case it starts with a new paragraph
    if (!formattedParagraphs[0].length) formattedParagraphs.shift();
    PersistLog.debug('formattedParagraphs: %s length: %s',
                     formattedParagraphs, formattedParagraphs.length);
    for (var i = 0; i < formattedParagraphs.length; i += 1) {
        PersistLog.debug('Paragraph %s: %s', i+1, formattedParagraphs[i]);
    }
    return formattedParagraphs;
};

function _formatCSPANText(blob) {
    PersistLog.debug('_formatDocTexts start');
    var formattedTexts = [];
    // Transform soundbites to follow the same SRT format
    // [APPLAUSE] -> :[(APPLAUSE)] and a new paragraph break
    blob = blob.replace(/(\[(.*?)\])\s*/g,"\n\n:[($1)]\n\n");
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
        formattedParagraphs[i] = formattedParagraphs[i].replace(/([A-Za-z0-9.-]{1,30}:)/, function(v) { return v.toUpperCase(); });
    }
    // If there's only one paragraph in a given chunk
    // and the paragraph under the Horizontal rule is too long
    // Find the first period and add an artificial paragraph so that
    // the factcheckers can start annotating.
    if (formattedParagraphs.length == 1) {
        if (_isParagraphUnderLineTooLong()) {
            var bits = formattedParagraphs[0].split(/(\w{3,}\.)/);
            if (bits.length > 1) {
                PersistLog.info('tweaked long paragraph: %s', formattedParagraphs[0]);
                formattedParagraphs[0] = bits.shift();
                formattedParagraphs[0] += bits.shift();
                formattedParagraphs.push(bits.join('').trim());
            }
        }
    }
    return formattedParagraphs;
};

