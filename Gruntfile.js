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
          countries: 'data/countries Version2.csv'
        },
        src: 'data/Flow Data for Online Viz Version2.csv',
        dest: 'tmp/data.csv'
      }
    },
    compile: {
      main: {
        src: 'tmp/data.csv',
        dest: 'json/migrations.json'
      }
    },
    concat: {
      js: {
        options: {
          separator: ';'
        },
        src: [
          'javascripts/modernizr.js',
          'javascripts/d3.v3.min.js',
          'lib/countrymerge.js',
          'lib/layout.js',
          'lib/chord.js',
          'lib/timeline.js',
          'lib/chart.js'
        ],
        dest: 'dist/app-v1.js'
      },
      css: {
        options: {
          separator: '\n'
        },
        src: [
          'stylesheets/normalize.css',
          'stylesheets/styles.css'
        ],
        dest: 'dist/app-v1.css'
      },
      lib: {
        options: {
          separator: ';'
        },
        src: [
          'lib/countrymerge.js',
          'lib/layout.js',
          'lib/chord.js',
          'lib/timeline.js',
          'lib/chart.js'
        ],
        dest: 'dist/circular-flows.js'
      },
    },
    uglify: {
      js: {
        files: {
        'dist/app-v1.min.js': ['dist/app-v1.js']
        }
      },
      lib: {
        files: {
        'dist/circular-flows.min.js': ['dist/circular-flows.js']
        }
      }
    },
    cssmin: {
      css: {
        src: 'dist/app-v1.css',
        dest: 'dist/app-v1.min.css'
      }
    },
    copy: {
      fonts: {
        files: [
          {
            expand: true,
            cwd: 'stylesheets/fonts/',
            src: ['*'],
            dest: 'dist/fonts',
            flatten: true
          }
        ]
      }
    },
    clean: ['tmp', 'json', 'dist']
  });

  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('build', ['concat', 'cssmin', 'uglify', 'copy']);
  grunt.registerTask('default', ['jshint', 'nodeunit', 'filter', 'compile', 'build']);
};
