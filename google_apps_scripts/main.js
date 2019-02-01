/**
 * Google app script project that will poll a SRT stream each minute
 * parse it and append it to a google docs document in order for the
 * fact checking process to be done inside the doc with all the collaboration
 * suggestion and commenting mode sugar provided by google docs
 * created for the presidential elections debates coverage at NPR.org
 *
 * Main functions:
 * update: Function called each time the 1 minute trigger fires
 * reset: Will clean up the google doc and logs and create the trigger to fire update periodically
 */

/**
 * Note: Functions called outside of a nested function scope
 * will get executed everytime any function of the script project
 * gets executed either through the console or through a trigger
 * or even through the REST execution API.
 * Variables are available in the global scope by default also
 */
// The document associated with this script project
var doc;
// We are getting all the properties from the script globally
var props;

/**
 * Updates the google drive document with the new transcript data received through the SRT stream
 * called by the time based trigger launch in init
 * (defaults to 1 minute which is the minimum allowed by google)
 * via: https://developers.google.com/apps-script/guides/triggers/installable#time-driven_triggers
 */
function update() {
  var cspan = false;
  try {
    props = PropertiesService.getScriptProperties();
    // Open the google drive document
    var documentID = props.getProperty("documentID");
    doc = DocumentApp.openById(documentID);
    _initializeLogging();
    PersistLog.info("update process start");
    cspan = _getBoolProperty("cspan");
    if (cspan) {
      updateCSPAN();
    } else {
      updateVerb8tm();
    }
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
    // Send email
    if (NOTIFICATION_ENABLED)
      MailApp.sendEmail(NOTIFICATION_RECIPIENTS, "Error: Report", msg);
    // Propagate
    throw e;
  }
}

function resetCaptionID() {
  PropertiesService.getScriptProperties().deleteProperty("lastCaptionID");
}

function dryRun() {
  resetCaptionID();
  update();
}

/**
 * Reset the google drive document and project properties to its initial state
 * it assumes a document is already created and its id stored as a property
 * Note: Useful when you want to restart the process without creating a new document
 */
function reset() {
  try {
    props = PropertiesService.getScriptProperties();
    _initializeLogging();
    PersistLog.info("reset process start");
    var data = props.getProperties();
    // Reset project properties to its initial state
    // Remove all properties except white listed
    for (var key in data) {
      if (PROPS_WHITE_LIST.indexOf(key) < 0) {
        props.deleteProperty(key);
      }
    }
    // remove triggers
    removeAllTriggers();

    // Open the google drive document
    var documentID = props.getProperty("documentID");
    doc = DocumentApp.openById(documentID);
    var body = doc.getBody();
    // From here: https://code.google.com/p/google-apps-script-issues/issues/detail?id=5830#makechanges
    body.appendParagraph("");
    // Reset body to initial state
    body.clear();
    // body.insertParagraph(0, DO_NOT_PUBLISH_MSG);
    _initMarker(body);

    // Open the google drive spreadsheet log
    var logID = props.getProperty("logID");
    var logSpreadsheet = SpreadsheetApp.openById(logID);
    // Clear previous logs
    logSpreadsheet.getSheetByName(LOG_SHEET_NAME).clearContents();

    // Create a 1 minute time based trigger
    createTrigger(1);
    PersistLog.info("reset process done");
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
    // Send email
    if (NOTIFICATION_ENABLED)
      MailApp.sendEmail(NOTIFICATION_RECIPIENTS, "Error: Report", msg);
    // Propagate
    throw e;
  }
}

/**
 * Pauses verb8tm polling removing triggers
 * Note: Useful when you want to stop getting data from verb8tm
 */
function pause() {
  try {
    props = PropertiesService.getScriptProperties();
    _initializeLogging();
    PersistLog.info("pausing verb8tm polling");
    var data = props.getProperties();
    // Reset project properties to its initial state
    // Remove all properties except white listed
    for (var key in data) {
      if (PROPS_WHITE_LIST.indexOf(key) < 0) {
        props.deleteProperty(key);
      }
    }
    // remove triggers
    removeAllTriggers();
    PersistLog.info("Verb8tm polling paused");
    PersistLog.info("Update RESTART_CAPTION_ID in config.js");
    PersistLog.info("run restart to create a new trigger");
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
    // Send email
    if (NOTIFICATION_ENABLED)
      MailApp.sendEmail(NOTIFICATION_RECIPIENTS, "Error: Report", msg);
    // Propagate
    throw e;
  }
}

/**
 * Restarts verb8tm polling from a given point defined in config.gs
 * RESTART_CAPTION_ID (RESTART_CAPTION_ID will not be received,
 * so it should be the lastCaptionID that is already on the document)
 * Note: Useful when you want to stop getting data from verb8tm
 */
function restart() {
  try {
    props = PropertiesService.getScriptProperties();
    _initializeLogging();
    PersistLog.info(
      "restarting verb8tm polling with lastCaptionID %s",
      RESTART_CAPTION_ID
    );
    var data = props.getProperties();
    // Reset project properties to its initial state
    // Remove all properties except white listed
    for (var key in data) {
      if (PROPS_WHITE_LIST.indexOf(key) < 0) {
        props.deleteProperty(key);
      }
    }
    // remove triggers
    removeAllTriggers();

    // Restore a given captionID into the script properties
    // and fire up a new timer
    // substract one to receive the configured caption
    props.setProperty("lastCaptionID", RESTART_CAPTION_ID - 1);

    // Open the google drive document
    var documentID = props.getProperty("documentID");
    doc = DocumentApp.openById(documentID);
    var body = doc.getBody();
    // Replace Live transcript end if it exists
    body.replaceText(LIVE_TRANSCRIPT_END_MSG, WARNING_MSG);
    // Create a 1 minute time based trigger
    createTrigger(1);
    PersistLog.info("new trigger created should not take more than a minute");
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
    // Send email
    if (NOTIFICATION_ENABLED)
      MailApp.sendEmail(NOTIFICATION_RECIPIENTS, "Error: Report", msg);
    // Propagate
    throw e;
  }
}

/**
 * Setup the google drive document ID and log ID
 * as script properties.
 */
function setup(
  api_srt_url,
  api_timestamp_url,
  api_cspan_url,
  cspan,
  documentID,
  logID
) {
  // Setup api endpoint urls
  props = PropertiesService.getScriptProperties();
  props.setProperty("api_srt_url", api_srt_url);
  props.setProperty("api_timestamp_url", api_timestamp_url);
  props.setProperty("api_cspan_url", api_cspan_url);
  props.setProperty("cspan", cspan);
  // Setup documentID and logID
  props.setProperty("documentID", documentID);
  props.setProperty("logID", logID);
}
