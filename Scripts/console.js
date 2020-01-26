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

        //Hackathon Shouldn't be hardcoded like that!
        let templateBufferLineNumber = 26;
        let fileName = "C:\\Program Files\\Acumatica ERP\\AcumaticaDemo2019R2\\CstDesigner\\Console_OmniSharp\\Console.cs";

        function getParsedBuffer(buffer) {
            let template = `using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using PX.Data;
using PX.Objects.GL;
using PX.Objects.CM;
using PX.Objects.CS;
using PX.Objects.CR;
using PX.Objects.TX;
using PX.Objects.IN;
using PX.Objects.EP;
using PX.Objects.AP;
using PX.TM;
using PX.Objects;
using PX.Objects.PO;
using PX.Objects.SO;

            namespace PX.Objects
            {
	            public class Console
	            {
                    public void Method()
                    {
                        var Graph = new {GRAPH_TYPE}();
{BUFFER}
                    }
	            }               
            }
        `;

            let graphType = px_alls['pnlGraphType'].getValue();
            return template.replace('{BUFFER}', buffer).replace('{GRAPH_TYPE}', graphType);
        }

        monaco.languages.registerCompletionItemProvider('csharp', {
            triggerCharacters: ["."],
            provideCompletionItems: function (model, position) {
                let word = model.getWordUntilPosition(position);
                let wordToComplete = "";
                if (word) wordToComplete = word.word;

                var range = {
                    startLineNumber: templateBufferLineNumber, //position.lineNumber,
                    endLineNumber: templateBufferLineNumber, //position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                let params = {
                    "Buffer": getParsedBuffer(model.getValue()),
                    "FileName": fileName,
                    "Column": position.column,
                    "Line": templateBufferLineNumber, //position.lineNumber
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

        monaco.languages.registerSignatureHelpProvider('csharp', {
            signatureHelpTriggerCharacters: ["(", ","],
            provideSignatureHelp: function (model, position) {
                let params = {
                    "Buffer": getParsedBuffer(model.getValue()),
                    "FileName": fileName,
                    "Column": position.column,
                    "Line": templateBufferLineNumber
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

        monaco.languages.registerHoverProvider('csharp', {
            provideHover: function (model, position) {
                let params = {
                    "Buffer": getParsedBuffer(model.getValue()),
                    "FileName": fileName,
                    "Column": position.column,
                    "Line": templateBufferLineNumber,
                    "IncludeDocumentation": true,
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
            minimap: {
                enabled: false
            }
        });

        var myBinding = editor.addCommand(monaco.KeyCode.Enter, function () {
            if (editor.getValue() != '') {
                px_alls['pnlConsoleInput'].updateValue(editor.getValue());
            editor.setValue('');
                px_alls['ds'].executeCallback('ConsoleRunAction');
            }
        });
    });
}