// via: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
function CustomError(message, fileName, lineNumber) {
     this.message = message;
     this.fileName = fileName;
     this.lineNumber = lineNumber;
 }
 CustomError.prototype = new Error();
 CustomError.prototype.name = "Error";
 CustomError.prototype.fileName = "";
 CustomError.prototype.lineNumber = "";
 CustomError.prototype.message = "";
 CustomError.prototype.constructor = CustomError;

 /**
* Google app script properties are stored as strings
* via: https://developers.google.com/apps-script/guides/properties#data_format
* This function returns a numeric version of the property stored
*
* @private
* @param {String} key property key to retrieve
*/
function _getNumProperty(props, key) {
  var p = props.getProperty(key);
  if (p !== null) {
    try {
        p = +p;
    } catch(e) {
        Logger.log("key: %s is not numeric", key);
    }
  }
  return p;
}

/**
* Insert the marker at the end of the document body
*
* @private
* @param {Object} body Google Apps Scripts Body class
*/
function _initMarkerAtBottom() {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  for (var i=0; i < 80; i++) {
    body.appendParagraph('');
  }
  var hr = body.appendHorizontalRule();
  var marker = hr.getParent();
  marker.appendText(WARNING_MSG);
}

function _insertPinnedPost() {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  body.insertParagraph(0, NEW_POST_MARKER).setBold(false).setBackgroundColor(null).setForegroundColor(null);
  var heading = body.insertParagraph(1, INITIAL_PINNED_POST_HEADLINE).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.insertParagraph(2, FRONTMATTER_MARKER);
  var slug = 'Slug: '+ 'pinned-post';
  body.insertParagraph(3, slug);
  var pinned = 'Pinned: Yes';
  body.insertParagraph(4, pinned);
  var status = 'Published Mode: Yes';
  body.insertParagraph(5, status).setHeading(DocumentApp.ParagraphHeading.HEADING3).setBold(true).setBackgroundColor('#FFF2CC');;
  body.insertParagraph(6, FRONTMATTER_MARKER).setBold(false).setBackgroundColor(null);
  body.insertParagraph(7, '');
  var placeholder = body.insertParagraph(7, PINNED_POST_PLACEHOLDER).setBold(false).setBackgroundColor(null);
  body.insertParagraph(8, '');
  body.insertParagraph(9, END_POST_MARKER).setBold(false).setForegroundColor('#FF0000');
  body.insertParagraph(10, '').setBold(false).setForegroundColor(null).setBackgroundColor(null);
}

function initializeDocument() {
  // Clear out the doc
  var ui = DocumentApp.getUi();
  var response = ui.alert('WARNING: SHOULD NEVER BE DONE DURING ELECTION NIGHT', 'This will delete the doc contents, are you sure you know what you are doing?', ui.ButtonSet.YES_NO);
  // Process the user's response.
  if (response != ui.Button.YES) {
    return;
  }

  var response = ui.alert('SO YOU SAID DO IT!! REALLY?', 'This will delete the doc contents, Are you sure, sure?', ui.ButtonSet.YES_NO);
  // Process the user's response.
  if (response != ui.Button.YES) {
    return;
  }
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  // From here: https://code.google.com/p/google-apps-script-issues/issues/detail?id=5830#makechanges
  body.appendParagraph('');
  // Reset body to initial state
  body.clear();

  // Open the google drive spreadsheet log
  var props = PropertiesService.getDocumentProperties();
  var logID = props.getProperty('logID');
  Logger.log("id: %s", logID);
  var logSpreadsheet = SpreadsheetApp.openById(logID);
  // Clear previous logs
  logSpreadsheet.getSheetByName(LOG_SHEET_NAME).clearContents();
  _initializeLogging();
  PersistLog.info("Logfile cleared inside initializeDocument");
  // Insert pinned Post
  _insertPinnedPost();
  PersistLog.info("Pinned Post inserted at the top of the document");
  // Insert marker at the bottom
  _initMarkerAtBottom();
  PersistLog.info("Document End Marker inserted at the bottom of the document");
  // Reset slug index property
  var props = PropertiesService.getDocumentProperties();
  var slug_idx = 0;
  props.deleteProperty('SLUG_IDX');
  PersistLog.info("SLUG_IDX property deleted");

}

/**
* Utility function to initialize a PersistLog instance
*
* @private
* @param {Number} min lower bound of the desired output range
* @param {Number} max upper bound of the desired output range
* @returns random number in the specified range
*/
function _initializeLogging() {
  var props = PropertiesService.getDocumentProperties();
  // Get the logging in place
  var logID = props.getProperty('logID');
  //Setup logging to spreadsheet
  var logCreated = PersistLog.useSpreadsheet(logID, LOG_SHEET_NAME);
  if (!logCreated) {
    var msg =  Utilities.formatString('Could not setup logging in spreadsheet file with id: %s', logID);
    // Send email
    MailApp.sendEmail(NOTIFICATION_RECIPIENTS,"Warning: continue with no logging", msg);
  }
}
