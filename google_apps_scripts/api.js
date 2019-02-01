/**
 * Hits the API endpoint and returns the HTTPResponse
 *
 * @private
 * @param {String} url The url endpoint
 * @param {String} param Name of the query param to mark our last received chunk of data
 * @param {String} lastData Last received data value.
 * @returns {HTTPResponse} HttpResponse if responseCode is 200 or 204
 */
function _getAPIData(url, param, lastData) {
  if (!url) {
    var msg = "did not find the api url in script properties";
    PersistLog.severe(msg);
    throw new Error(msg);
  }
  var api_url;
  PersistLog.debug("_getAPIData start");
  if (lastData !== null) {
    api_url = url + "?" + param + "=" + lastData;
  } else {
    api_url = url + "?" + param + "=0";
  }
  try {
    PersistLog.debug("api_url: %s", api_url);
    var response = UrlFetchApp.fetch(api_url, { muteHttpExceptions: true });
  } catch (e) {
    throw e;
  }
  return response;
}

/**
 * Fetches the transcript start time to set a timestamp to each speaker
 * combined with the offset in milliseconds on the start caption
 *
 * @private
 * @returns {String} Start transcript date
 */
function _getVerb8tmStartTime() {
  PersistLog.debug("_getVerb8tmStartTime start");
  try {
    var api_timestamp_url = props.getProperty("api_timestamp_url");
    if (!api_timestamp_url) {
      var msg = "did not find api_timestamp_url in script properties";
      PersistLog.severe(msg);
      throw new Error(msg);
    }
    var response = UrlFetchApp.fetch(api_timestamp_url, {
      muteHttpExceptions: true
    });
  } catch (e) {
    e = typeof e === "string" ? new Error(e) : e;
    var msg = Utilities.formatString(
      "Exception ocurred while invoking UrlFetchApp for %s",
      api_timestamp_url
    );
    PersistLog.severe(msg);
    throw e;
  }
  var responseCode = response.getResponseCode();

  if (responseCode === 409) {
    PersistLog.debug("Show StartTime not set yet: %s", responseCode);
    return null;
  } else if (responseCode !== 200 && responseCode !== 204) {
    var msg = Utilities.formatString(
      "Request failed to %s. Expected 200 or 204, got %s",
      api_timestamp_url,
      responseCode
    );
    PersistLog.severe(msg);
    return null;
  }
  return response;
}
