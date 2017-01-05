/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showMetadataSidebar() {
  var ui = HtmlService.createTemplateFromFile('metadata_sidebar').evaluate();
  DocumentApp.getUi().showSidebar(ui);
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
function insertMetadata(formObject) {
    try {
        _initializeLogging();
        PersistLog.info("insert Metadata Start");
        var doc = DocumentApp.getActiveDocument();
        var cursor = doc.getCursor();
        var body = doc.getBody();
        var el = null;

        // GET LAST SLUG INDEX

        var props = PropertiesService.getDocumentProperties();
        var slug_idx = _getNumProperty(props, 'SLUG_IDX');
        if (!slug_idx) {
            slug_idx = 1;
        } else {
            slug_idx += 1;
        }

        // VALIDATE HEADLINE

        if (!formObject.description || formObject.description === "") {
            msg = "You need to setup a description, you can change it later"
            throw new CustomError(msg, 'metadata.js', '41');
        }

        //COMPOSE METADATA

        // Author metadata
        if (!formObject.author) {
            msg = "No author was selected."
            throw new CustomError(msg, 'metadata.js', '51');
        }
        var author = '';
        if (formObject.author === 'other') {
            author += 'Author: ' + formObject.otherAuthor;
        }
        else {
            author += 'Author: ' + formObject.author
        }

        // Slug metadata
        var slug = 'Slug: ';
        var slug_lower = (formObject.description).toLowerCase();
        var slug_clean = slug_lower.replace(/[^\w\s]+/g,'').replace(/_/g,'-').replace(/\s+/g,'-');
        if (slug_clean.length > 40) {
            var ix = slug_clean.lastIndexOf('-', 39);
            if (ix !== -1) {
                slug_clean = slug_clean.substring(0,ix);
            }
        }
        if (slug_clean.match(/^\d/)) {
            PersistLog.info("slug %s startsWith number, adding sl- preffix", slug_clean);
            slug_clean = 'sl-' + slug_clean;
        }
        slug += slug_clean + '-' + slug_idx;

        // Published metadata
        var published = 'Published: No';

        // WRITE TO DOCUMENT
        var ui = DocumentApp.getUi();
        var selection = doc.getSelection();
        if (!selection) {
            var response = ui.alert('WARNING: CURSOR POSITION', 'Did you make sure your cursor is positioned where you want your annotation to be inserted?\nYou can also make a selection to bold the associated transcript text', ui.ButtonSet.YES_NO);
            // Process the user's response.
            if (response != ui.Button.YES) {
                return;
            }
            el = cursor.getElement();
            // If we are in the middle of text go to the parent to insert after
            if (cursor.getElement().getType() == DocumentApp.ElementType.TEXT) {
                el = el.getParent();
            }
        }
        else {
            var elements = selection.getSelectedElements();
            // Make selected elements bold
            for (var i = 0; i < elements.length; i++) {
                if (elements[i].isPartial()) {
                    var element = elements[i].getElement().asText();
                    var startIndex = elements[i].getStartOffset();
                    var endIndex = elements[i].getEndOffsetInclusive();
                    element.setBold(startIndex, endIndex, true)
                } else {
                    elements[i].getElement().setBold(true);
                }
            }

            // Insert below the last selected element
            var lastElement = elements[elements.length - 1];
            if (lastElement.isPartial()) {
                el = lastElement.getElement().getParent();
            }
            else {
                el = lastElement.getElement()
            }
        }
        var idx = body.getChildIndex(el) + 1;
        body.insertParagraph(idx+1, NEW_POST_MARKER).setBold(false).setBackgroundColor(null).setForegroundColor(null);
        var heading = body.insertParagraph(idx+2, formObject.description).setHeading(DocumentApp.ParagraphHeading.HEADING1);
        p = body.insertParagraph(idx+3, FRONTMATTER_MARKER);
        body.insertParagraph(idx+4, author);
        body.insertParagraph(idx+5, slug);
        body.insertParagraph(idx+6, published).setHeading(DocumentApp.ParagraphHeading.HEADING3).setBold(true).setBackgroundColor('#FFF2CC');
        body.insertParagraph(idx+7, FRONTMATTER_MARKER).setBold(false).setBackgroundColor(null);
        body.insertParagraph(idx+8, '');
        var placeholder = body.insertParagraph(idx+9, ANNOTATION_PLACEHOLDER);
        body.insertParagraph(idx+10, '');
        body.insertParagraph(idx+11, END_POST_MARKER).setBold(false).setForegroundColor('#FF0000');
        body.insertParagraph(idx+12, '').setBold(false).setForegroundColor(null).setBackgroundColor(null);

        // POSITION CURSOR ON PLACEHOLDER COPY TEXT
        var rangeBuilder = doc.newRange();
        rangeBuilder.addElement(placeholder);
        doc.setSelection(rangeBuilder.build());
        // STORE NEW SLUG INDEX
        props.setProperty("SLUG_IDX",slug_idx);
        PersistLog.info("New Slug Index: %s", slug_idx);
        PersistLog.info("insert Metadata End");
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
