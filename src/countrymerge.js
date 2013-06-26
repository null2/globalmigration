/*
 * globalmigration
 * https://github.com/null2/globalmigration
 *
 * Copyright (c) 2013 null2 GmbH Berlin
 * Licensed under the MIT license.
 */

// Merge country indices. Seperated for testing purpose.
(function(scope) {
  scope.countrymerge = function(data, countries) {
    return data.regions.reduce(function(memo, region, i) {
      if (countries.indexOf(region) === -1) {
        memo.push(region);
      } else {
        var idx = d3.range(region + 1, data.regions[region + 1] || data.names.length);
        idx.forEach(function(c) {
          memo.push(c);
        });
      }

      return memo;
    }, []);
  };
})(window.Globalmigration || (window.Globalmigration = {}));
