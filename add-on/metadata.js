/**
 * Opens a sidebar in the document containing the add-on's user interface.
 */
function showMetadataSidebar_() {
    var props = PropertiesService.getDocumentProperties();
    var ui = DocumentApp.getUi();
    authors_key = props.getProperty('authors_key');
    if (!authors_key) {
        var response = ui.alert('Authors spreadsheet not found, you need to set it first');
        return;
    }
    var doc = HtmlService.createTemplateFromFile('metadata_sidebar');
    doc.data = getAuthorsData_();
    doc.logo = getLogo_();
    html = doc.evaluate();
    html.setTitle('Annotation Metadata');
    ui.showSidebar(html);
}

function Comparator(a, b) {
    var splitA = a[1].split(" ");
    var splitB = b[1].split(" ");
    var lastA = splitA[splitA.length - 1];
    var lastB = splitB[splitB.length - 1];

    if (lastA < lastB) return -1;
    if (lastA > lastB) return 1;
    return 0;
}

/**
 * Retrieves the Authors data from a configured spreadsheet key
 * added to the Documents properties by setAuthors_() in config
 */
function getAuthorsData_() {
    var props = PropertiesService.getDocumentProperties();
    var authors_key = props.getProperty('authors_key');
    var values = SpreadsheetApp.openById(authors_key)
                         .getActiveSheet()
                         .getDataRange()
                         .getValues();
    // remove header
    values.shift();
    values = values.sort(Comparator);
    return values;
}

/**
 * Retrieves the Logo src url
 * added to the Documents properties by setLogo_() in config
 */
function getLogo_() {
    var props = PropertiesService.getDocumentProperties();
    var logo_url = props.getProperty('sidebar_logo');
    if (logo_url) {
        return logo_url;
    }
    return null;
}

/**
 * Bolds the text of the current selection adding the frontmatter below, or
 * inserts frontmatter at the current cursor location. (There will always be either
 * a selection or a cursor.)
 * @param {object} formObject The form sent from the sidebar page.
 */
function insertMetadata(formObject) {
    try {
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
        var author = 'Author:';
        if (formObject.author === 'other') {
            author += ' ' + formObject.otherAuthor;
        }
        else {
            author += ' ' + formObject.author;
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
        var idx = body.getChildIndex(el);
        body.insertParagraph(idx+1, NEW_POST_MARKER).setBold(false).setBackgroundColor(null).setForegroundColor(null);
        var heading = body.insertParagraph(idx+2, formObject.description).setHeading(DocumentApp.ParagraphHeading.HEADING2);
        p = body.insertParagraph(idx+3, FRONTMATTER_MARKER);
        body.insertParagraph(idx+4, author);
        body.insertParagraph(idx+5, slug);
        body.insertParagraph(idx+6, published).setHeading(DocumentApp.ParagraphHeading.HEADING3).setBold(true).setBackgroundColor('#FFF2CC');
        body.insertParagraph(idx+7, FRONTMATTER_MARKER).setBold(false).setBackgroundColor(null);
        body.insertParagraph(idx+8, '');
        var placeholder = body.insertParagraph(idx+9, ANNOTATION_PLACEHOLDER);
        body.insertParagraph(idx+10, '');
        body.insertParagraph(idx+11, END_POST_MARKER).setBold(false).setForegroundColor('#FF0000');

        // POSITION CURSOR ON PLACEHOLDER COPY TEXT
        var rangeBuilder = doc.newRange();
        rangeBuilder.addElement(placeholder);
        doc.setSelection(rangeBuilder.build());
        // STORE NEW SLUG INDEX
        props.setProperty("SLUG_IDX",slug_idx);
        return true;
    } catch(e) {
        throw e;
    }
}
