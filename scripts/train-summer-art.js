/* The generated PNG pixels define the artwork. These masks only expose its
   existing ink and fill for the editor; no curves are traced or reconstructed. */
(function () {
  'use strict';
  var cache = {};
  function source(kind) {
    return (window.LOG_TICKET_SUMMER_ART_ASSETS || {})[kind] || '';
  }
  function letterCornerFillBoundary(pixels, width, height) {
    // Locate the existing lower-right ink contour in the unedited v12 source.
    // This selects white fill only; the original ink mask is never modified.
    var anchors = [[1280,986],[1290,979],[1300,970],[1310,964],[1320,964],
      [1340,944],[1360,923],[1380,902],[1400,885],[1420,870],[1440,859],
      [1460,850],[1480,843],[1500,840],[1520,838],[1540,843],[1550,857],
      [1560,879],[1580,895],[1596,899]];
    var boundary = new Int32Array(width);boundary.fill(height);
    var segment = 0;
    for(var x=Math.ceil(1280*width/1596);x<width;x++){
      var sourceX=x*1596/width;
      while(segment<anchors.length-2&&sourceX>anchors[segment+1][0])segment++;
      var a=anchors[segment],b=anchors[segment+1];
      var expected=(a[1]+(b[1]-a[1])*(sourceX-a[0])/(b[0]-a[0]))*height/986;
      var edge=Math.min(height,Math.round(expected)),center=edge,distance=Infinity;
      var radius=Math.max(1,Math.ceil(6*height/986));
      for(var y=Math.max(0,center-radius);y<Math.min(height,center+radius+1);y++){
        var i=(y*width+x)*4;
        if(pixels[i+2]-pixels[i]>80&&pixels[i+2]>120&&Math.abs(y-expected)<distance){
          edge=y;distance=Math.abs(y-expected);
        }
      }
      boundary[x]=edge;
    }
    return boundary;
  }
  function masks(kind, image) {
    if (!image || !image.complete || !image.naturalWidth) return null;
    var key = kind + ':' + image.src;
    if (cache[kind] && cache[kind].key === key) return cache[kind];
    var body = document.createElement('canvas'), ink = document.createElement('canvas');
    body.width = ink.width = image.naturalWidth;
    body.height = ink.height = image.naturalHeight;
    var bodyContext = body.getContext('2d', { willReadFrequently: true });
    var inkContext = ink.getContext('2d');
    bodyContext.drawImage(image, 0, 0);
    var pixels = bodyContext.getImageData(0, 0, body.width, body.height);
    var inkPixels = inkContext.createImageData(body.width, body.height);
    var emptyCorner = kind === 'summer-foam-letter'
      ? letterCornerFillBoundary(pixels.data, body.width, body.height) : null;
    for (var i = 0; i < pixels.data.length; i += 4) {
      var red = pixels.data[i], green = pixels.data[i + 1], blue = pixels.data[i + 2];
      var peak = Math.max(red, green, blue);
      // The original PNG uses a black production matte, white interiors and
      // blue ink. Retain its antialiasing and any supplied source alpha.
      var coverage = peak < 12 ? 0 : pixels.data[i + 3] * peak / 255;
      var inkCoverage = coverage * Math.max(0, blue - red) / Math.max(1, peak);
      if(emptyCorner){
        var pixel=i/4;
        if(Math.floor(pixel/body.width)>emptyCorner[pixel%body.width])coverage=inkCoverage;
      }
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
      pixels.data[i + 3] = Math.round(coverage);
      inkPixels.data[i] = inkPixels.data[i + 1] = inkPixels.data[i + 2] = 255;
      inkPixels.data[i + 3] = Math.round(inkCoverage);
    }
    bodyContext.putImageData(pixels, 0, 0);
    inkContext.putImageData(inkPixels, 0, 0);
    cache[kind] = { key: key, body: body, ink: ink };
    return cache[kind];
  }
  window.LOG_TICKET_SUMMER_ART = { source: source, masks: masks };
})();
