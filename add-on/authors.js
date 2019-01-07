/**
 * Opens a sidebar in the document containing the add-on's user interface.
 */
function showAuthorsDialog_() {
    var ui = DocumentApp.getUi();
    var doc = HtmlService.createTemplateFromFile('authors_dialog');
    doc.key = getAuthorsKey_();
    html = doc.evaluate();
    html.setHeight(400);
    ui.showModalDialog(html, 'Authors Spreadseet Dialog');
}

function getAuthorsKey_() {
    var props = PropertiesService.getDocumentProperties();
    var authors_key = props.getProperty('authors_key');
    if (authors_key) {
        return authors_key;
    }
    return null;
}

function authorsProperty(url) {
    var authors_key = null;
    // Get DocumentProperties
    try {
        var props = PropertiesService.getDocumentProperties();
        var spreadsheetRegex = /^.*\/d\/([^/]+).*$/;
        var authors_parsed = spreadsheetRegex.exec(url);
        if (authors_parsed) {
            authors_key = authors_parsed[1];
            try {
                var ss = SpreadsheetApp.openById(authors_key);
            } catch(e) {
                msg = 'Could not open the spreadsheet. Are you sure it is a valid spreadsheet url?';
                throw new CustomError(msg, 'authors.js', '31');
            }
            props.setProperty('authors_key', authors_key);
            return true;
        }
        else {
            msg = 'Could not parse the url. Are you sure it is a valid spreadsheet url?';
            throw new CustomError(msg, 'authors.js', '28');
        }
    } catch(e) {
        throw e;
    }
}
