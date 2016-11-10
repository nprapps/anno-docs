/**
* Log all script properties and its current values
*/
function showProperties() {
  var data = props.getProperties();
  for (var key in data) {
    PersistLog.info('Key: %s, Value: %s', key, data[key]);
  }
}

/**
* Force the deletion of some project property
*/
function forceDeleteProperties() {
  props.deleteProperty('endTime');
  props.deleteProperty('simulationIdx');
}

/**
* Force the value of some project property
*/
function forceSetProperties() {
  props.setProperty('simulationIdx', null);
}

function testFindText() {
  var documentID = props.getProperty('documentID');
  doc = DocumentApp.openById(documentID);
  var body = doc.getBody();
  var prevLastParagraph = props.getProperty('prevLastParagraph');
  Logger.log('prevLastParagraph: %s', prevLastParagraph);
  if (prevLastParagraph) {
    var found = body.findText(prevLastParagraph);
    Logger.log('found: %s', found);
  }
}

function testFindWarning() {
  var documentID = props.getProperty('documentID');
  doc = DocumentApp.openById(documentID);
  var body = doc.getBody();
  var found = body.findText(WARNING_MSG);
  Logger.log('found: %s', found);
  Logger.log('getElement: %s', found.getElement().getParent());
  // Logger.log('getElementType: %s', found.getElementType());
}

function testSearchLastParagraph() {
  var documentID = props.getProperty('documentID');
  doc = DocumentApp.openById(documentID);
  var body = doc.getBody();
  var warnParagraph = body.findText(WARNING_MSG);
  var p = warnParagraph.getElement().getParent().getPreviousSibling();
  var lastTranscriptParagraph = _searchLastTranscriptParagraph(p);
  Logger.log('lastTranscriptParagraph Text: %s', lastTranscriptParagraph.getText());
}

function testEndTranscript() {
  var documentID = props.getProperty('documentID');
  doc = DocumentApp.openById(documentID);
  var body = doc.getBody();
  var end_par = body.appendParagraph(LIVE_TRANSCRIPT_END_MSG);
  end_par.setHeading(DocumentApp.ParagraphHeading.HEADING1);
}

function testStartTime() {
  _initializeLogging();
  PersistLog.info('START_TIME_URL: %s', START_TIME_URL);
  var response = _getTranscriptStartTime();
  PersistLog.info('response: %s', response);
  var content = response.getContentText('UTF-8');
  PersistLog.info('content: %s', content);
  var startTime = Date.parse(content);
  PersistLog.info('start time: %s', startTime);
  //startTime = _transformDate(content);
}

/**
* Test the logging mechanism
*/
function testLogging() {
  // Remove all existing project properties
  props.deleteAllProperties();
  // Remove all existing project triggers
  removeAllTriggers()

  // Create logging spreadsheet
  var newLog = SpreadsheetApp.create(DOCUMENT_NAME + ' Log');
  var logID = newLog.getId();

  // Move log to a shared folder
  var logFile = DriveApp.getFileById(logID);
  DriveApp.getFolderById(LOG_FOLDER_ID).addFile(logFile);
  // Remove the log from the root folder.
  DriveApp.getRootFolder().removeFile(logFile);
  // Store the associated google drive spreadsheet id as a project property
  props.setProperty('logID', logID);

  // Add one line to use BetterLog and log to a spreadsheet
  PersistLog.useSpreadsheet(logID, LOG_SHEET_NAME);
  PersistLog.info("hello");
}
