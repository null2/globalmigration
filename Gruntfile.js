'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      tasks: {
        src: ['tasks/*.js']
      }
    },
    nodeunit: {
      files: ['test/**/*_test.js']
    },
    filter: {
      main: {
        options: {
          countries: 'data/countries.csv'
        },
        src: 'data/Flow Data for Online Viz.csv',
        dest: 'tmp/data.csv'
      }
    },
    compile: {
      main: {
        src: 'tmp/data.csv',
        dest: 'json/migrations.json'
      }
    },
    clean: ['tmp', 'json']
  });

  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  grunt.registerTask('default', ['jshint', 'nodeunit', 'filter', 'compile']);
};
