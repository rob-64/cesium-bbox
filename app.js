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

  var cameraBbox = viewer.entities.add({
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(0, 0, 0, 0),
      material: Cesium.Color.RED.withAlpha(0.5)
    }
  });

  var pickMap = function(x, y) {
    var cartesian = viewer.camera.pickEllipsoid(
      new Cesium.Cartesian2(x, y),
      viewer.scene.globe.ellipsoid
    );
    if (cartesian) {
      var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      if (cartographic) {
        return {
          lng: Cesium.Math.toDegrees(cartographic.longitude),
          lat: Cesium.Math.toDegrees(cartographic.latitude)
        };
      }
    }
  };

  var computeViewRectangle = function() {
    var w = viewer.scene.canvas.clientWidth;
    var h = viewer.scene.canvas.clientHeight;
    var center = pickMap(w / 2, h / 2);
    var topLeft = pickMap(0, 0);
    if (!topLeft) {
      topLeft = {
        lng: -180.0,
        lat: 90.0
      };
    }
    var bottomLeft = pickMap(0, h);
    if (!bottomLeft) {
      bottomLeft = {
        lng: -180.0,
        lat: -90.0
      };
    }
    var topRight = pickMap(w, 0);
    if (!topRight) {
      topRight = {
        lng: 180.0,
        lat: 90.0
      };
    }
    var bottomRight = pickMap(w, h);
    if (!bottomRight) {
      bottomRight = {
        lng: 180.0,
        lat: -90.0
      };
    }
    console.log("topLeft: ", topLeft);
    console.log("bottomLeft: ", bottomLeft);
    console.log("topRight: ", topRight);
    console.log("bottomRight: ", bottomRight);
    console.log("center: ", center);
    console.log("===========================");
    // fix wrap around picks
    if (center) {
      if (topLeft.lng > center.lng) {
        console.debug("fixing topLeft.lng ", topLeft.lng);
        topLeft.lng = -180.0;
      }
      if (bottomLeft.lng > center.lng) {
        bottomLeft.lng = -180.0;
      }
      if (topRight.lng < center.lng) {
        topRight.lng = 180.0;
      }
      if (bottomRight.lng < center.lng) {
        bottomRight.lng = 180.0;
      }
    }
    // fix when there is one point of a side off the map
    if (topLeft.lng < bottomLeft.lng) {
      topLeft.lng = bottomLeft.lng;
    } else if (bottomLeft.lng < topLeft.lng) {
      bottomLeft.lng = topLeft.lng;
    } else if (center && topLeft.lng === -180 && bottomLeft.lng === -180) {
      var centerLeft = pickMap(0, h / 2);
      // console.log("centerLeft: ", centerLeft);
      if (centerLeft && centerLeft.lng < center.lng) {
        topLeft.lng = centerLeft.lng;
        bottomLeft.lng = centerLeft.lng;
      }
    }

    if (topRight.lng > bottomRight.lng) {
      topRight.lng = bottomRight.lng;
    } else if (bottomRight.lng > topRight.lng) {
      bottomRight.lng = topRight.lng;
    } else if (center && topRight.lng === 180 && bottomRight.lng === 180) {
      var centerRight = pickMap(w, h / 2);
      // console.log("centerRight: ", centerRight);
      if (centerRight && centerRight.lng > center.lng) {
        topRight.lng = centerRight.lng;
        bottomRight.lng = centerRight.lng;
      }
    }

    console.log("topLeft: ", topLeft);
    console.log("bottomLeft: ", bottomLeft);
    console.log("topRight: ", topRight);
    console.log("bottomRight: ", bottomRight);
    var west = Math.min(topLeft.lng, bottomLeft.lng);
    var south = Math.min(bottomLeft.lat, bottomRight.lat);
    var east = Math.max(bottomRight.lng, topRight.lng);
    var north = Math.max(topRight.lat, topLeft.lat);
    return Cesium.Rectangle.fromDegrees(west, south, east, north);
  };

  var addVisibleLabels = function(ids) {
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
    labels.removeAll();
    var camera = viewer.scene.camera;
    var viewRectangle;
    if (Cesium.SceneMode.SCENE3D === viewer.scene.mode) {
      viewRectangle = camera.computeViewRectangle(Cesium.Ellipsoid.WGS84);
      cameraBbox.rectangle.coordinates = viewRectangle.clone();
    } else {
      viewRectangle = computeViewRectangle();
      cameraBbox.rectangle.coordinates = viewRectangle;
    }
    if (viewRectangle) {
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
})();
