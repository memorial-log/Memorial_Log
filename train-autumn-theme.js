/* Oak & Acorn front / Oak Letter B3 back. All values are editable defaults. */
(function () {
  'use strict';
  var INK = '#f2ede2', RED = '#ff4637', OLIVE = '#625b3c', PAPER = '#242320';
  var barcode, solidPixel;
  function pixelAsset(){if(!solidPixel){var c=document.createElement('canvas');c.width=c.height=1;var ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1,1);solidPixel=c.toDataURL('image/png');}return solidPixel;}
  function barcodeAsset() {
    if (barcode) return barcode;
    var canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 220;
    var ctx = canvas.getContext('2d'); ctx.fillStyle = INK;
    // Decorative serial bars, stored as an ordinary recolorable raster layer.
    var widths = [2,1,1,3,1,2,4,1,2,1,1,3,2,2,1,4,1,1,2,3,1,2,1,1,4,2,1,3,2,1,1,3,1,2,3,1,2,1,4,1,2,2,1,3,1,1,2,4,1,2,1,3,2,1,1,2,3,1,4,1,2,1,3,2,1,1,2,3,1,2,4,1];
    var total=widths.reduce(function(a,b){return a+b;},0), x=0;
    widths.forEach(function(w,i){if(i%2===0)ctx.fillRect(x*600/total,0,w*600/total,220);x+=w;});
    barcode=canvas.toDataURL('image/png'); return barcode;
  }
  function create(next, normalize, block) {
    var A=window.LOG_TICKET_AUTUMN_ASSETS, layers={front:[],back:[]};
    next.theme='dark'; next.accent=INK; next.quoteColor=INK; next.muted=INK;
    next.texture=true; next.textureStrength=18; next.quoteEffect='solid';
    next.side='front'; next.postcardViewMode='front'; next.motion='none';
    next.hiddenLayers=[]; next.removedLayers=[]; next.selectedLayer='';
    ['frontMain','backMain','frontStub','backStub'].forEach(function(k){next.blocks[k]=block(PAPER);});
    function base(side,key,name,type,x,y,w,h){return {id:'custom-autumn-'+side+'-'+key,side:side,type:type,name:name,x:x/9.6,y:y/4.8,w:w/9.6,h:h/4.8,rotation:0,opacity:100};}
    function text(side,key,name,value,x,y,w,size,extra){var t=Object.assign(base(side,key,name,'text',x,y,w,size*1.2),{text:value,font:'noto-serif',fontSize:size,fontWeight:'400',color:INK,lineHeight:'1.35',autoHeight:true,boundsTrimmed:true,whiteSpace:'pre-wrap'},extra||{});layers[side].push(t);return t;}
    function rect(side,key,name,x,y,w,h,color,extra){if(!extra&&(w<28.8||h<14.4))return art(side,key,name,pixelAsset(),x,y,w,h,color||INK);var t=Object.assign(base(side,key,name,'shape',x,y,w,h),{shapeKind:'rectangle',fillMode:'color',fillColor:color||INK,stroke:{enabled:false,width:0}},extra||{});layers[side].push(t);return t;}
    function rule(side,key,x,y,w){return rect(side,key,'구분선',x,y,w,.7);}
    function art(side,key,name,src,x,y,w,h,color){var t=Object.assign(base(side,key,name,'image',x,y,w,h),{imageData:src,imageName:name+'.png',imageType:'image/png',fit:'contain',effect:{overlay:100,overlayColor:color||OLIVE,overlayBlend:'normal'}});layers[side].push(t);return t;}
    var masthead={font:'bodoni-archive',fontWeight:'900',color:RED,lineHeight:'1',letterSpacing:'-5px',whiteSpace:'pre'};
    art('front','oak-left','참나무와 도토리 · 왼쪽',A.bough,8,225,255,238);
    art('front','oak-right','참나무와 도토리 · 오른쪽',A.bough,481,293,217,229);
    art('front','leaf','낙엽',A.leaf,82,143,66,69);
    text('front','masthead','Autumn','AUTUMN',17,-2,676,141,masthead);
    rect('front','arch-photo','아치 사진',156,81,326,399,PAPER,{shapeKind:'arch',fillMode:'image',imageData:'',imageName:'',imageType:'',fit:'cover',imageFrameW:326/9.6,imageFrameH:399/4.8,effect:{brightness:97,saturation:90,contrast:101,grain:10,filmTone:0,readability:0}});
    text('front','season-label','Seasonal Memory Ticket','SEASONAL\nMEMORY\nTICKET',19,146,114,11.5,{letterSpacing:'1px',lineHeight:'1.22'});
    rule('front','edition-rule',20,207,46);
    text('front','edition','Limited Edition','LIMITED\nEDITION\nNO.0719',20,221,112,10.4,{letterSpacing:'.8px',lineHeight:'1.24'});
    text('front','margin-note','Season Note','SOME\nPLACES\nSTAY\nIN OUR\nSEASONS.',20,387,97,9.5,{letterSpacing:'.7px',lineHeight:'1.36'});
    rule('front','quote-rule',545,145,140);
    text('front','quote','Main Quote','우리가 지나온\n모든 밤은\n사라진 게 아니라\n길이 되었다.',549,168,143,19,{font:'gowun-batang',lineHeight:'1.35'});
    rule('front','speaker-rule',550,287,21);
    text('front','speaker','Speaker','해온',549,299,118,14,{font:'gowun-batang'});
    // The sideways masthead is live text. Its full content stays movable.
    text('back','masthead','Autumn · 세로 타이틀','AUTUMN',-193,178,522,111,Object.assign({},masthead,{rotation:-90,letterSpacing:'-4px',scaleX:.86}));
    art('back','leaf','낙엽',A.leaf,127,12,103,107);
    text('back','heading','Memory Heading','기억은 도착지가 아니라,\n계속 이어지는 노선이다.',174,68,497,46,{font:'gowun-batang',lineHeight:'1.27'});
    rule('back','heading-rule',140,209,503);
    text('back','record-left','Memory Record · 1','어떤 계절은 스쳐가도,\n어떤 계절은 오래도록\n마음에 남는다.\n붉게 물든 풍경 사이로,\n우리는 조금 더 단단한\n사람이 된다.',140,233,155,14.5,{font:'gowun-batang',lineHeight:'1.5'});
    text('back','record-right','Memory Record · 2','지나온 날들이 모여 지금의\n너와 나를 만들었다.\n그리고 아직도 더 이어질\n이야기가 있다.\n가을은 끝이 아니라,\n다음을 향해 가는 또 하나의\n시작이다.',306,233,176,14.5,{font:'gowun-batang',lineHeight:'1.5'});
    rule('back','footer-rule',140,409,503);
    [[140,'DEPARTURE','HAEON'],[290,'ARRIVAL','MIRA'],[425,'DATE','2026.10.21']].forEach(function(r,i){text('back','footer-label-'+i,r[1],r[1],r[0],421,125,10);text('back','footer-value-'+i,r[1]+' Value',r[2],r[0],438,143,15.5);});
    rect('back','footer-divider-1','구분선',247,421,.7,36);
    rect('back','footer-divider-2','구분선',383,421,.7,36);
    art('back','oak','참나무와 도토리',A.bough,477,198,235,237);
    text('back','edition','Limited Edition','LIMITED EDITION\nNO.0719',603,441,92,8.8,{letterSpacing:'.2px',lineHeight:'1.25'});
    ['front','back'].forEach(function(side){
      rule(side,'coupon-top-rule',723,35,214);
      text(side,'coupon-title','Autumn Passage','AUTUMN\nPASSAGE',686,40,288,53,{font:'bodoni-archive',lineHeight:'.88',letterSpacing:'-1.8px',scaleX:.75,align:'center',whiteSpace:'pre'});
      rule(side,'coupon-title-rule',723,146,214);
      text(side,'coupon-conductor','Conductor’s Coupon','CONDUCTOR’S COUPON',723,154,214,11.4,{align:'center',letterSpacing:'1.2px'});
      // Approved B3: no rule between this label and the red admission band.
      rect(side,'coupon-band','Admit One · 배경',723,185,214,39,RED);
      text(side,'coupon-admit','Admit One','ADMIT ONE',723,184,214,31,{font:'bodoni-archive',fontWeight:'500',color:'#090908',align:'center',lineHeight:'1.2',letterSpacing:'-.4px'});
      rule(side,'coupon-admit-rule',723,235,214);
      [['CAR / SEAT','07 · 18'],['FARE / ROUTE','NL–07'],['SERIAL','LT 0719 · 23:48']].forEach(function(r,i){var y=246+i*33;text(side,'coupon-label-'+i,r[0],r[0],723,y+1,98,11.7);text(side,'coupon-value-'+i,r[0]+' Value',r[1],803,y-3,134,i===2?17.2:19,{align:'right',font:'bodoni-archive'});rule(side,'coupon-row-rule-'+i,723,y+25,214);});
      rule(side,'coupon-footer-top',723,358,214);
      [[723,61,'HAEON'],[786,62,'MIRA'],[854,83,'2026.10.21']].forEach(function(r,i){text(side,'coupon-meta-'+i,['Departure','Arrival','Date'][i],r[2],r[0],367,r[1],12.4,{align:'center',font:'bodoni-archive'});});
      rect(side,'coupon-meta-rule-1','구분선',785,363,.7,28);
      rect(side,'coupon-meta-rule-2','구분선',852,363,.7,28);
      rule(side,'coupon-footer-bottom',723,394,214);
      art(side,'coupon-barcode','Serial Barcode',barcodeAsset(),723,405,122,48,INK);
      text(side,'coupon-note','Coupon Note','GOOD\nPEOPLE\nFARTHER\nPLACES',853,409,56,8.5,{lineHeight:'1.18',letterSpacing:'.5px'});
      rect(side,'coupon-star','별',908,413,25,28,INK,{shapeKind:'star',starPoints:4});
    });
    next.customLayers=normalize(layers);
    // Native scaffolding first, followed by independently selectable ink layers.
    next.layerOrder=next.layerOrder.concat(layers.front.concat(layers.back).map(function(i){return i.id;}));
    return restoreTypography(refine(next));
  }
  function refine(next) {
    var remove = ['edition-rule','quote-rule','coupon-top-rule','coupon-title-rule','coupon-admit-rule','coupon-star'];
    ['front','back'].forEach(function(side){
      var prefix='custom-autumn-'+side+'-', removed=[];
      next.customLayers[side]=next.customLayers[side].filter(function(item){
        var key=item.id.slice(prefix.length);
        if(item.id.indexOf(prefix)===0 && remove.indexOf(key)>=0){removed.push(item.id);return false;}return true;
      });
      var changes={
        'coupon-conductor':{y:161/4.8},
        'coupon-admit':{x:722.2/9.6,y:187.2/4.8,w:214/9.6,align:'center'},
        'coupon-meta-0':{y:369/4.8},
        'coupon-meta-1':{x:785.7/9.6,w:66.3/9.6,y:369/4.8,align:'center'},
        'coupon-meta-2':{y:369/4.8},
        'coupon-note':{w:84/9.6,align:'right'}
      };
      if(side==='front')Object.assign(changes,{'edition':{y:199/4.8},'quote':{y:148/4.8},'speaker-rule':{y:255/4.8},'speaker':{y:267/4.8},'oak-right':{y:241/4.8,h:262/4.8}});
      next.customLayers[side].forEach(function(item){
        if(item.id.indexOf(prefix)!==0)return;
        var key=item.id.slice(prefix.length),change=changes[key];
        if(change){Object.assign(item,change);if(next.placements&&next.placements[side])delete next.placements[side][item.id];}
        if(['oak-left','oak-right','oak'].indexOf(key)>=0){
          item.imageData=window.LOG_TICKET_AUTUMN_ASSETS.bough;
          item.effect.overlayBlend='multiply';item.opacity=100;
          if(key!=='oak-left'){
            // The PNG's last visible half-pixel meets the 72.8% perforation.
            item.x=72.8-item.w*(430.5/436);
            if(next.placements&&next.placements[side])delete next.placements[side][item.id];
          }
        }
      });
      if(next.layerOrders&&next.layerOrders[side])next.layerOrders[side]=next.layerOrders[side].filter(function(id){return removed.indexOf(id)<0;});
      next.layerOrder=next.layerOrder.filter(function(id){return removed.indexOf(id)<0;});
      removed.forEach(function(id){
        if(next.shadows)delete next.shadows[id];
        ['placements','layerStyles','inlineTextStyles','sideStrokes','sideShadows'].forEach(function(key){
          if(next[key]&&next[key][side])delete next[key][side][id];
        });
        ['hidden','locked','clipping','removedLayers'].forEach(function(key){
          if(Array.isArray(next[key]))next[key]=next[key].filter(function(token){return token!==id&&token!==side+'::'+id;});
        });
      });
    });
    return next;
  }
  function restoreTypography(next, previousVersion) {
    if(next.template!=='train-autumn')return next;
    var version=arguments.length>1?previousVersion:next.autumnTypographyRollbackVersion;
    if(version===1)return next;
    var originalFonts={"custom-autumn-front-masthead":{"font":"bodoni-archive","fontWeight":"900","fontStyle":"normal"},"custom-autumn-front-season-label":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-edition":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-margin-note":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-quote":{"font":"gowun-batang","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-speaker":{"font":"gowun-batang","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-title":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-conductor":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-admit":{"font":"bodoni-archive","fontWeight":"500","fontStyle":"normal"},"custom-autumn-front-coupon-label-0":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-value-0":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-label-1":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-value-1":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-label-2":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-value-2":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-meta-0":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-meta-1":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-meta-2":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-front-coupon-note":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-masthead":{"font":"bodoni-archive","fontWeight":"900","fontStyle":"normal"},"custom-autumn-back-heading":{"font":"gowun-batang","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-record-left":{"font":"gowun-batang","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-record-right":{"font":"gowun-batang","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-footer-label-0":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-footer-value-0":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-footer-label-1":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-footer-value-1":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-footer-label-2":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-footer-value-2":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-edition":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-title":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-conductor":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-admit":{"font":"bodoni-archive","fontWeight":"500","fontStyle":"normal"},"custom-autumn-back-coupon-label-0":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-value-0":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-label-1":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-value-1":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-label-2":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-value-2":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-meta-0":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-meta-1":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-meta-2":{"font":"bodoni-archive","fontWeight":"400","fontStyle":"normal"},"custom-autumn-back-coupon-note":{"font":"noto-serif","fontWeight":"400","fontStyle":"normal"}};
    ['front','back'].forEach(function(side){
      (next.customLayers[side]||[]).forEach(function(item){
        var original=originalFonts[item.id];if(!original)return;
        Object.assign(item,original);
        var styles=next.layerStyles&&next.layerStyles[side]&&next.layerStyles[side][item.id];
        if(styles){styles.fontFamily=original.font;styles.fontWeight=original.fontWeight;styles.fontStyle=original.fontStyle;}
        (item.inlineTextStyles||[]).forEach(function(run){delete run.fontFamily;delete run.fontWeight;delete run.fontStyle;});
        if(item.id==='custom-autumn-back-masthead'){
          Object.assign(item,{"x":-20.104166666666668,"y":37.083333333333336,"w":54.375,"h":27.75,"rotation":-90,"fontSize":111,"letterSpacing":"-4px","scaleX":0.86,"scaleY":1});
          if(next.placements&&next.placements.back)delete next.placements.back[item.id];
          if(styles)['fontSize','letterSpacing','lineHeight'].forEach(function(k){delete styles[k];});
        }
      });
    });
    next.autumnTypographyRollbackVersion=1;
    return next;
  }
  window.LOG_TICKET_AUTUMN_THEME={create:create,refine:refine,restoreTypography:restoreTypography};
})();
