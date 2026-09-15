/* Summer: editable paper / rear foam / photo / front foam; letter reverse. */
(function () {
  'use strict';
  var BLUE = '#087dff', BLACK = '#111111', WIDTH = 960, HEIGHT = 480, SEAM = .682;
  var assets = {};
  var KINDS = ['summer-foam-behind', 'summer-foam-over', 'summer-foam-letter'];
  function silhouette() {
    return [[.018,0],[SEAM-.016,0],[SEAM,.034],[SEAM+.016,0],[.982,0],[1,.044],
      [1,.956],[.982,1],[SEAM+.016,1],[SEAM,.966],[SEAM-.016,1],[.018,1],[0,.956],[0,.044]];
  }
  function png(key, width, height, paint) {
    if (assets[key]) return assets[key];
    var canvas=document.createElement('canvas');canvas.width=width*4;canvas.height=height*4;
    var ctx=canvas.getContext('2d');ctx.scale(4,4);paint(ctx,width,height);
    assets[key]=canvas.toDataURL('image/png');return assets[key];
  }
  function gridAsset() {
    return png('grid',WIDTH,HEIGHT,function(ctx,w,h){
      // One dot lattice across both panels, with no connecting rules.
      ctx.fillStyle=BLUE;ctx.globalAlpha=.65;
      for(var gx=20;gx<w;gx+=20)for(var gy=20;gy<h;gy+=20){ctx.beginPath();ctx.arc(gx,gy,.48,0,Math.PI*2);ctx.fill();}
    });
  }
  function borderAsset() {
    return png('border',WIDTH,HEIGHT,function(ctx,w,h){
      ctx.strokeStyle=BLUE;ctx.lineWidth=.9;ctx.lineJoin='round';ctx.beginPath();
      silhouette().forEach(function(p,i){var x=.65+p[0]*(w-1.3),y=.65+p[1]*(h-1.3);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
      ctx.closePath();ctx.stroke();ctx.lineWidth=.65;
      for(var y=18;y<h-14;y+=10.6){ctx.beginPath();ctx.arc(w*SEAM,y,2.05,0,Math.PI*2);ctx.stroke();}
    });
  }
  function mountOutlineHitTarget(node, item) {
    if(item.type!=='image'||!/^custom-summer-(front|back)-outline$/.test(item.id))return;
    node.classList.add('summer-outline-layer');
    if(node.querySelector('.summer-outline-hit'))return;
    var ns='http://www.w3.org/2000/svg';
    var svg=document.createElementNS(ns,'svg');
    svg.setAttribute('class','summer-outline-hit');
    svg.setAttribute('viewBox','0 0 '+WIDTH+' '+HEIGHT);
    svg.setAttribute('preserveAspectRatio','none');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.setAttribute('data-html2canvas-ignore','true');
    // Match the painted perimeter and perforations. The unfilled interior
    // passes pointer events through to the photo and other layers below.
    var d=silhouette().map(function(p,i){return (i?'L':'M')+(.65+p[0]*(WIDTH-1.3))+' '+(.65+p[1]*(HEIGHT-1.3));}).join(' ')+' Z';
    var x=WIDTH*SEAM,r=2.05;
    for(var y=18;y<HEIGHT-14;y+=10.6){
      d+=' M'+(x+r)+' '+y+' a'+r+' '+r+' 0 1 0 '+(-2*r)+' 0 a'+r+' '+r+' 0 1 0 '+(2*r)+' 0 Z';
    }
    var path=document.createElementNS(ns,'path');
    path.setAttribute('d',d);
    path.setAttribute('fill','none');
    path.setAttribute('stroke','transparent');
    path.setAttribute('stroke-width','5');
    path.setAttribute('stroke-linejoin','round');
    path.setAttribute('vector-effect','non-scaling-stroke');
    svg.appendChild(path);node.appendChild(svg);
  }
  function barcodeAsset() {
    return png('barcode',300,32,function(ctx,w,h){
      var widths=[2,1,1,2,3,1,2,1,1,3,1,1,4,1,2,2,1,1,3,1,2,1,1,3,2,1,2,1,4,1,1,2,3,1,2,2,1,1,4,1,1,2,3,1,2,1,1,3,1,1,2,3,1,1,4,1,2,1,3,1,2,1,1,2,3,1,2,2,1,3,1,1,3,1,2,1,1,3,2,1,4,1,1,2];
      var total=widths.reduce(function(a,b){return a+b;},0),x=0;ctx.fillStyle=BLACK;
      widths.forEach(function(value,i){if(i%2===0)ctx.fillRect(x*w/total,0,value*w/total,h);x+=value;});
    });
  }
  // Foam artwork is loaded from image-generated PNGs by train-summer-art.js.
  function create(next, normalize, block) {
    var layers={front:[],back:[]};
    next.theme='light';next.accent=BLUE;next.quoteColor=BLACK;next.muted=BLACK;next.font='pretendard';
    next.texture=false;next.textureStrength=0;next.quoteEffect='solid';next.motion='none';
    next.side='front';next.postcardViewMode='front';next.hidden=[];next.removedLayers=[];next.selectedLayer='';
    ['frontMain','backMain','frontStub','backStub'].forEach(function(key){next.blocks[key]=block('#ffffff');});
    function base(side,key,name,type,x,y,w,h){return {id:'custom-summer-'+side+'-'+key,side:side,type:type,name:name,x:x/9.6,y:y/4.8,w:w/9.6,h:h/4.8,rotation:0,opacity:100};}
    function text(side,key,name,value,x,y,w,size,extra){var item=Object.assign(base(side,key,name,'text',x,y,w,size*1.25),{text:value,font:'pretendard',fontSize:size,fontWeight:'300',color:BLACK,align:'left',lineHeight:'1.35',autoHeight:true,boundsTrimmed:true,whiteSpace:'pre-wrap'},extra||{});layers[side].push(item);return item;}
    function image(side,key,name,src,x,y,w,h,color){var item=Object.assign(base(side,key,name,'image',x,y,w,h),{imageData:src,imageName:name+'.png',imageType:'image/png',fit:'contain',effect:{overlay:100,overlayColor:color,overlayBlend:'normal'}});layers[side].push(item);return item;}
    function foam(side,key,name,kind,box){var item=Object.assign(base(side,key,name,'shape',box[0],box[1],box[2],box[3]),{shapeKind:kind,fillMode:'color',fillColor:'#ffffff',stroke:{enabled:true,width:1.25,color:BLUE,join:'round'}});layers[side].push(item);return item;}
    ['front','back'].forEach(function(side){image(side,'grid','모눈 종이',gridAsset(),0,0,960,480,BLUE);});
    // Source coordinates are relative to the cropped ticket, not the mockup margin.
    foam('front','foam-behind','포말 1 · 사진 뒤','summer-foam-behind',[-16.7,0,670.5,480]);
    layers.front.push(Object.assign(base('front','photo','사진 프레임','shape',55.3,74.6,561.2,299.1),{
      shapeKind:'rectangle',fillMode:'image',fillColor:'#d8efff',imageData:'',
      imageName:'',imageType:'',imageAssetStored:false,fit:'cover',imageFrameW:561.2/9.6,imageFrameH:299.1/4.8,
      stroke:{enabled:false,width:0},effect:{enabled:true,brightness:100,contrast:100,saturation:100,grain:0,readability:0,filmTone:0}
    }));
    foam('front','foam-over','포말 2 · 사진 위','summer-foam-over',[179,248.7,486.3,261.1]);
    foam('back','foam-letter','포말 · 편지','summer-foam-letter',[326,12.4,316.5,506.1]);
    text('back','letter-label','Dear Summer','DEAR SUMMER,',46,62,440,15,{color:BLUE,letterSpacing:'3.7px'});
    text('back','letter-body','편지 본문','햇빛이 머물던 창가와 바람의 온도,\n아무 말 없이도 함께 웃었던 순간을 기억합니다.\n\n시간이 흘러 이 표를 다시 펼쳤을 때,\n그날의 목소리가 조용히 돌아올 수 있도록.',38,146.4,500,17,{lineHeight:'1.5'});
    text('back','letter-signoff','편지 · 발신과 수신','FROM HAEON / TO MIRA',38,295.2,420,10.5,{color:BLUE,letterSpacing:'1.8px'});
    text('back','letter-date','편지 · 날짜','2026.07.19',38,314.4,250,10.5,{letterSpacing:'1.7px'});
    ['front','back'].forEach(function(side){
      image(side,'outline','티켓 외곽선 · 절취선',borderAsset(),0,0,960,480,BLUE);
      // Peer IDs share the coupon suffix so the editor mirrors all editable data.
      text(side,'coupon-title','Summer Passage','summer\npassage.',681.4,34,247,58,{color:BLUE,fontWeight:'900',lineHeight:'.87',letterSpacing:'-2.6px',whiteSpace:'pre',align:'right'});
      text(side,'coupon-admit','Admit One','ADMIT ONE',694.4,155,234,13,{fontWeight:'300',lineHeight:'1.15',align:'right'});
      text(side,'coupon-express','Summer Express','SUMMER EXPRESS',685.4,178,243,8.5,{letterSpacing:'2.2px',lineHeight:'1.2',align:'right'});
      [['DEPARTURE','HAEON',224],['ARRIVAL','MIRA',276],['DATE','2026.07.19',328]].forEach(function(row,index){
        text(side,'coupon-label-'+index,row[0]+' · 항목명',row[0],685.4,row[2],243,9.5,{color:BLUE,letterSpacing:'2.1px',lineHeight:'1.15',align:'right'});
        text(side,'coupon-value-'+index,row[0]+' · 값',row[1],683.4,row[2]+18,245,20.5,{lineHeight:'1.2',align:'right'});
      });
      image(side,'coupon-barcode','Serial Barcode',barcodeAsset(),693,388,235,29,BLACK).effect.enabled=false;
      text(side,'coupon-serial','Serial Number','No. 07301926',693,425,243,11,{letterSpacing:'2.2px',lineHeight:'1.2'});
    });
    // Approved text layout from the 2026-09-15 edit; photo slots stay empty.
    var splashStyle={fontWeight:'900',fontWeightBase:'900',fontBold:false,color:'#ffea00',lineHeight:'0.85',autoHeight:false,boundsTrimmed:false};
    text('front','splash-title','Splashing Around','SPLASHING\nAROUND',43.2,338.4,321.6,164/3,Object.assign({h:20.5},splashStyle));
    text('back','splash-title','Splashing Around · 편지 제목','SPLASHING AROUND',38,72,600,164/3,Object.assign({h:18.5},splashStyle));
    next.customLayers=normalize(layers);
    next.layerOrder=next.layerOrder.concat(layers.front.concat(layers.back).map(function(item){return item.id;}));
    return refine(next);
  }
  function alignFrontLayout(next, previousVersion) {
    next.summerFrontLayoutVersion=1;
    if(previousVersion===1)return next;
    var defaults={
      'summer-foam-behind':{old:[-16.7,0,670.5,480,0],box:[-67,-35,670.5,480,0]},
      'summer-foam-over':{old:[179,248.7-261.1*60/420,486.3*900/845,261.1*480/420,0],box:[129.7,177.5,576.9,329.6,-14.6]}
    };
    (next.customLayers.front||[]).forEach(function(item){
      var layout=defaults[item.shapeKind];
      if(!layout||item.id!=='custom-summer-front-'+item.shapeKind.replace('summer-',''))return;
      var current=[item.x*9.6,item.y*4.8,item.w*9.6,item.h*4.8,item.rotation||0];
      // Update the old template placement once; retain manually positioned waves.
      if(!current.every(function(value,i){return Math.abs(value-layout.old[i])<.02;}))return;
      item.x=layout.box[0]/9.6;item.y=layout.box[1]/4.8;
      item.w=layout.box[2]/9.6;item.h=layout.box[3]/4.8;item.rotation=layout.box[4];
    });
    // The shared coupon follows the reference's right edge, clear of the wave.
    ['front','back'].forEach(function(side){
      (next.customLayers[side]||[]).forEach(function(item){
        if(item.type!=='text'||!/^custom-summer-(front|back)-coupon-(title|admit|express|label-\d|value-\d)$/.test(item.id)||item.align!=='left')return;
        var x=item.id.endsWith('-title')?692:693;
        if(Math.abs(item.x*9.6-x)<.02)item.align='right';
      });
    });
    return next;
  }
  function alignBackLayout(next, previousVersion) {
    next.summerBackLayoutVersion=1;
    if(previousVersion===1)return next;
    var layouts={
      'foam-letter':{old:[326,12.4,316.5,506.1],box:[0,27,WIDTH*SEAM,480]},
      'letter-label':{old:[46,62,440,18.75],box:[38,40,500,13.75],size:[15,11]},
      'letter-heading':{old:[46,105,447,30],box:[38,72,550,40],size:[24,32],lineHeight:['1.45','1.25']},
      'letter-body':{old:[46,225,411,19.375],box:[38,170,500,21.25],size:[15.5,17],lineHeight:['1.65','1.5']},
      'letter-signoff':{old:[46,416,354,13.125],box:[38,311,420,13.125]},
      'letter-date':{old:[46,436,250,13.125],box:[38,329,250,13.125]}
    };
    (next.customLayers.back||[]).forEach(function(item){
      var layout=layouts[item.id.replace('custom-summer-back-','')];
      if(!layout)return;
      var current=[item.x*9.6,item.y*4.8,item.w*9.6,item.h*4.8];
      // Keep edited copy, colors and manually adjusted geometry when upgrading.
      if(item.rotation||!current.every(function(value,i){return Math.abs(value-layout.old[i])<.02;}))return;
      item.x=layout.box[0]/9.6;item.y=layout.box[1]/4.8;
      item.w=layout.box[2]/9.6;item.h=layout.box[3]/4.8;
      if(layout.size&&item.fontSize===layout.size[0])item.fontSize=layout.size[1];
      if(layout.lineHeight&&item.lineHeight===layout.lineHeight[0])item.lineHeight=layout.lineHeight[1];
    });
    return next;
  }
  function refine(next, previousVersion, previousFoamVersion, previousBackVersion) {
    if(next.template!=='train-summer')return next;
    var version=arguments.length>1?previousVersion:next.summerFrameVersion;
    var foamVersion=arguments.length>2?previousFoamVersion:next.summerFrontLayoutVersion;
    var backVersion=arguments.length>3?previousBackVersion:next.summerBackLayoutVersion;
    next.summerFrameVersion=1;
    if(version===1)return alignBackLayout(alignFrontLayout(next,foamVersion),backVersion);
    var oldId='custom-summer-front-photo';
    var photo=(next.customLayers.front||[]).find(function(item){return item.id===oldId;});
    if(photo){
      // Use the same photo slot, crop controls and drag behavior as other tickets.
      var block=next.blocks.frontMain;
      ['imageData','imageName','imageType','imageAssetStored','fit','zoom','panX','panY','effect'].forEach(function(key){block[key]=photo[key];});
      block.panMode='bounded';
      var baseW=561.2/9.6,baseH=299.1/4.8;
      next.placements.front['image-main']={
        x:photo.x-55.3/9.6+(photo.w-baseW)/2,y:photo.y-74.6/4.8+(photo.h-baseH)/2,
        scaleX:photo.w/baseW,scaleY:photo.h/baseH,rotation:photo.rotation||0,skewX:photo.skewX||0
      };
      next.sideStrokes.front['image-main']=photo.stroke&&photo.stroke.enabled&&photo.stroke.width>0
        ? photo.stroke : {enabled:true,width:.9,color:BLUE,join:'miter'};
      ['layerStyles','sideShadows','shadows','layerFolders'].forEach(function(key){
        var values=next[key]&&next[key].front||next[key];
        if(values&&values[oldId]){values['image-main']=values[oldId];delete values[oldId];}
      });
      function order(list){return (list||[]).filter(function(id){return id!=='image-main';}).map(function(id){return id===oldId?'image-main':id;});}
      next.layerOrder=order(next.layerOrder);
      if(next.layerOrders)next.layerOrders.front=order(next.layerOrders.front);
      ['hidden','locked','removedLayers','clipping'].forEach(function(key){
        if(next[key])next[key]=next[key].map(function(id){return id===oldId||id==='front::'+oldId?'front::image-main':id;});
      });
      if(next.selectedLayer===oldId)next.selectedLayer='image-main';
      next.customLayers.front=next.customLayers.front.filter(function(item){return item.id!==oldId;});
      delete next.placements.front[oldId];
    }
    ['front','back'].forEach(function(side){
      (next.customLayers[side]||[]).forEach(function(item){
        if(item.id==='custom-summer-'+side+'-grid'){
          item.imageData=gridAsset();item.imageName='점 모눈.png';item.name='점 모눈';
        }
        if(item.shapeKind==='summer-foam-over'){
          // Expand the canvas around the existing curves without stretching them.
          item.y-=item.h*60/420;item.w*=900/845;item.h*=480/420;
        }
      });
    });
    return alignBackLayout(alignFrontLayout(next,foamVersion),backVersion);
  }
  window.LOG_TICKET_SUMMER_THEME={create:create,refine:refine,kinds:KINDS,silhouette:silhouette,mountOutlineHitTarget:mountOutlineHitTarget};
})();
