(function() {
  var turfIndex = Comlink.proxy(new Worker("turfIndex.js"));
  var viewer = new Cesium.Viewer("cesiumContainer", {
    mapProjection: new Cesium.GeographicProjection(),
    mapMode2D: Cesium.MapMode2D.ROTATE,
    timeline: false,
    geocoder: false,
    baseLayerPicker: false,
    selectionIndicator: false,
    sceneModePicker: true,
    sceneMode: Cesium.SceneMode.SCENE2D,
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

  var drawPick = function(x, y) {
    var can = document.createElement("canvas");
    var ctx = can.getContext("2d");
    can.width = 6;
    can.height = 6;
    var style = `position:fixed;top:${y}px;left:${x}px;z-index:99;`;
    can.style = style;
    can.className = "xpick";

    ctx.rect(0, 0, 6, 6);
    ctx.fillStyle = "green";
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
  };

  // var pickCorner = function(x, y, xStep, yStep, tryLimit, positions) {
  //   var lx = x;
  //   var ly = y;
  //   var corner = pickMap(lx, ly);
  //   var tryCount = 1;
  //   while (!corner) {
  //     if (tryCount >= tryLimit) {
  //       break;
  //     }
  //     ly += yStep;
  //     lx += xStep;
  //     corner = pickMap(lx, ly);
  //     if (corner) {
  //       // drawPick(lx, ly);
  //       break;
  //     }
  //     var x1 = lx - xStep;
  //     corner = pickMap(x1, ly);
  //     if (corner) {
  //       // drawPick(x1, ly);
  //       break;
  //     }
  //     var y1 = ly - yStep;
  //     corner = pickMap(lx, y1);
  //     if (corner) {
  //       // drawPick(x1, y1);
  //       break;
  //     }
  //     // console.log("lx ly, x1, y1 = ", lx, ly, x1, y1);
  //     tryCount++;
  //   }
  //   if (corner) {
  //     var lngLat = cartesianToLngLat(corner);
  //     corner.longitude = lngLat.longitude;
  //     corner.latitude = lngLat.latitude;
  //     positions.push(corner);
  //     // console.log("corner: ", corner);
  //     return true;
  //   }
  //   return false;
  // };

  var sampleWorldPositions = function(
    x,
    y,
    xStep,
    yStep,
    stepCount,
    positions
  ) {
    var counter = 0;
    while (counter <= stepCount) {
      var pos = pickMap(x, y);
      if (pos) {
        positions.push(pos);
      }
      x += xStep;
      y += yStep;
      counter++;
    }
    // var lastCp;
    // for (i = 0; i < crossPositions.length; i++) {
    //   var cp = crossPositions[i];
    //   if (lastCp) {
    //     if ((lastCp.longitude < 0 && cp.longitude > 0) || (lastCp.longitude > 0 && cp.longitude < 0)) {
    //       var diff = Math.abs(lastCp.longitude) + Math.abs(cp.longitude);
    //       console.log("diff is:", diff, lastCp.longitude, cp.longitude)
    //       if (diff > 180) {
    //         console.warn("diff over 100")

    //         return true;
    //       }
    //     }
    //   }
    //   lastCp = cp;
    // }

    // return false;
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

  var computeViewRectangles = function() {
    try {
      removePicks();
      var viewRectangles = [];
      var w = viewer.scene.canvas.clientWidth;
      var h = viewer.scene.canvas.clientHeight;

      // var corners = [];
      // var corner = pickMap(1, 1);
      // if (corner) {
      //   corners.push(corner);
      // }
      // corner = pickMap(1, h - 1);
      // if (corner) {
      //   corners.push(corner);
      // }
      // corner = pickMap(w - 1, h - 1);
      // if (corner) {
      //   corners.push(corner);
      // }
      // corner = pickMap(1, h - 1);
      // if (corner) {
      //   corners.push(corner);
      // }

      // if (corners.length === 4) {
      //   console.log("corners: ", corners);
      //   viewRectangle = createRectangle(corners);
      //   var viewRectangleWidth = Cesium.Math.toDegrees(viewRectangle.width);
      //   // console.log("computeViewRectangle: corners: ", viewRectangle);
      //   if (viewRectangleWidth <= 100) {
      //     return viewRectangle;
      //   }
      // }

      // if(Cesium.Math.toDegrees(viewRectangle.east) - Math.abs(Cesium.Math.toDegrees(viewRectangle.west))  ){
      //   console
      // }

      var positions = [];
      var gridLines = 10;
      // TODO pick step count based on canvas w/h %
      var stepCount = 60;
      var xStep = w / stepCount;
      var yStep = h / stepCount;

      var topLeft = pickMap(1, 1);
      var bottomLeft = pickMap(1, h - 1);
      var bottomRight = pickMap(w - 1, h - 1);
      var topRight = pickMap(1, h - 1);

      // for (var i = 1; i <= gridLines; i++) {
      //   var y = (h / gridLines) * i;
      //   sampleWorldPositions(0, y, xStep, 0, stepCount, positions);
      // }
      // for (var i = 1; i <= gridLines; i++) {
      //   var x = (w / gridLines) * i;
      //   sampleWorldPositions(x, 0, 0, yStep, stepCount, positions);
      // }

      // topLeft to bottomRight
      sampleWorldPositions(0, 0, xStep, yStep, stepCount, positions);
      // bottomLeft to topRight
      sampleWorldPositions(0, h, xStep, -yStep, stepCount, positions);
      // centerTop to centerBottom
      sampleWorldPositions(w / 2, 0, 0, yStep, stepCount, positions);
      // centerLeft to centerRight
      sampleWorldPositions(0, h / 2, xStep, 0, stepCount, positions);

      sampleWorldPositions(0, h / 4, xStep, 0, stepCount, positions);
      sampleWorldPositions(0, (h / 4) * 3, xStep, 0, stepCount, positions);

      // sampleWorldPositions(0, h / 4, xStep, yStep / 2, stepCount, positions);'
      var vr = createRectangle(positions);
      var width = Cesium.Math.toDegrees(vr.width);
      console.log("computeViewRectangle: width: ", width);
      if (width > 270) {
        console.warn("its a wrap!!!!!");
        var longitudes = positions.map(function(p) {
          return p.longitude;
        });
        longitudes.sort(function(lng1, lng2) {
          if (lng1 < lng2) {
            return -1;
          } else if (lng1 > lng2) {
            return 1;
          }
          return 0;
        });
        var positiveLngs = longitudes.filter(function(lng) {
          return lng >= 0;
        });
        // console.log("positiveLngs: ", positiveLngs);
        var vr1 = Cesium.Rectangle.fromDegrees(
          positiveLngs[0],
          Cesium.Math.toDegrees(vr.south),
          positiveLngs[positiveLngs.length - 1],
          Cesium.Math.toDegrees(vr.north)
        );
        viewRectangles.push(vr1);
        var negativeLngs = longitudes.filter(function(lng) {
          return lng <= 0;
        });
        // console.log("negativeLngs: ", negativeLngs);
        var vr2 = Cesium.Rectangle.fromDegrees(
          negativeLngs[0],
          Cesium.Math.toDegrees(vr.south),
          negativeLngs[negativeLngs.length - 1],
          Cesium.Math.toDegrees(vr.north)
        );
        viewRectangles.push(vr2);
      } else {
        viewRectangles.push(vr);
      }
      return viewRectangles;
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
