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

exports.process = function(options, done) {
  var data = {
    years: {
      1990: {},
      1995: {},
      2000: {},
      2005: {}
    },
    regions: {},
    countries: {}
  };
  var years = Object.keys(data.years);
  var headers = [];

  // create object from headers out of row
  // TODO: get years from CSV
  function obj(row) {
    return row.reduce(function(memo, col, i) {
      memo[headers[i]] = col;
      return memo;
    }, {});
  }

  // build the matrix for a scope,
  // scope can be `regions` or `countries`
  function buildMatrix(scope) {
    var keys = Object.keys(data[scope]);

    years.forEach(function(year) {
      data.years[year][scope] = keys.map(function(source) {
        return keys.map(function(destination) {
          return data[scope][source][destination][year];
        });
      });
    });

    return keys;
  }

  csv()
    .from.stream(fs.createReadStream(options.input))
    .on('record', function(row, index){
      if (index === 0) {
        return headers = row;
      }

      row = obj(row);

      // if sample option, only use countries starting with `A`
      if (options.sample && !(row.origin_name.match(/^A/) && row.destination_name.match(/^A/))) {
        return;
      }

      // collect region-country mappings
      // data.regions[row.originregion_name] = data.regions[row.originregion_name] || { countries: [] };
      // if (data.regions[row.originregion_name].countries.indexOf(row.origin_name) === -1) {
      //   data.regions[row.originregion_name].countries.push(row.origin_name);
      // }

      // collect country migration data
      data.countries[row.origin_name] = data.countries[row.origin_name] || {};
      data.countries[row.origin_name][row.destination_name] = data.countries[row.origin_name][row.destination_name] || {};
      years.forEach(function(year) {
        data.countries[row.origin_name][row.destination_name][year] = parseInt(row['countryflow_' + year], 10);
      });

      // collect region migration data
      data.regions[row.originregion_name] = data.regions[row.originregion_name] || {};
      data.regions[row.originregion_name][row.destinationregion_name] = data.regions[row.originregion_name][row.destinationregion_name] || {};
      years.forEach(function(year) {
        data.regions[row.originregion_name][row.destinationregion_name][year] = parseInt(row['regionflow_' + year], 10);
      });
    })
   .on('end', function(){
      data.countries = buildMatrix('countries');
      data.regions = buildMatrix('regions');

      done(null, data);
    })
    .on('error', function(error){
      console.error(error.message);
      done(error);
    });
};
