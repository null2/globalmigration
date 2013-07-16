/*
 * globalmigration
 * https://github.com/null2/globalmigration
 *
 * Copyright (c) 2013 null2 GmbH Berlin
 * Licensed under the MIT license.
 */

// Basically a d3.svg.chord, but with
// * sourcePadding
// * targetPadding
(function(scope) {
  // from d3/svg/chord.js

  // import "../core/functor";
  var d3_functor = d3.functor;
  // import "../core/source";
  function d3_source(d) {
    return d.source;
  }
  // import "../core/target";
  function d3_target(d) {
    return d.target;
  }
  // import "../math/trigonometry";
  var π = Math.PI;
  // import "arc";
  var d3_svg_arcOffset = -π / 2;
  function d3_svg_arcStartAngle(d) {
    return d.startAngle;
  }
  function d3_svg_arcEndAngle(d) {
    return d.endAngle;
  }
  // import "svg";

  scope.chord = function() {
    var source = d3_source,
        target = d3_target,
        radius = d3_svg_chordRadius,
        sourcePadding = d3_svg_chordSourcePadding,
        targetPadding = d3_svg_chordTargetPadding,
        startAngle = d3_svg_arcStartAngle,
        endAngle = d3_svg_arcEndAngle;

    // TODO Allow control point to be customized.

    function chord(d, i) {
      var s = subgroup(this, source, d, i),
          t = subgroup(this, target, d, i, true);


      if (equals(s, t)) {
        s.a1 = s.a1 - (s.a1 - s.a0) / 2;
        s.p1 = [s.r * Math.cos(s.a1), s.r * Math.sin(s.a1)];

        t.a0 = t.a0 + (t.a1 - t.a0) / 2;
        t.p0 = [t.r * Math.cos(t.a0), t.r * Math.sin(t.a0)];
      }

      var ccp = cubic_control_points(s, t, s.r * 0.618);

      return "M" + s.p0
        + arc(s.r, s.p1, s.a1 - s.a0)
        + cubic_curve(ccp.cps1, ccp.cpt0, t.p0)
        + arc(t.r, t.p1, t.a1 - t.a0)
        + cubic_curve(ccp.cpt1, ccp.cps0, s.p0)
        + "Z";
    }

    function cubic_control_points(s, t, factor) {
      cps0 = [factor * Math.cos(s.a0), factor * Math.sin(s.a0)];
      cps1 = [factor * Math.cos(s.a1), factor * Math.sin(s.a1)];
      cpt0 = [factor * Math.cos(t.a0), factor * Math.sin(t.a0)];
      cpt1 = [factor * Math.cos(t.a1), factor * Math.sin(t.a1)];
      return {
        cps0: cps0, 
        cps1: cps1, 
        cpt0: cpt0, 
        cpt1: cpt1
      };
    }

    function subgroup(self, f, d, i, target) {
      var subgroup = f.call(self, d, i),
          r = radius.call(self, subgroup, i),
          a0 = startAngle.call(self, subgroup, i) + d3_svg_arcOffset,
          a1 = endAngle.call(self, subgroup, i) + d3_svg_arcOffset;
      
      if (target) {
        var d = targetPadding.call(self, subgroup, i) || 0;
        r = r - d;
      } else {
        var d = sourcePadding.call(self, subgroup, i) || 0;
        r = r - d;
      }

      return {
        r: r,
        a0: a0,
        a1: a1,
        p0: [r * Math.cos(a0), r * Math.sin(a0)],
        p1: [r * Math.cos(a1), r * Math.sin(a1)]
      };
    }

    function equals(a, b) {
      return a.a0 == b.a0 && a.a1 == b.a1;
    }

    function arc(r, p, a) {
      return "A" + r + "," + r + " 0 " + +(a > π) + ",1 " + p;
    }

    function curve(r0, p0, r1, p1) {
      return "Q 0,0 " + p1;
    }

    function cubic_curve(cp0, cp1, p1) {
      return "C " + cp0 + " " + cp1 + " " + p1;
    }

    chord.radius = function(v) {
      if (!arguments.length) return radius;
      radius = d3_functor(v);
      return chord;
    };

    // null2
    chord.sourcePadding = function(v) {
      if (!arguments.length) return sourcePadding;
      sourcePadding = d3_functor(v);
      return chord;
    };
    chord.targetPadding = function(v) {
      if (!arguments.length) return targetPadding;
      targetPadding = d3_functor(v);
      return chord;
    };

    chord.source = function(v) {
      if (!arguments.length) return source;
      source = d3_functor(v);
      return chord;
    };

    chord.target = function(v) {
      if (!arguments.length) return target;
      target = d3_functor(v);
      return chord;
    };

    chord.startAngle = function(v) {
      if (!arguments.length) return startAngle;
      startAngle = d3_functor(v);
      return chord;
    };

    chord.endAngle = function(v) {
      if (!arguments.length) return endAngle;
      endAngle = d3_functor(v);
      return chord;
    };

    return chord;
  };

  function d3_svg_chordRadius(d) {
    return d.radius;
  }
  function d3_svg_chordTargetPadding(d) {
    return d.targetPadding;
  }
  function d3_svg_chordSourcePadding(d) {
    return d.sourcePadding;
  }
})(window.Globalmigration || (window.Globalmigration = {}));
