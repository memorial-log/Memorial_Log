/* Only the requested display lettering changes; geometry remains document data. */
(function(){
  'use strict';
  // html2canvas measures text baselines using the family's regular face even
  // when it paints bold. Prime those faces before its synchronous measurement.
  var metricsReady=document.fonts?Promise.all([
    document.fonts.load('400 16px "Memorial Winter"'),
    document.fonts.load('400 16px "Memorial Didone"')
  ]):Promise.resolve();
  function apply(next, previousVersion){
    if(['train-winter','train-autumn'].indexOf(next.template)<0)return next;
    var version=arguments.length>1?previousVersion:next.seasonDisplayFontVersion;
    if(version===1)return next;
    var season=next.template.slice(6),font=season==='winter'?'memorial-winter':'memorial-didone';
    ['front','back'].forEach(function(side){
      var prefix='custom-'+season+'-'+side+'-';
      (next.customLayers[side]||[]).forEach(function(item){
        if(item.id!==prefix+'coupon-title'&&item.id!==prefix+(season==='winter'?'wordmark':'masthead'))return;
        item.font=font;
        var style=next.layerStyles&&next.layerStyles[side]&&next.layerStyles[side][item.id];
        if(style)style.fontFamily=font;
        // Preserve color, weight, size and all positions, including inline ranges.
        (item.inlineTextStyles||[]).forEach(function(run){if(run.fontFamily)run.fontFamily=font;});
        (item.styledRuns||[]).forEach(function(run){if(run.fontFamily)run.fontFamily=font;});
        if(item.typingStyle&&item.typingStyle.fontFamily)item.typingStyle.fontFamily=font;
      });
    });
    next.seasonDisplayFontVersion=1;
    return next;
  }
  window.LOG_TICKET_SEASON_FONTS={apply:apply,ready:function(){return metricsReady;}};
})();
