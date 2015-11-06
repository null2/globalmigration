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

    config.now = config.now || Object.keys(data.matrix)[0];

    // geometry
    config.width = config.width || 1100;
    config.height = config.height || 1100;
    config.margin = config.margin || 125;
    config.outerRadius = config.outerRadius || (Math.min(config.width, config.height) / 2 - config.margin);
    config.arcWidth = config.arcWidth || 24;
    config.innerRadius = config.innerRadius || (config.outerRadius - config.arcWidth);
    config.arcPadding = config.arcPadding || 0.005;
    config.sourcePadding = config.sourcePadding || 3;
    config.targetPadding = config.targetPadding || 20;
    config.labelPadding = config.labelPadding || 10;
    config.labelRadius = config.labelRadius || (config.outerRadius + config.labelPadding);

    // animation
    var aLittleBit = π / 100000;
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
    config.layout.alpha = config.layout.alpha || aLittleBit; // start angle for first region (0, zero, is up North)

    config.maxRegionsOpen = config.maxRegionsOpen || 2;
    config.infoPopupDelay = config.infoPopupDelay || 300;


    var colors = d3.scale.category10().domain(data.regions);
    if (config.layout.colors) {
      colors.range(config.layout.colors);
    }

    function arcColor(d) {
      if (d.region === d.id) {
        return colors(d.region);
      }
      var hsl = d3.hsl(colors(d.region));
      var r = [hsl.brighter(0.75), hsl.darker(2), hsl, hsl.brighter(1.5), hsl.darker(1)];
      return r[(d.id - d.region) % 5];
    }

    function chordColor(d) {
      return arcColor(d.source);
    }

    // state before animation
    var previous = {
      countries: []
    };

    Number.prototype.mod = function (n) {
            return ((this % n) + n) % n;
    };

    // calculate label position
    function labelPosition(angle) {
      var temp = angle.mod(2*π);
      return {
        x: Math.cos(temp - π / 2) * config.labelRadius,
        y: Math.sin(temp - π / 2) * config.labelRadius,
        r: (temp - π / 2) * 180 / π
      };
    }

    function formatNumber(nStr, seperator) {
      seperator = seperator || ',';

      nStr += '';
      x = nStr.split('.');
      x1 = x[0];
      x2 = x.length > 1 ? '.' + x[1] : '';
      var rgx = /(\d+)(\d{3})/;
      while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + seperator + '$2');
      }
      return x1 + x2;
    }

    function luminicity(color) {
      var rgb = d3.rgb(color);

      return 0.21 * rgb.r + 0.71 * rgb.g + 0.07 * rgb.b;
    }

    // arc path generator
    var textPathArc = d3.svg.arc()
        .innerRadius(config.outerRadius + 10)
        .outerRadius(config.outerRadius + 10);
    var textPathArc2 = d3.svg.arc()
        .innerRadius(config.outerRadius + 18)
        .outerRadius(config.outerRadius + 18);

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
    if (config.layout.sortChords) {
      layout.sortChords(config.layout.sortChords);
    }
    if (config.layout.alpha) {
      layout.alpha(config.layout.alpha);
    }

    // chord path generator
    var chordGenerator = Globalmigration.chord()
        .radius(config.innerRadius)
        .sourcePadding(config.sourcePadding)
        .targetPadding(config.targetPadding);

    // svg element
    var svg = d3.select(config.element).append("svg")
        .attr('preserveAspectRatio', 'xMidYMid')
        .attr('viewBox', '0 0 ' + config.width + ' ' + config.height)
        .attr("width", config.width)
        .attr("height", config.height);
    var element = svg.append("g")
        .attr("id", "circle")
        .attr("transform", "translate(" + config.width / 2 + "," + config.height / 2 + ")");

    d3.select(window).on('resize.svg-resize', function() {
      var width = svg.node().parentNode.clientWidth;

      if (width) {
        // make height adapt to shrinking of page
        if (width < config.width) {
          svg.attr('height', width);
        }
      }
    });

    // needed for fade mouseover
    var circle = element.append("circle").attr("r", config.outerRadius + 24);

    var filter = svg.append('filter').attr('id', 'dropshadow');
    filter.append('feGaussianBlur').attr({
      in: 'SourceAlpha',
      stdDeviation: 2
    });
    filter.append('feOffset').attr({
      dx: 0,
      dy: 1,
      result: 'offsetblur'
    });
    filter.append('feComponentTransfer').append('feFuncA').attr({
      type: 'linear',
      slope: 0.5
    });
    var femerge = filter.append('feMerge');
    femerge.append('feMergeNode');
    femerge.append('feMergeNode').attr('in', 'SourceGraphic');

    var info = svg.append('g')
      .attr('class', 'info-group')
      .attr("transform", "translate(" + config.width / 2 + "," + config.height / 2 + ")")
      .append('g')
        .attr('class', 'info')
        .attr('opacity', 0);
    
    info.append('rect')
      .style('filter', 'url(#dropshadow)');
    info.append('g').attr('class', 'text');

    svg.on('mousemove', function() {
      info
        .transition()
        .duration(10)
        .attr('opacity', 0);
    });

    circle.on('mouseout', function() {
      if (infoTimer) {
        clearTimeout(infoTimer);
      }
      info
        .transition()
        .duration(10)
        .attr('opacity', 0);
    });

    var infoTimer;

    // eg: West Africa: Total inflow 46, Total outflow 2
    function groupInfo(d) {
      var el = this;

      if (infoTimer) {
        clearTimeout(infoTimer);
      }

      var bbox = el.getBBox();
      infoTimer = setTimeout(function() {
        var color = d3.select(el).style('fill');

        info
          .attr('transform', 'translate(' + (bbox.x + bbox.width / 2) + ',' + (bbox.y + bbox.height / 2) + ')');

        var text = info.select('.text').selectAll('text')
          .data([
            data.names[d.id],
            'Total In: ' + formatNumber(d.inflow),
            'Total Out: ' + formatNumber(d.outflow)
          ]);
        text.enter().append('text');
        text
          .text(function(t) { return t; })
          .style({
            fill: luminicity(color) > 160 ? 'black' : 'white'
          })
          .attr({
            transform: function(t, i) {
              return 'translate(6, ' + (i * 14 + 16) + ')';
            }
          });
        text.exit().remove();

        var tbbox = info.select('.text').node().getBBox();
        info.select('rect')
          .style('fill', color)
          .attr({
            width: tbbox.width + 12,
            height: tbbox.height + 10
          });

        info
          .transition()
          .attr('opacity', 1);
      }, config.infoPopupDelay);
    }

    // chord info
    // eg: West Asia → Pacific: 46
    function chordInfo(d) {
      var el = this;

      if (infoTimer) {
        clearTimeout(infoTimer);
      }

      var bbox = el.getBBox();
      infoTimer = setTimeout(function() {
        var color = d3.select(el).style('fill');

        info.attr('transform', 'translate(' + (bbox.x + bbox.width / 2) + ',' + (bbox.y + bbox.height / 2) + ')')
          .attr('opacity', 0)
          .transition()
          .attr('opacity', 1);

        var text = info.select('.text').selectAll('text')
          .data([
            data.names[d.source.id] + ' → ' + data.names[d.target.id] + ': ' + formatNumber(d.source.value)
          ]);
        text.enter().append('text');
        text.exit().remove();
        text
          .text(function(t) { return t; })
          .style({
            fill: luminicity(color) > 160 ? 'black' : 'white'
          })
          .attr('transform', function(t, i) {
            return 'translate(6, ' + (i * 12 + 16) + ')';
          });

        info.selectAll('rect').style('fill', d3.select(el).style('fill'));

        var tbbox = info.select('.text').node().getBBox();
        info.select('rect')
          .attr({
            width: tbbox.width + 12,
            height: tbbox.height + 10
          });
      }, config.infoPopupDelay);
    }


    function rememberTheGroups() {
      previous.groups = layout.groups().reduce(function(sum, d) {
        sum[d.id] = d;
        return sum;
      }, {});
    }
    function rememberTheChords() {
      previous.chords = layout.chords().reduce(function(sum, d) {
        sum[d.source.id] = sum[d.source.id] || {};
        sum[d.source.id][d.target.id] = d;
        return sum;
      }, {});
    }

    function getCountryRange(id) {
      var end = data.regions[data.regions.indexOf(id) + 1];

      return {
        start: id + 1,
        end: end ? end - 1 : data.names.length - 1
      };
    }

    function inRange(id, range) {
      return id >= range.start && id <= range.end;
    }

    function inAnyRange(d, ranges) {
      return !!ranges.filter(function(range) { return inRange(d.source.id, range) || inRange(d.target.id, range); }).length;
    }

    // Transition countries to region:
    // Use first country's start angle and last countries end angle. 
    function meltPreviousGroupArc(d) {
      if (d.id !== d.region) {
        return;
      }

      var range = getCountryRange(d.id);
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
      var ranges = countries.map(getCountryRange);

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
        .on("mouseover", function(d) {
          chord.classed("fade", function(p) {
            return p.source.id !== d.id && p.target.id !== d.id;
          });
        });
      group.exit().remove();
      
      // group arc
      var groupPath = group.selectAll('.group-arc')
        .data(function(d) { return [d]; });
      groupPath.enter()
        .append('path')
        .attr("class", "group-arc")
        .attr("id", function(d, i, k) { return "group" + k; });
      groupPath
        .style("fill", arcColor)
        .on("mousemove", groupInfo)
        .transition()
        .duration(config.animationDuration)
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
      var groupTextGroup = element.selectAll('.label')
        .data(layout.groups, function(d) { return d.id; });
      groupTextGroup.enter()
        .append("g")
        .attr('class', 'label');
      groupTextGroup
        .filter(function(d) {return d.id !== d.region})
        .transition()
        .duration(config.animationDuration)
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
        .style('opacity', 0)
        .attrTween("transform", function(d) {
          // do not animate region labels
          if (d.id === d.region) {
            return;
          }

          var region = layout.groups().filter(function(g) { return g.id === d.region });
          region = region && region[0];
          var angle = region && (region.startAngle + (region.endAngle - region.startAngle) / 2);
          angle = angle || 0;
          var i = d3.interpolate(d, { angle: angle });
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
        .append("text")
      groupText
        .classed('region', function(d) {
          return d.id === d.region;
        })
        .text(function(d) { 
          if (d.id !== d.region) {
            return data.names[d.id];
          } 
        })
        .attr('transform', function(d) {
          if (d.id !== d.region) {
            return d.angle.mod(2*π) > π ? 'translate(0, -4) rotate(180)' : 'translate(0, 4)';
          }
        })
        .attr('text-anchor', function(d) {
          return d.id === d.region ?
            'middle' :
            (d.angle.mod(2*π) > π ? 'end' : 'start');
        })
        .style('fill', function(d) {
          return d.id === d.region ? arcColor(d) : null;
        })
        .classed('fade', function(d) {
          // hide labels for countries with little migrations
          return d.value < config.layout.labelThreshold;
        });

      // path for text-on-path
      var groupTextPathPath = group
        .filter(function(d) {return d.id === d.region})
        .selectAll('.group-textpath-arc')
        .data(function(d) { return [d]; });
      groupTextPathPath.enter()
        .append('path')
        .attr("class", "group-textpath-arc")
        .attr("id", function(d, i, k) { return "group-textpath-arc" + d.id; });
      groupTextPathPath
        .style("fill", 'none')
        .transition()
        .duration(config.animationDuration)
        .attrTween("d", function(d) {
          var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d);
          if (d.angle.mod(2*π) > π/2 && d.angle.mod(2*π) < π*3/2) {
            return function (t) {
              return textPathArc2(i(t)); 
            };
          } else {
            return function (t) {
              return textPathArc(i(t)); 
            };
          }
        });
      groupTextPathPath.exit().remove();

      // text on path
      var groupTextPath = groupText
        .filter(function(d) {return d.id === d.region})
        .selectAll('textPath')
        .data(function(d) { return [d]; });
      groupTextPath
        .enter()
        .append("textPath")
      groupTextPath
        .text(function(d) { return data.names[d.id]; })
        .attr('startOffset', function(d) {
          if (d.angle.mod(2*π) > π/2 && d.angle.mod(2*π) < π*3/2) {
            return '75%';
          } else {
            return '25%';
          }
        })
        .attr("xlink:href", function(d, i, k) { return "#group-textpath-arc" + d.id; });


      groupTextPath
        .filter(function(d, i) {
          return this.getComputedTextLength() > (d.endAngle - d.startAngle) * (config.outerRadius + 18);
        })
        .remove();



      // chords
      var chord = element.selectAll(".chord")
          .data(layout.chords, function(d) { return d.id; });
      chord.enter()
        .append("path")
        .attr("class", "chord")
        .on('mousemove', chordInfo);
      chord
        .style("fill", chordColor)
        .transition()
        .duration(config.animationDuration)
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
        .style('opacity', 0)
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


      chord.classed("unselected", ranges.length ? function(d) {
        return !inAnyRange(d, ranges);
      } : false);

      d3.select(window).on('resize.svg-resize')();
    }

    return {
      draw: draw,
      data: data
    };
  };
})(window.Globalmigration || (window.Globalmigration = {}));
