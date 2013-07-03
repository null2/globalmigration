'use strict';

var countrymerge = require('../lib/countrymerge.js').countrymerge;

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports.countrymerge = {
  'no country': function(test) {
    test.expect(1);
    var regions = [0,2,4];
    test.deepEqual(countrymerge({ regions: regions }, []), regions, 'should return regions');
    test.done();
  },

  'first country': function(test) {
    test.expect(1);
    var regions = [0,2,4];
    var names = [0,1,2,3,4,5];
    test.deepEqual(countrymerge({ regions: regions, names: names }, [0]), [1,2,4], 'should open first region');
    test.done();
  },
  'second country': function(test) {
    test.expect(1);
    var regions = [0,2,4];
    var names = [0,1,2,3,4,5];
    test.deepEqual(countrymerge({ regions: regions, names: names }, [2]), [0,3,4], 'should open second region');
    test.done();
  },
  'third country': function(test) {
    test.expect(1);
    var regions = [0,2,4];
    var names = [0,1,2,3,4,5];
    test.deepEqual(countrymerge({ regions: regions, names: names }, [4]), [0,2,5], 'should open third region');
    test.done();
  },

  'two countries': function(test) {
    test.expect(1);
    var regions = [0,2,4];
    var names = [0,1,2,3,4,5];
    test.deepEqual(countrymerge({ regions: regions, names: names }, [0,2]), [1,3,4], 'should return regions');
    test.done();
  }
};
