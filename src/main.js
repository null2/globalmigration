/*
 * globalmigration
 * https://github.com/null2/globalmigration
 *
 * Copyright (c) 2013 null2 GmbH Berlin
 * Licensed under the MIT license.
 */

(function() {
  var datafile = 'migrations.json';

  var width = 960,
      height = 960,
      outerRadius = Math.min(width, height) / 2 - 10,
      innerRadius = outerRadius - 24;

  var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

  var layout = d3.layout.chord()
      .padding(0.004)
      .sortSubgroups(d3.descending)
      .sortChords(d3.ascending);

  var path = d3.svg.chord()
      .radius(innerRadius);

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
    // Compute the chord layout.
    layout.matrix(matrix);

    // Add a group per neighborhood.
    var group = svg.selectAll(".group")
        .data(layout.groups);

    group.enter().append("g");
    group.attr("class", "group")
      .on("mouseover", function(d, i) {
        chord.classed("fade", function(p) {
          return p.source.index !== i && p.target.index !== i;
        });
      });
    group.exit().remove();

    // Add a mouseover title.
    group.append("title").text(function(d, i) {
      return countries[i];
    });

    // Add the group arc.
    var groupPath = group.append("path")
        .attr("id", function(d, i) { return "group" + i; })
        .attr("d", arc)
        .style("fill", '#dd0000');

    // Add a text label.
    var groupText = group.append("text")
        .attr("x", 6)
        .attr("dy", 15);

    groupText.append("textPath")
        .attr("xlink:href", function(d, i) { return "#group" + i; })
        .text(function(d, i) { return countries[i]; });

    // Remove the labels that don't fit. :(
    groupText.filter(function(d, i) { return groupPath[0][i].getTotalLength() / 2 - 25 < this.getComputedTextLength(); })
        .remove();

    // Add the chords.
    var chord = svg.selectAll(".chord")
        .data(layout.chords);

    chord.enter().append("path");
    chord.attr("class", "chord")
      .style("fill", '#ff0000')
      .attr("d", path);
    chord.exit().remove();

    // Add an elaborate mouseover title for each chord.
    chord.append("title").text(function(d) {
      return countries[d.source.index];
    });
  }

  d3.json(datafile, function(data) {
    var scope = 'regions';
    draw(data[scope], data.years[1990][scope]);

    form.selectAll('label.year')
      .data(Object.keys(data.years))
      .enter()
      .append('label')
      .classed('year', true)
      .html(function(d) { return d + ' '; })
        .append('input')
        .attr({
          name: 'year',
          type: 'radio',
          value: function(d) { return d; },
          checked: function(d, i) { return i === 0 || null; }
        })
        .on('click', function(d) {
          draw(data[scope], data.years[d][scope]);
        });
  });

})();
