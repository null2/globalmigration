'use strict';

module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib: {
        src: ['lib/**/*.js']
      },
      src: {
        options: {
          jshintrc: 'src/.jshintrc'
        },
        src: ['src/*.js']
      }
    },
    nodeunit: {
      files: ['test/**/*_test.js']
    },
    clean: ['migrations.json']
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  grunt.registerTask('compile', 'Compile original data', function() {
    var done = this.async();

    var outfile = __dirname + '/migrations.json';
    
    var options = this.options({
      input: __dirname + '/data/Flow Data for Online Viz.csv',
      sample: grunt.option('sample')
    });

    grunt.log.write('Compiling data...');
    require('./lib/compile.js').process(options, function(err, data) {
      if (err) {
        grunt.log.error(err);
      } else {
        grunt.log.ok();
        grunt.file.write(outfile, JSON.stringify(data, null, options.sample ? 2 : 0));
      }
      done(!err);
    });
  });

  // Default task.
  grunt.registerTask('default', ['jshint', 'nodeunit', 'compile']);
};
