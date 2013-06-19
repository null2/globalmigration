/*
 * globalmigration
 * https://github.com/null2/globalmigration
 *
 * Copyright (c) 2013 null2 GmbH Berlin
 * Licensed under the MIT license.
 */

(function() {
  var datafile = 'migrations.json';

  // geometry
  var width = 960,
      height = 960,
      outerRadius = Math.min(width, height) / 2 - 100,
      innerRadius = outerRadius - 24,
      arcPadding = 0.01,
      sourcePadding = 3,
      targetPadding = 20,
      labelPadding = 10;

  // animation
  var animationDuration = 1000;
  var aLittleBit = Math.PI / 100000;
  var initialAngle = { 
    arc: {
      startAngle: 0, endAngle: aLittleBit
    },
    chord: {
      source: {
        startAngle: 0, endAngle: aLittleBit
      },
      target: {
        startAngle: 2 * Math.PI - aLittleBit, endAngle: 2 * Math.PI
      }
    }
  };

  var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

  var layout = d3.layout.chord()
      // TODO: substract padding from chords, instead of adding it to chrord sum
      // .padding(arcPadding)
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

  // calculate *star* style label position and angle
  function labelPosition(angle) {
    var radius = outerRadius + labelPadding;
    return {
      x: Math.cos(angle - Math.PI / 2) * radius,
      y: Math.sin(angle - Math.PI / 2) * radius,
      r: (angle - Math.PI / 2) * 180 / Math.PI
    };
  }

  // global data object
  var data;

  // get the region of a country by index
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

  // previous data stored for animation
  var previous = {
    groups: {},
    labels: {},
    chords: {}
  };

  function drawYearSelector(years) {
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
        var y = d;
        year.selectAll('input').attr('checked', function(d) {
          return y === d || null;
        });
        drawChord(d);
      });
    span.append('label')
      .attr('for', function(d) { return 'year-' + d; })
      .text(function(d) { return d; });
    d3.select(document.body).on('keypress', function() {
      var idx = d3.event.which - 49;
      var y = years[idx];
      if (y) {
        year.selectAll('input').each(function(d) {
          if (d === y) {
            console.log('jo');
            d3.select(this).on('click')(d);
          }
        });
      }
    });
  }

  // redraw the chord
  function drawChord(year, indices) {
    year = year || 1990;
    indices = indices || data.regions;

    layout.matrix(data.matrix[year]);
    layout.indices(indices);

    var countries = indices.map(function(i) { return data.names[i]; });
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

        drawChord(year, a.concat(b).concat(c));
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
        previous.groups[region(d.id)] = d;
      })
      .attrTween("d", function(d) {
        var i = d3.interpolate(previous.groups[region(d.id)] || initialAngle.arc, d);
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
        var i = d3.interpolate(p || initialAngle.chord, d);
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

  // get data
  d3.json(datafile, function(d) {
    data = d;

    drawYearSelector(Object.keys(data.matrix));
    drawChord();
  });
})();
