/* ribbon.js — the mesh.
 *
 * A parametric Möbius ribbon rasterized live into a character grid (each cell
 * shaded by the surface's angle to the light and its depth, with a z-buffer so
 * the sheet occludes itself as it turns), which then resolves into the arc
 * mark: every character travels from its spot on the 3D sheet to a target
 * inside the logo's filled path. Same characters throughout — no crossfade.
 *
 * Ported from the "ㄴ + ㅅ — ASCII Ribbon Morph" artifact
 * (claude.ai/code/artifact/30226fb8-9091-4143-88a1-7a52ceb6c557).
 * The geometry, shading, morph staggering and idle motion are unchanged from
 * there. What changed for this site:
 *   1. it no longer reaches for control markup by id, so the public page and
 *      the studio share one renderer;
 *   2. `paper` joined the state object (it was a CSS variable in the artifact);
 *   3. the focal length is clamped for fullscreen — see build().
 */
(function (global) {
  'use strict';

  var RAMPS = { ascii: " .·:-=+*ox%#@", blocks: " ·░▒▓█", binary: " ..01" };

  // Also the shape the studio publishes and the public page loads.
  var DEFAULTS = {
    twist: 1, charset: 'ascii', tempo: 1, loop: true, random: false,
    gran: 130, float: 1, bend: 1, trail: 0.35, gather: 0, reveal: 'auto',
    ambient: 1.5, chaos: 1.2, mouse: 0.5, freedom: 0.4,
    scale: 1, holo: 0, holoWide: 0.35, ink: '#c0c0c0', paper: '#232323'
  };

  var KEYS = Object.keys(DEFAULTS);

  // Only known keys, only the right types — this parses whatever the server
  // hands back, which is whatever was on disk.
  function sanitize(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i], v = raw[k], d = DEFAULTS[k];
      if (v === undefined || v === null) continue;
      if (typeof d === 'number' && typeof v === 'number' && isFinite(v)) out[k] = v;
      else if (typeof d === 'boolean' && typeof v === 'boolean') out[k] = v;
      else if (typeof d === 'string' && typeof v === 'string') out[k] = v;
    }
    return out;
  }

  function createRibbon(opts) {
    var sheet = opts.container, cv = opts.canvas, ctx = cv.getContext('2d');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var state = Object.assign({}, DEFAULTS, sanitize(opts.state));

  var WRITE_CHANCE=0.2;  // in Auto reveal, how often a cycle hand-writes instead of sweeping
  var SPIN=2.4, RES=4.4, T0=SPIN+RES;   // one-time intro: ribbon forms the mark (RES = time to form)
  // infinite cycle phases (seconds). REF===RES → formation speed matches intro & every loop.
  // Tumble length = state.ambient (user-controlled). Seam sits on the fully-formed hold state.
  var HOLD=2.4, DISS=3.4, REF=4.4;
  var mp={phase:0.6,dir:1,rate:0.7,tilt:-0.5,rz:0}; // current motion params
  function rollMotion(){
    if(state.random){
      mp={ phase:Math.random()*6.283, dir:Math.random()<0.5?-1:1,
           rate:0.5+Math.random()*0.95, tilt:-(0.3+Math.random()*0.55),
           rz:(Math.random()-0.5)*1.15, tw:1+Math.floor(Math.random()*3) };
    } else { mp={phase:0.6,dir:1,rate:0.7,tilt:-0.5,rz:0,tw:state.twist}; }
    // reveal order for THIS cycle: auto = mostly sweep, occasionally hand-write
    mp.write = state.reveal==='write' ? true : state.reveal==='sweep' ? false : (Math.random()<WRITE_CHANCE);
    // ~1 in 3 cycles the swarm briefly coalesces into a clean Möbius mid-drift
    mp.showMobius = Math.random()<0.34;
  }

  // value-noise for a faint background mesh
  function h(x,y){var n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);}
  function vn(x,y){var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
    var u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
    var a=h(xi,yi),b=h(xi+1,yi),c=h(xi,yi+1),d=h(xi+1,yi+1);
    return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;}
  function fbm(x,y){var f=0,a=.5,s=0;for(var i=0;i<3;i++){f+=a*vn(x,y);s+=a;x*=2.02;y*=2.02;a*=.5;}return f/s;}
  function smoother(t){t=t<0?0:t>1?1:t;return t*t*t*(t*(t*6-15)+10);}

  // ---- ribbon geometry (Möbius family) ----
  var HW=0.62;
  function ribPt(u,v,tw){
    var r=1.0 + v*HW*Math.cos(tw*u/2);
    return [ r*Math.cos(u), r*Math.sin(u), v*HW*Math.sin(tw*u/2) ];
  }
  function rotY(p,a){var c=Math.cos(a),s=Math.sin(a);return [c*p[0]+s*p[2],p[1],-s*p[0]+c*p[2]];}
  function rotX(p,a){var c=Math.cos(a),s=Math.sin(a);return [p[0],c*p[1]-s*p[2],s*p[1]+c*p[2]];}
  function rotZ(p,a){var c=Math.cos(a),s=Math.sin(a);return [c*p[0]-s*p[1],s*p[0]+c*p[1],p[2]];}
  var Lx=0.35,Ly=0.5,Lz=0.79; // light dir (normalized-ish)
  // A lamp at a POSITION, not a direction. Holodisc's light is a point
  // (u_light.xy - p), so the direction to it differs across the surface and the
  // catch is a localised highlight that travels — rather than the whole sheet
  // flaring at once, which is what a light-at-infinity gives you.
  var LPx=1.7, LPy=2.0, LPz=-2.4;

  // Visible-spectrum wavelength (nm) to rgb — lifted from holodisc's shader so
  // the mesh iridesces off the same physics rather than a hue cycle.
  function wl2rgb(w){
    var r,g,b;
    if      (w<440.0){ r=(440.0-w)/60.0; g=0.0; b=1.0; }
    else if (w<490.0){ r=0.0; g=(w-440.0)/50.0; b=1.0; }
    else if (w<510.0){ r=0.0; g=1.0; b=(510.0-w)/20.0; }
    else if (w<580.0){ r=(w-510.0)/70.0; g=1.0; b=0.0; }
    else if (w<645.0){ r=1.0; g=(645.0-w)/65.0; b=0.0; }
    else             { r=1.0; g=0.0; b=0.0; }
    var a=1.0;
    if (w<420.0) a=0.3+0.7*(w-380.0)/40.0;
    if (w>700.0) a=0.3+0.7*(780.0-w)/80.0;
    return [Math.max(0,Math.min(1,r))*a, Math.max(0,Math.min(1,g))*a, Math.max(0,Math.min(1,b))*a];
  }

  // The lamp does not move. Holodisc's diffraction is a function of screen
  // position against a fixed light and eye — the disc spins *through* a
  // stationary rainbow rather than carrying one around. So this is keyed to the
  // cell's place on screen, not to the ribbon's orientation: the mesh travels
  // through the field. It also means the whole thing precomputes on resize and
  // costs nothing per frame.
  var holoIdx=null, LGT=[-0.35,0.55,0.90];
  function buildHoloField(){
    holoIdx=new Uint16Array(cols*rows);
    var R=Math.min(W,H)*0.75, SAT=0.62;
    for(var gy=0;gy<rows;gy++)for(var gx=0;gx<cols;gx++){
      var px=((gx+0.5)*cellW - W*0.5)/R, py=((gy+0.5)*cellH - H*0.5)/R;
      var rr=Math.sqrt(px*px+py*py)||1e-4, urx=px/rr, ury=py/rr;   // radial grating, as on a disc
      var wx=LGT[0]-px, wy=LGT[1]-py, wz=LGT[2];                    // point -> light
      var wl_=Math.sqrt(wx*wx+wy*wy+wz*wz); wx/=wl_; wy/=wl_;
      var ox=-px*0.35, oy=-py*0.35, oz=1.7;                         // point -> eye
      var ol=Math.sqrt(ox*ox+oy*oy+oz*oz); ox/=ol; oy/=ol;
      var sd=(wx*urx+wy*ury)+(ox*urx+oy*ury);                       // the grating term
      var r=0,g=0,b=0;
      for(var mo=1;mo<=4;mo++){                                     // sum the diffraction orders
        var w=1600.0*Math.abs(sd)/mo;
        if(w>380.0&&w<780.0){ var c=wl2rgb(w), k=1.4/mo; r+=c[0]*k; g+=c[1]*k; b+=c[2]*k; }
      }
      var mx=Math.max(r,g,b); if(mx>1){ r/=mx; g/=mx; b/=mx; }
      var lum=r*0.2126+g*0.7152+b*0.0722;                           // holodisc's u_sat
      r=lum+(r-lum)*SAT; g=lum+(g-lum)*SAT; b=lum+(b-lum)*SAT;
      holoIdx[gy*cols+gx]=((r*15+0.5)|0)<<8 | ((g*15+0.5)|0)<<4 | ((b*15+0.5)|0);
    }
  }

  // ---- the real logo: filled brush path from arc-mark.svg (viewBox 148x168) ----
  var LOGO_VB=[148,168];
  var LOGO_D="M 90.297 11.198 C 89.114 12.464, 85.619 18.435, 82.531 24.468 C 79.443 30.500, 76.259 36.161, 75.456 37.049 C 74.653 37.936, 74.298 38.965, 74.668 39.335 C 75.038 39.705, 74.415 41.019, 73.284 42.254 C 72.152 43.489, 69.751 47.200, 67.949 50.500 C 66.147 53.800, 63.842 57.433, 62.828 58.573 C 61.814 59.713, 59.498 63.538, 57.682 67.073 C 51.697 78.721, 46.707 87.469, 44.873 89.529 C 43.879 90.645, 40.100 97.845, 36.474 105.529 C 27.188 125.210, 27.355 124.810, 25.415 132 C 23.451 139.281, 22.592 140.767, 21.431 138.889 C 19.008 134.967, 18.940 96.612, 21.328 80 C 22.237 73.675, 23.098 61.975, 23.241 54 L 23.500 39.500 21.441 39.206 C 20.309 39.044, 18.114 39.909, 16.563 41.129 L 13.742 43.348 14.251 52.262 L 14.759 61.176 13.311 64.078 C 11.213 68.284, 9.635 90.139, 9.563 116 L 9.500 138.500 11.456 144.500 C 13.723 151.454, 16.039 154.446, 21.210 157.097 C 27.744 160.448, 31.626 159.491, 53 149.260 C 60.975 145.443, 69.975 141.381, 73 140.234 C 88.705 134.279, 98.006 131.092, 101.555 130.452 C 103.725 130.060, 105.950 129.405, 106.500 128.996 C 110.220 126.230, 123.103 127.454, 130.637 131.289 C 132.212 132.091, 134.512 133.059, 135.750 133.441 L 138 134.135 137.919 129.817 C 137.874 127.410, 136.879 123.749, 135.669 121.542 L 133.500 117.583 128.801 115.908 C 126.216 114.986, 123.898 114.435, 123.650 114.683 C 122.624 115.710, 113.094 109.699, 107.566 104.539 C 104.302 101.493, 101.233 99, 100.746 99 C 99.274 99, 91.182 93.181, 78.135 82.742 C 71.334 77.301, 65.146 72.610, 64.385 72.317 C 62.556 71.616, 62.605 68.089, 64.454 67.379 C 65.254 67.072, 66.901 64.724, 68.115 62.161 C 69.328 59.597, 72.682 53.900, 75.568 49.500 C 78.453 45.100, 83.071 37.675, 85.831 33 C 88.590 28.325, 92.120 22.964, 93.674 21.087 C 95.228 19.210, 97.261 16.430, 98.191 14.910 L 99.881 12.147 98.685 11.154 C 98.027 10.608, 96.354 9.876, 94.968 9.528 L 92.447 8.895 90.297 11.198 M 52.199 87.750 C 51.134 89.263, 49.947 91.515, 49.562 92.755 C 49.177 93.996, 47.748 96.335, 46.386 97.953 C 44.268 100.470, 37.991 116.153, 34.874 126.714 C 34.353 128.481, 33.493 130.196, 32.963 130.523 C 31.817 131.231, 31.692 141.967, 32.809 143.725 L 33.588 144.951 40.044 142.665 C 43.595 141.408, 48.695 139.394, 51.377 138.189 C 54.060 136.985, 56.522 136, 56.850 136 C 57.178 136, 60.608 134.495, 64.473 132.655 C 73.269 128.467, 76.498 127.311, 86.500 124.764 C 90.900 123.643, 95.175 122.331, 96 121.849 C 96.825 121.366, 98.737 120.484, 100.250 119.888 C 102.810 118.879, 104.056 117, 102.164 117 C 101.232 117, 90.741 109.064, 84.357 103.529 C 79.468 99.291, 72.275 94, 71.403 94 C 71.064 94, 69.075 92.644, 66.982 90.986 C 63.361 88.118, 57.172 85, 55.100 85 C 54.570 85, 53.265 86.237, 52.199 87.750";

  // ---- grid + buffers ----
  var cols,rows,cellW,cellH,W,H,dpr,zbuf,rib,glint,f,cx,cy;
  var holoCache=null, holoCacheKey='', cacheInk=[192,192,192];
  var TX,TY,TF,TW,TN=0, originX=0, originY=0;  // targets + seed-stagger + write-order stagger + origin point
  var fitS=1, fitX=0, fitY=0, logoPath=null;    // SVG→screen fit + cached vector path (set in build)
  // pen path in SVG (148x168) coords, in writing order:
  //  ㄴ: down the left, then right to the corner · ㅅ: up from that corner to the apex, then the left leg
  var WRITE_PATH=[[18,42],[15,150],[135,133],[90,12],[24,150]];
  function buildWriteOrder(){
    if(!TN) return;
    var pts=WRITE_PATH.map(function(p){ return [fitX+p[0]*fitS, fitY+p[1]*fitS]; });
    var seg=[],cum=[0],total=0;
    for(var i=0;i<pts.length-1;i++){ var dx=pts[i+1][0]-pts[i][0],dy=pts[i+1][1]-pts[i][1],L=Math.sqrt(dx*dx+dy*dy); seg.push(L); total+=L; cum.push(total); }
    TW=new Float32Array(TN);
    for(var t=0;t<TN;t++){ var qx=TX[t],qy=TY[t],best=1e18,arc=0;
      for(var i=0;i<pts.length-1;i++){ var ax=pts[i][0],ay=pts[i][1],vx=pts[i+1][0]-ax,vy=pts[i+1][1]-ay,ll=vx*vx+vy*vy||1;
        var u=((qx-ax)*vx+(qy-ay)*vy)/ll; if(u<0)u=0; if(u>1)u=1;
        var dx=qx-(ax+vx*u),dy=qy-(ay+vy*u),dd=dx*dx+dy*dy;
        if(dd<best){ best=dd; arc=cum[i]+seg[i]*u; } }
      TW[t]=total?arc/total:0; }
  }
  // fill TF from distance to a chosen origin target → the sweep starts/collapses at that point
  function computeStagger(oi){
    if(!TN) return; var oxp=TX[oi]||TX[0], oyp=TY[oi]||TY[0], mx=1e-6;
    originX=oxp; originY=oyp;
    for(var i=0;i<TN;i++){ var dx=TX[i]-oxp, dy=TY[i]-oyp, dd=Math.sqrt(dx*dx+dy*dy); TF[i]=dd; if(dd>mx)mx=dd; }
    for(var i=0;i<TN;i++) TF[i]/=mx;
  }
  function rand(n){ return (Math.random()*n)|0; }
  function build(){
    dpr=Math.min(2,window.devicePixelRatio||1);
    W=sheet.clientWidth; H=sheet.clientHeight;
    cellW=Math.max(3,W/state.gran); cellH=cellW/0.55;
    cols=Math.ceil(W/cellW); rows=Math.ceil(H/cellH);
    cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.textBaseline='top'; ctx.textAlign='left';
    zbuf=new Float32Array(cols*rows); rib=new Float32Array(cols*rows);
    glint=new Float32Array(cols*rows);   // how hard this cell is catching the light, 3D
    buildHoloField();                 // stationary diffraction field, recomputed on resize
    dispX=new Float32Array(cols*rows); dispY=new Float32Array(cols*rows);   // cursor-swipe displacement per grain
    // `scale` sizes the whole composition: it multiplies the ribbon's focal
    // length and the mark's fit by the same factor, so the two stay in
    // proportion through the morph. Scaling only one would land the characters
    // somewhere the ribbon never was.
    var S=state.scale;
    f=Math.min(W*0.60,H*0.80)*S; cx=W/2; cy=H*0.5;
    // rasterize the SVG fill at grid resolution → collect target cells
    var mc=document.createElement('canvas'); mc.width=cols; mc.height=rows;
    var m=mc.getContext('2d');
    var scale=Math.min((W*0.42*S)/LOGO_VB[0], (H*0.66*S)/LOGO_VB[1]); // fit, centered
    var offx=(W-LOGO_VB[0]*scale)/2, offy=(H-LOGO_VB[1]*scale)/2;
    fitS=scale; fitX=offx; fitY=offy;   // remember for the write-path mapping
    m.setTransform(scale/cellW,0,0,scale/cellH, offx/cellW, offy/cellH);
    m.fillStyle='#000'; m.fill(new Path2D(LOGO_D),'evenodd');
    var d=m.getImageData(0,0,cols,rows).data;
    var list=[];
    for(var gy=0;gy<rows;gy++)for(var gx=0;gx<cols;gx++){
      if(d[(gy*cols+gx)*4+3]>90) list.push([gx,gy]);
    }
    // sweep order: top-to-bottom with a slight left-to-right bias → mark draws on in a sweep
    list.sort(function(a,b){ return (a[1]*1.0+a[0]*0.28)-(b[1]*1.0+b[0]*0.28); });
    TN=list.length; TX=new Float32Array(TN); TY=new Float32Array(TN); TF=new Float32Array(TN);
    for(var i=0;i<TN;i++){ TX[i]=list[i][0]*cellW+cellW*0.5; TY[i]=list[i][1]*cellH+cellH*0.5; }
    computeStagger(0); // default origin (top); randomized per-cycle at runtime
    buildWriteOrder(); // order cells along the ㄴ→ㅅ pen path (for Write mode)
    logoPath=new Path2D(LOGO_D); // cached vector for the solid-at-rest crossfade
  }

  // p = overall reflow progress 0..1 (0 = pure spinning ribbon, 1 = fully-formed mark)
  var HOLO_EXP=11.0;   // angular tolerance of the catch, set from holoWide each frame
  function renderRibbon(spin,tilt,roll,tw,p,tsec,chaosAmt){
    for(var i=0;i<zbuf.length;i++){zbuf[i]=1e9;rib[i]=0;glint[i]=0;}
    var N=700,M=56,du=6.2832/N,dv=2/(M-1),D=3.7,K=N*M; // dense enough to fill even extreme detail without gaps
    // a forming FRONT sweeps out from the seed point (targets ordered by distance = TF).
    // Trail tightens the front → a narrow wave that draws the mark from the seed outward.
    var BAND=0.14+(1-state.trail)*0.95, front=p*(1+BAND);
    var k=-1;
    for(var i=0;i<N;i++){
      var uu=i*du;
      for(var j=0;j<M;j++){
        k++;
        // each ribbon sample is assigned a fill-target inside the real logo shape
        var trank = TN? (k*TN/K)|0 : 0; if(trank>=TN) trank=TN-1;
        var orderFrac = TN? (mp.write? TW[trank] : TF[trank]) : 0;   // this cycle's order: pen-write or seed-sweep
        var mmi=(front-orderFrac)/BAND; mmi=mmi<0?0:mmi>1?1:mmi; mmi=smoother(mmi);
        var zScale=1-mmi;
        var vv=-1+j*dv;
        var q=ribPt(uu,vv,tw);
        if(chaosAmt>0.001){   // scatter the ribbon into a drifting swarm (fades as it forms via the mmi blend)
          q[0]+=(vn(uu*0.7+chaosT, vv*1.1)-0.5)*chaosAmt;
          q[1]+=(vn(uu*0.7+9.1, vv*1.1+chaosT)-0.5)*chaosAmt;
          q[2]+=(vn(uu*0.7+chaosT*0.8, vv*1.1+4.2)-0.5)*chaosAmt*0.8;
        }
        var pa=ribPt(uu+0.012,vv,tw), pb=ribPt(uu,vv+0.012,tw);
        var ex0=pa[0]-q[0],ex1=pa[1]-q[1],ex2=pa[2]-q[2];
        var ev0=pb[0]-q[0],ev1=pb[1]-q[1],ev2=pb[2]-q[2];
        var nx=ex1*ev2-ex2*ev1, ny=ex2*ev0-ex0*ev2, nz=ex0*ev1-ex1*ev0;
        var nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1; nx/=nl;ny/=nl;nz/=nl;
        var pp=rotZ(rotX(rotY([q[0],q[1],q[2]*zScale],spin),tilt),roll);
        var n=rotZ(rotX(rotY([nx,ny,nz],spin),tilt),roll);
        var pz=pp[2]+D; if(pz<=0.2) continue;
        var px=cx+f*pp[0]/pz, py=cy-f*pp[1]/pz;      // 3D-projected screen pos
        var tsx=TN?TX[trank]:px, tsy=TN?TY[trank]:py;  // static home; idle motion applied at draw time
        // Gather funnels the fly-source from the spread ribbon toward the single seed point
        var srcx=px+(originX-px)*state.gather, srcy=py+(originY-py)*state.gather;
        var fx=srcx+(tsx-srcx)*mmi, fy=srcy+(tsy-srcy)*mmi;   // flies source → its spot as the front reaches it
        var col=(fx/cellW)|0, row=(fy/cellH)|0;
        if(col<0||col>=cols||row<0||row>=rows) continue;
        var idx=row*cols+col;
        var zz=pz*(1-mmi)+D*mmi;
        if(zz<zbuf[idx]){
          zbuf[idx]=zz;
          var diff=Math.abs(n[0]*Lx+n[1]*Ly+n[2]*Lz);
          var depth=Math.max(0.18,Math.min(1,(D+1.7-pz)/2.4));
          var rb=(0.30+0.70*diff)*depth;
          rib[idx]=rb*(1-mmi)+mmi;   // shading → solid ink as it lands
          // Holo only fires when the surface catches the lamp. A tight lobe on
          // the 3D normal makes that a brief flash as the ribbon turns through
          // the angle, and (1-mmi) retires it per character as it lands — so a
          // fully formed mark carries no iridescence at all.
          // direction from THIS shard to the lamp, so its distance and place in
          // space matter, not just its tilt
          var wx=LPx-pp[0], wy=LPy-pp[1], wz=LPz-pp[2];
          var wl2=Math.sqrt(wx*wx+wy*wy+wz*wz)||1; wx/=wl2; wy/=wl2; wz/=wl2;
          var hx2=wx, hy2=wy, hz2=wz-1.0;                   // + view dir (toward camera)
          var hl2=Math.sqrt(hx2*hx2+hy2*hy2+hz2*hz2)||1; hx2/=hl2; hy2/=hl2; hz2/=hl2;
          var nd=Math.abs(n[0]*hx2+n[1]*hy2+n[2]*hz2);      // two-sided sheet
          // holoWide sets the angular tolerance: tight = a rare, precise catch,
          // wide = the sheet picks up the lamp over a broader sweep
          var g2=Math.pow(nd, HOLO_EXP);
          // inverse-square falloff, so shards further from the lamp catch weaker
          glint[idx]=g2*(1.0-mmi)*(1.0/(1.0+0.10*wl2*wl2));
        }
      }
    }
  }

  // m for one infinite cycle, given seconds `c` into it. Tumble length = state.ambient.
  function cycleM(c){
    if(c<HOLD) return 1;                          // hold (float) — the seam state
    if(c<HOLD+DISS) return 1-(c-HOLD)/DISS;       // dissolve 1→0
    if(c<HOLD+DISS+state.ambient) return 0;       // ribbon tumbles (ambient time)
    return (c-(HOLD+DISS+state.ambient))/REF;     // reform 0→1 back to hold
  }
  function cycLen(){ return HOLD+DISS+state.ambient+REF; }

  var raf=0,running=false,start=0,spinAngle=0.6,lastNow=0,idlePhase=0,cyclePhase=0,loopStarted=false,chaosT=0;
  var mx=-1e5,my=-1e5,pmx=-1e5,pmy=-1e5,mAmt=0,mTarget=0,dispX,dispY;  // cursor pos+prev, influence, per-grain displacement
  sheet.addEventListener('pointermove',function(e){ var r=cv.getBoundingClientRect(); mx=e.clientX-r.left; my=e.clientY-r.top; mTarget=1; });
  sheet.addEventListener('pointerleave',function(){ mTarget=0; });
  function frame(now){
    if(!running) return;
    var dt=(now-lastNow)/1000; lastNow=now; if(dt<0)dt=0; if(dt>0.05)dt=0.05;
    idlePhase += dt*state.float/state.tempo;   // hover/ripple clock — Tempo scales it (master speed)
    chaosT += dt/state.tempo*0.8;              // swarm drift clock
    var tt=(now-start)/1000/state.tempo;
    var m;
    if(tt<SPIN) m=0;                            // intro: ribbon spins
    else if(tt<T0) m=(tt-SPIN)/RES;             // intro: forms the mark
    else if(!state.loop) m=1;                   // hold + float forever
    else {                                       // infinite loop via a phase accumulator (Ambient can change live)
      if(!loopStarted){ loopStarted=true; cyclePhase=0; }
      cyclePhase += dt/state.tempo;
      if(cyclePhase>=cycLen()){ cyclePhase-=cycLen();     // new cycle (during hold, invisible): re-roll mesh + seed
        rollMotion(); if(TN) computeStagger(state.random?rand(TN):0); }
      m=cycleM(cyclePhase);
    }
    // accumulate rotation from a per-frame delta → resets cleanly on replay, never jumps
    spinAngle += dt*mp.rate*mp.dir*(1-m*0.85)/state.tempo;
    // swarm intensity: full by default; ~1 in 3 loop cycles it dips mid-tumble so a clean Möbius coalesces
    var effChaos=state.chaos;
    if(state.loop && mp.showMobius && cyclePhase>HOLD+DISS && cyclePhase<HOLD+DISS+state.ambient){
      var tp=(cyclePhase-(HOLD+DISS))/state.ambient;      // 0..1 across the tumble
      effChaos=state.chaos*(1-Math.sin(tp*3.14159)*0.92); // dips near-zero mid-drift → Möbius appears
    }
    var tilt=mp.tilt*(1-m*0.9) + Math.sin(chaosT*0.7)*0.3*state.chaos*(1-m);
    var roll=mp.rz*(1-m*0.9)   + Math.cos(chaosT*0.9)*0.35*state.chaos*(1-m);
    var tw = state.random ? mp.tw : state.twist;   // random mode varies the mesh per loop
    HOLO_EXP=2.0+(1.0-state.holoWide)*26.0;   // 28 = tight/rare, 2 = broad
    renderRibbon(spinAngle,tilt,roll,tw,m,idlePhase,effChaos);   // swarm scatters, then reflows into the strokes
    var flowT=now/1000*0.35;
    var ramp=RAMPS[state.charset], RL=ramp.length-1;
    var bgFade=1-m*0.6; // faint mesh recedes as the mark forms
    ctx.clearRect(0,0,W,H);
    ctx.font='700 '+(cellH*0.92)+'px "SF Mono", ui-monospace, Menlo, Consolas, monospace';
    ctx.fillStyle=state.ink;
    // ---- holo: holodisc's grating equation, applied to the mark's characters.
    // The surface-vs-half-vector term becomes a wavelength, so colour comes out
    // of how the ribbon is turned rather than from a clock. Quantised into
    // buckets and applied only to mark cells, so it costs a handful of
    // fillStyle changes per frame instead of one per cell.
    var holo=state.holo, lastFill='';
    if(holo>0.001 && (holoCacheKey!==holo+'|'+state.ink)){
      holoCacheKey=holo+'|'+state.ink; holoCache=new Array(32768);
      var hx2=state.ink.replace('#','');
      cacheInk=[parseInt(hx2.substr(0,2),16),parseInt(hx2.substr(2,2),16),parseInt(hx2.substr(4,2),16)];
    }
    // idle motion applied HERE as continuous draw offsets → the mark floats smoothly, off the grid
    // Float = whole-shape hover (bob/drift) · Bend = how much each char warps → the shape bends/stretches
    var idle=m, RIP=cellW*0.8*state.bend;
    // cursor swipe shoves grains along the movement; Freedom lets them travel further, scatter, settle looser
    mAmt += (mTarget-mAmt)*0.4;
    var mvx=mx-pmx, mvy=my-pmy; pmx=mx; pmy=my;
    var mR=Math.min(W,H)*0.20*(1+state.freedom*0.6), mR2=mR*mR;
    if(state.mouse>0 && mAmt>0.02 && (mvx!==0||mvy!==0)){
      var mStr=state.mouse*0.95*mAmt, cap=mR*(0.9+state.freedom*2.6), perpAmt=state.freedom*1.7;
      var c0=Math.max(0,((mx-mR)/cellW)|0), c1=Math.min(cols-1,((mx+mR)/cellW)|0);
      var r0=Math.max(0,((my-mR)/cellH)|0), r1=Math.min(rows-1,((my+mR)/cellH)|0);
      for(var gy2=r0;gy2<=r1;gy2++)for(var gx2=c0;gx2<=c1;gx2++){
        var mi=gy2*cols+gx2; if(rib[mi]<=0.02) continue;
        var ax=gx2*cellW+cellW*0.5-mx, ay=gy2*cellH+cellH*0.5-my, ad2=ax*ax+ay*ay;
        if(ad2<mR2){ var ff=1-Math.sqrt(ad2)/mR; ff*=ff;
          var hh=Math.sin(mi*12.9898)*43758.5453; hh=(hh-Math.floor(hh))-0.5;   // stable per-grain scatter
          var sx=-mvy*hh*perpAmt, sy=mvx*hh*perpAmt;                             // ⊥ to the swipe → grains fan out
          var vX=dispX[mi]+(mvx+sx)*ff*mStr, vY=dispY[mi]+(mvy+sy)*ff*mStr;
          dispX[mi]=vX>cap?cap:vX<-cap?-cap:vX; dispY[mi]=vY>cap?cap:vY<-cap?-cap:vY; } }
    }
    var dcy=0.84+state.freedom*0.13;   // higher Freedom = looser, longer settle
    for(var di=0;di<dispX.length;di++){ dispX[di]*=dcy; dispY[di]*=dcy; }
    var bobY=(Math.sin(idlePhase*1.5)+Math.sin(idlePhase*0.95+1.3)*0.4)*(H*0.022)*idle;
    var driftX=(Math.sin(idlePhase*0.85)+Math.cos(idlePhase*1.4)*0.35)*(W*0.007)*idle;
    for(var gy=0;gy<rows;gy++){
      for(var gx=0;gx<cols;gx++){
        var idx=gy*cols+gx, ribB=rib[idx];
        var hx=gx*cellW, hy=gy*cellH, dx=hx, dy=hy;
        var val,alpha;
        if(ribB>0.02){ val=ribB; alpha=ribB;             // mark → floats (sub-pixel continuous)
          dx=hx + driftX + Math.sin(idlePhase*1.3 + hx*0.026 + hy*0.02)*RIP*idle + dispX[idx];
          dy=hy + bobY   + Math.cos(idlePhase*1.1 + hy*0.03 - hx*0.014)*RIP*0.8*idle + dispY[idx];
        } else { var fluid=fbm(gx*0.11+flowT*0.4, gy*0.14 - flowT*0.2);
              val=fluid*0.72; alpha=(0.10+fluid*0.42)*0.4*bgFade; } // faint living mesh (untouched by cursor)
        if(alpha<0.055) continue;
        if(val>1)val=1;
        var ci=Math.round(val*RL); if(ci<0)ci=0; if(ci>RL)ci=RL;
        var ch=ramp.charAt(ci); if(ch===' ') continue;
        if(holo>0.001){
          var want;
          var amt = ribB>0.02 ? holo*glint[idx] : 0;
          if(amt>0.012){
            var lv=(amt*7.999/holo)|0;            // 8 strength steps, so the cache stays small
            var key=(holoIdx[idx]<<3)|lv, cc=holoCache[key];
            if(cc===undefined){
              var q=holoIdx[idx], a=(lv+0.5)/8*holo;
              var fr=((q>>8)&15)/15*255, fg=((q>>4)&15)/15*255, fb=(q&15)/15*255;
              cc='rgb('+((cacheInk[0]+(fr-cacheInk[0])*a)|0)+','
                       +((cacheInk[1]+(fg-cacheInk[1])*a)|0)+','
                       +((cacheInk[2]+(fb-cacheInk[2])*a)|0)+')';
              holoCache[key]=cc;
            }
            want=cc;
          } else want=state.ink;
          if(want!==lastFill){ ctx.fillStyle=want; lastFill=want; }
        }
        ctx.globalAlpha=alpha>1?1:alpha;
        ctx.fillText(ch, dx, dy);
      }
    }
    ctx.globalAlpha=1;
    raf=requestAnimationFrame(frame);
  }
  function play(){
    cancelAnimationFrame(raf); running=true; rollMotion(); spinAngle=mp.phase; idlePhase=0; cyclePhase=0; loopStarted=false;
    if(TN) computeStagger(state.random?rand(TN):0);
    if(reduce){ start=performance.now()-1e7; lastNow=start; state.loop=false; frame(performance.now()); running=false; return; }
    start=performance.now(); lastNow=start; raf=requestAnimationFrame(frame);
  }

    // paper is the container's background showing through the cleared canvas,
    // which is how the artifact did it too — just driven by state now.
    function applyPaper() { sheet.style.background = state.paper; }

    var rt;
    function onResize() { clearTimeout(rt); rt = setTimeout(build, 150); }
    window.addEventListener('resize', onResize);

    applyPaper();
    build();
    play();

    return {
      getState: function () { return Object.assign({}, state); },
      play: play,
      setState: function (patch) {
        var clean = sanitize(patch), needBuild = false, needPlay = false;
        for (var k in clean) {
          if (!Object.prototype.hasOwnProperty.call(clean, k)) continue;
          var v = clean[k];
          if (state[k] === v) continue;
          // scrubbing tempo must not jump the morph — rebase the clock instead
          if (k === 'tempo') {
            var np = performance.now();
            start = np - (np - start) * (v / state.tempo);
          }
          state[k] = v;
          // both re-rasterize the mark into the grid, so the targets must be rebuilt
          if (k === 'gran' || k === 'scale') needBuild = true;
          else if (k === 'paper') applyPaper();
          else if (k === 'loop' || k === 'random' || k === 'reveal') needPlay = true;
        }
        if (needBuild) build();
        if (needPlay) play();
      },
      destroy: function () {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
      }
    };
  }

  global.createRibbon = createRibbon;
  global.RIBBON_DEFAULTS = DEFAULTS;
  global.RIBBON_RAMPS = RAMPS;
  global.ribbonSanitize = sanitize;
})(window);
