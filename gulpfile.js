var Builder = require('nw-builder'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    zip = require('gulp-zip');


gulp.task('nw', function() {
    var builder = new Builder({
        files: [
            'favicon.png',
            'index.html',
            'math.min.js',
            'package.json',
            'recalc.js',
            'style.css'
        ],
        platforms: ['osx32', 'osx64', 'linux32', 'linux64', 'win32', 'win64']
    });
    builder.on('log', function (msg) {
        gutil.log('\'' + 'node-webkit-builder'.cyan + '\':', msg);
    });

    return builder.build().catch(function (err) {
        gutil.log('\'' + 'node-webkit-builder'.cyan + '\':', err);
    });
});

gulp.task('dist-linux32', ['nw'], function () {
    return gulp.src('build/calque/linux32/**/**')
        .pipe(zip('Linux32.zip'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('dist-linux64', ['nw'], function () {
    return gulp.src('build/calque/linux64/**/**')
        .pipe(zip('Linux64.zip'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('dist-osx32', ['nw'], function () {
    return gulp.src('build/calque/osx32/**/**')
        .pipe(zip('OSX32.zip'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('dist-osx64', ['nw'], function () {
    return gulp.src('build/calque/osx64/**/**')
        .pipe(zip('OSX64.zip'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('dist-win32', ['nw'], function () {
    return gulp.src('build/calque/win32/**/**')
        .pipe(zip('Windows32.zip'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('dist-win64', ['nw'], function () {
    return gulp.src('build/calque/win64/**/**')
        .pipe(zip('Windows64.zip'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('dist', [
    'dist-linux32',
    'dist-linux64',
    'dist-osx32',
    'dist-osx64',
    'dist-win32',
    'dist-win64'
]);
