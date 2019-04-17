(function() {
  importScripts(
    "https://npmcdn.com/@turf/turf/turf.min.js",
    "https://cdn.jsdelivr.net/npm/comlinkjs@3.1.1/umd/comlink.js"
  );
  console.debug("turfIndex init");
  var turfIndex = {};

  Comlink.expose(turfIndex, self);
})();
