// Properties that should remain untouched when a Google App Script reset is performed
var PROPS_WHITE_LIST = [
  "api_timestamp_url",
  "api_srt_url",
  "api_cspan_url",
  "cspan",
  "documentID",
  "logID"
];

// Number of consecutive updates with no data needed in order to
// infer that the live streaming of the event has ended
// used to delete the timed based trigger
var IDLE_STOP_THRESHOLD = 10;
var LONG_PARAGRAPH_THRESHOLD = 200;

//Notifications
var NOTIFICATION_ENABLED = false;
var NOTIFICATION_RECIPIENTS = "nprapps@npr.org";

// Warning message to go with the horizontal rule that will
// mark the limit where the fact checkers should not write
var WARNING_TEXT = "DO NOT WRITE BELOW THIS LINE";
var WARNING_MSG = "^^^^^^^^^^ " + WARNING_TEXT + " ^^^^^^^^^^";
var LIVE_TRANSCRIPT_END_MSG = "-------> LIVE TRANSCRIPT HAS ENDED <-----------";
var DO_NOT_PUBLISH_MSG =
  "DO NOT PUBLISH UNTIL FURTHER NOTICE - NO DATA WILL BE AVAILABLE IN THE WIDGET UNTIL THE TIME OF THE LIVE EVENT";
// Hot Fix Restart CaptionID
// Set to the first text you want to receive
var RESTART_CAPTION_ID = 1;

// Google Apps Script logging sheet name
var LOG_SHEET_NAME = "Log";
