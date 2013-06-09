Zepto(function($){

  var width = 960,
      height = 960,
      outerRadius = Math.min(width, height) / 2 - 10,
      innerRadius = outerRadius - 24;

  var formatPercent = d3.format(".1%");

  var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

  var layout = d3.layout.chord()
      .padding(0.004)
      .sortSubgroups(d3.descending)
      .sortChords(d3.ascending);

  var path = d3.svg.chord()
      .radius(innerRadius);

  var svg = d3.select("body").append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("id", "circle")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  svg.append("circle")
      .attr("r", outerRadius);

  d3.json("data/countries.json", function(countries) {
    d3.json("data/matrix_1990.json", function(matrix) {

      // Compute the chord layout.
      layout.matrix(matrix);

      // Add a group per neighborhood.
      var group = svg.selectAll(".group")
          .data(layout.groups)
        .enter().append("g")
          .attr("class", "group")
          .on("mouseover", mouseover);

      // Add a mouseover title.
      group.append("title").text(function(d, i) {
        return countries[i];
      });

      // Add the group arc.
      var groupPath = group.append("path")
          .attr("id", function(d, i) { return "group" + i; })
          .attr("d", arc)
          .style("fill", function(d, i) { return '#dd0000'; });

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
          .data(layout.chords)
        .enter().append("path")
          .attr("class", "chord")
          .style("fill", function(d) { return '#ff0000'; })
          .attr("d", path);

      // Add an elaborate mouseover title for each chord.
      chord.append("title").text(function(d) {
        return countries[d.source.index];
      });

      function mouseover(d, i) {
        chord.classed("fade", function(p) {
          return p.source.index != i && p.target.index != i;
        });
      }
    });
  });



});
