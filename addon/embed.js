/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showEmbedSidebar() {
  var ui = HtmlService.createTemplateFromFile('embed_sidebar').evaluate();
  DocumentApp.getUi().showSidebar(ui);
}

/* Parses the corresponding attributes for each shortcode embed type
 * Returns a string with all the attributes needed
 */
function getAttributes(formObject) {
    var attributes = "";
    switch (formObject.embed_type) {
        case "tweet":
            attributes += "show_media=" + formObject.show_media;
            attributes += " " + "show_thread=" + formObject.show_thread;
            break;
        case "image":
            if (formObject.caption) {
              attributes += "caption=\"" + formObject.caption + "\"";
              attributes += " ";
            }
            if (formObject.credit) {
              attributes += "credit=\"" + formObject.credit + "\"";
            } else {
              var msg =  Utilities.formatString("Image must have credit.");
              throw new CustomError(msg, 'embed.js', '28');
            }
            break;
        case "youtube":
            var youtube_start_time = 0;
            if (formObject.youtube_start_minute) {
                youtube_start_time += +formObject.youtube_start_minute * 60;
            }
            if (formObject.youtube_start_second) {
                youtube_start_time += +formObject.youtube_start_second;
            }
            attributes += "youtube_start_time=" + youtube_start_time;
            break;
        case "internal_link":
            attributes += "link_text=\"" + formObject.link_text + "\"";
            break;
        default:
            Logger.log("Unexpected shortcode type %s", formObject.embed_type);
    }
    PersistLog.info("shortcode attributes: %s", attributes);
    return attributes;
}

/**
 * Replaces the text of the current selection with the provided text, or
 * inserts text at the current cursor location. (There will always be either
 * a selection or a cursor.) If multiple elements are selected, only inserts the
 * translated text in the first element that can contain text and removes the
 * other elements.
 *
 * @param {string} newText The text with which to replace the current selection.
 */
function insertShortCode(formObject) {
    try {
        _initializeLogging();
        PersistLog.info("insert Shortcode Start");
        var doc = DocumentApp.getActiveDocument();
        var cursor = doc.getCursor();
        var selection = DocumentApp.getActiveDocument().getSelection();
        var body = doc.getBody();

        // PARSE ATTRIBUTES
        var attrs = getAttributes(formObject);

        // PARSE URL

        var url = formObject.url;

        // Test url for shortcodes requiring one
        if (formObject.embed_type == "youtube" || formObject.embed_type == "facebook" || formObject.embed_type == "tweet") {
            if (url.lastIndexOf("http", 0) !== 0) {
                msg = "Is this a URL? You must enter the complete URL for the embed.";
                throw new CustomError(msg, 'embed.js', '75');
            }
            var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getResponseCode();
            if (response != 200) {
                msg = "Server did not respond. Check if URL is correct.";
                throw new CustomError(msg, 'embed.js', '80');
            }
        }

        if (formObject.embed_type == "image" || formObject.embed_type == "graphic") {
            var testUrl = IMAGE_URL + url;
            PersistLog.debug("testUrl: %s", testUrl);
            var response = UrlFetchApp.fetch(testUrl, { muteHttpExceptions: true }).getResponseCode();
            if (response == 404) {
                var msg =  Utilities.formatString("Did not find image %s in %s. Check the filename and make sure it is uploaded.", url, IMAGE_URL);
                throw new CustomError(msg, 'embed.js', '90');
            } else if (response != 200) {
                 msg = "Server did not respond. Check if URL is correct.";
                throw new CustomError(msg, 'embed.js', '93');
            }
        }

        if (formObject.embed_type == "youtube") {
            // YOUTUBE
            var youtubeRegex = /^.*(?:\/|v=)(.*)/;
            var youtube_parsed = youtubeRegex.exec(url);
            if (youtube_parsed) {
                url = 'https://www.youtube.com/embed/'+youtube_parsed[1];
                // YOUTUBE QUERY REMOVAL
                url = url.split('&')[0]
            }
        } else if (formObject.embed_type == "tweet") {
            // TWITTER QUERY REMOVAL
            url = url.split('?')[0]
        }

        // CREATE SHORTCODE
        var shortCode = "[% " + formObject.embed_type
        if (formObject.embed_type !== "internal_link") {
            shortCode += " " + url;
        } else {
            shortCode += " " + formObject.slug;
        }

        shortCode += " " + attrs + " %]";

        if (formObject.embed_type === "internal_link") {
            if (selection) {
                msg = "Internal links provide their own text. <br>Remove your cursor selection and place cursor where you want the shortcode to be inserted";
                throw new CustomError(msg, 'embed.js', '112');
            }
            else {
                // INTERNAL LINKS GO INLINE
                var surroundingText = cursor.getSurroundingText().getText();
                var surroundingTextOffset = cursor.getSurroundingTextOffset();

                // If the cursor follows or preceds a non-space character, insert a space
                // between the character and the translation. Otherwise, just insert the
                // translation.
                if (surroundingTextOffset > 0) {
                  if (surroundingText.charAt(surroundingTextOffset - 1) != ' ') {
                    shortCode = ' ' + shortCode;
                  }
                }
                if (surroundingTextOffset < surroundingText.length) {
                  if (surroundingText.charAt(surroundingTextOffset) != ' ') {
                    shortCode += ' ';
                  }
                }
                cursor.insertText(shortCode);
            }
        }
        else {
            var el = null;
            // REST OF SHORTCODES SHOULD BE ON THERE OWN PARAGRAPH
            if (selection) {
                // Insert above the first selected element
                var elements = selection.getSelectedElements();
                var firstElement = elements[0];
                if (firstElement.isPartial()) {
                    el = firstElement.getElement().getParent();
                } else {
                    el = firstElement.getElement()
                }
            } else {
                // Insert above the users cursor
                el = cursor.getElement();
                while (el.getType() != DocumentApp.ElementType.PARAGRAPH) {
                    el = el.getParent();
                    if (el.getType() == DocumentApp.ElementType.BODY_SECTION) {
                        el = cursor.getElement();
                        break;
                    }
                }
            }
            var idx = body.getChildIndex(el);
            body.insertParagraph(idx, '');
            body.insertParagraph(idx+1, shortCode);
            body.insertParagraph(idx+2, '');
        }
        PersistLog.info("inserted Shortcode: %s", shortCode);
        PersistLog.info("insert Shortcode End");
    } catch(e) {
        var msg =  Utilities.formatString('%s: %s (line %s, file %s). Stack: %s .', e.name || '',
                                      e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
        if (e instanceof CustomError) {
            PersistLog.warning(msg);
        } else {
            PersistLog.severe(msg);
        }
        if (NOTIFICATION_ENABLED) MailApp.sendEmail(NOTIFICATION_RECIPIENTS,"Error: Report", msg);
        throw e;
    }
}

function retrievePosts() {
    try {
        _initializeLogging();
        PersistLog.info("Retrieve Posts Start");
        var doc = DocumentApp.getActiveDocument();
        var body = doc.getBody();

        // Define the search parameters.
        var searchType = DocumentApp.ElementType.PARAGRAPH;
        var searchHeading = DocumentApp.ParagraphHeading.HEADING1;
        var searchResult = null;

        // Search until the paragraph is found.
        var options_array = [];
        while (searchResult = body.findElement(searchType, searchResult)) {
            var par = searchResult.getElement().asParagraph();
            if (par.getHeading() == searchHeading) {
                var heading = par.getText();
            } else if (par.getText().lastIndexOf('Slug:', 0) === 0) {
                var slug = par.getText().split(':')[1].trim();
                if (slug === 'pinned-post') {
                    continue;
                }
            } else if (par.getText().lastIndexOf('Published:', 0) === 0) {
                // Published should be the last item
                var published = par.getText().split(':')[1].toLowerCase().trim();
                if (published === 'no') {
                    heading += ' (draft)';
                }
                options_array.push('<option value="'+ slug +'">'+ heading +'</option>');
            }
        }
        PersistLog.info("found %s posts sending as options to select element", options_array.length);
        PersistLog.debug("options_array: %s", options_array);
        PersistLog.info("Retrieve Posts End");

        return options_array;
    } catch(e) {
        var msg =  Utilities.formatString('%s: %s (line %s, file %s). Stack: %s .', e.name || '',
                                      e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
        if (e instanceof CustomError) {
            PersistLog.warning(msg);
        } else {
            PersistLog.severe(msg);
        }
        if (NOTIFICATION_ENABLED) MailApp.sendEmail(NOTIFICATION_RECIPIENTS,"Error: Report", msg);
        throw e;
    }
}
