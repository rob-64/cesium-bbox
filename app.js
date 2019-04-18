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

  var cameraBbox = viewer.entities.add({
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(0, 0, 0, 0),
      material: Cesium.Color.RED.withAlpha(0.1)
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
    var cartesian = viewer.camera.pickEllipsoid(
      new Cesium.Cartesian2(x, y),
      viewer.scene.globe.ellipsoid
    );
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

  var pickCorner = function(x, y, xStep, yStep, tryLimit, positions) {
    var lx = x;
    var ly = y;
    var corner = pickMap(lx, ly);
    var tryCount = 1;
    while (!corner) {
      if (tryCount >= tryLimit) {
        break;
      }
      ly += yStep;
      lx += xStep;
      corner = pickMap(lx, ly);
      if (corner) {
        drawPick(lx, ly);
        break;
      }
      var x1 = lx - xStep;
      corner = pickMap(x1, ly);
      if (corner) {
        drawPick(x1, ly);
        break;
      }
      var y1 = ly - yStep;
      corner = pickMap(lx, y1);
      if (corner) {
        drawPick(x1, y1);
        break;
      }
      console.log("lx ly, x1, y1 = ", lx, ly, x1, y1);
      tryCount++;
    }
    if (corner) {
      var lngLat = cartesianToLngLat(corner);
      corner.longitude = lngLat.longitude;
      corner.latitude = lngLat.latitude;
      positions.push(corner);
      console.log("corner: ", corner);
      return true;
    }
    return false;
  };

  var computeViewRectangle = function() {
    try {
      var w = viewer.scene.canvas.clientWidth;
      var h = viewer.scene.canvas.clientHeight;

      var positions = [];

      // var center = pickMap(w / 2, h / 2);
      // if (center) {
      //   positions.push(center);
      // }

      removePicks();

      var pixelStep = 20;
      var tryLimit = Math.max(w, h) / pixelStep;
      console.log("tryLimit: ", tryLimit);
      // topLeft screen
      pickCorner(0, 0, pixelStep, pixelStep, tryLimit, positions);
      // bottomLeft screen
      pickCorner(0, h, pixelStep, -pixelStep, tryLimit, positions);
      // bottomRight screen
      pickCorner(w, h, -pixelStep, -pixelStep, tryLimit, positions);
      // topRight screen
      pickCorner(w, 0, -pixelStep, pixelStep, tryLimit, positions);

      var viewRectangle;
      if (positions.length < 4) {
        console.log("positions: ", positions);
        console.warn("using whole world extent");
        viewRectangle = Cesium.Rectangle.fromDegrees(-180, -90, 180, 90);
      } else {
        if (Cesium.SceneMode.SCENE2D === viewer.scene.mode) {
          if (viewer.scene.mapMode2D === Cesium.MapMode2D.ROTATE) {
            // camera could be rotated
          } else {
            // world wraps, camera CANT rotate
            console.warn("wrapping occurs");
          }
        } else {
          // columbus
          console.log("columbus: positions: ", positions);
          var west = 0,
            south = 0,
            east = 0,
            north = 0;
          positions.forEach(function(p) {
            west = Math.min(p.longitude, west);
            south = Math.min(p.latitude, south);
            east = Math.max(p.longitude, east);
            north = Math.max(p.latitude, north);
          });
          viewRectangle = Cesium.Rectangle.fromDegrees(
            west,
            south,
            east,
            north
          );
        }

        // var topLeft = getTopLeftPosition(positions);
        // console.log("topLeft: ", topLeft);
      }
      console.log("computeViewRectangle: viewRectangle: ", viewRectangle);
      return viewRectangle;
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
        // labels.add(label);
      }
    });
  };

  viewer.camera.moveEnd.addEventListener(function() {
    if (Cesium.SceneMode.MORPHING === viewer.scene.mode) {
      // stop it
      return;
    }
    var viewRectangle;
    if (Cesium.SceneMode.SCENE3D === viewer.scene.mode) {
      viewRectangle = viewer.scene.camera.computeViewRectangle(
        Cesium.Ellipsoid.WGS84
      );
    } else {
      viewRectangle = computeViewRectangle();
    }
    if (viewRectangle) {
      cameraBbox.rectangle.coordinates = viewRectangle;
      var bbox = [
        Cesium.Math.toDegrees(viewRectangle.west),
        Cesium.Math.toDegrees(viewRectangle.south),
        Cesium.Math.toDegrees(viewRectangle.east),
        Cesium.Math.toDegrees(viewRectangle.north)
      ];
      turfIndex.getVisibleIds(bbox).then(addVisibleLabels);
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
    for (var i = 0; i < 2000; i++) {
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
