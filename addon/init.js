/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {
    DocumentApp.getUi().createAddonMenu()
        .addItem('Add Post', 'showMetadataSidebar')
        .addItem('Add Embed ShortCode', 'showEmbedSidebar')
        .addSeparator()
        .addItem('Initialize Document', 'initializeDocument')
        .addToUi();

    // Prepare persistent logging
    var props = PropertiesService.getDocumentProperties();
    props.setProperty("logID",logID);
}

/**
 * Runs when the add-on is installed.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE.)
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Needed to allow to load HTML files with templates
 * and thus being able to split our code into modules
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
