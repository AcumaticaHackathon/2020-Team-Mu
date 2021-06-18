"use strict";

var editor = null;
var completionItemProvider = null;
var signatureHelpProvider = null;
var hoverProvider = null;
var enterBinding = null;
var upArrowBinding = null;
var downArrowBinding = null;

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

    px_alls["pnlConsoleOutput"].element.setAttribute("readonly", "true");
    px_alls["pnlConsoleOutput"].element.style.background = "black";
    px_alls["pnlConsoleOutput"].element.style.color = "#ccc";

    require.config({ paths: { 'vs': '../../Scripts/Monaco' } });
    require(['vs/editor/editor.main'], function () {
        function xhr(url, params) {
            var req = null;
            return new Promise(function (c, e) {
                req = new XMLHttpRequest();
                req.onreadystatechange = function () {
                    if (req._canceled) { return; }

                    if (req.readyState === 4) {
                        if ((req.status >= 200 && req.status < 300) || req.status === 1223) {
                            c(req);
                        } else {
                            e(req);
                        }
                        req.onreadystatechange = function () { };
                    }
                };

                req.open("POST", url, true);
                req.send(JSON.stringify(params));
            }, function () {
                req._canceled = true;
                req.abort();
            });
        }

        function extractSummaryText(xmlDocComment) {
            const summaryStartTag = '<summary>';
            const summaryEndTag = '</summary>';

            if (!xmlDocComment) {
                return xmlDocComment;
            }

            let summary = xmlDocComment;

            let startIndex = summary.search(summaryStartTag);
            if (startIndex < 0) {
                return "";
            }

            summary = summary.slice(startIndex + '<summary>'.length);

            let endIndex = summary.search(summaryEndTag);
            if (endIndex < 0) {
                return summary;
            }
            
            return summary.slice(0, endIndex).replace(/(<([^>]+)>)/ig, ' ').replace(/(\r\n|\n|\r)/gm, '');
        }

        function popHistory() {
            let valueAtPos = editor.history[editor.historyPos];
            editor.setValue(valueAtPos);

            let position = editor.getPosition();
            position.column = valueAtPos.length + 1; //Move caret to end of line
            editor.setPosition(position);
        }

        function lineNumbersFunc(originalLineNumber) {
            return "Acumatica>";
        }
        completionItemProvider = monaco.languages.registerCompletionItemProvider('csharp', {
            triggerCharacters: ["."],
            provideCompletionItems: function (model, position) {
                let word = model.getWordUntilPosition(position);
                let wordToComplete = "";
                if (word) wordToComplete = word.word;

                var range = {
                    startLineNumber: 1, 
                    endLineNumber: 1,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                let params = {
                    "Buffer": model.getValue(),
                    "GraphType": px_alls['pnlGraphType'].getValue(),
                    "Column": position.column,
                    "WantDocumentationForEveryCompletionResult": true,
                    "WantKind": true,
                    "WantReturnType": true,
                    "WordToComplete": wordToComplete,
                };

                return xhr('../../editor?c=autocomplete', params).then(function (res) {
                    if (!res.responseText) return;

                    let result = [];
                    let responses = JSON.parse(res.responseText);
                    let completions = Object.create(null);

                    for (let response of responses) {
                        let completion = {
                            label: response.CompletionText,
                            kind: monaco.languages.CompletionItemKind[response.Kind],
                            documentation: response.Description,
                            insertText: response.CompletionText,
                            detail: response.ReturnType ? response.ReturnType + " " + response.CompletionText : response.CompletionText,
                            range: range
                        };

                        let array = completions[completion.label];
                        if (!array) {
                            completions[completion.label] = [completion];
                        }
                        else {
                            array.push(completion);
                        }
                    }

                    // Per suggestion group, select on and indicate overloads
                    for (let key in completions) {

                        let suggestion = completions[key][0],
                            overloadCount = completions[key].length - 1;

                        if (overloadCount === 0) {
                            // remove non overloaded items
                            delete completions[key];
                        }
                        else {
                            // indicate that there is more
                            suggestion.detail = `${suggestion.detail} (+ ${overloadCount} overload(s))`;
                        }

                        result.push(suggestion);
                    }

                    return {
                        suggestions: result
                    };
                });

                return null;
            }
        });

        signatureHelpProvider = monaco.languages.registerSignatureHelpProvider('csharp', {
            signatureHelpTriggerCharacters: ["(", ","],
            provideSignatureHelp: function (model, position) {
                let params = {
                    "Buffer": model.getValue(),
                    "GraphType": px_alls['pnlGraphType'].getValue(),
                    "Column": position.column
                };

                return xhr('../../editor?c=signaturehelp', params).then(function (res) {
                    if (!res.responseText) return;
                    let signatureInfo = JSON.parse(res.responseText);

                    let signatureHelp = {
                        activeSignature: signatureInfo.ActiveSignature,
                        activeParameter: signatureInfo.ActiveParameter,
                        signatures: new Array(signatureInfo.Signatures.length)
                    };

                    //TODO: Refactor (case sensitivity?)
                    for (let i = 0; i < signatureInfo.Signatures.length; i++) {
                        let signature = signatureInfo.Signatures[i];
                        
                        signatureHelp.signatures[i] = {
                            label: signature.Label,
                            documentation: extractSummaryText(signature.Documentation),
                            parameters: new Array(signature.Parameters.length)
                        };

                        for (let j = 0; j < signature.Parameters.length; j++) {
                            signatureHelp.signatures[i].parameters[j] = {
                                label: signature.Parameters[j].Label,
                                documentation: signature.Parameters[j].Documentation
                            };
                        };
                    }

                    return {
                        value: signatureHelp,
                        dispose: function () { }
                    };
                });

                return null;
            }
        });

        hoverProvider = monaco.languages.registerHoverProvider('csharp', {
            provideHover: function (model, position) {
                let params = {
                    "Buffer": model.getValue(),
                    "GraphType": px_alls['pnlGraphType'].getValue(),
                    "Column": position.column,
                    "IncludeDocumentation": true
                };

                return xhr('../../editor?c=typelookup', params).then(function (res) {
                    if (!res.responseText) return;
                    let typeinfo = JSON.parse(res.responseText);

                    return {
                        range: new monaco.Range(1, 1, model.getLineCount(), model.getLineMaxColumn(model.getLineCount())),
                        contents: [
                            typeinfo.Documentation,
                            { language: 'cscript', value: typeinfo.Type }
                        ]
                    }
                });

                return null;
            }
        });

        editor = monaco.editor.create(document.getElementById('ctl00_pnlConsole_pnlConsoleEditor'), {
            language: 'csharp',
            //theme: 'vs-dark', //vs-dark messes up intellisense. Maybe hc-black?
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: lineNumbersFunc,
            minimap: {
                enabled: false
            },
            scrollbar: {
                useShadows: false,
                verticalHasArrows: true,
                horizontalHasArrows: true,
                vertical: 'hidden',
                horizontal: 'hidden',
                verticalScrollbarSize: 0,
                horizontalScrollbarSize: 17,
                arrowSize: 30
            },
            glyphMargin: false,
            folding: false,
            // Undocumented see https://github.com/Microsoft/vscode/issues/30795#issuecomment-410998882
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 12
        });

        editor.history = new Array();
        editor.historyPos = -1;
        
        enterBinding = editor.addCommand(monaco.KeyCode.Enter, function () {
            if (editor.getValue() !== '') {
                editor.history.push(editor.getValue());
                editor.historyPos = -1;

                px_alls['pnlConsoleInput'].updateValue(editor.getValue());
                editor.setValue('');
                px_alls['ds'].executeCallback('ConsoleRunAction');
            }
        });

        upArrowBinding = editor.addCommand(monaco.KeyCode.UpArrow, function () {
            if (editor.history.length > 0) {
                if (editor.historyPos === -1) {
                    //Start at the end of the history
                    editor.historyPos = editor.history.length - 1;
                    popHistory();
                }
                else {
                    if (editor.historyPos > 0) {
                        editor.historyPos--;
                        popHistory();
                    }
                }
            }
        });

        downArrowBinding = editor.addCommand(monaco.KeyCode.DownArrow, function () {
            if (editor.historyPos !== -1 && editor.historyPos < editor.history.length - 1) {
                editor.historyPos++;   
                popHistory();
            }
        });
    });
}

function BeforeHideConsolePanel() {
    //Very important otherwise we end up with duplicates in the code completion and other helpers
    completionItemProvider.dispose();
    signatureHelpProvider.dispose();
    hoverProvider.dispose();
    enterBinding.dispose();
    upArrowBinding.dispose();
    downArrowBinding.dispose();
    editor.dispose();
}

function AfterHideConsolePanel() {
    px_alls['ds'].executeCallback('ConsoleClearOutputAction');
}