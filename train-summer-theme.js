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
  // Curves are native canvas paths. Every body and droplet closes explicitly;
  // there is no cropped raster outline or SVG dependency at any zoom/export size.
  var rear = [
    ['M',25,240],['C',55,210,76,178,95,164],['C',110,153,102,179,114,174],
    ['C',135,159,164,112,202,83],['C',224,68,215,83,201,96],['C',182,116,162,139,169,147],
    ['C',176,155,192,130,202,136],['C',212,141,187,159,208,160],['C',229,159,264,112,306,81],
    ['C',322,73,310,92,309,96],['C',313,102,322,101,326,98],['C',310,123,310,142,334,151],
    ['C',369,169,416,110,457,91],['C',474,84,466,94,455,101],['C',421,132,405,175,371,177],
    ['C',324,180,278,166,241,177],['C',204,187,181,204,156,218],['C',140,226,119,230,120,218],
    ['C',121,210,137,206,132,198],['C',128,184,111,203,106,211],['C',80,240,63,291,37,327],
    ['L',10,327],['Z']
  ];
  var over = [
    ['M',365,855],['C',400,827,427,804,450,798],['C',472,790,470,800,460,805],['C',446,819,474,827,497,812],
    ['C',536,790,554,765,595,749],['C',622,738,637,749,623,758],['C',606,768,629,777,656,760],
    ['C',691,739,720,716,749,711],['C',777,703,753,720,744,729],['C',714,757,746,769,779,751],
    ['C',829,723,870,720,912,677],['C',925,665,937,652,950,637],['C',969,620,981,615,984,616],
    ['C',983,626,961,634,958,647],['C',950,659,958,663,973,657],['C',1004,646,1039,637,1069,610],
    ['C',1093,582,1100,565,1083,570],['C',1065,577,1055,567,1063,551],['C',1079,530,1095,509,1110,508],
    ['C',1131,499,1122,514,1114,523],['C',1105,536,1131,550,1180,483],
    ['C',1201,455,1220,426,1235,416],['C',1251,405,1237,432,1224,454],
    ['C',1206,485,1191,516,1202,522],['C',1211,527,1229,502,1234,508],
    ['C',1243,521,1210,558,1188,577],['C',1171,598,1150,623,1136,643],
    ['C',1129,658,1149,659,1157,658],['C',1166,666,1141,695,1139,720],
    ['C',1130,734,1144,732,1159,720],['C',1179,704,1198,680,1214,675],
    ['C',1234,669,1216,706,1188,735],['C',1182,740,1155,761,1139,758],
    ['C',1127,755,1120,759,1112,754],['C',1086,770,1091,751,1099,747],['C',1109,732,1088,737,1070,749],
    ['C',1030,776,1000,803,966,815],['C',948,824,940,812,951,802],['C',955,796,940,801,922,822],
    ['L',900,870],['L',365,870],['Z']
  ];
  var letter = [
    ['M',620,870],['C',672,830,711,801,739,797],['C',768,796,737,815,749,824],['C',779,834,822,799,844,777],
    ['C',857,763,823,776,831,756],['C',855,717,903,691,936,668],['C',962,650,974,625,953,634],
    ['C',932,642,939,618,960,598],['C',984,571,1017,536,1023,516],['C',1028,496,1002,520,994,512],
    ['C',985,502,1002,477,1028,447],['C',1054,416,1072,380,1064,359],['C',1060,344,1032,364,1034,341],
    ['C',1036,322,1049,286,1036,284],['C',1023,281,1002,303,991,296],['C',966,283,982,247,998,225],
    ['C',1024,195,1057,160,1053,152],['C',1043,142,1095,85,1115,78],['C',1139,69,1122,91,1102,111],
    ['C',1072,144,1059,179,1054,210],['C',1048,246,1061,242,1081,228],['C',1112,205,1100,240,1086,268],
    ['C',1066,305,1061,333,1081,329],['C',1110,315,1112,348,1104,375],['C',1092,414,1066,438,1061,457],
    ['C',1054,480,1075,449,1091,433],['C',1121,398,1160,414,1151,442],['C',1137,480,1104,511,1085,544],
    ['C',1055,595,1034,650,1004,697],['C',987,725,965,757,976,771],['C',987,786,1016,741,1038,734],
    ['C',1073,720,1059,778,1030,844],['L',1030,884],['L',620,884],['Z']
  ];
  var dropsRear=[[499,73,7,19,.82],[457,125,3.5,5,.6],[622,147,9,16,.66],[651,121,4,6,.65],
    [770,79,8,21,.62],[1107,141,9,22,.75],[98,340,8,23,.6],[78,443,8,24,.58],[79,551,6,12,.52],
    [109,610,10,32,.64],[117,689,9,21,.64],[83,736,8,26,.63],[1159,313,7,13,.6],[1163,385,4,5,.6],
    [1169,426,8,18,.61],[1172,466,3.5,6,.6],[389,766,9,23,.65],[128,263,4,8,.6]];
  var dropsOver=[[696,695,9,16,.62],[802,699,10,25,.78],[1130,470,9,25,.72],[1048,591,3.8,12,.65],
    [976,786,5,8,.65]];
  var dropsLetter=[[1023,138,6,12,.6],[1121,187,9,19,.55],[934,348,11,28,.66],
    [893,581,9,28,.61],[916,628,5,11,.59],[1084,660,8,23,.66],[772,750,7,17,.77]];
  function trace(ctx, kind, width, height) {
    var box=kind==='summer-foam-over'?[365,390,900,480]:kind==='summer-foam-letter'?[620,70,550,814]:[25,50,1165,772];
    var body=kind==='summer-foam-over'?over:kind==='summer-foam-letter'?letter:rear;
    var drops=kind==='summer-foam-over'?dropsOver:kind==='summer-foam-letter'?dropsLetter:dropsRear;
    ctx.save();ctx.scale(width/box[2],height/box[3]);ctx.translate(-box[0],-box[1]);
    body.forEach(function(p){if(p[0]==='M')ctx.moveTo(p[1],p[2]);else if(p[0]==='L')ctx.lineTo(p[1],p[2]);else if(p[0]==='C')ctx.bezierCurveTo(p[1],p[2],p[3],p[4],p[5],p[6]);else ctx.closePath();});
    drops.forEach(function(d){ctx.moveTo(d[0]+Math.cos(d[4])*d[2],d[1]+Math.sin(d[4])*d[2]);ctx.ellipse(d[0],d[1],d[2],d[3],d[4],0,Math.PI*2);ctx.closePath();});
    ctx.restore();
  }
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
    text('back','letter-heading','편지 제목','그해 여름의 우리에게,\n오래 남을 장면을 보냅니다.',46,105,447,24,{lineHeight:'1.45'});
    text('back','letter-body','편지 본문','햇빛이 머물던 창가와 바람의 온도,\n아무 말 없이도 함께 웃었던 순간을 기억합니다.\n\n시간이 흘러 이 표를 다시 펼쳤을 때,\n그날의 목소리가 조용히 돌아올 수 있도록.',46,225,411,15.5,{lineHeight:'1.65'});
    text('back','letter-signoff','편지 · 발신과 수신','FROM HAEON / TO MIRA',46,416,354,10.5,{letterSpacing:'1.8px'});
    text('back','letter-date','편지 · 날짜','2026.07.19',46,436,250,10.5,{letterSpacing:'1.7px'});
    ['front','back'].forEach(function(side){
      image(side,'outline','티켓 외곽선 · 절취선',borderAsset(),0,0,960,480,BLUE);
      // Peer IDs share the coupon suffix so the editor mirrors all editable data.
      text(side,'coupon-title','Summer Passage','summer\npassage.',692,34,247,58,{color:BLUE,fontWeight:'900',lineHeight:'.87',letterSpacing:'-2.6px',whiteSpace:'pre'});
      text(side,'coupon-admit','Admit One','ADMIT ONE',693,155,234,13,{fontWeight:'300',lineHeight:'1.15'});
      text(side,'coupon-express','Summer Express','SUMMER EXPRESS',693,178,243,8.5,{letterSpacing:'2.2px',lineHeight:'1.2'});
      [['DEPARTURE','HAEON',224],['ARRIVAL','MIRA',276],['DATE','2026.07.19',328]].forEach(function(row,index){
        text(side,'coupon-label-'+index,row[0]+' · 항목명',row[0],693,row[2],243,9.5,{color:BLUE,letterSpacing:'2.1px',lineHeight:'1.15'});
        text(side,'coupon-value-'+index,row[0]+' · 값',row[1],693,row[2]+18,245,20.5,{lineHeight:'1.2'});
      });
      image(side,'coupon-barcode','Serial Barcode',barcodeAsset(),693,388,235,29,BLACK);
      text(side,'coupon-serial','Serial Number','No. 07301926',693,425,243,11,{letterSpacing:'2.2px',lineHeight:'1.2'});
    });
    next.customLayers=normalize(layers);
    next.layerOrder=next.layerOrder.concat(layers.front.concat(layers.back).map(function(item){return item.id;}));
    return refine(next);
  }
  function refine(next, previousVersion) {
    if(next.template!=='train-summer')return next;
    var version=arguments.length>1?previousVersion:next.summerFrameVersion;
    next.summerFrameVersion=1;
    if(version===1)return next;
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
    return next;
  }
  window.LOG_TICKET_SUMMER_THEME={create:create,refine:refine,trace:trace,kinds:KINDS,silhouette:silhouette,mountOutlineHitTarget:mountOutlineHitTarget};
})();
