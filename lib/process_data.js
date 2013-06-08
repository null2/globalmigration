/* jshint node: true */

'use strict';

var csv = require('csv');
var fs = require('fs');
var _ = require('lodash');

exports.doit = function() {

  var regions = {};
  var firstLine = true;

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
    
    if (!regions[row[1]]) {
      regions[row[1]] = {countries: []};
    }
    regions[row[1]].countries = _.union(regions[row[1]].countries, [row[10]]);

    if (!regions[row[3]]) {
      regions[row[3]] = {countries: []};
    }
    regions[row[3]].countries.push(row[12]);
    regions[row[3]].countries = _.union(regions[row[3]].countries, [row[12]]);


    //console.log('#'+index+' '+JSON.stringify(row));
  })
  .on('close', function(count){
    // when writing to a file, use the 'close' event
    // the 'end' event may fire before the file has been written
    console.log('Number of lines: '+count);
    
    // _.forEach(regions, function(regionData, regionName) {
    //   regionData.countries = _.uniq(regionData.countries);
    // });
    console.log('Regions: ' + JSON.stringify(regions, null, 2));
  })
  .on('error', function(error){
    console.log(error.message);
  });

};
