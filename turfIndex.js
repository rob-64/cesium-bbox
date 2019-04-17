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

  turfIndex.getVisibleIds = function(bbox) {
    // console.log("inView: ", bbox);
    var view = turf.bboxPolygon(bbox);
    console.log("truf view: ", view);
    var entList = Object.values(_entities);
    console.log("_entities: ", entList.length);
    var visible = [];
    var opts = { ignoreBoundary: true };
    entList.forEach(function(e) {
      var ptVisible = turf.booleanPointInPolygon(e.point, view, opts);
      // console.log("ptVisible: ", e, ptVisible);
      if (ptVisible) {
        visible.push(e.id);
      }
    });
    console.log("visible: ", visible.length);
    return visible;
  };

  Comlink.expose(turfIndex, self);
})();
