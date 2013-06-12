/*
 * globalmigration
 * https://github.com/null2/globalmigration
 *
 * Copyright (c) 2013 null2 GmbH Berlin
 * Licensed under the MIT license.
 */

(function() {
  var datafile = 'migrations.json';
  // var scope = 'regions';
  var scope = 'countries';

  var animationDuration = 1000;

  var width = 960,
      height = 960,
      outerRadius = Math.min(width, height) / 2 - 10,
      innerRadius = outerRadius - 24,
      sourcePadding = 30;

  var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

  var layout = d3.layout.chord()
      .padding(0.01)
      .sortSubgroups(d3.descending)
      .sortChords(d3.ascending);

  var chordGenerator = d3.svg.chord()
      .radius(innerRadius)
      .padding(sourcePadding);

  var form = d3.select("body").append("form");

  var svg = d3.select("body").append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("id", "circle")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  svg.append("circle")
      .attr("r", outerRadius);


  function draw(countries, matrix) {
    var colors = d3.scale.category10().domain(countries);

    // Compute the chord layout.
    layout.matrix(matrix);

    // Add a group per neighborhood.
    var group = svg.selectAll(".group")
      .data(layout.groups);
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

    // Add a mouseover title to arcs.
    var title = group.selectAll('title')
      .data(function(d, i) { return [countries[i]]; });
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
      .style("fill", function(d, i, k) { return colors(k); })
      .transition()
      .duration(animationDuration)
      .attr("d", arc)
      .each('end', function() {
        // Remove the labels that don't fit. :(
        groupText
          .filter(function(d) {
            return d3.select('#group' + d.index).node().getTotalLength() / 2 - 25 < this.getComputedTextLength();
          })
          .remove();
      });
    groupPath.exit().remove();

    // Add a text label.
    var groupText = group.selectAll('text')
      .data(function(d) { return [d]; });
    groupText.enter()
      .append("text")
      .attr("x", 6)
      .attr("dy", 15)
      .append("textPath")
        .attr("xlink:href", function(d, i, k) { return "#group" + k; })
        .text(function(d) { return countries[d.index]; });
    groupText.exit().remove();

    // Add the chords.
    var chord = svg.selectAll(".chord")
        .data(layout.chords);
    chord.enter()
      .append("path")
      .attr("class", "chord");
    chord
      .style("fill", function(d) {
        var hsl = d3.hsl(colors(d.source.index));

        var l = d3.scale.linear().domain([0, countries.length]).range([Math.min(hsl.l - 0.2, 0.3), Math.max(hsl.l + 0.2, 0.5)]);

        return d3.hsl(hsl.h, hsl.s, l(d.target.index)).toString();
      })
      .transition()
      .duration(animationDuration)
      .attr("d", chordGenerator);
    chord.exit().remove();

    // Add a mouseover title to chords.
    var chordTitle = chord.selectAll('title')
      .data(function(d) { return [d]; });
    chordTitle.enter().append('title');
    chordTitle
      .text(function(d) { return countries[d.source.index]; });
    chordTitle.exit().remove();
  }

  d3.json(datafile, function(data) {
    draw(data[scope], data.years[1990][scope]);

    var years = form.selectAll('.year')
      .data(Object.keys(data.years));
    var span = years.enter().append('span')
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
        draw(data[scope], data.years[d][scope]);
      });

    span.append('label')
      .attr('for', function(d) { return 'year-' + d; })
      .text(function(d) { return d; });

  });

})();
