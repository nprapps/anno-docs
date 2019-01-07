var NEW_POST_MARKER = "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++";
var END_POST_MARKER = "---------------------------------------------------------------------------------------------------------";
var FRONTMATTER_MARKER = "---";
var ANNOTATION_PLACEHOLDER = "[Annotation content goes here]";
var PREVIEW_API_ENDPOINT = "https://nfyw9sf89l.execute-api.us-east-1.amazonaws.com/Prod/preview";
var LIVE_TRANSCRIPT_END_MSG = '-------> LIVE TRANSCRIPT HAS ENDED <-----------';

function setLogo_() {
    // Get DocumentProperties
    var props = PropertiesService.getDocumentProperties();
    // Ask for data
    var ui = DocumentApp.getUi();
    var result = ui.prompt(
        'Sidebar logo',
        'Enter the sidebar logo url:',
        ui.ButtonSet.OK);
    var button = result.getSelectedButton();
    var url = result.getResponseText();
    if (button == ui.Button.OK) {
        props.setProperty('sidebar_logo', url);
    }
}

function preview_() {
    // Get payload
    var props = PropertiesService.getDocumentProperties();
    var doc = DocumentApp.getActiveDocument();
    var doc_key = null;
    if (doc == null || doc == undefined) {
        ui.alert('Active Document not found, this function is designed for an AddOn');
        return;
    } else {
        doc_key = doc.getId();
    }
    authors_key = props.getProperty('authors_key');
    if (!authors_key) {
        ui.alert('Authors spreadsheet not found, you need to set it first');
        return;
    }
    // Make a POST request with form data.
    var data = {
        'doc_key': doc_key,
        'authors_key': authors_key,
    };
    // Because payload is a JavaScript object, it will be interpreted as
    // as form data. (No need to specify contentType; it will automatically
    // default to either 'application/x-www-form-urlencoded'
    // or 'multipart/form-data')
    var options = {
        'method' : 'post',
        'muteHttpExceptions': true,
        'payload' : data
    };

    try {
        var response = UrlFetchApp.fetch(PREVIEW_API_ENDPOINT, options);
    } catch(e) {
        throw e;
    }

    var responseCode = response.getResponseCode();
    var data = JSON.parse(response.getContentText("UTF-8"));
    showPreviewDialog_(responseCode, data.message);
}

function marker_() {
    // Add maarker at the end of the document
    var body = DocumentApp.getActiveDocument().getBody();
    var hr = body.appendHorizontalRule();
    var marker = hr.getParent();
    marker.appendText(LIVE_TRANSCRIPT_END_MSG);
    body.appendParagraph('END');
}


