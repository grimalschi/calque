(function () {
    function Calque(inputEl, outputEl) {
        var calque = this;

        calque.inputEl = inputEl;
        calque.outputEl = outputEl;
        calque.parentEl = inputEl.parentNode;

        calque.raw = '';
        calque.lines = [];
        calque.cache = {};

        calque.selection = '';
        calque.selectionStart = 0;
        calque.selectionEnd = 0;

        var last = 0;
        var handler = function (delayed) {
            if (last === Date.now()) return;
            else last = Date.now();

            calque.input();
            calque.inputEl.style.height = Math.max(calque.outputEl.clientHeight, calque.parentEl.clientHeight) + 'px';
        };

        handler();

        calque.inputEl.oninput = handler;

        calque.inputEl.onmousedown = function () {
            window.requestAnimationFrame(handler);
        };

        calque.inputEl.onkeydown = function (event) {
            if (event.key === 'Enter') {
                var line = calque.lines.filter(line =>  line.selected).pop();

                var insert = '\n';
                if (line.summing) insert += '  ';
                for (var i = 0; i < line.indent; i++) insert += '  ';

                calque.replaceSelection(insert, false);
                event.preventDefault();
            }

            if (event.metaKey || event.ctrlKey) {
                if (event.key === 'd' || event.key === 'в') {
                    calque.duplicateSelection();
                    event.preventDefault();
                }
            }

            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                var selectionStart = calque.inputEl.selectionStart;
                var selectionEnd = calque.inputEl.selectionEnd;

                var selection = calque.raw.substring(selectionStart, selectionEnd);

                if (selection.match(/^-?\d+\.?\d*$/)) {
                    var newValue = selection * 1;

                    if (event.key === 'ArrowUp') newValue += event.shiftKey ? 10 : 1;
                    if (event.key === 'ArrowDown') newValue -= event.shiftKey ? 10 : 1;

                    calque.replaceSelection(newValue);
                    event.preventDefault();
                }
            }

            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    calque.removeIndent();
                } else {
                    calque.addIndent();
                }

                event.preventDefault();
            }

            window.requestAnimationFrame(handler);
        };

        setTimeout(function fn() {
            setTimeout(fn, 50);
            handler();
        });

        calque.outputEl.scrollTop = calque.inputEl.scrollTop;
    }

    Calque.prototype.input = function () {
        var calque = this;

        var raw = calque.inputEl.value;
        var selectionStart = calque.inputEl.selectionStart;
        var selectionEnd = calque.inputEl.selectionEnd;
        if (raw !== calque.raw || selectionStart !== calque.selectionStart || selectionEnd !== calque.selectionEnd) {
            calque.raw = raw;
            calque.recalc();
            calque.readSelection();
            calque.repaint();

            localStorage.setItem("input", calque.raw);
        }
    };

    Calque.prototype.recalc = function () {
        var calque = this;

        calque.lines = [];

        var scope = {
            last: null
        };

        var position = 0;
        calque.raw.split("\n").forEach(function (code, index) {
            var line = {
                index: index,
                code: code,
                positionStart: position,
                positionEnd: position + code.length,
                result: null,
                error: null,
                indent: 0,
                summing: null,
                closed: false,
            };

            position += code.length + 1;

            calque.lines.push(line);

            if (line.code.substr(0, 2) === '  ') {
                line.indent = line.code.match(/\s+/)[0].match(/\s\s/g).length;
            }

            calque.lines.forEach(function (line2) {
                if (line2.summing && line2.indent >= line.indent) {
                    line2.closed = true;
                    scope[line2.summing] = line2.result;
                }
            });

            if (line.code.trim().slice(-1) === ':' && line.code.indexOf('#') < 0) {
                line.summing = line.code.trim().slice(0, -1).trim();
                line.result = 0;
                line.closed = false;
                line.children = [];
            } else {
                try {
                    var cached = calque.cache[line.code];
                    if (!cached) {
                        cached = {};
                        calque.cache[line.code] = cached;
                        cached.parsed = math.parse(line.code);
                        cached.compiled = cached.parsed.compile();
                    }

                    line.parsed = cached.parsed;
                    line.compiled = cached.compiled;
                    line.result = line.compiled.eval(scope);
                } catch (e) {
                    line.error = e.toString();
                }
            }

            if (line.result !== undefined) {
                calque.lines.forEach(function (line2) {
                    if (line2.summing && !line2.closed && line2.indent < line.indent) {
                        line2.children.push(line);

                        try {
                            line2.result = math.add(line2.result, line.result);
                        } catch (e) {
                            line2.error = e.toString();
                        }
                    }
                });

                scope.last = line.result;
            }
        });
    };

    Calque.prototype.readActiveLine = function () {
        var calque = this;

        var value = calque.inputEl.value;
        var selectionStart = calque.inputEl.selectionStart;

        var match = value.substr(0, selectionStart).match(/\n/g);
        var index = match ? match.length : 0;
        calque.line = calque.lines[index];
    };

    Calque.prototype.readSelection = function () {
        var calque = this;

        calque.selectionStart = calque.inputEl.selectionStart;
        calque.selectionEnd = calque.inputEl.selectionEnd;

        calque.selection = calque.raw.substring(calque.selectionStart, calque.selectionEnd);

        calque.lines.forEach(function (line) {
            line.selected = false;

            var leftCheck = line.positionEnd >= calque.selectionStart;
            var rightCheck = line.positionStart <= calque.selectionEnd;
            if (leftCheck && rightCheck) line.selected = true;
        });
    };

    Calque.prototype.replaceSelection = function (replacement, select) {
        var calque = this;

        calque.readSelection();

        select = select === false ? false : true;
        replacement = replacement.toString();

        var newSelectionStart = calque.selectionStart;
        var newSelectionEnd = calque.selectionStart + replacement.length;

        if (!document.execCommand('insertText', false, replacement)) {
            calque.inputEl.setRangeText(replacement, calque.selectionStart, calque.selectionEnd, 'end');
            calque.input();
        }

        if (select) {
            calque.inputEl.setSelectionRange(newSelectionStart, newSelectionEnd);
        } else {
            calque.inputEl.setSelectionRange(newSelectionEnd, newSelectionEnd);
        }
    };

    Calque.prototype.duplicateSelection = function () {
        var calque = this;

        if (calque.selection === '') {
            var line = calque.lines.find(function (line) {
                return line.selected;
            });

            calque.inputEl.setSelectionRange(line.positionEnd, line.positionEnd);
            calque.replaceSelection('\n' + line.code);
            calque.inputEl.setSelectionRange(calque.selectionStart, calque.selectionStart);
         } else {
            var selection = calque.selection;

            calque.inputEl.setSelectionRange(calque.selectionEnd, calque.selectionEnd);
            calque.replaceSelection(selection);
            calque.inputEl.setSelectionRange(calque.selectionStart - selection.length, calque.selectionStart);
        }
    };

    Calque.prototype.addIndent = function () {
        var calque = this;

        var selectionStart = Infinity;
        var selectionEnd = 0;

        var affected = 0;
        var replacement = '';

        calque.lines.forEach(function (line) {
            if (!line.selected) return false;

            affected++;
            replacement += '  ' + line.code + '\n';

            if (line.positionStart <= selectionStart) {
                selectionStart = line.positionStart;
            }

            if (line.positionEnd > selectionEnd) {
                selectionEnd = line.positionEnd;
            }
        });

        if (affected === 0) return;

        replacement = replacement.substr(0, replacement.length - 1);

        var newSelectionStart = calque.selectionStart + 2;
        var newSelectionEnd = calque.selectionEnd + affected * 2;

        calque.inputEl.setSelectionRange(selectionStart, selectionEnd);
        calque.replaceSelection(replacement);
        calque.inputEl.setSelectionRange(newSelectionStart, newSelectionEnd);
    };

    Calque.prototype.removeIndent = function () {
        var calque = this;

        var selectionStart = Infinity;
        var selectionEnd = 0;

        var affected = 0;
        var replacement = '';

        calque.lines.forEach(function (line) {
            if (!line.selected) return false;
            if (line.code.substr(0, 2) !== '  ') return;

            affected++;
            replacement += line.code.substr(2) + '\n';

            if (line.positionStart <= selectionStart) {
                selectionStart = line.positionStart;
            }

            if (line.positionEnd > selectionEnd) {
                selectionEnd = line.positionEnd;
            }
        });

        if (affected === 0) return;

        replacement = replacement.substr(0, replacement.length - 1);

        var newSelectionStart = calque.selectionStart - 2;
        var newSelectionEnd = calque.selectionEnd - affected * 2;

        calque.inputEl.setSelectionRange(selectionStart, selectionEnd);
        calque.replaceSelection(replacement);
        calque.inputEl.setSelectionRange(newSelectionStart, newSelectionEnd);
    };

    Calque.prototype.repaint = function () {
        var calque = this;

        var html = '';

        calque.lines.forEach(function (line, index) {
            if (line.error) {
                if (line.selected) {
                    var type = 'empty';
                } else {
                    if (line.summing && line.children.find(line => line.error)) {
                        var type = 'empty';
                    } else {
                        var type = 'error';
                    }
                }
            } else if (line.summing) {
                var type = 'result';
            } else if (line.result === undefined) {
                var type = 'empty';
            } else if (line.parsed.isFunctionAssignmentNode) {
                var type = 'empty';
            } else if (line.parsed.isConstantNode) {
                var type = 'empty';
            } else if (line.parsed.isAssignmentNode && line.parsed.value.isConstantNode) {
                var type = 'empty';
            } else {
                var type = 'result';
            }

            var code = line.code || ' ';
            var prefix = ' ';
            for (var i = 0; i < line.indent; i++) code = code.replace(/(\| )?  /, '$1| ');

            if (type === 'result') prefix += '= ';
            else if (type === 'error') prefix += '// ';

            var data = '';
            if (type === 'result') {
                if (typeof line.result === 'number') {
                    data = math.round(line.result, 10).toString();
                } else {
                    data = line.result.toString();
                }
            }
            else if (type === 'error') data = line.error;

            data = data.replace(/\n/g, '\\n');

            if (line.selected) type += ' highlight';

            var lineHtml = '<div class="' + type + '">';
            lineHtml += '<span class="code" data-code="' + code + '"></span>';
            lineHtml += '<span class="hint" data-prefix="' + prefix + '">' + data + '</span>';
            lineHtml += '</div>';

            html += lineHtml;
        });

        calque.outputEl.innerHTML = html;
    };

    window.Calque = Calque;
})();