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

  scope.diagram = function(data, config) {
    data = data || { regions: [], names: [], matrix: [] };

    config = config || {};
    config.element = config.element || 'body';

    // geometry
    config.width = config.width || 960;
    config.height = config.height || 960;
    config.margin = config.margin || 125;
    config.outerRadius = config.outerRadius || (Math.min(config.width, config.height) / 2 - config.margin);
    config.arcWidth = config.arcWidth || 24;
    config.innerRadius = config.innerRadius || (config.outerRadius - config.arcWidth);
    config.arcPadding = config.arcPadding || 0.01;
    config.sourcePadding = config.sourcePadding || 3;
    config.targetPadding = config.targetPadding || 20;
    config.labelPadding = config.labelPadding || 10;
    config.labelRadius = config.labelRadius || (config.outerRadius + config.labelPadding);

    // animation
    var aLittleBit = Math.PI / 100000;
    config.animationDuration = config.animationDuration || 1000;
    config.initialAngle = config.initialAngle || {};
    config.initialAngle.arc = config.initialAngle.arc || { startAngle: 0, endAngle: aLittleBit };
    config.initialAngle.chord = config.initialAngle.chord || { source: config.initialAngle.arc, target: config.initialAngle.arc }

    // layout
    config.layout = config.layout || {};
    config.layout.sortSubgroups = config.layout.sortSubgroups || d3.descending;
    config.layout.sortChords = config.layout.sortChords || d3.descending;
    config.layout.threshold = config.layout.threshold || 1000;
    config.layout.labelThreshold = config.layout.labelThreshold || 200000;

    config.maxRegionsOpen = config.maxRegionsOpen || 2;

    // state before animation
    var previous = {
      groups: {},
      labels: {},
      chords: {},
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

    var colors = d3.scale.category10().domain(data.regions);

    function arcColor(d) {
      if (d.region === d.id) {
        return colors(d.region);
      }
      var hsl = d3.hsl(colors(d.region));
      var l = d3.scale.linear().domain([0, regionSize(d.region)]).range([Math.min(hsl.l - 0.4, 0.2), Math.max(hsl.l + 0.4, 0.8)]);
      return d3.hsl(hsl.h, hsl.s, l(d.id - d.region)).toString();
    }

    function chordColor(d) {
      var hsl = d3.hsl(arcColor(d.source));
      var l = d3.scale.linear().domain([0, layout.groups().length]).range([Math.min(hsl.l - 0.2, 0.3), Math.max(hsl.l + 0.2, 0.5)]);
      return d3.hsl(hsl.h, hsl.s, l(d.target.index)).toString();
    }
      

    // arc generator
    var arc = d3.svg.arc()
        .innerRadius(config.innerRadius)
        .outerRadius(config.outerRadius);

    // chord diagram
    var layout = Globalmigration.layout()
        .padding(config.arcPadding)
        .sortSubgroups(config.layout.sortSubgroups)
        .sortChords(config.layout.sortChords)
        .threshold(config.layout.threshold)
        .data(data);

    // chord path generator
    var chordGenerator = Globalmigration.chord()
        .radius(config.innerRadius)
        .sourcePadding(config.sourcePadding)
        .targetPadding(config.targetPadding);

    // svg element
    var svg = d3.select(config.element).append("svg")
        .attr("width", config.width)
        .attr("height", config.height);
    var element = svg.append("g")
        .attr("id", "circle")
        .attr("transform", "translate(" + config.width / 2 + "," + config.height / 2 + ")");


    // finally draw the diagram
    function draw(year, countries) {
      year = year || Object.keys(data.matrix)[0];
      countries = countries || previous.countries;
      previous.countries = countries;

      layout
        .year(year)
        .countries(countries);

      var group = element.selectAll(".group")
        .data(layout.groups, function(d) { return d.id; });
      group.enter()
        .append("g")
        .attr("class", "group");
      group
        .on("mouseover", function(d, i) {
          chord.classed("fade", function(p) {
            return p.source.index !== i && p.target.index !== i;
          });
        });
      group.exit().remove();
      
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

      // Add a mouseover title to arcs.
      var title = group.selectAll('title')
        .data(function(d) { return d.id; });
      title.enter()
        .append('title');
      title
        .text(function(d) { return d; });
      title.exit().remove();

      // Add the group arc.
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
        .each('end', function(d) {
          previous.groups[d.region] = d;
        })
        .attrTween("d", function(d) {
          var i = d3.interpolate(previous.groups[d.region] || config.initialAngle.arc, d);
          return function (t) { return arc(i(t)); };
        });
      groupPath.exit().remove();
      
      // Add a text label group
      var groupTextGroup = group.selectAll('.label')
        .data(function(d) { return [d]; });
      groupTextGroup.enter()
        .append("g")
        .attr('class', 'label');
      groupTextGroup
        .transition()
        .duration(config.animationDuration)
        .attr('transform', function(d) {
          var t = labelPosition(d.angle);
          return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
        })
        .each('end', function(d) {
          previous.labels[d.id] = d.angle;
        })
        .attrTween("transform", function(d) {
          var i = d3.interpolate(previous.labels[d.id] || previous.labels[d.region] || 0, d.angle);
          return function (t) {
            var t = labelPosition(i(t));
            return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
          };
        });
      groupTextGroup.exit().remove();

      // Add a text label.
      var groupText = groupTextGroup.selectAll('text')
        .data(function(d) { return [d]; });
      groupText.enter()
        .append("text");
      groupText
        .text(function(d) { return data.names[d.id]; })
        .attr('transform', function(d) {
          return d.angle > Math.PI ? 'rotate(180)' : null;
        })
        .attr('text-anchor', function(d) {
          return d.angle > Math.PI ? 'end' : 'start';
        })
        .style('fill', function(d) {
          return d.id === d.region ? arcColor(d) : 'black';
        })
        .style('opacity', function(d) {
          // hide labels for countries with small migrations (less than config.layout.labelThreshold)
          return d.value < config.layout.labelThreshold ? 0 : 1;
        });
      groupText.exit().remove();


      // Add the chords.
      var chord = element.selectAll(".chord")
          .data(layout.chords, function(d) { return d.id; });
      chord.enter()
        .append("path")
        .attr("class", "chord");
      chord
        .style("fill", chordColor)
        .transition()
        .duration(config.animationDuration)
        .attr("d", chordGenerator)
        .each('end', function(d) {
          previous.chords[d.source.id] = previous.chords[d.source.id] || {};
          previous.chords[d.source.id][d.target.id] = d;
        })
        .attrTween("d", function(d) {
          var p = previous.chords[d.source.id] && previous.chords[d.source.id][d.target.id];
          p = p || (previous.chords[d.source.region] && previous.chords[d.source.region][d.target.region]);
          var i = d3.interpolate(p || config.initialAngle.chord, d);
          return function (t) {
            return chordGenerator(i(t));
          };
        });
      chord.exit().remove();

      // Add a mouseover title to chords.
      var chordTitle = chord.selectAll('title')
        .data(function(d) { return [d]; });
      chordTitle.enter().append('title');
      chordTitle
        .text(function(d) { return data.names[d.source.id]; });
      chordTitle.exit().remove();
    }

    return {
      draw: draw,
      data: data
    };
  };
})(window.Globalmigration || (window.Globalmigration = {}));
