var PROPS_WHITE_LIST = ['api_timestamp_url', 'api_srt_url', 'documentID', 'logID'];
var LOG_SHEET_NAME = 'Log';
// Number of consecutive updates with no data needed in order to
// infer that the live streaming of the event has ended
// used to delete the timed based trigger
var IDLE_STOP_THRESHOLD = 10;

//Notifications
var NOTIFICATION_ENABLED = true;
var NOTIFICATION_RECIPIENTS = 'nprapps@npr.org';

// Warning message to go with the horizontal rule that will
// mark the limit where the fact checkers should not write
var WARNING_TEXT = 'DO NOT WRITE BELOW THIS LINE'
var WARNING_MSG = '^^^^^^^^^^ '+WARNING_TEXT+' ^^^^^^^^^^';
var LIVE_TRANSCRIPT_END_MSG = '-------> LIVE TRANSCRIPT HAS ENDED <-----------';
var DO_NOT_PUBLISH_MSG = 'DO NOT PUBLISH BEFORE 7PM EASTERN - NO DATA WILL BE AVAILABLE IN THE WIDGET UNTIL AFTER 9PM EASTERN';

// Hot Fix Restart CaptionID
// Set to the first text you want to receive
var RESTART_CAPTION_ID = 1;
