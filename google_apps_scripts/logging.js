var PersistLog = (function(Logger) {
  /*************************************************************************
   * Globals
   *********/
  var sheet; //the spreadsheet that is appended to
  var SHEET_MAX_ROWS = 50000; //sheet is cleared and starts again
  var SHEET_LOG_CELL_WIDTH = 1000; //
  var SHEET_LOG_HEADER =
    "Message layout: Date Time UTC-Offset MillisecondsSinceInvoked LogLevel Message. Use Ctrl + ArrowDown (or Command + ArrowDown) to jump to the last row";
  var DATE_TIME_LAYOUT = "yyyy-MM-dd HH:mm:ss:SSS Z"; //http://docs.oracle.com/javase/6/docs/api/java/text/SimpleDateFormat.html

  var Level = Object.freeze({
    OFF: Number.MAX_VALUE,
    SEVERE: 1000,
    WARNING: 900,
    INFO: 800,
    DEBUG: 700,
    CONFIG: 600,
    FINE: 500,
    FINER: 400,
    FINEST: 300,
    ALL: Number.MIN_VALUE
  });

  var level = Level.INFO; //set as default. The log level. We log everything this level or greater.
  var startTime = new Date();
  var counter = 0;

  /*************************************************************************
   * public methods
   *********/

  /**
   * Allows logging to a Google spreadsheet.
   *
   * @param  {String} optKey    The spreadsheet key (optional). Defaults to the active spreadsheet if available.
   * @param  {String} optSheetName The name of the sheet (optional). Defaults to "Log". The sheet is created if needed.
   * @returns {BetterLog} this object, for chaining
   */
  function useSpreadsheet(optKey, optSheetName) {
    try {
      _setLogSheet(optKey, optSheetName);
      sheet.getRange(1, 1).setValue(SHEET_LOG_HEADER); //in case we need to update
      _rollLogOver(); //rollover the log if we need to
    } catch (e) {
      return false;
    }
    return true;
  }

  /**
   * Logs at the SEVERE level. SEVERE is a message level indicating a serious failure.
   * In general SEVERE messages should describe events that are of considerable importance and
   * which will prevent normal program execution. They should be reasonably intelligible to end users and to system administrators.
   *
   * @param  {Object} message    The message to log or an sprintf-like format string (uses Utilities.formatString() internally - see http://www.perlmonks.org/?node_id=20519 as a good reference).
   * @param  {Object...} optValues  If a format string is used in the message, a number of values to insert into the format string.
   * @returns {BetterLog} this object, for chaining
   */
  function severe(message, optValues) {
    var lev = Level.SEVERE;
    if (_isLoggable(lev)) {
      _log({
        message:
          typeof message == "string" || message instanceof String
            ? Utilities.formatString.apply(this, arguments)
            : message,
        level: lev,
        time: new Date(),
        elapsedTime: _getElapsedTime()
      });
    }
  }

  /**
   * Logs at the WARNING level. WARNING is a message level indicating a potential problem.
   * In general WARNING messages should describe events that will be of interest to end users
   * or system managers, or which indicate potential problems.
   *
   * @param  {Object} message    The message to log or an sprintf-like format string (uses Utilities.formatString() internally - see http://www.perlmonks.org/?node_id=20519 as a good reference).
   * @param  {Object...} optValues  If a format string is used in the message, a number of values to insert into the format string.
   * @returns {BetterLog} this object, for chaining
   */
  function warning(message, optValues) {
    var lev = Level.WARNING;
    if (_isLoggable(lev)) {
      _log({
        message:
          typeof message == "string" || message instanceof String
            ? Utilities.formatString.apply(this, arguments)
            : message,
        level: lev,
        time: new Date(),
        elapsedTime: _getElapsedTime()
      });
    }
  }

  /**
   * Logs at the INFO level. INFO is a message level for informational messages.
   * Typically INFO messages will be written to the console or its equivalent. So the INFO level
   * should only be used for reasonably significant messages that will make sense to end users and system administrators.
   *
   * @param  {Object} message    The message to log or an sprintf-like format string (uses Utilities.formatString() internally - see http://www.perlmonks.org/?node_id=20519 as a good reference).
   * @param  {Object...} optValues  If a format string is used in the message, a number of values to insert into the format string.
   * @returns {BetterLog} this object, for chaining
   */
  function info(message, optValues) {
    var lev = Level.INFO;
    if (_isLoggable(lev)) {
      _log({
        message:
          typeof message == "string" || message instanceof String
            ? Utilities.formatString.apply(this, arguments)
            : message,
        level: lev,
        time: new Date(),
        elapsedTime: _getElapsedTime()
      });
    }
  }

  /**
   * Logs at the DEBUG level. DEBUG is a message level for development messages.
   * Typically DEBUG messages will be written to the console or its equivalent. So the DEBUG level
   * should only be used for reasonably significant messages that will make sense to end users and system administrators.
   *
   * @param  {Object} message    The message to log or an sprintf-like format string (uses Utilities.formatString() internally - see http://www.perlmonks.org/?node_id=20519 as a good reference).
   * @param  {Object...} optValues  If a format string is used in the message, a number of values to insert into the format string.
   * @returns {BetterLog} this object, for chaining
   */
  function debug(message, optValues) {
    var lev = Level.DEBUG;
    if (_isLoggable(lev)) {
      _log({
        message:
          typeof message == "string" || message instanceof String
            ? Utilities.formatString.apply(this, arguments)
            : message,
        level: lev,
        time: new Date(),
        elapsedTime: _getElapsedTime()
      });
    }
  }

  /**
   * Logs at the CONFIG level. CONFIG is a message level for static configuration messages.
   * CONFIG messages are intended to provide a variety of static configuration information,
   * to assist in debugging problems that may be associated with particular configurations.
   *
   * @param  {Object} message    The message to log or an sprintf-like format string (uses Utilities.formatString() internally - see http://www.perlmonks.org/?node_id=20519 as a good reference).
   * @param  {Object...} optValues  If a format string is used in the message, a number of values to insert into the format string.
   * @returns {BetterLog} this object, for chaining
   */
  function config(message, optValues) {
    var lev = Level.CONFIG;
    if (_isLoggable(lev)) {
      _log({
        message:
          typeof message == "string" || message instanceof String
            ? Utilities.formatString.apply(this, arguments)
            : message,
        level: lev,
        time: new Date(),
        elapsedTime: _getElapsedTime()
      });
    }
  }

  /**
   * Logs at the FINE level. FINE is a message level providing tracing information.
   * All of FINE, FINER, and FINEST are intended for relatively detailed tracing.
   * The exact meaning of the three levels will vary between subsystems, but in general,
   * FINEST should be used for the most voluminous detailed output,
   * FINER for somewhat less detailed output, and FINE for the lowest volume (and most important) messages.
   *
   * In general the FINE level should be used for information that will be broadly interesting to developers
   * who do not have a specialized interest in the specific subsystem.
   * FINE messages might include things like minor (recoverable) failures. Issues indicating potential performance problems are also worth logging as FINE.
   *
   * @param  {Object} message    The message to log or an sprintf-like format string (uses Utilities.formatString() internally - see http://www.perlmonks.org/?node_id=20519 as a good reference).
   * @param  {Object...} optValues  If a format string is used in the message, a number of values to insert into the format string.
   * @returns {BetterLog} this object, for chaining
   */
  function fine(message, optValues) {
    var lev = Level.FINE;
    if (_isLoggable(lev)) {
      _log({
        message:
          typeof message == "string" || message instanceof String
            ? Utilities.formatString.apply(this, arguments)
            : message,
        level: lev,
        time: new Date(),
        elapsedTime: _getElapsedTime()
      });
    }
  }

  /**
   * Logs at the FINER level. FINER indicates a fairly detailed tracing message.
   * By default logging calls for entering, returning, or throwing an exception are traced at this level.
   *
   * @param  {Object} message    The message to log or an sprintf-like format string (uses Utilities.formatString() internally - see http://www.perlmonks.org/?node_id=20519 as a good reference).
   * @param  {Object...} optValues  If a format string is used in the message, a number of values to insert into the format string.
   * @returns {BetterLog} this object, for chaining
   */
  function finer(message, optValues) {
    var lev = Level.FINER;
    if (_isLoggable(lev)) {
      _log({
        message:
          typeof message == "string" || message instanceof String
            ? Utilities.formatString.apply(this, arguments)
            : message,
        level: lev,
        time: new Date(),
        elapsedTime: _getElapsedTime()
      });
    }
  }

  /**
   * Logs at the FINEST level. FINEST indicates a highly detailed tracing message.
   *
   * @param  {Object} message    The message to log or an sprintf-like format string (uses Utilities.formatString() internally - see http://www.perlmonks.org/?node_id=20519 as a good reference).
   * @param  {Object...} optValues  If a format string is used in the message, a number of values to insert into the format string.
   * @returns {BetterLog} this object, for chaining
   */
  function finest(message, optValues) {
    var lev = Level.FINEST;
    if (_isLoggable(lev)) {
      _log({
        message:
          typeof message == "string" || message instanceof String
            ? Utilities.formatString.apply(this, arguments)
            : message,
        level: lev,
        time: new Date(),
        elapsedTime: _getElapsedTime()
      });
    }
  }

  /**
   * Logs at the INFO level. INFO is a message level for informational messages.
   * Typically INFO messages will be written to the console or its equivalent. So the INFO level should
   * only be used for reasonably significant messages that will make sense to end users and system administrators.
   *
   * @param  {Object} message    The message to log or an sprintf-like format string (uses Utilities.formatString() internally - see http://www.perlmonks.org/?node_id=20519 as a good reference).
   * @param  {Object...} optValues  If a format string is used in the message, a number of values to insert into the format string.
   * @returns {BetterLog} this object, for chaining
   */
  function log(message, optValues) {
    return info.apply(this, arguments);
  }

  /**
   * Sets the new log level
   *
   * @param  {String} logLevel    The new log level e.g. "OFF","SEVERE","WARNING","INFO","CONFIG","FINE","FINER","FINEST" or "ALL".
   * @returns {BetterLog} this object, for chaining
   */
  function setLevel(logLevel) {
    if (typeof logLevel === "string") {
      var logLevel = _stringToLevel(logLevel);
    }
    if (logLevel != _getLevel()) {
      _setLevel(logLevel);
    }
  }
  /**
   * Gets the current log level name
   *
   * @returns {String} The name of the current log level e.g. "OFF","SEVERE","WARNING","INFO","CONFIG","FINE","FINER","FINEST" or "ALL".
   */
  function getLevel() {
    return _levelToString(_getLevel());
  }

  /*************************************************************************
   * @private functions
   ********************/

  // Returns the string as a Level.
  function _stringToLevel(str) {
    for (var name in Level) {
      if (name == str) {
        return Level[name];
      }
    }
  }

  // Returns the Level as a String
  function _levelToString(lvl) {
    for (var name in Level) {
      if (Level[name] == lvl) return name;
    }
  }

  //gets the current logging level
  function _getLevel() {
    return level;
  }

  //sets the current logging level
  function _setLevel(lvl) {
    for (var name in Level) {
      if (Level[name] == lvl) {
        level = lvl;
        info("Log level has been set to " + getLevel());
        break;
      }
    }
  }

  //checks to see if this level is enabled
  function _isLoggable(Level) {
    if (_getLevel() <= Level) {
      return true;
    }
    return false;
  }

  //core logger function
  function _log(msg) {
    counter++;
    //default console logging (built in with Google Apps Script's View > Logs...)
    Logger.log(_convertUsingDefaultPatternLayout(msg));
    //ss logging
    if (sheet) {
      _logToSheet(msg);
    }
  }

  //  rolls over the log if we need to
  function _rollLogOver() {
    var rowCount = sheet.getLastRow();
    if (rowCount > SHEET_MAX_ROWS) {
      //copy the log
      var ss = sheet.getParent();
      var oldLog = ss.copy(
        ss.getName() +
          " as at " +
          Utilities.formatDate(
            new Date(),
            Session.getScriptTimeZone(),
            DATE_TIME_LAYOUT
          )
      );
      //add current viewers and editors to old log
      oldLog.addViewers(ss.getViewers());
      oldLog.addEditors(ss.getEditors());
      // prep the live log
      sheet.deleteRows(2, sheet.getMaxRows() - 2);
      sheet.getRange(1, 1).setValue(SHEET_LOG_HEADER);
      //sheet.appendRow(['Log reached ' + rowCount + ' rows (MAX_ROWS is ' + SHEET_MAX_ROWS + ') and was cleared. Previous log is available here:']);
      sheet
        .getRange("A2")
        .setValue([
          "Log reached " +
            rowCount +
            " rows (MAX_ROWS is " +
            SHEET_MAX_ROWS +
            ") and was cleared. Previous log is available here:"
        ]);
      sheet.appendRow([oldLog.getUrl()]);
    }
  }

  //logs to spreadsheet
  function _logToSheet(msg) {
    //check for rollover every 100 rows logged during one invocation
    if (counter % 100 === 0) {
      _rollLogOver();
    }
    //sheet.appendRow([_convertUsingSheetPatternLayout(msg)]);
    _call(function() {
      sheet.appendRow([_convertUsingSheetPatternLayout(msg)]);
    }, Logger.log);
  }
  // convert message to text string
  function _convertUsingDefaultPatternLayout(msg) {
    var dt = Utilities.formatDate(
      msg.time,
      Session.getScriptTimeZone(),
      DATE_TIME_LAYOUT
    );
    var message =
      dt +
      " " +
      _pad(msg.elapsedTime, 6) +
      " " +
      _levelToString(msg.level) +
      " " +
      msg.message;
    return message;
  }
  // convert message to text string
  function _convertUsingSheetPatternLayout(msg) {
    return _convertUsingDefaultPatternLayout(msg);
  }
  //Sets the log sheet, creating one if it doesn't exist
  function _setLogSheet(optKey, optSheetName) {
    var sheetName = optSheetName || "Log";
    var ss = optKey
      ? SpreadsheetApp.openById(optKey)
      : SpreadsheetApp.getActiveSpreadsheet();
    var sheets = _call(function() {
      return ss.getSheets();
    }, Logger.log);
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName() === sheetName) {
        sheet = sheets[i];
        return;
      }
    }
    sheet = ss.insertSheet(sheetName, i);
    sheet.deleteColumns(2, sheet.getMaxColumns() - 1);
    sheet.getRange(1, 1).setValue(SHEET_LOG_HEADER);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, SHEET_LOG_CELL_WIDTH);
    info("Log created");
  }

  //gets the time since the start of logging
  function _getElapsedTime() {
    return new Date() - startTime; //milliseconds
  }
  // pads a number with leading zeros
  function _pad(n, len) {
    var s = n.toString();
    if (s.length < len) {
      s = ("0000000000" + s).slice(-len);
    }
    return s;
  }

  //copy GASRetry 'MGJu3PS2ZYnANtJ9kyn2vnlLDhaBgl_dE'
  function _call(func, optLoggerFunction) {
    for (var n = 0; n < 6; n++) {
      try {
        return func();
      } catch (e) {
        if (optLoggerFunction) {
          optLoggerFunction("_call " + n + ": " + e);
        }
        if (n == 5) {
          throw e;
        }
        Utilities.sleep(
          Math.pow(2, n) * 1000 + Math.round(Math.random() * 1000)
        );
      }
    }
  }
  // return public interface
  return {
    useSpreadsheet: useSpreadsheet,
    severe: severe,
    warning: warning,
    info: info,
    debug: debug,
    config: config,
    fine: fine,
    finer: finer,
    finest: finest,
    log: log,
    setLevel: setLevel,
    getLevel: getLevel
  };
})(Logger);
