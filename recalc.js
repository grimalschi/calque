window.onload = function () {
    var inputEl = document.getElementById('input');
    var outputEl = document.getElementById('output');

    var oldValue = null;
    var oldSelectionStart = null;
    var handler = function () {
        var newValue = inputEl.value;
        if (newValue !== oldValue) {
            oldValue = newValue;
            setTimeout(recalc, 0);
        }

        var newSelectionStart = inputEl.selectionStart;
        if (newSelectionStart !== oldSelectionStart) {
            oldSelectionStart = newSelectionStart;
            setTimeout(recalc, 0);
        }

        if (input.scrollTop !== output.scrollTop) {
            output.scrollTop = input.scrollTop;
        }
    };

    inputEl.onkeydown = handler;
    inputEl.onkeyup = handler;
    setInterval(handler, 50);

    outputEl.scrollTop = inputEl.scrollTop;
    inputEl.onscroll = function () {
        outputEl.scrollTop = inputEl.scrollTop;
    };
}

function recalc() {
    var scope = {};
    var output = [];

    var inputEl = document.getElementById('input');
    var input = inputEl.value.split("\n");


    if (input.length === 1) {
        var selectedLine = 1;
    } else {
        var match = inputEl.value.substr(0, inputEl.selectionStart).match(/\n/g);
        if (!match) {
            var selectedLine = 1;
        } else {
            var selectedLine = inputEl.value.substr(0, inputEl.selectionStart).match(/\n/g).length + 1;
        }
    }

    input.forEach(function (line, index) {
        if (line === '' || line[0] === '#') {
            output.push({
                type: 'empty',
            });
        } else {
            var length = line.length;

            try {
                var value = math.eval(line, scope).toString();
            } catch (e) {
                output.push({
                    type: 'error',
                    length: length,
                    value: e,
                    mute: index + 1 === selectedLine,
                });
                return;
            }

            if (value.substr(0, 8) === 'function') {
                value = value.substring(9, value.indexOf('{') - 1);
                output.push({
                    type: 'function',
                    length: length,
                    value: value,
                });
            } else {
                output.push({
                    type: 'value',
                    length: length,
                    value: value,
                });
            }
        }
    });

    var outputEl = document.getElementById('output');
    outputEl.innerHTML = '';
    output.forEach(function (line) {
        if (line.type === 'empty') {
            outputEl.innerHTML += '<div class="clear">&nbsp;</div>';
        } else if (line.type === 'value') {
            var comment = '<span class="comment">= </span>';
            var spaces = '';
            for (var s = 0; s <= line.length; s++) spaces += ' ';
            outputEl.innerHTML += '<div class="value">' + spaces + comment + line.value + '</div>';
        } else if (line.type === 'function') {
            var comment = '<span class="comment"> fn</span>';
            var spaces = '';
            for (var s = 0; s <= line.length; s++) spaces += ' ';
            outputEl.innerHTML += '<div class="function">' + spaces + comment + '</div>';
        } else if (line.type === 'error') {
            if (line.mute) {
                outputEl.innerHTML += '<div class="clear">&nbsp;</div>';
            } else {
                var comment = '<span class="comment">// </span>';
                var spaces = '';
                for (var s = 0; s <= line.length; s++) spaces += ' ';
                outputEl.innerHTML += '<div class="error">' + spaces + comment + line.value + '</div>';
            }
        }
    });
}