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
    config.margin = config.margin || 100;
    config.outerRadius = config.outerRadius || (Math.min(config.width, config.height) / 2 - config.margin);
    config.arcWidth = config.arcWidth || 24;
    config.innerRadius = config.innerRadius || (config.outerRadius - config.arcWidth);
    config.arcPadding = config.arcPadding || 0.01;
    config.sourcePadding = config.sourcePadding || 3;
    config.targetPadding = config.targetPadding || 20;
    config.labelPadding = config.labelPadding || 10;
    config.labelRadius = config.labelRadius || (config.outerRadius + config.labelPadding);

    // animation
    config.animationDuration = config.animationDuration || 1000;
    config.initialAngle = config.initialAngle || {};
    config.initialAngle.arc = config.initialAngle.arc || { startAngle: 0, endAngle: 0 };
    config.initialAngle.chord = config.initialAngle.chord || { source: config.initialAngle.arc, target: config.initialAngle.arc }

    // layout
    config.layout = config.layout || {};
    config.layout.sortSubgroups = config.layout.sortSubgroups || d3.descending;
    config.layout.sortChords = config.layout.sortChords || d3.descending;

    config.maxRegionsOpen = 2;

    // state before animation
    var previous = {
      groups: {},
      labels: {},
      chords: {}
    };


    // calculate label position
    function labelPosition(angle) {
      return {
        x: Math.cos(angle - π / 2) * config.labelRadius,
        y: Math.sin(angle - π / 2) * config.labelRadius,
        r: (angle - π / 2) * 180 / π
      };
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

    // TODO: still needed?
    element.append("circle").attr("r", config.outerRadius);

    function draw(year, countries) {
      year = year || Object.keys(data.matrix)[0];
      countries = countries || [];

      layout
        .year(year)
        .countries(countries);

      var colors = d3.scale.category10().domain(data.regions);
      
      // Add a group per neighborhood.
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
        })
        .on('click', function(d) {
          if (countries.length + 1 > config.maxRegionsOpen) {
            countries.shift();
          }
          draw(year, countries.concat(d.id));
        });
      group.exit().remove();

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
        .style("fill", function(d) {
          return colors(d.region);
        })
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
        });
      groupText.exit().remove();

      // Remove the labels that don't fit. :(
      // groupText
      //   .filter(function(d) {
      //     return d3.select('#group' + d.index).node().getTotalLength() / 2 - 25 < this.getComputedTextLength();
      //   })
      //   .remove();

      // Add the chords.
      var chord = element.selectAll(".chord")
          .data(layout.chords, function(d) { return d.id; });
      chord.enter()
        .append("path")
        .attr("class", "chord");
      chord
        .style("fill", function(d, i) {
          var hsl = d3.hsl(colors(d.source.region));

          // TODO: fixme and make me configurable
          var l = d3.scale.linear().domain([0, layout.groups().length]).range([Math.min(hsl.l - 0.2, 0.3), Math.max(hsl.l + 0.2, 0.5)]);

          return d3.hsl(hsl.h, hsl.s, l(d.target.index)).toString();
        })
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
        .text(function(d) { return data.names[d.source.index]; });
      chordTitle.exit().remove();
    }

    return {
      draw: draw,
      data: data
    };
  };
})(window.Globalmigration || (window.Globalmigration = {}));
