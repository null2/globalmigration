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
    config.layout.threshold = 100;
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

      // var l = [(hsl.l - 0.4) < 0.2 ? 0.2 : hsl.l, hsl.l, Math.max(hsl.l + 0.4, 0.8)];
      // console.log(l, d.id - d.region, (d.id - d.region) % 3);
      // var l = d3.scale.ordinal().range([(hsl.l - 0.4) < 0.2 ? 0.2 : hsl.l, hsl.l, Math.max(hsl.l + 0.4, 0.8)]);
      // return d3.hsl(hsl.h, hsl.s, l(d.id - d.region)).toString();
    }

    function chordColor(d) {
      return arcColor(d.source);
      // var hsl = d3.hsl(arcColor(d.source));
      // var l = d3.scale.linear().domain([0, layout.groups().length]).range([Math.min(hsl.l - 0.2, 0.3), Math.max(hsl.l + 0.2, 0.5)]);
      // return d3.hsl(hsl.h, hsl.s, l(d.target.index)).toString();
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

    // get number of countries per region
    function regionSize(region) {
      var idx = data.regions.indexOf(region);
      return (data.regions[idx + 1] || data.names.length) - region;
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

    function meltPreviousGroupArc(d) {
      if (d.id !== d.region) {
        return;
      }
      var start = previous.groups[data.regions[d.id] + 1];
      var end = previous.groups[data.regions[d.id + 1] - 1];

      if (!start || !end) {
        return;
      }

      return {
        angle: start.startAngle + (end.endAngle - start.startAngle) / 2,
        startAngle: start.startAngle,
        endAngle: end.endAngle
      };
    }

    function meltPreviousChord(d) {
      if (d.source.id !== d.source.region) {
        return;
      }
      
      var prev = previous.chords[d.source.region];

      // TODO...
      
      if (!prev) {
        return;
      }

      var start = d3.min(Object.keys(prev), function(key) { return prev[key].source.startAngle });
      var end = d3.max(Object.keys(prev), function(key) { return prev[key].source.endAngle });

      if (!start || !end) {
        return;
      }

      return {
        source: {
          startAngle: start,
          endAngle: end
        },
        target: {
          startAngle: 0,
          endAngle: aLittleBit
        }
      };
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

      // Groups
      var group = element.selectAll(".group")
        .data(layout.groups, function(d) { return d.id; });
      group.enter()
        .append("g")
        .attr("class", "group");
      group
        .on("mouseover", function(d) {
          chord.classed("fade", function(p) {
            return p.source.id !== d.id && p.target.id !== d.id;
          });
          
          var p = info.selectAll('.info').data([d]);
          p.enter().append('p').attr('class', 'info');
          p.exit().remove();
          p.text(function(h) { 
            return data.names[h.id];
          });
        });
      group.exit().remove();
      
      // Regions
      group
        .filter(function(d) {
          return d.id === d.region;
        })
        .classed('region', true)
        .on('click', function(d) {
          if (countries.length + 1 > config.maxRegionsOpen) {
            countries.shift();
          }
          draw(year, countries.concat(d.id));
        });

      // countries
      group
        .filter(function(d) {
          return d.id !== d.region;
        })
        .on('click', function(d) {
          countries.splice(countries.indexOf(d.region), 1);
          draw(year, countries);
        });

      // Mouseover title on arcs
      var title = group.selectAll('title')
        .data(function(d) { return d.id; });
      title.enter()
        .append('title');
      title
        .text(function(d) { return d; });
      title.exit().remove();

      // Group arc
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
      
      // Text label group
      var groupTextGroup = group.selectAll('.label')
        .data(function(d) { return [d]; });
      groupTextGroup.enter()
        .append("g")
        .attr('class', 'label')
        .on('mouseover', function(d) {
          var p = info.selectAll('.info').data([d]);
          p.enter().append('p').attr('class', 'info');
          p.exit().remove();
          p.text(function(h) { 
            return data.names[h.id] + ': ' + Math.round(h.value);
          });
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
      groupTextGroup.exit().remove();

      // Text label
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


      // Chords
      var chord = element.selectAll(".chord")
          .data(layout.chords, function(d) { return d.id; });
      chord.enter()
        .append("path")
        .attr("class", "chord")
        .on('mouseover', function(d) {
          var p = info.selectAll('.info').data([d]);
          p.enter().append('p').attr('class', 'info');
          p.exit().remove();
          p.text(function(h) { 
            return data.names[h.source.id] + ' → ' + data.names[h.target.id] + ': ' + h.source.value;
          });
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
      chord.exit().remove();

      // Mouseover title on chords
      var chordTitle = chord.selectAll('title')
        .data(function(d) { return [d]; });
      chordTitle.enter().append('title');
      chordTitle
        .text(function(d) { return data.names[d.source.id]; });
      chordTitle.exit().remove();
    }
      
    // var duration = config.animationDuration;
    // config.animationDuration = 0;
    // setTimeout(function() {
    //   config.animationDuration = duration;
    // }, 100);

    return {
      draw: draw,
      data: data
    };
  };
})(window.Globalmigration || (window.Globalmigration = {}));
