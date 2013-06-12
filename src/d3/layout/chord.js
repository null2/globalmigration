// null2 patch:
// 


// import "../arrays/range";
// import "../math/trigonometry";
var π = Math.PI;

d3.layout.chord = function() {
  var chord = {},
      chords,
      groups,
      matrix,
      n,
      padding = 0,
      sortGroups,
      sortSubgroups,
      sortChords;

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

    chords = [];
    groups = [];

    // Compute the sum.
    k = 0, i = -1; while (++i < n) {
      x = 0, j = -1; while (++j < n) {
        x += matrix[i][j];
        x += matrix[j][i];
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
          return sortSubgroups(matrix[i][a], matrix[i][b]);
        });
        d.target.sort(function(a, b) {
          return sortSubgroups(matrix[a][i], matrix[b][i]);
        });
      });
    }

    // Convert the sum to scaling factor for [0, 2pi].
    // TODO Allow start and end angle to be specified.
    // TODO Allow padding to be specified as percentage?
    k = (2 * π - padding * n) / k;

    //          Asia     Africa   Europe
    //        + -------------------------
    // Asia   | 5661442  30498    302427
    // Africa | 9547     7341354  962816
    // Europe | 31392    554466   3625105

    // Compute the start and end angle for each group and subgroup.
    // Note: Opera has a bug reordering object literal properties!
    x = 0, i = -1; while (++i < n) {
      var di = groupIndex[i];
      // sources
      x0 = x, j = -1; while (++j < n) {
        var dj = subgroupIndex[di].source[j],
            v = matrix[di][dj],
            a0 = x,
            d = v * k;
        x += d;
        subgroups['source' + '-' + di + "-" + dj] = {
          index: di,
          subindex: dj,
          startAngle: a0,
          dAngle: v * k,
          value: v
        };
      }
      var lastX0 = x0;
      // targets
      x0 = x, j = -1; while (++j < n) {
        var dj = subgroupIndex[di].target[j],
            v = matrix[dj][di],
            a0 = x,
            d = v * k;
        x += d;
        subgroups['target' + '-' + di + "-" + dj] = {
          index: di,
          subindex: dj,
          startAngle: a0,
          dAngle: v * k,
          value: v
        };
      }
      
      groups[di] = {
        index: di,
        startAngle: lastX0,
        endAngle: x,
        value: (x - lastX0) / k
      };
      x += padding;
    }

    // Generate chords for each (non-empty) subgroup-subgroup link.
    i = -1; while (++i < n) {
      j = i - 1; while (++j < n) {
        var source = subgroups['source' + '-' + i + "-" + j],
            target = subgroups['target' + '-' + j + "-" + i];
        if (source.value || target.value) {
          if (i === j) {
            if (source.dAngle) {
              var target = subgroups['target' + '-' + i + "-" + j];
              chords.push({
                source: {
                  index: source.index,
                  subindex: source.subindex,
                  startAngle: source.startAngle,
                  endAngle: source.startAngle + source.dAngle,
                  value: source.sourceV
                },
                target: {
                  index: target.index,
                  subindex: target.subindex,
                  startAngle: target.startAngle,
                  endAngle: target.startAngle + target.dAngle,
                  value: target.sourceV
                }
              });
            }
          } else {
            chords.push({
              source: {
                index: source.index,
                subindex: source.subindex,
                startAngle: source.startAngle,
                endAngle: source.startAngle + source.dAngle,
                value: source.sourceV
              },
              target: {
                index: target.index,
                subindex: target.subindex,
                startAngle: target.startAngle,
                endAngle: target.startAngle + target.dAngle,
                value: target.sourceV
              }
            });
            var source = subgroups['source' + '-' + j + "-" + i],
                target = subgroups['target' + '-' + i + "-" + j];
            chords.push({
              source: {
                index: source.index,
                subindex: source.subindex,
                startAngle: source.startAngle,
                endAngle: source.startAngle + source.dAngle,
                value: source.sourceV
              },
              target: {
                index: target.index,
                subindex: target.subindex,
                startAngle: target.startAngle,
                endAngle: target.startAngle + target.dAngle,
                value: target.sourceV
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
      return sortChords(
          a.source.value,
          b.source.value);
    });
  }

  chord.matrix = function(x) {
    if (!arguments.length) return matrix;
    n = (matrix = x) && matrix.length;
    chords = groups = null;
    return chord;
  };

  chord.padding = function(x) {
    if (!arguments.length) return padding;
    padding = x;
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

  return chord;
};
