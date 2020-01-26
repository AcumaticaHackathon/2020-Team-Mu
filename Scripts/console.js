"use strict";

var editor = null;

function BeforeLoadConsolePanel() {
}

function AfterLoadConsolePanel() {
    
}

function BeforeShowConsolePanel() {

}

function AfterShowConsolePanel() {
    px_alls["pnlConsole"].element.style.removeProperty("top");
    px_alls["pnlConsole"].element.style.removeProperty("left");
    px_alls["pnlConsole"].element.style.bottom = "5px";
    px_alls["pnlConsole"].element.style.right = "5px";
    
    require.config({ paths: { 'vs': '../../Scripts/Monaco' } });
    require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(document.getElementById('ctl00_pnlConsole_pnlConsoleEditor'), {
            //value: sourceTextEdit.getValue(),
            language: 'csharp',
            automaticLayout: true
        });

        var myBinding = editor.addCommand(monaco.KeyCode.Enter, function () {
            px_alls['pnlConsoleInput'].updateValue(editor.getValue());
            editor.setValue('');
            px_alls['ds'].executeCallback('ConsoleRunAction');
        });
    });
}