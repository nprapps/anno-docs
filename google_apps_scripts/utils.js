/**
 * Google app script properties are stored as strings
 * via: https://developers.google.com/apps-script/guides/properties#data_format
 * This function returns a numeric version of the property stored
 *
 * @private
 * @param {String} key property key to retrieve
 */
function _getNumProperty(key) {
  var props = PropertiesService.getScriptProperties();
  var p = props.getProperty(key);
  PersistLog.debug("Property %s: Value: %s", key, p);
  if (p !== null) {
    try {
      p = +p;
    } catch (e) {
      PersistLog.warning(e);
    }
  }
  return p;
}

/**
 * Google app script properties are stored as strings
 * via: https://developers.google.com/apps-script/guides/properties#data_format
 * This function returns a boolean version of the property stored
 *
 * @private
 * @param {String} key property key to retrieve
 */
function _getBoolProperty(key) {
  var props = PropertiesService.getScriptProperties();
  var p = props.getProperty(key);
  PersistLog.debug("Property %s: Value: %s", key, p);
  var bool_p = false;
  if (p !== null) {
    try {
      bool_p = p.toLowerCase() == "true";
    } catch (e) {
      PersistLog.warning(e);
    }
  }
  return bool_p;
}

/**
 * Utility function to get a random integer between a range of options
 * This function returns a numeric version of the property stored
 *
 * @private
 * @param {Number} min lower bound of the desired output range
 * @param {Number} max upper bound of the desired output range
 * @returns random number in the specified range
 */
function _getRandomInteger(min, max) {
  return Math.ceil(Math.random() * (max - min) + min);
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
  // Get the logging in place
  var props = PropertiesService.getScriptProperties();
  var logID = props.getProperty("logID");
  //Setup logging to spreadsheet
  var logCreated = PersistLog.useSpreadsheet(logID, LOG_SHEET_NAME);
  if (!logCreated) {
    var msg = Utilities.formatString(
      "Could not setup logging in spreadsheet file with id: %s",
      logID
    );
    // Send email
    MailApp.sendEmail(
      NOTIFICATION_RECIPIENTS,
      "Warning: continue with no logging",
      msg
    );
  }
}

function _formatDate(date) {
  var d = new Date(date);
  return d.toUTCString();
}
