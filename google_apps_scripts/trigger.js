/**
 * Remove all triggers from the script project
 * Exposed to the outside without params in case we need to force it from the console
 */
function removeAllTriggers() {
  PersistLog.debug("removeAllTriggers start");
  _deleteTriggers(null);
}

/**
 * Programatically creates a minute time based trigger
 *
 * @private
 * @param {Number} m frequency in minutes to trigger the function
 */
function createTrigger(m) {
  PersistLog.debug("createTrigger start");
  _removeTrigger();
  m = m || 1;
  PersistLog.debug("setting %s minute trigger", m);
  try {
    var trigger = ScriptApp.newTrigger("update")
      .timeBased()
      .everyMinutes(m)
      .create();
  } catch (e) {
    e = typeof e === "string" ? new Error(e) : e;
    var msg = Utilities.formatString(
      "Exception ocurred while creating a trigger"
    );
    PersistLog.severe(msg);
    throw e;
  }
  props.setProperty("triggerID", trigger.getUniqueId());
}

/**
 * Programatically removes a trigger if it was previously stored as a script property
 *
 * @private
 */
function _removeTrigger() {
  PersistLog.debug("_removeTrigger start");
  var triggerID = props.getProperty("triggerID");
  PersistLog.debug("triggerID %s", triggerID);
  if (triggerID) {
    _deleteTriggers(triggerID);
    props.deleteProperty("triggerID");
  } else {
    _deleteTriggers(null);
  }
}

/**
 * Remove all triggers from the script
 *
 * @private
 */
function _deleteTriggers(triggerID) {
  try {
    PersistLog.debug("_deleteTriggers start");
    var allTriggers = ScriptApp.getProjectTriggers();
    PersistLog.debug("There are %s triggers", allTriggers.length);
    for (var i = 0; i < allTriggers.length; i++) {
      if (triggerID) {
        if (allTriggers[i].getUniqueId() == triggerID) {
          PersistLog.debug("Found trigger %s deleting it", triggerID);
          ScriptApp.deleteTrigger(allTriggers[i]);
          break;
        }
      } else {
        ScriptApp.deleteTrigger(allTriggers[i]);
      }
    }
  } catch (e) {
    e = typeof e === "string" ? new Error(e) : e;
    var msg = Utilities.formatString(
      "Exception ocurred while deleting triggers. id: %s",
      triggerID
    );
    PersistLog.severe(msg);
    throw e;
  }
}
