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
  // Compile csv data file into JSON matrix
  function compile(filename, options, done) {
    var data = {
      years: {
        1990: {},
        1995: {},
        2000: {},
        2005: {}
      },
      migrations: {},
      regions: {}
    };
    var years = Object.keys(data.years);
    var headers = [];
    
    // sort order
    var sortedRegions = ['North America', 'Africa', 'Europe', 'Fmr Soviet Union', 'West Asia', 'South Asia', 'East Asia', 'South-East Asia', 'Oceania', 'Latin America'];

    // create object from headers out of row
    // TODO: get years from CSV
    function obj(row) {
      return row.reduce(function(memo, col, i) {
        memo[headers[i]] = col;
        return memo;
      }, {});
    }

    csv()
      .from.stream(fs.createReadStream(filename))
      .on('record', function(row, index){
        if (index === 0) {
          return headers = row;
        }

        row = obj(row);

        // when sample option is set, only use countries starting with `A`
        if (options.sample === true) {
          options.sample = 'A';
        }
        if (options.sample) {
          var test = new RegExp('^' + options.sample);
          if (!row.origin_name.match(test) || !row.destination_name.match(test)) {
            return;
          }
        }

        // collect region-country mappings
        data.regions[row.originregion_name] = data.regions[row.originregion_name] || [];
        if (data.regions[row.originregion_name].indexOf(row.origin_name) === -1) {
          data.regions[row.originregion_name].push(row.origin_name);
        }

        // collect migration data
        data.migrations[row.origin_name] = data.migrations[row.origin_name] || {};
        // country to country
        data.migrations[row.origin_name][row.destination_name] = data.migrations[row.origin_name][row.destination_name] || {};
        // country to region
        data.migrations[row.origin_name][row.destinationregion_name] = data.migrations[row.origin_name][row.destinationregion_name] || {};
        data.migrations[row.originregion_name] = data.migrations[row.originregion_name] || {};
        // region to country
        data.migrations[row.originregion_name][row.destination_name] = data.migrations[row.originregion_name][row.destination_name] || {};
        // region to region
        data.migrations[row.originregion_name][row.destinationregion_name] = data.migrations[row.originregion_name][row.destinationregion_name] || {};

        years.forEach(function(year) {
          var value = parseInt(row['countryflow_' + year], 10);
          // country to country
          data.migrations[row.origin_name][row.destination_name][year] = value;
          // country to region
          data.migrations[row.origin_name][row.destinationregion_name][year] = data.migrations[row.origin_name][row.destinationregion_name][year] || 0;
          data.migrations[row.origin_name][row.destinationregion_name][year] += value;
          // region to country
          data.migrations[row.originregion_name][row.destination_name][year] = data.migrations[row.originregion_name][row.destination_name][year] || 0;
          data.migrations[row.originregion_name][row.destination_name][year] += value;
          // region to region
          data.migrations[row.originregion_name][row.destinationregion_name][year] = data.migrations[row.originregion_name][row.destinationregion_name][year] || 0;
          data.migrations[row.originregion_name][row.destinationregion_name][year] += value;
        });
      })
     .on('end', function() {
        var keys = grunt.util._.union(sortedRegions, Object.keys(data.regions)).reduce(function(memo, region) {
          memo.indices.push(memo.keys.length);
          memo.keys.push(region);
          memo.keys = memo.keys.concat(data.regions[region] && data.regions[region].sort());
          return memo;
        }, { indices: [], keys: [] });

        var matrix = {};
        years.forEach(function(year) {
          matrix[year] = keys.keys.map(function(source) {
            return keys.keys.map(function(destination) {
              return data.migrations[source] && data.migrations[source][destination] && data.migrations[source][destination][year];
            });
          });
        });

        done(null, {
          names: keys.keys,
          regions: keys.indices,
          matrix: matrix
        });
      })
      .on('error', function(error) {
        console.error(error.message);
        done(error);
      });
  }

  grunt.registerMultiTask('compile', 'Compile csv data', function() {
    var options = this.options();

    var done = this.async();

    this.files.forEach(function(file) {
      file.src.forEach(function(src) {
        grunt.log.write('Compiling ' + src + '...');

        compile(src, options, function(err, data) {
          if (err) {
            grunt.log.error(err);
          } else {
            grunt.log.ok();
            grunt.file.write(file.dest, JSON.stringify(data, null, options.sample ? 2 : 0));
          }
          done(!err);
        });
      });
    });
  });
};
