(function() {
  importScripts(
    "https://npmcdn.com/@turf/turf/turf.min.js",
    "https://cdn.jsdelivr.net/npm/comlinkjs@3.1.1/umd/comlink.js"
  );
  console.debug("turfIndex init");
  var turfIndex = {};
  var _entities = {};

  turfIndex.index = function(entityMap) {
    Object.values(entityMap).forEach(function(e) {
      _entities[e.id] = {
        id: e.id,
        point: turf.point([e.lng, e.lat])
      };
    });
  };

  turfIndex.clearIndex = function() {
    _entities = {};
  };

  turfIndex.getVisibleIds = function(boundingBoxes) {
    var view2;
    var view1 = turf.bboxPolygon(boundingBoxes[0]);
    if (boundingBoxes.length > 1) {
      view2 = turf.bboxPolygon(boundingBoxes[1]);
    }
    console.log("turf views: ", view1, view2);
    var entList = Object.values(_entities);
    console.log("_entities: ", entList.length);
    var visible = [];
    var opts = { ignoreBoundary: true };
    entList.forEach(function(e) {
      var ptVisible = turf.booleanPointInPolygon(e.point, view1, opts);
      console.debug("ptVisible: ", e, ptVisible);
      if (ptVisible) {
        visible.push(e.id);
      } else if (view2) {
        ptVisible = turf.booleanPointInPolygon(e.point, view2, opts);
        if (ptVisible) {
          visible.push(e.id);
        }
      }
    });
    console.log("visible: ", visible.length);
    return visible;
  };

  Comlink.expose(turfIndex, self);
})();
