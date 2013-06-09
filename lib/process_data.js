/* jshint node: true */

'use strict';

var csv = require('csv');
var fs = require('fs');
var _ = require('lodash');
var async = require('async');

function makeMatrix(countries, countryData, field) {
  var ret = _.map(countries, function(country, idx) {
    console.log('------- country ' + country + ' ' + idx);
    var cd = countryData[country];
    // if (!countryData[country]) {
    //   console.log("no data for %s %j", country, countryData);
    //   return [];
    // }
    return _.map(countries, function(destCountry) {
      // console.log("   " + destCountry + ": " + cd[destCountry][field]);
      // console.log(countryData);
      return parseInt(cd[destCountry][field], 10);
    });
  });
  return ret;
}

function writeMatrixData(matrixData, next) {
  fs.writeFile(__dirname+'/../data/' + matrixData.name + '.json', JSON.stringify(matrixData.data), function (err) {
    next(err);
  });
}

exports.doit = function() {

  var regions = {};
  var firstLine = true;

  var countries = [];
  var countryData = {};
  var matrix_1990;
  var matrix_1995;
  var matrix_2000;
  var matrix_2005;

  csv()
  .from.stream(fs.createReadStream(__dirname+'/../data/data.csv'))
  .to.path(__dirname+'/../data/processed.json')
  .transform( function(row){
    //row.unshift(row.pop());
    return row;
  })
  .on('record', function(row,index){
    if (firstLine) {
      firstLine = false;
      return;
    }

    // 0 originregion_id,
    // 1 originregion_name,
    // 2 destinationregion_id,
    // 3 destinationregion_name,
    // 4 regionflow_1990,
    // 5 regionflow_1995,
    // 6 regionflow_2000,
    // 7 regionflow_2005,
    // 8 xxx,
    // 9 origin_iso,
    // 10 origin_name,
    // 11 destination_iso,
    // 12 destination_name,
    // 13 countryflow_1990,
    // 14 countryflow_1995,
    // 15 countryflow_2000,
    // 16 countryflow_2005

    // only inter-region for testing
    // if(row[1] !== 'Latin America' || row[3] !== 'Latin America') {return;}

    // onyl countries beginnig with "a" for testing
    if( !(row[10].match(/^A/) && row[12].match(/^A/)) ) {return;}

    if (!regions[row[1]]) {
      regions[row[1]] = {countries: []};
    }
    regions[row[1]].countries = _.union(regions[row[1]].countries, [row[10]]);

    if (!regions[row[3]]) {
      regions[row[3]] = {countries: []};
    }
    regions[row[3]].countries.push(row[12]);
    regions[row[3]].countries = _.union(regions[row[3]].countries, [row[12]]);

    if (!countryData[row[10]]) {
      countryData[row[10]] = {}; 
    }
    countryData[row[10]][row[12]] = {
      flow_1990:row[13],
      flow_1995:row[14],
      flow_2000:row[15],
      flow_2005:row[16]
    };
  })
  .on('close', function(count){
    console.log('Number of lines: '+count);

    console.log('Regions: ' + JSON.stringify(regions, null, 2));

    _.each(regions, function(regionObject, regionKey) {
      countries.push(_.uniq(regionObject.countries));
    });

    countries = _.flatten(countries, true);

    console.log('Countries: ' + JSON.stringify(countries, null, 2));

    // loop over countries and fill matrix
    var matrices = [
      {name: 'matrix_1990', data: makeMatrix(countries, countryData, 'flow_1990')},
      {name: 'matrix_1995', data: makeMatrix(countries, countryData, 'flow_1995')},
      {name: 'matrix_2000', data: makeMatrix(countries, countryData, 'flow_2000')},
      {name: 'matrix_2005', data: makeMatrix(countries, countryData, 'flow_2005')}
    ];

    async.each(matrices, function(matrixData, next) {
      writeMatrixData(matrixData, next);
    }, function(err) {
      fs.writeFile(__dirname+'/../data/countries.json', JSON.stringify(countries), function (err) {
        console.log('Done');
      });
    });


  })
  .on('error', function(error){
    console.log(error.message);
  });

};
