(function () {
    function translit(text){
        return text.replace(/[а-яА-Я]/g, function (match) {
            return '_x' + match.charCodeAt() + 'x_';
        });
    }

    function detranslit(text) {
        return text.replace(/_x(\d+)x_/g, function (match, code) {
            return String.fromCharCode(code);
        });
    }

    function Calque(inputEl, outputEl) {
        this.inputEl = inputEl;
        this.outputEl = outputEl;
        this.parentEl = inputEl.parentNode;

        this.raw = '';
        this.lines = [];
        this.expressions = [];
        this.activeLine = 0;

        var handler = function () {
            this.updateActiveLine();
            this.input();
            this.inputEl.style.height = Math.max(
                this.outputEl.clientHeight,
                this.parentEl.clientHeight
            ) + 'px';
        }.bind(this);

        handler();

        this.inputEl.onkeydown = handler;
        this.inputEl.onkeyup = handler;
        setInterval(handler, 50);

        this.outputEl.scrollTop = this.inputEl.scrollTop;
    }

    Calque.prototype.updateActiveLine = function () {
        var value = this.inputEl.value;
        var selectionStart = this.inputEl.selectionStart;

        var match = value.substr(0, selectionStart).match(/\n/g);

        if (!match) {
            var activeLine = 1;
        } else {
            var activeLine = value.substr(0, selectionStart).match(/\n/g).length + 1;
        }

        if (this.activeLine !== activeLine) {
            this.activeLine = activeLine;
            this.repaint();
        }
    }

    Calque.prototype.input = function () {
        var raw = this.inputEl.value;
        if (raw !== this.raw) {
            this.raw = raw;
            this.lines = this.raw.split("\n");
            this.recalc();
        }
    }

    Calque.prototype.recalc = function () {
        this.expressions = [];

        var spacevars = [];

        var scope = {
            last: null
        };

        this.lines.forEach(function (code, index) {
            var processed = code;

            if (processed.indexOf('=') > 0) {
                var names = [];

                processed.split('=').slice(0, -1).forEach(function (part) {
                    if (processed.indexOf('(') > 0) {
                        names.push(part.substr(0, part.indexOf('(')).trim());
                    } else {
                        names.push(part.trim());
                    }
                });

                names.forEach(function (name) {
                    var spacevar = {
                        original: name,
                        replaced: name.replace(/ /g, '_'),
                        regexp: new RegExp(name, 'g')
                    };

                    spacevars.splice(0, 0, spacevar);
                });
            }

            spacevars.forEach(function (spacevar) {
                processed = processed.replace(spacevar.regexp, spacevar.replaced);
            });

            processed = translit(processed);

            try {
                var result = math.eval(processed, scope);
                var error = null;
            } catch (e) {
                var result = null;
                var error = detranslit(e.toString());
            }

            this.expressions.push({
                line: index,
                code: code,
                result: result,
                error: error
            });

            if (result !== undefined) {
                scope.last = result;
            }
        }.bind(this));

        this.repaint();
    };

    Calque.prototype.repaint = function () {
        var html = '';

        this.lines.forEach(function (line, index) {
            var expression = this.expressions.filter(function (expression) {
                return expression.line === index;
            })[0];

            if (expression.error) {
                if (this.activeLine === index + 1) {
                    var type = 'empty';
                } else {
                    var type = 'error';
                }
            } else if (expression.result === undefined) {
                var type = 'empty';
            } else {
                var type = 'result';
            }

            var prefix = '';
            for (var s = 0; s <= expression.code.length; s++) prefix += ' ';
            if (type === 'empty') prefix += ' ';
            if (type === 'result') {
                if (expression.result instanceof Function) {
                    prefix += 'fn';
                } else {
                    prefix += '= ';
                }
            }
            if (type === 'error') prefix += '// ';

            var data = '';
            if (type === 'result') {
                if (expression.result === null) {
                    data = 'null';
                } else if (expression.result instanceof Function) {
                    var source = expression.result.toString();
                    data = '';
                } else {
                    data = expression.result.toString();
                }
            };
            if (type === 'error') data = expression.error;

            var lineHtml = '<div class="' + type + '">';
            lineHtml += '<span class="prefix" data-prefix="' + prefix + '"></span>';
            lineHtml += '<span class="data">' + data + '</span>';
            lineHtml += '</div>';

            html += lineHtml;
        }.bind(this));

        this.outputEl.innerHTML = html;
    };

    window.Calque = Calque;
})();