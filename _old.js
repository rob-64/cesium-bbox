        // var cameraHeading = Cesium.Math.toDegrees(viewer.camera.heading);
        // console.log("cameraHeading: ", cameraHeading);
        // if (cameraHeading >= 315 || cameraHeading <= 45) {
        //   console.warn("camera northish");
        // } else {
        //   console.warn("camera southish");
        // }

        // var tlx = 0;
        // var tly = 0;
        // var topLeft = pickMap(tlx, tly);
        // console.log("top left: ", tlx, tly, topLeft);
        // while (!topLeft) {
        //   tly += 20;
        //   topLeft = pickMap(tlx, tly);
        //   console.log("top left: ", tlx, tly, topLeft);
        //   if (!topLeft) {
        //     tlx += 20;
        //     topLeft = pickMap(tlx, tly);
        //     console.log("top left: ", tlx, tly, topLeft);
        //   }
        // }

        // if (topLeft) {
        //   positions.push(topLeft);
        // }

        // var bottomLeft = pickMap(0, h);
        // if (bottomLeft) {
        //   positions.push(bottomLeft);
        // }
        // var topRight = pickMap(w, 0);
        // if (topRight) {
        //   positions.push(topRight);
        // }
        // var bottomRight = pickMap(w, h);
        // if (bottomRight) {
        //   positions.push(bottomRight);
        // }

        // var viewRectangle = Cesium.Rectangle.fromCartesianArray(
        //   positions,
        //   viewer.scene.globe.ellipsoid
        // );

        // if (viewRectangle.east > viewRectangle.west) {
        //   console.warn("east > west");
        // }

        // var crossedDL = crossedDateline(
        //   Cesium.Math.toDegrees(viewRectangle.west),
        //   Cesium.Math.toDegrees(viewRectangle.east)
        // );
        // console.warn("crossedDateline: ", crossedDL);
        // if (crossedDL) {
        //   viewRectangle = new Cesium.Rectangle(
        //     viewRectangle.east,
        //     viewRectangle.south,
        //     viewRectangle.west,
        //     viewRectangle.north
        //   );
        // }

        // var cameraPos = cartesianToLngLat(viewer.camera.positionWC);
        // var cameraRoll = Cesium.Math.toDegrees(viewer.camera.roll);
        // var cameraRight = cartesianToLngLat(viewer.camera.rightWC);
        // var cameraHeading = Cesium.Math.toDegrees(viewer.camera.heading);
        // if (cameraPos) {
        //   console.log("camera pos: ", cameraPos);
        //   console.log("cameraRoll: ", cameraRoll);
        //   console.log("cameraHeading: ", cameraHeading);
        //   console.log("cameraRight: ", cameraRight);
        // }
        // var center = pickMap(w / 2, h / 2);
        // var topLeft = pickMap(0, 0);
        // if (!topLeft) {
        //   topLeft = {
        //     lng: -180.0,
        //     lat: 90.0
        //   };
        // }
        // var bottomLeft = pickMap(0, h);
        // if (!bottomLeft) {
        //   bottomLeft = {
        //     lng: -180.0,
        //     lat: -90.0
        //   };
        // }
        // var topRight = pickMap(w, 0);
        // if (!topRight) {
        //   topRight = {
        //     lng: 180.0,
        //     lat: 90.0
        //   };
        // }
        // var bottomRight = pickMap(w, h);
        // if (!bottomRight) {
        //   bottomRight = {
        //     lng: 180.0,
        //     lat: -90.0
        //   };
        // }
        // console.log("topLeft: ", topLeft);
        // console.log("bottomLeft: ", bottomLeft);
        // console.log("topRight: ", topRight);
        // console.log("bottomRight: ", bottomRight);
        // console.log("center: ", center);
        // console.log("===========================");
        // // fix wrap around picks
        // if (center) {
        //   if (topLeft.lng > center.lng) {
        //     console.debug("fixing topLeft.lng ", topLeft.lng);
        //     topLeft.lng = -180.0;
        //   }
        //   if (bottomLeft.lng > center.lng) {
        //     bottomLeft.lng = -180.0;
        //   }
        //   if (topRight.lng < center.lng) {
        //     topRight.lng = 180.0;
        //   }
        //   if (bottomRight.lng < center.lng) {
        //     bottomRight.lng = 180.0;
        //   }
        // }
        // // fix when there is one point of a side off the map
        // if (topLeft.lng < bottomLeft.lng) {
        //   topLeft.lng = bottomLeft.lng;
        // } else if (bottomLeft.lng < topLeft.lng) {
        //   bottomLeft.lng = topLeft.lng;
        // } else if (center && topLeft.lng === -180 && bottomLeft.lng === -180) {
        //   var centerLeft = pickMap(0, h / 2);
        //   // console.log("centerLeft: ", centerLeft);
        //   if (centerLeft && centerLeft.lng < center.lng) {
        //     topLeft.lng = centerLeft.lng;
        //     bottomLeft.lng = centerLeft.lng;
        //   }
        // }

        // if (topRight.lng > bottomRight.lng) {
        //   topRight.lng = bottomRight.lng;
        // } else if (bottomRight.lng > topRight.lng) {
        //   bottomRight.lng = topRight.lng;
        // } else if (center && topRight.lng === 180 && bottomRight.lng === 180) {
        //   var centerRight = pickMap(w, h / 2);
        //   // console.log("centerRight: ", centerRight);
        //   if (centerRight && centerRight.lng > center.lng) {
        //     topRight.lng = centerRight.lng;
        //     bottomRight.lng = centerRight.lng;
        //   }
        // }

        // console.log("topLeft: ", topLeft);
        // console.log("bottomLeft: ", bottomLeft);
        // console.log("topRight: ", topRight);
        // console.log("bottomRight: ", bottomRight);
        // var west = Math.min(topLeft.lng, bottomLeft.lng);
        // var south = Math.min(bottomLeft.lat, bottomRight.lat);
        // var east = Math.max(bottomRight.lng, topRight.lng);
        // var north = Math.max(topRight.lat, topLeft.lat);
        // return Cesium.Rectangle.fromDegrees(west, south, east, north);