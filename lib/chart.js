/*
 * globalmigration
 * https://github.com/null2/globalmigration
 *
 * Copyright (c) 2013 null2 GmbH Berlin
 * Licensed under the MIT license.
 */

// Initialize diagram
(function(scope) {
  var π = Math.PI;

  scope.chart = function(data, config) {
    data = data || { regions: [], names: [], matrix: [] };

    config = config || {};
    config.element = config.element || 'body';
    config.info = config.info || 'body';

    config.now = config.now || Object.keys(data.matrix)[0];

    // geometry
    config.width = config.width || 1100;
    config.height = config.height || 1100;
    config.margin = config.margin || 75;
    config.outerRadius = config.outerRadius || (Math.min(config.width, config.height) / 2 - config.margin);
    config.arcWidth = config.arcWidth || 24;
    config.innerRadius = config.innerRadius || (config.outerRadius - config.arcWidth);
    config.arcPadding = config.arcPadding || 0.005;
    config.sourcePadding = config.sourcePadding || 3;
    config.targetPadding = config.targetPadding || 20;
    config.labelPadding = config.labelPadding || 10;
    config.labelRadius = config.labelRadius || (config.outerRadius + config.labelPadding);

    // animation
    var aLittleBit = Math.PI / 100000;
    config.animationDuration = config.animationDuration || 1000;
    config.initialAngle = config.initialAngle || {};
    config.initialAngle.arc = config.initialAngle.arc || { startAngle: 0, endAngle: aLittleBit };
    config.initialAngle.chord = config.initialAngle.chord || { source: config.initialAngle.arc, target: config.initialAngle.arc };

    // layout
    config.layout = config.layout || {};
    config.layout.sortSubgroups = config.layout.sortSubgroups || d3.descending;
    config.layout.sortChords = config.layout.sortChords || d3.descending;
    config.layout.threshold = config.layout.threshold || 1000;
    config.layout.labelThreshold = config.layout.labelThreshold || 100000;

    // disabled by now because of transitions between years
    // config.layout.threshold = null;
    // config.layout.threshold = 100;
    // config.layout.threshold = 0;

    config.maxRegionsOpen = config.maxRegionsOpen || 2;

    var colors = d3.scale.category10().domain(data.regions);
    if (config.layout.colors) {
      colors.range(config.layout.colors);
    }

    function arcColor(d) {
      if (d.region === d.id) {
        return colors(d.region);
      }
      var hsl = d3.hsl(colors(d.region));
      var r = [hsl.darker(1), hsl, hsl.brighter(1)];
      return r[(d.id - d.region) % 3];
    }

    function chordColor(d) {
      return arcColor(d.source);
    }

    // state before animation
    var previous = {
      countries: []
    };

    // calculate label position
    function labelPosition(angle) {
      return {
        x: Math.cos(angle - π / 2) * config.labelRadius,
        y: Math.sin(angle - π / 2) * config.labelRadius,
        r: (angle - π / 2) * 180 / π
      };
    }

    // chord info
    // eg: West Asia → Pacific: 46
    function chordInfo(d) {
      return data.names[d.source.id] + ' → ' + data.names[d.target.id] + ': ' + Math.round(d.source.value / 1000);
    }

    // group info
    // eg: West Africa: Total inflow 46, Total outflow 2
    function groupInfo(d) {
      return data.names[d.id] + ': ' + Math.round(d.value / 1000);
    }

    // arc generator
    var arc = d3.svg.arc()
        .innerRadius(config.innerRadius)
        .outerRadius(config.outerRadius);

    // chord diagram
    var layout = Globalmigration.layout()
        .padding(config.arcPadding)
        .threshold(config.layout.threshold)
        .data(data)
        .year(config.now);

    if (config.layout.sortGroups) {
      layout.sortGroups(config.layout.sortGroups);
    }
    if (config.layout.sortSubgroups) {
      layout.sortSubgroups(config.layout.sortSubgroups);
    }
    if (config.layout.sortChors) {
      layout.sortChors(config.layout.sortChords);
    }

    // chord path generator
    var chordGenerator = Globalmigration.chord()
        .radius(config.innerRadius)
        .sourcePadding(config.sourcePadding)
        .targetPadding(config.targetPadding);

    // svg element
    var svg = d3.select(config.element).append("svg")
        .attr('preserveAspectRatio', 'xMinYMin')
        .attr('viewBox', '0 0 ' + config.width + ' ' + config.height)
        .attr("width", config.width)
        .attr("height", config.height);
    var element = svg.append("g")
        .attr("id", "circle")
        .attr("transform", "translate(" + config.width / 2 + "," + config.height / 2 + ")");

    // needed for fade mouseover
    element.append("circle").attr("r", config.outerRadius);

    var info = d3.select(config.info);

    function rememberTheGroups() {
      previous.groups = layout.groups().reduce(function(sum, d) {
        sum[d.id] = d;
        return sum;
      }, {});
    }
    function rememberTheChords() {
      previous.chords = layout.chords().reduce(function(sum, d) {
        sum[d.source.id] = sum[d.source.id] || {};
        sum[d.source.id][d.target.id] = d
        return sum;
      }, {});
    }

    function getCountryRange(d) {
      var end = data.regions[data.regions.indexOf(d.id) + 1];

      return {
        start: d.id + 1,
        end: end ? end - 1 : data.names.length - 1
      };
    }

    // Transition countries to region:
    // Use first country's start angle and last countries end angle. 
    function meltPreviousGroupArc(d) {
      if (d.id !== d.region) {
        return;
      }

      var range = getCountryRange(d);
      var start = previous.groups[range.start];
      var end = previous.groups[range.end];

      if (!start || !end) {
        return;
      }

      return {
        angle: start.startAngle + (end.endAngle - start.startAngle) / 2,
        startAngle: start.startAngle,
        endAngle: end.endAngle
      };
    }

    // Used to set the startpoint for
    // countries -> region
    // transition, that is closing a region.
    function meltPreviousChord(d) {
      if (d.source.id !== d.source.region) {
        return;
      }
      
      var c = {
        source: {},
        target: {}
      };

      Object.keys(previous.chords).forEach(function(sourceId) {
        Object.keys(previous.chords[sourceId]).forEach(function(targetId) {
          var chord = previous.chords[sourceId][targetId];

          if (chord.source.region === d.source.id) {
            if (!c.source.startAngle || chord.source.startAngle < c.source.startAngle) {
              c.source.startAngle = chord.source.startAngle;
            }
            if (!c.source.endAngle || chord.source.endAngle > c.source.endAngle) {
              c.source.endAngle = chord.source.endAngle;
            }
          }
          
          if (chord.target.region === d.target.id) {
            if (!c.target.startAngle || chord.target.startAngle < c.target.startAngle) {
              c.target.startAngle = chord.target.startAngle;
            }
            if (!c.target.endAngle || chord.target.endAngle > c.target.endAngle) {
              c.target.endAngle = chord.target.endAngle;
            }
          }
        });
      });
      
      c.source.startAngle = c.source.startAngle || 0;
      c.source.endAngle = c.source.endAngle || aLittleBit;
      c.target.startAngle = c.target.startAngle || 0;
      c.target.endAngle = c.target.endAngle || aLittleBit;

      // transition from start
      c.source.endAngle = c.source.startAngle + aLittleBit;
      c.target.endAngle = c.target.startAngle + aLittleBit;

      return c;
    }


    // finally draw the diagram
    function draw(year, countries) {
      year = year || Object.keys(data.matrix)[0];
      countries = countries || previous.countries;
      previous.countries = countries;

      rememberTheGroups();
      rememberTheChords();

      layout
        .year(year)
        .countries(countries);

      // groups
      var group = element.selectAll(".group")
        .data(layout.groups, function(d) { return d.id; });
      group.enter()
        .append("g")
        .attr("class", "group");
      group
        .classed('region', function(d) {
          return d.id === d.region;
        })
        .on("mouseover", function(d) {
          chord.classed("fade", function(p) {
            return p.source.id !== d.id && p.target.id !== d.id;
          });
          
          info.text(groupInfo(d));
        });
      group.exit().remove();
      
      // mouseover title on groups
      var title = group.selectAll('title').data(function(d) { return [d]; });
      title.enter().append('title');
      title.text(groupInfo);
      title.exit().remove();

      // group arc
      var groupPath = group.selectAll('.group-arc')
        .data(function(d) { return [d]; });
      groupPath.enter()
        .append('path')
        .attr("class", "group-arc")
        .attr("id", function(d, i, k) { return "group" + k; });
      groupPath
        .style("fill", arcColor)
        .transition()
        .duration(config.animationDuration)
        .attr("d", arc)
        .attrTween("d", function(d) {
          var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d);
          return function (t) { return arc(i(t)); };
        });
      groupPath.exit().remove();

      // open regions
      groupPath
        .filter(function(d) {
          return d.id === d.region;
        })
        .on('click', function(d) {
          if (countries.length + 1 > config.maxRegionsOpen) {
            countries.shift();
          }
          draw(year, countries.concat(d.id));
        });

      // close regions
      groupPath
        .filter(function(d) {
          return d.id !== d.region;
        })
        .on('click', function(d) {
          countries.splice(countries.indexOf(d.region), 1);
          draw(year, countries);
        });

      
      // text label group
      var groupTextGroup = group.selectAll('.label')
        .data(function(d) { return [d]; });
      groupTextGroup.enter()
        .append("g")
        .attr('class', 'label')
        .on('mouseover', function(d) {
          info.text(groupInfo(d));
        });
      groupTextGroup
        .transition()
        .duration(config.animationDuration)
        .attr('transform', function(d) {
          var t = labelPosition(d.angle);

          return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
        })
        .attrTween("transform", function(d) {
          var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || { angle: 0 }, d);
          return function (t) {
            var t = labelPosition(i(t).angle);
            return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
          };
        });
      groupTextGroup.exit()
        .transition()
        .duration(config.animationDuration)
        .attrTween("transform", function(d) {
          console.log('wooo');
          var i = d3.interpolate(d, { angle: 0 });
          return function (t) {
            var t = labelPosition(i(t).angle);
            return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
          };
        })
        .each('end', function() {
          d3.select(this).remove();
        });

      // labels
      var groupText = groupTextGroup.selectAll('text')
        .data(function(d) { return [d]; });
      groupText.enter()
        .append("text");
      groupText
        .text(function(d) { return data.names[d.id]; })
        .attr('transform', function(d) {
          if (d.id === d.region) {
            return 'rotate(90)';
          } else {
            return d.angle > Math.PI ? 'rotate(180)' : null;
          }
        })
        .attr('text-anchor', function(d) {
          return d.id === d.region ?
            'middle' :
            (d.angle > Math.PI ? 'end' : 'start');
        })
        .style('fill', function(d) {
          return d.id === d.region ? arcColor(d) : null;
        })
        .classed('fade', function(d) {
          // hide labels for countries with small migrations (less than config.layout.labelThreshold)
          return d.value < config.layout.labelThreshold;
        });
      groupText.exit().remove();


      // chords
      var chord = element.selectAll(".chord")
          .data(layout.chords, function(d) { return d.id; });
      chord.enter()
        .append("path")
        .attr("class", "chord")
        .on('mouseover', function(d) {
          info.text(chordInfo(d));
        });
      chord
        .style("fill", chordColor)
        .transition()
        .duration(config.animationDuration)
        .attr("d", chordGenerator)
        .attrTween("d", function(d) {
          var p = previous.chords[d.source.id] && previous.chords[d.source.id][d.target.id];
          p = p || (previous.chords[d.source.region] && previous.chords[d.source.region][d.target.region]);
          p = p || meltPreviousChord(d);
          p = p || config.initialAngle.chord;
          var i = d3.interpolate(p, d);
          return function (t) {
            return chordGenerator(i(t));
          };
        });
      chord.exit()
        .transition()
        .duration(config.animationDuration)
        .attrTween("d", function(d) {
          var i = d3.interpolate(d, {
            source: {
              startAngle: d.source.endAngle - aLittleBit,
              endAngle: d.source.endAngle
            },
            target: {
              startAngle: d.target.endAngle - aLittleBit,
              endAngle: d.target.endAngle
            }
          });
          return function (t) {
            return chordGenerator(i(t));
          };
        })
        .each('end', function() {
          d3.select(this).remove();
        });

      // mouseover title on chords
      var chordTitle = chord.selectAll('title').data(function(d) { return [d]; });
      chordTitle.enter().append('title');
      chordTitle.text(chordInfo);
      chordTitle.exit().remove();
    }

    return {
      draw: draw,
      data: data
    };
  };
})(window.Globalmigration || (window.Globalmigration = {}));
