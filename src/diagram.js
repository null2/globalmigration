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

    // get region from country index
    function region(index) {
      var r = 0;
      for (var i = 0; i < data.regions.length; i++) {
        if (data.regions[i] > index) {
          break;
        }
        r = i;
      }
      return r;
    }


    // arc generator
    var arc = d3.svg.arc()
        .innerRadius(config.innerRadius)
        .outerRadius(config.outerRadius);

    // chord diagram
    var layout = Globalmigration.layout()
        .padding(config.arcPadding)
        .sortSubgroups(config.layout.sortSubgroups)
        .sortChords(config.layout.sortChords);

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

    function draw(year, indices) {
      year = year || Object.keys(data.matrix)[0];
      indices = indices || data.regions;

      layout.matrix(data.matrix[year]);
      layout.indices(indices);

      // set year
      // layout.year(year);
      
      // show all countries for region ids
      // layout.countries([1,2,3]);

      var countries = indices.map(function(i) { return data.names[i]; });
      var colors = d3.scale.category10().domain([0, data.regions.length - 1]);
      
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
          var a = indices.slice(0, d.index),
              b = d3.range(data.regions[d.index] + 1, data.regions[d.index + 1]),
              c = indices.slice(d.index + 1);

          draw(year, a.concat(b).concat(c));
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
          var r = region(d.id);
          return colors(r);
        })
        .transition()
        .duration(config.animationDuration)
        .attr("d", arc)
        .each('end', function(d) {
          previous.groups[region(d.id)] = d;
        })
        .attrTween("d", function(d) {
          var i = d3.interpolate(previous.groups[region(d.id)] || config.initialAngle.arc, d);
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
          var i = d3.interpolate(previous.labels[d.id] || previous.labels[data.regions[region(d.id)]] || 0, d.angle);
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
        .text(function(d) { return countries[d.index]; })
        .attr('transform', function(d) {
          return d.angle > 1/2 * Math.PI ? 'rotate(180)' : null;
        })
        .attr('text-anchor', function(d) {
          return d.angle > 1/2 * Math.PI ? 'end' : 'start';
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
          var r = region(d.source.id);
          var hsl = d3.hsl(colors(r));

          // TODO: fixme and make me configurable
          var l = d3.scale.linear().domain([0, countries.length]).range([Math.min(hsl.l - 0.2, 0.3), Math.max(hsl.l + 0.2, 0.5)]);

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
          if (!p) {
            var rs = data.regions[region(d.source.id)];
            var rt = data.regions[region(d.target.id)];
            var r = rs && rt && previous.chords[rs] && previous.chords[rs][rt];
            p = r && { source: { startAngle: r.source.startAngle, endAngle: r.source.endAngle }, target: { startAngle: r.target.startAngle, endAngle: r.target.endAngle } };
          }
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
        .text(function(d) { return countries[d.source.index]; });
      chordTitle.exit().remove();
    }

    return {
      draw: draw,
      data: data
    };
  };
})(window.Globalmigration || (window.Globalmigration = {}));
