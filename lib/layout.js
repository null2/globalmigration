/*
 * globalmigration
 * https://github.com/null2/globalmigration
 *
 * Copyright (c) 2013 null2 GmbH Berlin
 * Licensed under the MIT license.
 */

// Basically a d3.layout.chord, but with
// Depends on countrymerge.js
(function(scope) {
  // from d3/layout/chord.js

  // import "../arrays/range";
  // import "../math/trigonometry";
  var π = Math.PI,
      radians = π / 180,
      degrees = 180 / π;

  scope.layout = function() {
    var chord = {},
        chords,
        groups,
        data,
        matrix,
        indices,
        countries,
        year,
        n,
        padding = 0,
        threshold = null,
        sortGroups,
        sortSubgroups,
        sortChords,
        alpha;

    // get region from country index
    function region(index) {
      var r = 0;
      for (var i = 0; i < data.regions.length; i++) {
        if (data.regions[i] > index) {
          break;
        }
        r = i;
      }
      return data.regions[r];
    }

    function relayout() {
      var subgroups = {},
          groupSums = [],
          groupIndex = d3.range(n),
          subgroupIndex = [],
          k,
          x,
          x0,
          i,
          j;

      data = data || { matrix: {}, names: [], regions: []};
      year = year || Object.keys(data.matrix)[0];
      matrix = year && data.matrix[year] || [];

      chords = [];
      groups = [];

      // Compute the sum.
      k = 0, i = -1; while (++i < n) {
        x = 0, j = -1; while (++j < n) {
          x += matrix[indices[i]][indices[j]];
          x += matrix[indices[j]][indices[i]];
          // if (x === 0) {
          //   x = 1;
          // }
        }
        groupSums.push(x);
        subgroupIndex.push({source: d3.range(n), target: d3.range(n)});
        k += x;
      }

      // Sort groups…
      if (sortGroups) {
        groupIndex.sort(function(a, b) {
          return sortGroups(groupSums[a], groupSums[b]);
        });
      }

      // Sort subgroups…
      if (sortSubgroups) {
        subgroupIndex.forEach(function(d, i) {
          d.source.sort(function(a, b) {
            return sortSubgroups(matrix[indices[i]][indices[a]], matrix[indices[i]][indices[b]]);
          });
          d.target.sort(function(a, b) {
            return sortSubgroups(matrix[indices[a]][indices[i]], matrix[indices[b]][indices[i]]);
          });
        });
      }

      // TODO: substract padding from chords, instead of adding it to chrord sum
      // padding = 0;

      // Convert the sum to scaling factor for [0, 2pi].
      // TODO Allow start and end angle to be specified.
      // TODO Allow padding to be specified as percentage?
      k = (2 * π - padding * n) / k;

      // Compute the start and end angle for each group and subgroup.
      // Note: Opera has a bug reordering object literal properties!
      x = chord.alpha(), i = -1; while (++i < n) {
        var inflow = 0;
        var outflow = 0;

        var di = groupIndex[i];
        // targets
        x0 = x, j = -1; while (++j < n) {
          var dj = subgroupIndex[di].target[j],
              v = matrix[indices[dj]][indices[di]],
              a0 = x,
              d = v * k;
          x += d;
          subgroups['target' + '-' + di + "-" + dj] = {
            originalIndex: indices[dj],
            index: di,
            subindex: dj,
            startAngle: a0,
            dAngle: v * k,
            value: v
          };
          inflow += v;
        }
        var lastX0 = x0;
        // sources
        x0 = x, j = -1; while (++j < n) {
          var dj = subgroupIndex[di].source[j],
              v = matrix[indices[di]][indices[dj]],
              a0 = x,
              d = v * k;
          x += d;
          subgroups['source' + '-' + di + "-" + dj] = {
            originalIndex: indices[di],
            index: di,
            subindex: dj,
            startAngle: a0,
            dAngle: v * k,
            value: v
          };
          outflow += v;
        }
        
        groups[di] = {
          id: indices[di],
          region: region(indices[di]),
          index: di,
          startAngle: lastX0,
          endAngle: x,
          angle: lastX0 + (x - lastX0) / 2,
          inflow: inflow,
          outflow: outflow,
          value: Math.round((x - lastX0) / k)
        };
        x += padding;
      }

      // Generate chords for each (non-empty) subgroup-subgroup link.
      i = -1; while (++i < n) {
        j = i - 1; while (++j < n) {
          var source = subgroups['source' + '-' + i + "-" + j],
              target = subgroups['target' + '-' + j + "-" + i];
          if (i === j) {
            if (threshold === null || source.value > threshold) {
              var target = subgroups['target' + '-' + i + "-" + j];
              chords.push({
                id: 'source-' + indices[i] + "-" + indices[j],
                source: {
                  id: indices[source.index],
                  region: region(indices[source.index]),
                  index: source.index,
                  subindex: source.subindex,
                  startAngle: source.startAngle,
                  endAngle: source.startAngle + source.dAngle,
                  value: source.value
                },
                target: {
                  id: indices[target.index],
                  region: region(indices[target.index]),
                  index: target.index,
                  subindex: target.subindex,
                  startAngle: target.startAngle,
                  endAngle: target.startAngle + target.dAngle,
                  value: target.value
                }
              });
            }
          } else {
            if (threshold === null || source.value > threshold) {
              chords.push({
                id: 'source-' + indices[i] + "-" + indices[j],
                source: {
                  id: indices[source.index],
                  region: region(indices[source.index]),
                  index: source.index,
                  subindex: source.subindex,
                  startAngle: source.startAngle,
                  endAngle: source.startAngle + source.dAngle,
                  value: source.value
                },
                target: {
                  id: indices[target.index],
                  region: region(indices[target.index]),
                  index: target.index,
                  subindex: target.subindex,
                  startAngle: target.startAngle,
                  endAngle: target.startAngle + target.dAngle,
                  value: target.value
                }
              });
            }
            var source = subgroups['source' + '-' + j + "-" + i],
                target = subgroups['target' + '-' + i + "-" + j];
            if (threshold === null || source.value > threshold) {
              chords.push({
                id: 'target-' + indices[i] + "-" + indices[j],
                source: {
                  id: indices[source.index],
                  region: region(indices[source.index]),
                  index: source.index,
                  subindex: source.subindex,
                  startAngle: source.startAngle,
                  endAngle: source.startAngle + source.dAngle,
                  value: source.value
                },
                target: {
                  id: indices[target.index],
                  region: region(indices[target.index]),
                  index: target.index,
                  subindex: target.subindex,
                  startAngle: target.startAngle,
                  endAngle: target.startAngle + target.dAngle,
                  value: target.value
                }
              });
            }
          }
        }
      }

      if (sortChords) resort();
    }

    function resort() {
      chords.sort(function(a, b) {
        return sortChords(a.source.value, b.source.value);
      });
    }

    chord.data = function(x) {
      if (!arguments.length) return data;
      data = x;
      indices = data.regions.slice();
      n = indices.length;
      chords = groups = null;
      return chord;
    };

    chord.year = function(x) {
      if (!arguments.length) return year;
      year = x;
      chords = groups = null;
      return chord;
    };

    chord.countries = function(x) {
      if (!arguments.length) return countries;
      countries = x;
      indices = scope.countrymerge(data, countries);
      n = indices.length;
      chords = groups = null;
      return chord;
    };

    chord.padding = function(x) {
      if (!arguments.length) return padding;
      padding = x;
      chords = groups = null;
      return chord;
    };

    chord.threshold = function(x) {
      if (!arguments.length) return threshold;
      threshold = x;
      chords = groups = null;
      return chord;
    };

    chord.sortGroups = function(x) {
      if (!arguments.length) return sortGroups;
      sortGroups = x;
      chords = groups = null;
      return chord;
    };

    chord.sortSubgroups = function(x) {
      if (!arguments.length) return sortSubgroups;
      sortSubgroups = x;
      chords = null;
      return chord;
    };

    chord.sortChords = function(x) {
      if (!arguments.length) return sortChords;
      sortChords = x;
      if (chords) resort();
      return chord;
    };

    chord.chords = function() {
      if (!chords) relayout();
      return chords;
    };

    chord.groups = function() {
      if (!groups) relayout();
      return groups;
    };

    // start angle for first region (decimal degrees)
    // (stored internally in radians)
    chord.alpha = function(x) {
      if (!arguments.length) return alpha * degrees;
      alpha = (x === 0) ? 0.00001 : x; // small but not zero
      alpha *= radians;
      alpha = alpha.mod(2*π);
      chords = groups = null;
      return chord;
    };

    // proper modulus (works taking the sign of the divisor not of the dividend)
    Number.prototype.mod = function (n) {
            return ((this % n) + n) % n;
    };

    return chord;
  };
})(window.Globalmigration || (window.Globalmigration = {}));
