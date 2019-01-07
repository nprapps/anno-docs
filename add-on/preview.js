/**
 * Opens a dialog in the document containing the add-on's user interface.
 */
function showPreviewDialog_(responseCode, msg) {
    var ui = DocumentApp.getUi();
    var doc = HtmlService.createTemplateFromFile('preview_dialog');
    doc.responseCode = responseCode;
    doc.msg = msg;
    html = doc.evaluate();
    html.setHeight(250);
    ui.showModalDialog(html, 'Execution Result');
}
