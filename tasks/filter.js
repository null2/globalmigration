/*
 * globalmigration
 * https://github.com/null2/globalmigration
 *
 * Copyright (c) 2013 null2 GmbH Berlin
 * Licensed under the MIT license.
 */

'use strict';

var csv = require('csv');
var fs = require('fs');

module.exports = function(grunt) {
  function countries(filename, done) {
    var codes = [];

    csv()
      .from.stream(fs.createReadStream(filename))
      .on('record', function(row, index) {
        if (index === 0) {
          return;
        }

        if (row[2] === '1') {
          codes.push(row[0]);
        }
      })
      .on('end', function() {
        done(null, codes);
      })
      .on('error', function(error) {
        console.error(error.message);
        done(error);
      });
  }

  function filter(source, dest, codes, options, done) {
    var headers = [];

    // create object from headers out of row
    function obj(row) {
      return row.reduce(function(memo, col, i) {
        memo[headers[i]] = col;
        return memo;
      }, {});
    }

    csv()
      .from.stream(fs.createReadStream(source))
      .to.stream(fs.createWriteStream(dest))
      .transform(function(row, index) {
        if (index === 0) {
          return headers = row;
        }

        var o = obj(row);

        if (options.sample) {
          if (!o.origin_name.match(options.sample) || !o.destination_name.match(options.sample)) {
            return null;
          }
        }

        if (codes.indexOf(o.origin_iso) === -1) {
          return null;
        }
        if (codes.indexOf(o.destination_iso) === -1) {
          return null;
        }

        return row;
      })
      .on('end', function() {
        done(null);
      })
      .on('error', function(error) {
        console.error(error.message);
        done(error);
      });
  }

  grunt.registerMultiTask('filter', 'Filter csv data', function() {
    var options = this.options({
      countries: grunt.option('countries'),
      sample: grunt.option('sample')
    });

    // when sample option is set, only use countries starting with `A`
    if (options.sample === true) {
      options.sample = 'A';
    }
    if (options.sample) {
      options.sample = new RegExp('^' + options.sample);
    }

    var done = this.async();
    var files = this.files;

    grunt.log.write('Reading countries ' + options.countries + '...');
    countries(options.countries, function(err, codes) {
      if (err) {
        grunt.log.error(err);
      } else {
        grunt.log.ok();

        files.forEach(function(file) {
          file.src.forEach(function(src) {
            grunt.log.write('Filtering ' + src + '...');

            filter(src, file.dest, codes, options, function(err) {
              if (err) {
                grunt.log.error(err);
              } else {
                grunt.log.ok();
              }
              done(!err);
            });
          });
        });
      }
    });
  });
};
