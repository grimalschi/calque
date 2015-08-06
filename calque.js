(function () {
    function scopeClone(scope) {
        var newScope = {};

        _.each(scope, function (value, name) {
            if (value instanceof Function) {
                newScope[name] = value;
            } else {
                newScope[name] = math.clone(value);
            }
        });

        return newScope;
    }

    function Calque(inputEl, outputEl) {
        this.inputEl = inputEl;
        this.outputEl = outputEl;

        this.raw = '';
        this.lines = [];
        this.expressions = [];
        this.activeLine = 0;

        var handler = function () {
            this.updateActiveLine();
            this.input();

            if (this.inputEl.scrollTop !== this.outputEl.scrollTop) {
                this.outputEl.scrollTop = this.inputEl.scrollTop;
            }
        }.bind(this);

        handler();

        inputEl.onkeydown = handler;
        inputEl.onkeyup = handler;
        setInterval(handler, 50);

        outputEl.scrollTop = inputEl.scrollTop;
        inputEl.onscroll = function () {
            outputEl.scrollTop = inputEl.scrollTop;
        };
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
        this.expressions.forEach(function (expression) {
            expression.line = null;
        });

        var scope = {
            last: null
        };

        this.lines.forEach(function (code, index) {
            var oldSimilarExpressions = this.expressions.filter(function (expression) {
                if (expression.line !== null) return;
                if (expression.code !== code) return;
                return true;
            });

            if (oldSimilarExpressions.length) {
                var expression = oldSimilarExpressions[0];
                expression.eval(scope);
            } else {
                var expression = new Expression(code, scope);
                this.expressions.push(expression);
            }

            scope = scopeClone(expression.scopeOutput);

            if (expression.result !== undefined) {
                scope.last = expression.result;
            }

            expression.line = index;
        }.bind(this));

        _.remove(this.expressions, { line: null });

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


    function Expression(code, scope) {
        this.code = code;
        this.scopeInput = scopeClone(scope);
        this.scopeOutput = scopeClone(this.scopeInput);

        try {
            this.parse = math.parse(code);

            this.dependencies = [];
            this.parse.traverse(function (node) {
                if (node.isSymbolNode || node.isFunctionNode) {
                    this.dependencies.push(node.name);
                }
            }.bind(this));

            this.eval(scope);
        } catch (e) {
            this.result = null;
            this.error = e;
        }

        this.line = null;
    };

    Expression.prototype.eval = function (scope) {
        this.scopeInput = scopeClone(scope);
        this.scopeOutput = scopeClone(this.scopeInput);

        try {
            this.result = this.parse.eval(this.scopeOutput);
            this.error = null;
        } catch (e) {
            this.result = null;
            this.error = e;
        }
    };

    window.Calque = Calque;
})();