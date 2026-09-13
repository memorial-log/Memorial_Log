/* Winter uses ordinary editable editor layers and the approved raster artwork. */
(function () {
  'use strict';
  var A = window.LOG_TICKET_WINTER_ASSETS;
  var BLUE = '#2024f4', W = 1774, H = 887;
  function film(value) {
    if (!value || typeof value !== 'object') return null;
    function n(key, fallback, max) { var v=Number(value[key]);return Math.max(0,Math.min(max,Number.isFinite(v)?v:fallback)); }
    return {enabled:value.enabled!==false,blur:n('blur',24,50),grain:n('grain',44,100),tone:n('tone',90,100),wash:n('wash',58,100),color:/^#[0-9a-f]{6}$/i.test(value.color||'')?value.color:'#2936ff'};
  }
  function activeFilm(effect) { return effect && effect.enabled!==false && effect.winterFilm && effect.winterFilm.enabled!==false ? film(effect.winterFilm) : null; }
  function create(next, normalize, block) {
    next.theme='light'; next.accent=next.quoteColor=next.muted=BLUE;
    next.texture=false;next.textureStrength=0;next.quoteEffect='solid';next.side='front';next.postcardViewMode='front';next.motion='none';
    next.hidden=[];next.removedLayers=[];next.selectedLayer='';
    ['frontMain','backMain','frontStub','backStub'].forEach(function(k){next.blocks[k]=block('#f9faff');});
    ['front','back'].forEach(function(side){var b=next.blocks[side+'Main'];b.fit='cover';b.effect.winterFilm=film(side==='back'?{}:{blur:0,grain:0,tone:0,wash:12});});
    var layers={front:[],back:[]};
    function base(side,key,name,type,x,y,w,h){return {id:'custom-winter-'+side+'-'+key,side:side,type:type,name:name,x:100*x/W,y:100*y/H,w:100*w/W,h:100*h/H,opacity:100,rotation:0};}
    function text(side,key,name,value,x,y,w,size,extra){var t=Object.assign(base(side,key,name,'text',x,y,w,size*1.35),{text:value,font:'pretendard',fontSize:size*960/W,color:BLUE,fontWeight:'400',lineHeight:'1.25',autoHeight:true,boundsTrimmed:true},extra||{});layers[side].push(t);return t;}
    function image(side,key,name,asset,x,y,w,h){var t=Object.assign(base(side,key,name,'image',x,y,w,h),{imageData:asset,imageName:name+'.png',imageType:'image/png',fit:'contain',effect:{overlay:100,overlayColor:BLUE,overlayBlend:'normal'}});layers[side].push(t);return t;}
    function rule(side,key,x,y,w){image(side,key,'Rule',A.rule,x,y,w,2.4);}
    function snow(side,key,x,y,w,h,asset){return image(side,key,'Snow Crystal',asset||A.snow.src,x,y,w,h);}
    image('front','wordmark','Winter',A.winter.src,A.winter.left*1.04,A.winter.top*1.04-54,A.winter.width*1.04,A.winter.height*1.04);
    // Entire crystals remain in the document; only the ticket silhouette clips them.
    snow('front','snow-left',-7,297,361,384);
    snow('front','snow-top',690,-45,214,176,A.top.src);
    snow('front','snow-upper-right',1033,198,161,176);
    snow('front','snow-center',725,558,112,120);
    snow('front','snow-small',1168,458,76,83);
    text('front','quote','Main Quote','우리가 지나온 모든 밤은\n사라진 게 아니라 길이 되었다.',814,696,550,43,{font:'gowun-batang',align:'right',lineHeight:'1.32'});
    text('front','speaker','Speaker','— 해온',1165,820,198,33,{font:'gowun-batang',align:'right'});
    text('front','edition','Edition','MEMORIAL LOG\nWINTER EDITION\nDEC — FEB\nLT 0719 · 23:48',40,720,320,28,{lineHeight:'1.2'});
    image('back','wordmark','Winter',A.winter.src,30,88,641,190);
    snow('back','snow-top',620,-62,244,214,A.top.src);
    snow('back','snow-left',-174,645,388,414);
    snow('back','snow-small',1178,705,119,131);
    text('back','quote','Memory Heading','기억은 도착지가 아니라,\n계속 이어지는 노선이다.',805,150,480,46,{font:'gowun-batang',align:'right',lineHeight:'1.35'});
    rule('back','record-rule',89,343,1190);
    text('back','body','Memory Record','밤이 깊어질수록 창밖의 풍경은 이름을 잃고, 오래 남은 문장만이 작은 불빛처럼 또렷해집니다.\n이 기록면에는 그날의 대화와 표정, 다시 꺼내 보고 싶은 한순간을 천천히 적어 주세요.\n어디에서 출발했는지보다 무엇을 마음에 남겼는지, 누구와 같은 장면을 바라보았는지가\n더 오래 기억될지도 모릅니다.\n\n열차가 다음 역으로 사라진 뒤에도 이 표는 한동안 당신의 문장을 품고 있습니다.\n시간이 흐른 뒤 다시 펼쳤을 때 그날의 온도와 목소리가 조용히 돌아올 수 있도록,\n빈칸을 서두르지 말고 당신만의 기록으로 채워 주세요.',92,375,1190,30,{font:'gowun-batang',lineHeight:'1.4'});
    [['DEPARTURE','HAEON',380],['ARRIVAL','MIRA',664],['DATE ISSUED','2026.12.21',908]].forEach(function(r,i){text('back','footer-label-'+i,r[0],r[0],r[2],764,210,22);rule('back','footer-rule-'+i,r[2]-4,797,176);text('back','footer-value-'+i,r[0]+' Value',r[1],r[2],808,240,29);});
    ['front','back'].forEach(function(side){
      snow(side,'coupon-snow',1405,498,530,566);
      text(side,'coupon-title','Winter Passage','WINTER\nPASSAGE',1362,74,370,77,{font:'bodoni-moda',lineHeight:'.96',letterSpacing:'-2.6px'});
      text(side,'coupon-admit','Admit One','ADMIT ONE',1363,234,355,34,{letterSpacing:'4px',fontWeight:'500'});
      [['DEPARTURE','HAEON'],['ARRIVAL','MIRA'],['DATE ISSUED','2026.12.21'],['CAR / SEAT','07 · 18']].forEach(function(r,i){var y=288+54*i;text(side,'coupon-label-'+i,r[0],r[0],1363,y,208,25);text(side,'coupon-value-'+i,r[0]+' Value',r[1],1550,y-2,157,31,{align:'right'});rule(side,'coupon-rule-'+i,1363,y+39,345);});
      text(side,'coupon-serial','Serial','LT 0719 · 23:48',1363,502,333,31);
    });
    next.customLayers=normalize(layers);
    return alignFrontSnow(refine(next));
  }
  function refine(next) { return correctTypography(next); }
  function correctTypography(next, previousVersion) {
    if(next.template!=='train-winter')return next;
    var version=arguments.length>1?previousVersion:next.winterTypographyVersion;
    if(version===1)return next;
    ['front','back'].forEach(function(side){
      var prefix='custom-winter-'+side+'-';
      next.customLayers[side].forEach(function(item){
        var heading=item.id===prefix+'wordmark'||item.id===prefix+'coupon-title';
        var caption=side==='front'&&(item.id===prefix+'quote'||item.id===prefix+'speaker');
        if(!heading&&!caption)return;
        if(item.id===prefix+'wordmark'){
          if(item.type==='image'){
            item.color=item.effect.overlayColor||BLUE;
            item.type='text';item.text='Winter';item.imageData='';item.imageName='';item.imageType='';
          }
          // Match the approved raster's narrow Didone proportions with live type.
          // Horizontal scaling is centered by the editor, so compensate once
          // to keep the original visible left edge instead of moving the title.
          if(item.font!=='prata')item.x-=item.w*(1-.78)/2;
          item.fontSize=item.w*9.6/2.62;item.h=item.fontSize/4.8;
          item.autoHeight=true;item.boundsTrimmed=true;item.lineHeight='1';item.whiteSpace='pre';
          item.letterSpacing='-2px';item.scaleX=.78;
        }
        if(heading)item.font='prata';
        if(item.id===prefix+'coupon-title'){item.fontSize=36;item.letterSpacing='-1.8px';item.lineHeight='1.04';}
        item.fontWeight='700';
        var styles=next.layerStyles&&next.layerStyles[side]&&next.layerStyles[side][item.id];
        if(styles){if(heading)styles.fontFamily='prata';styles.fontWeight='700';if(heading)delete styles.fontSize;}
        // Retain colors and other inline styling while removing conflicting fonts/weights.
        function patch(style){if(!style)return;if(heading){delete style.fontFamily;delete style.font;delete style.fontSize;}delete style.fontWeight;}
        (item.inlineTextStyles||[]).forEach(patch);
        (item.styledRuns||[]).forEach(patch);patch(item.typingStyle);
      });
    });
    next.winterTypographyVersion=1;
    return next;
  }
  function alignFrontSnow(next, previousVersion) {
    if(next.template!=='train-winter')return next;
    var version=arguments.length>1?previousVersion:next.winterSnowLayoutVersion;
    if(version===1)return next;
    // Only these two front crystals changed in the reference. Apply the new
    // editable geometry once, without replacing artwork or other saved layers.
    var geometry={
      'custom-winter-front-snow-center':{x:692,y:612,w:112,h:120},
      'custom-winter-front-snow-small':{x:1170,y:452,w:116,h:125}
    };
    (next.customLayers.front||[]).forEach(function(item){
      var box=geometry[item.id];if(!box)return;
      Object.assign(item,{x:100*box.x/W,y:100*box.y/H,w:100*box.w/W,h:100*box.h/H,scaleX:1,scaleY:1});
      if(next.placements&&next.placements.front)delete next.placements.front[item.id];
    });
    next.winterSnowLayoutVersion=1;
    return next;
  }
  function alignOpticalType(next, previousVersion) {
    if(next.template!=='train-winter')return next;
    var version=arguments.length>1?previousVersion:next.winterOpticalLayoutVersion;
    next.winterOpticalLayoutVersion=1;
    if(version===1)return next;
    function clearTracking(item, side) {
      // Keep the editor's native character styles, including saved colors.
      (item.inlineTextStyles||[]).forEach(function(run){delete run.letterSpacing;});
      (item.styledRuns||[]).forEach(function(run){delete run.letterSpacing;});
      if(item.typingStyle)delete item.typingStyle.letterSpacing;
      var style=next.layerStyles&&next.layerStyles[side]&&next.layerStyles[side][item.id];
      if(style)delete style.letterSpacing;
      item.inlineTextStyles=(item.inlineTextStyles||[]).filter(function(run){return Object.keys(run).some(function(key){return key!=='start'&&key!=='end';});});
      return style;
    }
    ['front','back'].forEach(function(side){
      var prefix='custom-winter-'+side+'-';
      (next.customLayers[side]||[]).forEach(function(item){
        if(item.id===prefix+'wordmark'&&item.text==='Winter'){
          clearTracking(item,side);
          // Optical pairs Wi / in / nt / te / er, proportional to each face's
          // existing type size. Leave the wordmark's position and scale intact.
          [-.075,-.014,-.010,-.034,-.041].forEach(function(em,index){
            item.inlineTextStyles.push({start:index,end:index+1,letterSpacing:em*item.fontSize});
          });
        }
        if(item.id===prefix+'coupon-title'&&item.text==='WINTER\nPASSAGE'){
          var style=clearTracking(item,side);
          // Fit the visible ink of both lines to the 345-unit information rule.
          // These are Memorial Winter Bold metrics at 40 px; keep real type
          // proportions instead of stretching the letters horizontally.
          item.x=100*1363/W;item.w=100*345/W;item.fontSize=40;
          item.scaleX=1;item.letterSpacing='0px';item.whiteSpace='pre';item.align='left';
          item.inlineTextStyles.push({start:0,end:6,letterSpacing:2.367355143687905});
          item.inlineTextStyles.push({start:7,end:14,letterSpacing:-.013872951549141513});
          if(style){delete style.fontSize;delete style.textAlign;}
        }
        if(side==='back'&&item.id===prefix+'quote'){
          item.x=100*790/W;item.y=100*205/H;
        }
      });
    });
    return next;
  }
  function refineBackHeader(next, previousVersion) {
    if(next.template!=='train-winter')return next;
    var version=arguments.length>1?previousVersion:next.winterBackHeaderVersion;
    next.winterBackHeaderVersion=1;
    if(version===1)return next;
    var retired='custom-winter-back-record-label';
    next.customLayers.back=(next.customLayers.back||[]).filter(function(item){return item.id!==retired;});
    next.customLayers.back.forEach(function(item){
      // Match the reference's horizontal inset; keep the current vertical layout.
      if(item.id==='custom-winter-back-quote')item.x=100*775/W;
    });
    function prune(value) {
      if(Array.isArray(value))return value.filter(function(item){return typeof item!=='string'||item.replace(/^(front|back)::/,'')!==retired;}).map(prune);
      if(value&&typeof value==='object')Object.keys(value).forEach(function(key){if(key===retired)delete value[key];else value[key]=prune(value[key]);});
      return value;
    }
    ['layerOrder','layerOrders','hidden','hiddenLayers','locked','removedLayers','clipping','placements','layerStyles','inlineTextStyles','textTypingStyles','sideStrokes','sideShadows','shadows','selectedLayers'].forEach(function(key){if(next[key])next[key]=prune(next[key]);});
    if(next.selectedLayer===retired)next.selectedLayer='';
    return next;
  }
  window.LOG_TICKET_WINTER_THEME={create:create,refine:refine,correctTypography:correctTypography,alignFrontSnow:alignFrontSnow,alignOpticalType:alignOpticalType,refineBackHeader:refineBackHeader,normalizeFilm:film,activeFilm:activeFilm};
})();
