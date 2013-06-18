/*
 * globalmigration
 * https://github.com/null2/globalmigration
 *
 * Copyright (c) 2013 null2 GmbH Berlin
 * Licensed under the MIT license.
 */

(function() {
  var datafile = 'migrations.json';

  var animationDuration = 3000;

  var width = 960,
      height = 960,
      outerRadius = Math.min(width, height) / 2 - 100,
      innerRadius = outerRadius - 24,
      sourcePadding = 3,
      targetPadding = 20,
      labelPadding = 10;

  var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

  var layout = d3.layout.chord()
      // .padding(0.01)
      // .sortGroups(d3.descending)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);

  var chordGenerator = d3.svg.chord()
      .radius(innerRadius)
      .sourcePadding(sourcePadding)
      .targetPadding(targetPadding);

  var form = d3.select("body").append("form");

  var svg = d3.select("body").append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("id", "circle")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  svg.append("circle")
      .attr("r", outerRadius);

  function labelPosition(angle) {
    var radius = outerRadius + labelPadding;
    return {
      x: Math.cos(angle - Math.PI / 2) * radius,
      y: Math.sin(angle - Math.PI / 2) * radius,
      r: (angle - Math.PI / 2) * 180 / Math.PI
    };
  }

  var data;

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

  var previous = {
    groups: {},
    labels: {},
    chords: {}
  };
  function draw(year, indices) {
    year = year || 1990;
    indices = indices || data.regions;

    var countries = indices.map(function(i) { return data.names[i]; });

    layout.matrix(data.matrix[year]);
    layout.indices(indices);

    var colors = d3.scale.category10().domain([0, data.regions.length - 1]);
    
    // Add a group per neighborhood.
    var group = svg.selectAll(".group")
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
      .duration(animationDuration)
      .attr("d", arc)
      .each('end', function(d) {
        previous.groups[d.id] = d;
      })
      .attrTween("d", function(b) {
        var i = d3.interpolate(previous.groups[b.id] || { startAngle: 0, endAngle: 0 }, b);
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
      .duration(animationDuration)
      .attr('transform', function(d) {
        var t = labelPosition(d.angle);
        return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
      })
      .each('end', function(d) {
        previous.labels[d.id] = d.angle;
      })
      .attrTween("transform", function(b) {
        var i = d3.interpolate(previous.labels[b.id] || 0, b.angle);
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
    var chord = svg.selectAll(".chord")
        .data(layout.chords, function(d) { return d.id; });
    chord.enter()
      .append("path")
      .attr("class", "chord");
    chord
      .style("fill", function(d, i) {
        var r = region(d.source.id);
        var hsl = d3.hsl(colors(r));

        var l = d3.scale.linear().domain([0, countries.length]).range([Math.min(hsl.l - 0.2, 0.3), Math.max(hsl.l + 0.2, 0.5)]);

        return d3.hsl(hsl.h, hsl.s, l(d.target.index)).toString();
      })
      .transition()
      .duration(animationDuration)
      .attr("d", chordGenerator)
      .each('end', function(d) {
        previous.chords[d.id] = d;
      })
      .attrTween("d", function(b) {
        var i = d3.interpolate(previous.chords[b.id] || { source: { startAngle: 0, endAngle: 0 }, target: { startAngle: 0, endAngle: 0 } }, b);
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

  d3.json(datafile, function(d) {
    data = d;

    var years = Object.keys(data.matrix);

    var year = form.selectAll('.year')
      .data(years);
    var span = year.enter().append('span')
      .classed('year', true);

    span.append('input')
      .attr({
        name: 'year',
        type: 'radio',
        id: function(d) { return 'year-' + d; },
        value: function(d) { return d; },
        checked: function(d, i) { return i === 0 || null; }
      })
      .on('click', function(d) {
        draw(d);
      });

    span.append('label')
      .attr('for', function(d) { return 'year-' + d; })
      .text(function(d) { return d; });

    d3.select(document.body).on('keypress', function() {
      var idx = d3.event.which - 49;
      var y = years[idx];
      if (y) {
        year.selectAll('input').attr('checked', function(d) {
          return parseInt(d, 10) === y ? 'checked' : null;
        });
        draw(y);
      }
    });

    draw();
  });
})();
