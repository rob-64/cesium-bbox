(function() {
  var turfIndex = Comlink.proxy(new Worker("turfIndex.js"));
  var viewer = new Cesium.Viewer("cesiumContainer", {
    mapProjection: new Cesium.GeographicProjection(),
    // mapMode2D: Cesium.MapMode2D.ROTATE,
    timeline: false,
    geocoder: false,
    baseLayerPicker: false,
    selectionIndicator: false,
    sceneModePicker: true,
    sceneMode: Cesium.SceneMode.SCENE3D,
    infoBox: false,
    homeButton: true,
    navigationHelpButton: false,
    fullscreenButton: false,
    navigationInstructionsInitiallyVisible: false,
    animation: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider({
      ellipsoid: Cesium.Ellipsoid.WGS84
    })
  });

  var btn2dMapMode = document.createElement("BUTTON");
  btn2dMapMode.innerHTML = "SW2D";

  var switch2dMapMode = function() {
    if (viewer.scene.mapMode2D !== Cesium.MapMode2D.ROTATE) {
      viewer.scene.mapMode2D = Cesium.MapMode2D.ROTATE;
    } else {
      viewer.scene.mapMode2D = Cesium.MapMode2D.INFINITE_SCROLL;
    }
    console.log(
      "viewer.scene.mapMode2D: INF",
      viewer.scene.mapMode2D === Cesium.MapMode2D.INFINITE_SCROLL
    );
  };

  var create2dRotateButton = function() {
    var viewerToolbar = document.querySelector(".cesium-viewer-toolbar");
    if (viewerToolbar) {
      btn2dMapMode.addEventListener("click", switch2dMapMode);
      viewerToolbar.appendChild(btn2dMapMode);
    }
  };

  var edgeOffset = 2;
  var sampleStepCount = 30;
  var meridianBuffer = 20;

  var labels = viewer.scene.primitives.add(new Cesium.LabelCollection());

  var bbox1 = viewer.entities.add({
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(0, 0, 0, 0),
      material: Cesium.Color.RED.withAlpha(0.1)
    }
  });
  var bbox2 = viewer.entities.add({
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(0, 0, 0, 0),
      material: Cesium.Color.YELLOW.withAlpha(0.1)
    }
  });

  var cartesianToLngLat = function(cartesian) {
    if (cartesian) {
      var cartographic = Cesium.Cartographic.fromCartesian(
        cartesian,
        viewer.scene.globe.ellipsoid
      );
      if (cartographic) {
        return {
          longitude: Cesium.Math.toDegrees(cartographic.longitude),
          latitude: Cesium.Math.toDegrees(cartographic.latitude)
        };
      }
    }
  };

  var pickColors = ["red", "green", "blue", "yellow"];
  var pickIndex = 0;

  var drawPick = function(x, y) {
    var can = document.createElement("canvas");
    var ctx = can.getContext("2d");
    var size = 8;
    var offSet = size / 2;
    can.width = size;
    can.height = size;
    var lx = x - offSet;
    var ly = y - offSet;
    var style = `position:fixed;top:${ly}px;left:${lx}px;z-index:99;`;
    can.style = style;
    can.className = "xpick";

    ctx.rect(0, 0, size, size);
    ctx.fillStyle = pickColors[pickIndex];
    pickIndex++;
    if (pickIndex >= pickColors.length) {
      pickIndex = 0;
    }
    ctx.fill();
    document.body.appendChild(can);
  };

  var removePicks = function() {
    var picks = document.querySelectorAll(".xpick");
    if (picks) {
      picks.forEach(function(p) {
        p.remove();
      });
    }
    pickIndex = 0;
  };

  var pickMap = function(x, y) {
    drawPick(x, y);
    var cartesian = viewer.camera.pickEllipsoid(
      new Cesium.Cartesian2(x, y),
      viewer.scene.globe.ellipsoid
    );
    if (cartesian) {
      var lngLat = cartesianToLngLat(cartesian);
      cartesian.longitude = lngLat.longitude;
      cartesian.latitude = lngLat.latitude;
    }
    return cartesian;
  };

  var createRectangle = function(positions) {
    var west = 180,
      south = 90,
      east = -180,
      north = -90;
    positions.forEach(function(p) {
      west = Math.min(p.longitude, west);
      south = Math.min(p.latitude, south);
      east = Math.max(p.longitude, east);
      north = Math.max(p.latitude, north);
    });
    console.log("west, south, east, north: ", west, south, east, north);
    return Cesium.Rectangle.fromDegrees(west, south, east, north);
  };

  var splitRectangleOnMerrdians = function(vr, positions) {
    positions.sort(function(p1, p2) {
      if (p1.longitude < p2.longitude) {
        return -1;
      } else if (p1.longitude > p2.longitude) {
        return 1;
      }
      return 0;
    });

    // positive (right side)
    var firstPositive = positions.find(function(p) {
      return p.longitude >= 0;
    });
    var lastPositive = positions[positions.length - 1];
    var posWest =
      firstPositive.longitude <= meridianBuffer ? 0 : firstPositive.longitude;
    var posEast =
      180 - lastPositive.longitude <= 20 ? 180 : lastPositive.longitude;
    var vr1 = Cesium.Rectangle.fromDegrees(
      posWest,
      Cesium.Math.toDegrees(vr.south),
      posEast,
      Cesium.Math.toDegrees(vr.north)
    );
    var firstNegative = positions[0];
    positions.reverse();
    var lastNegative = positions.find(function(p) {
      return p.longitude <= 0;
    });
    var negWest =
      180 + firstNegative.longitude >= 0 ? -180 : firstNegative.longitude;
    var negEast =
      180 - lastNegative.longitude <= meridianBuffer
        ? 0
        : lastNegative.longitude;
    var vr2 = Cesium.Rectangle.fromDegrees(
      negWest,
      Cesium.Math.toDegrees(vr.south),
      negEast,
      Cesium.Math.toDegrees(vr.north)
    );
    return [vr1, vr2];
  };

  var createViewRectangles = function(positions, vr) {
    if (!vr) {
      vr = createRectangle(positions);
    }
    var vrWidth = Cesium.Math.toDegrees(vr.width);
    console.log("createViewRectangles: vrWidth: ", vrWidth);
    if (vrWidth <= 200) {
      return [vr];
    } else {
      return splitRectangleOnMerrdians(vr, positions);
    }
  };

  var sampleWorldXCross = function(w, h, positions) {
    // topLeft to bottomRight
    var x = 0;
    var y = 0;
    var xStep = w / sampleStepCount;
    var yStep = h / sampleStepCount;
    var counter = 0;
    while (counter <= sampleStepCount) {
      var pos = pickMap(x, y);
      if (pos) {
        positions.push(pos);
      }
      x += xStep;
      y += yStep;
      counter++;
    }
    // bottomLeft to topRight
    x = 0;
    y = h;
    counter = 0;
    while (counter <= sampleStepCount) {
      var pos = pickMap(x, y);
      if (pos) {
        positions.push(pos);
      }
      x += xStep;
      y -= yStep;
      counter++;
    }
    // center left to right
    x = 0;
    y = h / 2;
    counter = 0;
    while (counter <= sampleStepCount) {
      var pos = pickMap(x, y);
      if (pos) {
        positions.push(pos);
      }
      x += xStep;
      counter++;
    }
    // center top to bottom
    x = w / 2;
    y = 0;
    counter = 0;
    while (counter <= sampleStepCount) {
      var pos = pickMap(x, y);
      if (pos) {
        positions.push(pos);
      }
      y += yStep;
      counter++;
    }
  };

  var sampleEdges = function(w, h) {
    var positions = [];
    var pos = pickMap(edgeOffset, edgeOffset);
    // corners
    if (pos) {
      topLeft = pos;
      positions.push(pos);
    }
    pos = pickMap(edgeOffset, h - edgeOffset);
    if (pos) {
      positions.push(pos);
    }
    pos = pickMap(w - edgeOffset, h - edgeOffset);
    if (pos) {
      positions.push(pos);
    }
    pos = pickMap(w - edgeOffset, edgeOffset);
    if (pos) {
      positions.push(pos);
    }

    if (positions.length === 4) {
      var vr = Cesium.Rectangle.fromCartesianArray(
        positions,
        viewer.scene.globe.ellipsoid
      );
      console.log("corners width: ", Cesium.Math.toDegrees(vr.width));
      return [vr];
    }

    // center top
    pos = pickMap(w / 2, edgeOffset);
    if (pos) {
      positions.push(pos);
    }
    // center bottom
    pos = pickMap(w / 2, h - edgeOffset);
    if (pos) {
      positions.push(pos);
    }
    // center left
    pos = pickMap(edgeOffset, h / 2);
    if (pos) {
      positions.push(pos);
    }
    // center right
    pos = pickMap(w - edgeOffset, h / 2);
    if (pos) {
      positions.push(pos);
    }
    if (positions.length >= 6) {
      return createViewRectangles(positions);
    }
  };

  var _walkLeft1 = function(w, h, x, y, xStep, yStep, positions) {
    // go left
    var lx = x;
    var ly = y;
    while (lx >= 0) {
      lx -= xStep;
      var pos = pickMap(lx, ly);
      if (pos) {
        positions.push(pos);
        lx -= xStep;
      } else {
        var halfStep = xStep / 2;
        lx += halfStep;
        pos = pickMap(lx, ly);
        if (pos) {
          positions.push(pos);
        } else {
          lx += halfStep;
        }
        if (x > 0) {
          // walk left
        } else {
          // walk down
        }
        break;
      }
    }
  };

  var _walkUp = function(w, h, x, y, xStep, yStep, positions) {
    // go up
    var lx = x;
    var ly = y;
    while (ly >= 0) {
      ly -= yStep;
      var pos = pickMap(lx, ly);
      if (pos) {
        positions.push(pos);
        ly -= yStep;
      } else {
        var halfStep = yStep / 2;
        ly += halfStep;
        pos = pickMap(lx, ly);
        if (pos) {
          positions.push(pos);
        } else {
          var halfHalfStep = halfStep / 2;
          ly += halfHalfStep;
          pos = pickMap(lx, ly);
          if (pos) {
            positions.push(pos);
          } else {
            ly -= halfHalfStep;
          }
        }
        if (x > 0) {
          // walk left
          _walkLeft(w, h, lx, ly, xStep, yStep, positions);
        } else {
          // walk down
        }
        break;
      }
    }
  };

  var _walkDownLeft3 = function(w, h, x, y, xStep, yStep, positions) {
    var lx = x;
    var ly = y;
    while (ly <= h) {
      ly += yStep;
      console.log("_walkLeftDown: ", lx, ly);
      var pos = pickMap(lx, ly);
      if (pos) {
        positions.push(pos);
        lx += xStep;
        pos = pickMap(lx, ly);
        if (pos) {
          positions.push(pos);
        } else {
          lx -= xStep;
        }
      } else {
        lx += xStep;
        pos = pickMap(lx, ly);
        if (pos) {
          positions.push(pos);
        }
      }
    }
  };

  var _walkLeftUp3 = function(w, h, x, y, xStep, yStep, positions) {
    var lx = x;
    var ly = y;
    while (lx >= 0) {
      lx -= xStep;
      console.log("_walkLeftUp: ", lx, ly);
      var pos = pickMap(lx, ly);
      if (pos) {
        positions.push(pos);
        if (ly >= 0) {
          ly -= yStep;
          pos = pickMap(lx, ly);
          if (pos) {
            positions.push(pos);
          } else {
            ly += yStep * 2;
            pos = pickMap(lx, ly);
            if (pos) {
              positions.push(pos);
            }
          }
        }
      } else {
        // didnt hit x
        _walkDownLeft(w, h, lx, ly, xStep, yStep, positions);
      }
    }
  };

  var _walkEdge1 = function(w, h, x, y, xStep, yStep, positions) {
    console.log("_walkEdge, ", w, h, x, y);
    // go up
    _walkLeftUp(w, h, x, y, xStep, yStep, positions);
  };

  var _walkLeftUp44 = function(w, h, x, y, xStep, yStep, positions) {
    if (x >= 0) {
      var lx = x;
      var ly = y;
      lx -= xStep;
      var pos = pickMap(lx, ly);
      if (pos) {
        positions.push(pos);
        ly -= yStep;
        pos = pickMap(lx, ly);
        if (pos) {
          positions.push(pos);
        } else {
          ly += yStep * 2;
          pos = pickMap(lx, ly);
          if (pos) {
            positions.push(pos);
          } else {
          }
        }
      } else {
        ly += yStep;
      }
      _walkLeftUp(w, h, lx, ly, xStep, yStep, positions);
    } else {
    }
  };

  var _walkLeftUp = function(w, h, x, y, xStep, yStep, positions) {
    if (x >= 0 && y >= 0) {
      var s00 = pickMap(x - xStep, y - yStep, positions);
      var s01 = pickMap(x, y - yStep, positions);
      var s02 = pickMap(x + xStep, y - yStep, positions);

      var s10 = pickMap(x - xStep, y, positions);
      var s11 = pickMap(x, y, positions);
      var s12 = pickMap(x + xStep, y, positions);

      var s20 = pickMap(x - xStep, y + yStep, positions);
      var s21 = pickMap(x, y + yStep, positions);
      var s22 = pickMap(x + xStep, y + yStep, positions);
    }
  };

  var _pickEdge = function(w, h, x, y, edges) {
    // console.log("_pickEdge: ", x, y);
    var key = `${Math.round(x)}_${Math.round(y)}`;
    if (edges[key] === undefined) {
      if (x >= 0 && x <= w) {
        if (y >= 0 && y <= h) {
          console.log("_pickEdge: ", x, y);
          var pos = pickMap(x, y);
          if (pos) {
            edges[key] = pos;
            return true;
          }
        }
      }
      edges[key] = null;
    }
    return false;
  };

  var _getXyStepper = function(w, h, x, y, xStep, yStep) {
    var centerX = w / 2;
    var centerY = h / 2;
    var xyStepper = [];
    if (x <= centerX && y <= centerY) {
      // quad 1 -> bottomLeft, rotate right
      xyStepper.push({ x: x - xStep, y: y + yStep }); //bl
      xyStepper.push({ x: x - xStep, y: y }); //cl
      xyStepper.push({ x: x - xStep, y: y - yStep }); //tl

      xyStepper.push({ x: x, y: y - yStep }); //tc
      xyStepper.push({ x: x + xStep, y: y - yStep }); //tr
      xyStepper.push({ x: x + xStep, y: y }); //cr

      xyStepper.push({ x: x + xStep, y: y + yStep }); //br
      xyStepper.push({ x: x, y: y + yStep }); //bc
    }
    return xyStepper;

    //   return [
    //     [x - xStep, y + yStep],
    //     [x - xStep, y],
    //     [x - xStep, y - yStep],
    //     [x, y - yStep],
    //     [x + xStep, y - yStep],
    //     [x + xStep, y],
    //     [x + xStep, y + yStep],
    //     [x, y + yStep],
    //     [x - xStep, y + yStep],

    //     [x - xStep, y + yStep],
    //     [x - xStep, y],
    //     [x - xStep, y - yStep],

    //     [x - xStep, y - yStep],
    //     [x, y - yStep],
    //     [x + xStep, y - yStep],
    //     [x + xStep, y],
    //     [x + xStep, y + yStep],
    //     [x, y + yStep]
    //   ];
    // } else if (x >= centerX && y <= centerY) {
    //   // quad 2 -> up, right, and down
    //   return [
    //     [x, y - yStep],
    //     [x + xStep, y - yStep],
    //     [x + xStep, y],
    //     [x + xStep, y + yStep],
    //     [x, y + yStep]
    //   ];
    // } else if (x >= centerX && y >= centerY) {
    //   // quad 3 -> right, down, and left
    //   return [
    //     [x + xStep, y],
    //     [x + xStep, y + yStep],
    //     [x, y + yStep],
    //     [x - xStep, y + yStep],
    //     [x - xStep, y]
    //   ];
    // } else if (x <= centerX && y >= centerY) {
    //   // // quad 4 -> right, down, and left
    //   // return [
    //   //   [x + xStep, y],
    //   //   [x + xStep, y + yStep],
    //   //   [x, y + yStep],
    //   //   [x - xStep, y + yStep],
    //   //   [x - xStep, y]
    //   // ];
    // }
  };

  var _walkEdge = function(x, y, state, edges) {
    console.log("_walkEdge: ", edges);
    // steps
    // pick grid around x y
    // check if row A hiehgt is greater than/equla to 0
    // a1, a2, a3
    // if we get a hit, call walkEdge again with those coords

    var xyStepper = state.xyStepper;
    if (xyStepper) {
      var i;
      for (i = 0; i < xyStepper.length; i++) {
        var xy = xyStepper[i];
        if (_pickEdge(w, h, xy.x, xy.y, edges)) {
          return _walkEdge(w, h, xy.y, xy[1], xStep, yStep, edges);
        }
      }
    }

    // // row A  --> 0, 1, 2
    // var ay = y - yStep;
    // var a1 = _pickEdge(w, h, x0, ay, positions);
    // if (a1) {
    //   return _walkEdge(w, h, x0, ay, xStep, yStep, positions);
    // }
    // var a2 = _pickEdge(w, h, x, ay, positions);
    // if (a2) {
    //   return _walkEdge(w, h, x, ay, xStep, yStep, positions);
    // }
    // // var a3 = _pickEdge(w, h, x2, ay, positions);
    // // if (a3) {
    // //   return _walkEdge(w, h, x2, ay, xStep, yStep, positions);
    // // }
    // // // row B  --> 0, 1, 2
    // // var a1 = _pickEdge(w, h, x0, y, positions);
    // // if (a1) {
    // //   return _walkEdge(w, h, x0, y, xStep, yStep, positions);
    // // }
    // // var a2 = _pickEdge(w, h, x, y, positions);
    // // if (a2) {
    // //   return _walkEdge(w, h, x, y, xStep, yStep, positions);
    // // }
    // // var a3 = _pickEdge(w, h, x2, y, positions);
    // // if (a3) {
    // //   return _walkEdge(w, h, x2, y, xStep, yStep, positions);
    // // }
    // // row C  --> 0, 1, 2
  };

  var walkEdge = function(w, h) {
    var xStep = w / sampleStepCount;
    var yStep = h / sampleStepCount;
    var lx = 0;
    var ly = h / 2;
    var edges = [];
    var pos;
    var state = {
      w: w,
      h: h,
      xStep: xStep,
      yStep: yStep
    };
    while (!pos && lx < w) {
      pos = pickMap(lx, ly);
      if (pos) {
        edges.push(pos);
        state.startPos = pos;
        state.xyStepper = _getXyStepper(w, h, lx, ly, xStep, yStep);
        _walkEdge(lx, ly, state, edges);
      } else {
        lx += xStep;
      }
    }
    // // topLeft -> bottomRight
    // while (!pos && lx < w) {
    //   pos = pickMap(lx, ly);
    //   if (pos) {
    //     edges.push(pos);
    //     _walkEdge(w, h, lx, ly, xStep, yStep, edges);
    //   } else {
    //     lx += xStep;
    //     ly += yStep;
    //   }
    // }
    // lx = 0;
    // ly = h;
    // // bottomLeft -> topRight
    // while (!pos && ly > 0) {
    //   pos = pickMap(lx, ly);
    //   if (pos) {
    //     positions.push(pos);
    //     // _walkEdge(w, h, lx, ly, xStep, yStep, positions);
    //   } else {
    //     lx += xStep;
    //     ly -= yStep;
    //   }
    // }
  };

  var computeViewRectangles = function() {
    try {
      removePicks();
      var cameraPos = viewer.scene.camera.positionCartographic;
      console.log("cameraPos: ", cameraPos);
      if (cameraPos.height >= 30000000) {
        console.debug("30 million meters away you fool");
        return;
      }
      var w = viewer.scene.canvas.clientWidth;
      var h = viewer.scene.canvas.clientHeight;
      walkEdge(w, h);
      return;

      if (Cesium.SceneMode.COLUMBUS_VIEW === viewer.scene.mode) {
        var vr = sampleEdges(w, h);
        if (vr) {
          return vr;
        }
        var positions = [];
        sampleWorldXCross(w, h, positions);
        return createViewRectangles(positions);
      } else if (Cesium.SceneMode.SCENE3D === viewer.scene.mode) {
        var vr = sampleEdges(w, h);
        if (vr) {
          return vr;
        }
        // we are zoome out
      } else {
        if (Cesium.MapMode2D.INFINITE_SCROLL === viewer.scene.mapMode2D) {
          var vr = sampleEdges(w, h);
          if (vr) {
            return vr;
          }
          var positions = [];
          sampleWorldXCross(w, h, positions);
          return createViewRectangles(positions);
        } else {
          // 2D ROTATE... picks on empty map where world would wrap on INFINITE_SCROLL return valid positions
        }
      }

      // // if(Cesium.Math.toDegrees(viewRectangle.east) - Math.abs(Cesium.Math.toDegrees(viewRectangle.west))  ){
      // //   console
      // // }

      // var positions = [];
      // var gridLines = 10;
      // // TODO pick step count based on canvas w/h %
      // var stepCount = 60;
      // var xStep = w / stepCount;
      // var yStep = h / stepCount;

      // var topLeft = pickMap(1, 1);
      // var bottomLeft = pickMap(1, h - 1);
      // var bottomRight = pickMap(w - 1, h - 1);
      // var topRight = pickMap(1, h - 1);

      // // for (var i = 1; i <= gridLines; i++) {
      // //   var y = (h / gridLines) * i;
      // //   sampleWorldPositions(0, y, xStep, 0, stepCount, positions);
      // // }
      // // for (var i = 1; i <= gridLines; i++) {
      // //   var x = (w / gridLines) * i;
      // //   sampleWorldPositions(x, 0, 0, yStep, stepCount, positions);
      // // }

      // // topLeft to bottomRight
      // sampleWorldPositions(0, 0, xStep, yStep, stepCount, positions);
      // // bottomLeft to topRight
      // sampleWorldPositions(0, h, xStep, -yStep, stepCount, positions);
      // // centerTop to centerBottom
      // sampleWorldPositions(w / 2, 0, 0, yStep, stepCount, positions);
      // // centerLeft to centerRight
      // sampleWorldPositions(0, h / 2, xStep, 0, stepCount, positions);

      // sampleWorldPositions(0, h / 4, xStep, 0, stepCount, positions);
      // sampleWorldPositions(0, (h / 4) * 3, xStep, 0, stepCount, positions);

      // // sampleWorldPositions(0, h / 4, xStep, yStep / 2, stepCount, positions);'
      // var vr = createRectangle(positions);
      // var width = Cesium.Math.toDegrees(vr.width);
      // console.log("computeViewRectangle: width: ", width);
      // if (width > 270) {
      //   console.warn("its a wrap!!!!!");
      //   var longitudes = positions.map(function(p) {
      //     return p.longitude;
      //   });
      //   longitudes.sort(function(lng1, lng2) {
      //     if (lng1 < lng2) {
      //       return -1;
      //     } else if (lng1 > lng2) {
      //       return 1;
      //     }
      //     return 0;
      //   });
      //   var positiveLngs = longitudes.filter(function(lng) {
      //     return lng >= 0;
      //   });
      //   // console.log("positiveLngs: ", positiveLngs);
      //   var vr1 = Cesium.Rectangle.fromDegrees(
      //     positiveLngs[0],
      //     Cesium.Math.toDegrees(vr.south),
      //     positiveLngs[positiveLngs.length - 1],
      //     Cesium.Math.toDegrees(vr.north)
      //   );
      //   viewRectangles.push(vr1);
      //   var negativeLngs = longitudes.filter(function(lng) {
      //     return lng <= 0;
      //   });
      //   // console.log("negativeLngs: ", negativeLngs);
      //   var vr2 = Cesium.Rectangle.fromDegrees(
      //     negativeLngs[0],
      //     Cesium.Math.toDegrees(vr.south),
      //     negativeLngs[negativeLngs.length - 1],
      //     Cesium.Math.toDegrees(vr.north)
      //   );
      //   viewRectangles.push(vr2);
      // } else {
      //   viewRectangles.push(vr);
      // }
      // return viewRectangles;
    } catch (ex) {
      console.error("computeViewRectangle: ", ex);
    }
  };

  var addVisibleLabels = function(ids) {
    labels.removeAll();
    console.log("visible ids: ", ids.length);
    var currentTime = viewer.clock.currentTime;
    ids.forEach(function(id) {
      var ent = viewer.entities.getById(id);
      if (ent && ent.xLabel) {
        var label = Object.assign({}, ent.xLabel, {
          position: ent.position.getValue(currentTime)
        });
        labels.add(label);
      }
    });
  };

  viewer.camera.moveEnd.addEventListener(function() {
    if (Cesium.SceneMode.MORPHING === viewer.scene.mode) {
      // stop it
      return;
    }
    var viewRectangles = computeViewRectangles();
    if (viewRectangles) {
      var vr1 = viewRectangles[0];
      bbox1.rectangle.coordinates = vr1;
      var boundingBoxes = [
        [
          Cesium.Math.toDegrees(vr1.west),
          Cesium.Math.toDegrees(vr1.south),
          Cesium.Math.toDegrees(vr1.east),
          Cesium.Math.toDegrees(vr1.north)
        ]
      ];
      if (viewRectangles.length > 1) {
        var vr2 = viewRectangles[1];
        bbox2.rectangle.coordinates = vr2;
        boundingBoxes.push([
          Cesium.Math.toDegrees(vr2.west),
          Cesium.Math.toDegrees(vr2.south),
          Cesium.Math.toDegrees(vr2.east),
          Cesium.Math.toDegrees(vr2.north)
        ]);
      } else {
        bbox2.rectangle.coordinates = Cesium.Rectangle.fromDegrees(0, 0, 0, 0);
      }
      turfIndex.getVisibleIds(boundingBoxes).then(addVisibleLabels);
    }
  });

  var getRandomInRange = function(from, to, fixed) {
    return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
    // .toFixed() returns string, so ' * 1' is a trick to convert to number
  };

  var populate = function() {
    var pixelOffset = new Cesium.Cartesian2(0, -8);
    viewer.entities.suspendEvents();
    var entityMap = {};
    for (var i = 0; i < 100; i++) {
      var lng = getRandomInRange(-180, 180, 5);
      var lat = getRandomInRange(-90, 90, 5);
      // console.log("lng: " + lng + " lat: " + lat);
      // var lng = -Math.random() * 180;
      // var lat = Math.random() * 180;
      var id = "test_" + i;
      entityMap[id] = {
        id: id,
        lng: lng,
        lat: lat
      };
      var pos = new Cesium.Cartesian3.fromDegrees(lng, lat);
      var e = viewer.entities.add({
        id: id,
        position: pos,
        billboard: {
          image:
            "https://cesiumjs.org/Cesium/Apps/Sandcastle/images/facility.gif"
        }
      });
      e.xLabel = {
        text: id,
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: pixelOffset
      };
      // e.label = e.anoleLabel;
    } // end for loop
    viewer.entities.resumeEvents();
    turfIndex.index(entityMap);
  };

  setTimeout(create2dRotateButton, 250);
  setTimeout(populate, 1500);

  var labelEnt = viewer.entities.add({
    label: {
      show: false,
      showBackground: true,
      font: "14px monospace",
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      pixelOffset: new Cesium.Cartesian2(15, 0)
    }
  });

  var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(function(movement) {
    var cartesian = viewer.camera.pickEllipsoid(
      movement.endPosition,
      viewer.scene.globe.ellipsoid
    );

    if (cartesian) {
      var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      var longitudeString = Cesium.Math.toDegrees(
        cartographic.longitude
      ).toFixed(2);
      var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(
        2
      );
      // console.log("mouse move end: ", movement.endPosition);
      labelEnt.position = cartesian;
      labelEnt.label.show = true;
      labelEnt.label.text =
        "Lon: " +
        ("   " + longitudeString).slice(-7) +
        "\u00B0" +
        "\nLat: " +
        ("   " + latitudeString).slice(-7) +
        "\u00B0";
    } else {
      labelEnt.label.show = false;
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
})();
