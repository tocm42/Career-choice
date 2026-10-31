/* Mixling Lab: procedural 3D creatures built from genes, rendered with Three.js.
   Exposes:  C3D.ok, C3D.thumb(creature, size) -> dataURL,
             C3D.mount(creature, element, {mode}) live turntable, C3D.unmount() */
import * as THREE from './vendor/three.module.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

const C3D={ok:false};
export default C3D;

/* ---------- shared caches ---------- */
const GEO={}, MAT={};
const geo=(key,make)=>GEO[key]||(GEO[key]=make());
const col=h=>new THREE.Color(h);
function shadeHex(h,a){const c=col(h);if(a>=0)c.lerp(new THREE.Color(1,1,1),a);else c.lerp(new THREE.Color(0,0,0),-a);return '#'+c.getHexString()}
function mat(hex,o={}){
  const key=hex+JSON.stringify(o);
  if(MAT[key])return MAT[key];
  const m=new THREE.MeshPhysicalMaterial({color:col(hex),roughness:o.rough??.42,metalness:0,clearcoat:o.cc??.5,clearcoatRoughness:.35,sheen:.3,sheenColor:col(hex),
    transparent:!!o.op,opacity:o.op??1,emissive:col(o.em||'#000'),emissiveIntensity:o.emi??1,iridescence:o.irid?1:0,iridescenceIOR:1.6,transmission:o.trans??0,thickness:.3,side:o.side||THREE.FrontSide});
  return MAT[key]=m;
}
const S_GEO=()=>geo('sph',()=>new THREE.SphereGeometry(1,40,28));
const sph=(r,m,sx=1,sy=1,sz=1)=>{const o=new THREE.Mesh(S_GEO(),m);o.scale.set(r*sx,r*sy,r*sz);o.castShadow=o.receiveShadow=true;return o};
const cone=(r,h,m,seg=28)=>{const o=new THREE.Mesh(geo('cone'+seg,()=>new THREE.ConeGeometry(1,1,seg)),m);o.scale.set(r,h,r);o.castShadow=true;return o};
const cyl=(rt,rb,h,m)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,24),m);o.castShadow=true;return o};
const torus=(R,r,m,arc=Math.PI*2)=>{const o=new THREE.Mesh(new THREE.TorusGeometry(R,r,16,40,arc),m);o.castShadow=true;return o};
const tube=(pts,r,m,taper)=>{
  const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
  const g=new THREE.TubeGeometry(curve,32,r,12,false);
  if(taper){const pos=g.attributes.position,c=new THREE.Vector3();const n=pos.count;const segs=33,rad=13;
    for(let i=0;i<segs;i++){const t=i/(segs-1);curve.getPointAt(t,c);const s=1-t*taper;for(let j=0;j<rad;j++){const k=i*rad+j;if(k>=n)break;const x=pos.getX(k),y=pos.getY(k),z=pos.getZ(k);pos.setXYZ(k,c.x+(x-c.x)*s,c.y+(y-c.y)*s,c.z+(z-c.z)*s)}}
    pos.needsUpdate=true;g.computeVertexNormals()}
  const o=new THREE.Mesh(g,m);o.castShadow=true;return o};
const box=(w,h,d,m)=>{const o=new THREE.Mesh(geo('box',()=>new THREE.BoxGeometry(1,1,1)),m);o.scale.set(w,h,d);o.castShadow=true;return o};
const at=(o,x,y,z)=>{o.position.set(x,y,z);return o};
const rot=(o,x,y,z)=>{o.rotation.set(x,y,z);return o};
const grp=(...kids)=>{const g=new THREE.Group();kids.forEach(k=>k&&g.add(k));return g};
const both=f=>[f(-1),f(1)];

/* ---------- the builder ---------- */
function buildCreature(c){
  const g=c.genes, ex=g.extras||[];
  const H=g.head,B=g.body,A=g.accent,BL=g.belly;
  const irid=ex.includes('rainbow');
  const mH=mat(H,{irid}), mB=mat(B,{irid}), mA=mat(A), mBL=mat(BL,{cc:.2}), mDark=mat(shadeHex(B,-.25)), mInk=mat('#1a1030',{rough:.25,cc:1}), mWhite=mat('#ffffff',{rough:.2,cc:1});
  const mGold=mat('#ffcf3f',{rough:.25,cc:1}), mOrange=mat('#ffa21f'), mPink=mat('#ff6b9a',{op:.85});
  const [bx,by,bz]={round:[1,.95,.92],wide:[1.3,.8,1],tall:[.85,1.15,.85]}[g.shape]||[1,.95,.92];
  const floating=g.limbs==='none';
  const legOff={paws:.22,feet:.5,hooves:.6,flippers:.3,tentacles:1.0,none:.9}[g.limbs]??.3;
  const bodyY=by+legOff;
  const hr=.86, headY=bodyY+by+hr*.62, faceZ=hr;
  const root=new THREE.Group(); root.userData={flappers:[],eyes:[],sparkles:[],wiggle:[]};
  const body=at(sph(1,mB,bx,by,bz),0,bodyY,0); root.add(body);
  const head=at(sph(hr,mH),0,headY,.05); root.add(head);
  const U=root.userData;

  /* patterns */
  if(g.pattern==='belly')root.add(at(sph(1,mBL,bx*.72,by*.75,bz*.4),0,bodyY-by*.12,bz*.68));
  else if(g.pattern==='spots'){
    [[.5,.25],[-.6,.15],[.2,-.35],[-.3,-.5],[.85,-.1],[-.9,-.25],[0,.6]].forEach(([u,v])=>{
      const th=u*1.1, ph=Math.PI/2-v*1.1;
      const p=new THREE.Vector3(bx*Math.sin(ph)*Math.sin(th),by*Math.cos(ph),bz*Math.sin(ph)*Math.cos(th));
      const s=at(sph(.17,mBL,1,1,.35),p.x,bodyY+p.y,p.z);s.lookAt(new THREE.Vector3(p.x*3,bodyY+p.y*3,p.z*3));root.add(s)});
  }else if(g.pattern==='stripes'){
    [-.45,0,.45].forEach(f=>{const r=Math.sqrt(1-f*f);const t=torus(1,.12,mat(shadeHex(A,.1)));t.scale.set(bx*r*.97,bz*r*.97,1);rot(t,Math.PI/2,0,0);at(t,0,bodyY+by*f,0);root.add(t)});
  }
  /* soft highlight blob (fake specular) */
  root.add(at(sph(.22,mat('#ffffff',{op:.35,rough:.1}),1,.6,.3),-hr*.42,headY+hr*.5,hr*.62));

  /* ---- back ---- */
  const wingPivot=(k,y)=>{const p=new THREE.Group();at(p,k*bx*.75,y,-bz*.25);root.add(p);U.flappers.push({p,k});return p};
  if(g.back==='wings'){
    both(k=>{const p=wingPivot(k,bodyY+by*.35);
      const w=at(sph(1,mat(shadeHex(H,.1)),1.15,.48,.14),k*1.05,.15,0);rot(w,0,0,k*.35);p.add(w);
      [0,1,2].forEach(i=>{const f=at(sph(1,mat(shadeHex(H,-.05)),.55,.2,.1),k*(1.75+i*.1),.25-i*.32,-.02);rot(f,0,0,k*(.5-i*.35));p.add(f)});
      p.add(at(sph(1,mA,.5,.1,.16),k*.9,.22,.05))});
  }else if(g.back==='bugwings'){
    const mW=mat('#dffbff',{op:.55,rough:.05,cc:1,trans:.4,side:THREE.DoubleSide});
    both(k=>{const p=wingPivot(k,bodyY+by*.55);
      const w1=at(sph(1,mW,1.2,.42,.05),k*1.15,.35,-.1);rot(w1,0,0,k*.55);p.add(w1);
      const w2=at(sph(1,mW,.95,.36,.05),k*.95,-.15,-.05);rot(w2,0,0,k*.1);p.add(w2);
      p.add(rot(at(torus(1,.035,mA),k*1.15,.35,-.1),0,0,k*.55)).scale.set(1,1,1);p.children[p.children.length-1].scale.set(1.2,.42,1)});
  }else if(g.back==='fins'){
    const f=at(cone(.5,.8,mA,4),0,bodyY+by*.95,-bz*.15);f.scale.z=.18;rot(f,-.45,Math.PI/4,0);root.add(f);
  }else if(g.back==='hump'){
    root.add(at(sph(.55,mB),bx*.45,bodyY+by*.75,-bz*.3));root.add(at(sph(.45,mB),-bx*.4,bodyY+by*.72,-bz*.3));
  }else if(g.back==='spikes'){
    for(let i=0;i<7;i++){const ph=(i/6)*1.6;const p=new THREE.Vector3(0,by*Math.cos(ph),-bz*Math.sin(ph));
      const s=at(cone(.14,.45,mA),0,bodyY+p.y,p.z);s.lookAt(new THREE.Vector3(0,bodyY+p.y*3,p.z*3));s.rotateX(Math.PI/2);root.add(s)}
  }

  /* ---- tail ---- */
  const tz=-bz*.92, ty=bodyY-by*.15;
  const tailG=new THREE.Group();at(tailG,0,ty,tz);root.add(tailG);U.wiggle.push(tailG);
  switch(g.tail){
    case 'feather':[-.5,0,.5].forEach(a=>{const f=at(sph(1,mDark,.16,.5,.07),Math.sin(a)*.3,.25,-.35);rot(f,-.7,0,a*.6);tailG.add(f)});break;
    case 'fluffy':{const t=tube([[0,0,0],[0,-.1,-.6],[0,.3,-1.1],[0,1.0,-1.2],[0,1.5,-.9]],.3,mB,.35);tailG.add(t);tailG.add(at(sph(.22,mA),0,1.5,-.9));break}
    case 'fishtail':both(k=>{const f=at(cone(.32,.75,mA,3),0,k*.28,-.5);f.scale.z=.2;rot(f,Math.PI/2+k*.6,0,0);tailG.add(f)});break;
    case 'curl':{const pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push([Math.sin(t*5)*.25,-.2+t*.9+Math.sin(t*6)*.15,-.2-t*1.1+Math.cos(t*5)*.25])}tailG.add(tube(pts,.15,mB,.6));break}
    case 'segment':for(let i=0;i<6;i++)tailG.add(at(sph(.22-i*.02,i%2?mA:mB),0,-.08*i,-.3-i*.32));break;
    case 'stub':tailG.add(at(sph(.24,mDark),0,.1,-.15));break;
    case 'puff':tailG.add(at(sph(.3,mWhite),0,.05,-.2));break;
  }

  /* ---- limbs ---- */
  if(g.limbs==='paws')both(k=>root.add(at(sph(.32,mDark,1,.75,1.1),k*bx*.55,.26,bz*.35)));
  else if(g.limbs==='feet')both(k=>{root.add(at(cyl(.1,.1,.6,mOrange),k*.3,.3,.1));[-1,0,1].forEach(t=>root.add(at(sph(1,mOrange,.08,.07,.3),k*.3+t*.14,.06,.4+Math.abs(t)*-.08)))});
  else if(g.limbs==='hooves')both(k=>{root.add(at(cyl(.22,.2,.8,mDark),k*bx*.5,.4,.05));root.add(at(cyl(.24,.24,.16,mat('#4a3426')),k*bx*.5,.08,.05))});
  else if(g.limbs==='flippers'){both(k=>{const f=at(sph(1,mDark,.22,.8,.12),k*(bx+.05),bodyY-.1,.1);rot(f,0,0,k*-.5);root.add(f);root.add(at(sph(1,mOrange,.3,.08,.42),k*.35,.08,.25))})}
  else if(g.limbs==='tentacles'){
    [-.7,-.35,0,.35,.7].forEach((o,i)=>{const d=i%2?1:-1;const x=o*bx;
      const t=tube([[x*.6,bodyY-by*.6,0],[x,bodyY-by-.3,.2*d],[x*1.3,.35,-.25*d],[x*1.4+(.3*d),.12,.3]],.17,mB,.5);
      const tg=grp(t);root.add(tg);U.wiggle.push(tg)});
  }

  /* ---- ears ---- */
  const top=headY+hr*.78;
  const mHd=mat(shadeHex(H,-.08)), mBone=mat('#ecd49c',{rough:.5}), mWood=mat('#8a5a2b',{rough:.7});
  switch(g.ears){
    case 'tufts':both(k=>{const e=at(cone(.22,.65,mHd),k*.5,top+.05,0);rot(e,0,0,k*-.5);root.add(e)});break;
    case 'pointy':both(k=>{root.add(rot(at(cone(.3,.85,mH),k*.5,top+.05,-.05),0,0,k*-.35));root.add(rot(at(cone(.17,.5,mA),k*.5,top+.05,.08),0,0,k*-.35))});break;
    case 'round':both(k=>{root.add(at(sph(.32,mH),k*.62,top-.05,-.05));root.add(at(sph(.18,mA,1,1,.4),k*.62,top-.05,.2))});break;
    case 'long':both(k=>{const e=grp(at(sph(1,mH,.22,.75,.14),0,.6,0),at(sph(1,mA,.11,.55,.08),0,.6,.1));at(e,k*.38,top-.05,-.05);rot(e,0,0,k*-.22);root.add(e);U.wiggle.push(e)});break;
    case 'horns':both(k=>{const h=torus(.5,.14,mBone,Math.PI*1.35);at(h,k*.78,top-.25,-.05);rot(h,0,k*Math.PI/2.4,k*-.4);root.add(h)});break;
    case 'antlers':both(k=>{const a=grp(rot(at(cyl(.05,.08,1,mWood),0,.5,0),0,0,k*-.3),rot(at(cyl(.04,.06,.6,mWood),k*.35,.85,0),0,0,k*-1.1),rot(at(cyl(.035,.05,.5,mWood),k*.05,1.05,-.05),0,0,k*.5));at(a,k*.4,top-.1,-.1);root.add(a)});break;
    case 'antennae':both(k=>{const a=grp(rot(at(cyl(.04,.05,.9,mat(shadeHex(H,-.3))),0,.45,0),0,0,k*-.5),at(sph(.15,mA),k*.43,.9,0));at(a,k*.3,top,0);root.add(a);U.wiggle.push(a)});break;
    case 'spines':for(let i=0;i<22;i++){const ph=Math.acos(1-2*(i+.5)/22),th=Math.PI*(1+Math.sqrt(5))*i;const p=new THREE.Vector3(Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th));
        if(p.z>.45&&p.y<.6)continue;const s=at(cone(.1,.38,mA),p.x*hr,headY+p.y*hr,.05+p.z*hr);s.lookAt(new THREE.Vector3(p.x*5,headY+p.y*5,.05+p.z*5));s.rotateX(Math.PI/2);root.add(s)}break;
    case 'frill':{const d=at(cyl(1.3,1.3,.08,mA),0,headY,-.3);rot(d,Math.PI/2,0,0);root.add(d);
      for(let i=0;i<18;i++){const a=i/18*Math.PI*2;const s=at(cone(.13,.45,mA),Math.cos(a)*1.4,headY+Math.sin(a)*1.4,-.3);rot(s,0,0,a-Math.PI/2);root.add(s)}break}
    case 'tiny':both(k=>root.add(at(sph(.16,mH,1,.7,.6),k*.72,top-.35,-.05)));break;
    case 'unihorn':both(k=>{root.add(rot(at(cone(.26,.7,mH),k*.52,top-.02,-.05),0,0,k*-.5));root.add(rot(at(cone(.14,.4,mA),k*.52,top-.02,.08),0,0,k*-.5))});
      {const h=at(cone(.17,1.1,mGold),0,top+.35,.15);rot(h,.15,0,0);root.add(h);for(let i=0;i<4;i++)root.add(at(torus(.14-i*.03,.02,mat('#c98a12')),0,top+.05+i*.25,.15+(i*.25*-.15)))}break;
  }

  /* ---- eyes ---- */
  const ey=headY+.1, ez=faceZ*.78, exx=.33;
  const eye=(k,r=.22)=>{const e=grp(sph(r,mWhite),at(sph(r*.62,mInk),0,0,r*.55),at(sph(r*.2,mWhite),r*.25,r*.25,r*.95));at(e,k*exx,ey,ez);U.eyes.push(e);return e};
  switch(g.eyes){
    case 'ring':both(k=>{root.add(rot(at(torus(.3,.06,mA),k*exx,ey,ez+.05),0,0,0));root.add(eye(k,.23))});break;
    case 'goggle':both(k=>{const e=grp(sph(.27,mat('#2a1f5e',{rough:.1,cc:1})),at(sph(.08,mWhite),.1,.1,.22),at(sph(.04,mWhite),-.1,-.08,.24));at(e,k*exx,ey,ez);root.add(e);U.eyes.push(e)});break;
    case 'sleepy':both(k=>{root.add(eye(k,.2));const lid=new THREE.Mesh(new THREE.SphereGeometry(.215,24,12,0,Math.PI*2,0,Math.PI/2),mH);at(lid,k*exx,ey+.02,ez);rot(lid,.25,0,0);root.add(lid)});break;
    case 'tiny':both(k=>{const e=grp(sph(.1,mInk),at(sph(.035,mWhite),.03,.03,.08));at(e,k*exx,ey,ez+.08);root.add(e);U.eyes.push(e)});break;
    default:both(k=>root.add(eye(k)));
  }
  both(k=>root.add(at(sph(1,mPink,.16,.1,.05),k*.58,ey-.28,faceZ*.72)));

  /* ---- mouth ---- */
  const my=headY-.32, mz=faceZ*.95;
  const smile=()=>{const s=torus(.17,.035,mInk,Math.PI);rot(s,0,0,Math.PI);at(s,0,my+.08,mz-.02);return s};
  switch(g.mouth){
    case 'beak':{const b=at(cone(.18,.4,mOrange,4),0,my+.02,mz+.1);rot(b,Math.PI/2,0,Math.PI/4);root.add(b);break}
    case 'snout':root.add(at(sph(1,mat(shadeHex(H,.45)),.38,.27,.25),0,my,faceZ*.82));root.add(at(sph(.1,mInk,1,.8,.8),0,my+.14,faceZ*.82+.22));root.add(at(torus(.1,.025,mInk,Math.PI).rotateZ(Math.PI),0,my-.02,faceZ+.05));break;
    case 'pout':root.add(at(sph(.1,mat('#ff6b9a'),1,1.1,.6),0,my,mz));break;
    case 'buck':root.add(smile());both(k=>root.add(at(box(.1,.16,.05,mWhite),k*.06,my-.06,mz)));break;
    case 'tongue':root.add(smile());{const t=at(sph(1,mat('#ff4f7a'),.07,.22,.04),0,my-.18,mz+.02);rot(t,.3,0,0);root.add(t);U.tongue=t;break}
    case 'beard':root.add(smile());{const b=at(cone(.32,.8,mat('#f4f1ea',{rough:.6})),0,my-.5,faceZ*.55);rot(b,Math.PI,0,0);root.add(b);break}
    default:root.add(smile());
  }

  /* ---- extras ---- */
  if(ex.includes('mane')){['#ff4fa3','#ffd54a','#9dff5c','#3be8ff','#9d5cff'].forEach((cc,i)=>{const t=torus(hr*.95+i*.1,.16,mat(cc));at(t,0,headY,-.15-i*.12);root.add(t)})}
  if(ex.includes('glasses')){both(k=>root.add(at(torus(.32,.035,mInk),k*exx,ey,ez+.12)));root.add(at(box(.14,.03,.03,mInk),0,ey+.04,ez+.14))}
  if(ex.includes('crown')){const cy=top+.1;root.add(at(cyl(.42,.36,.3,mGold),0,cy,0));for(let i=0;i<6;i++){const a=i/6*Math.PI*2;root.add(at(cone(.1,.3,mGold,4),Math.cos(a)*.38,cy+.3,Math.sin(a)*.38))}root.add(at(sph(.09,mat('#ff4fa3',{cc:1})),0,cy+.02,.42))}
  if(ex.includes('halo')){const h=torus(.42,.05,mat('#ffe066',{em:'#ffd54a',emi:.8}));rot(h,Math.PI/2,0,0);at(h,0,top+(g.ears==='unihorn'?1.4:.5),0);root.add(h)}
  if(ex.includes('flame')){const f=grp(rot(cone(.22,.7,mat('#ff8a1c',{em:'#ff5a00',emi:.9,op:.95}),12),0,0,-Math.PI/2),rot(at(cone(.1,.4,mat('#fff3b0',{em:'#ffd54a',emi:1}),12),.08,0,0),0,0,-Math.PI/2));at(f,.55,my,mz-.1);root.add(f);U.flame=f}
  if(ex.includes('bolts'))both(k=>{const b=at(cone(.14,.9,mat('#fde047',{em:'#fde047',emi:.9}),3),k*(bx+.6),bodyY+by+.3,0);rot(b,0,0,k*.6);b.userData.nofit=true;root.add(b);U.sparkles.push(b)});
  if(ex.includes('aura')){const ring=torus(1.9,.06,mat('#ffe066',{em:'#ffd54a',emi:1.2}));at(ring,0,bodyY+.6,-1.4);ring.userData.nofit=true;root.add(ring);U.ring=ring;
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:0xffd54a,transparent:true,opacity:.6,depthWrite:false}));sp.scale.set(6,6,1);at(sp,0,bodyY+.5,-1.6);sp.userData.nofit=true;root.add(sp)}
  if(ex.includes('sparkles'))for(let i=0;i<9;i++){const a=i/9*Math.PI*2;const s=new THREE.Mesh(geo('oct',()=>new THREE.OctahedronGeometry(1)),mat(i%2?'#ffffff':'#ffe066',{em:i%2?'#ffffff':'#ffd54a',emi:1.5}));
    s.scale.setScalar(.09+(i%3)*.03);at(s,Math.cos(a)*(1.7+(i%2)*.3),bodyY+.3+Math.sin(a*1.7)*1.2,Math.sin(a)*1.0-.3);s.userData.nofit=true;root.add(s);U.sparkles.push(s)}
  if(ex.includes('mane')||ex.includes('aura'))root.userData.legend=true;
  root.userData.floating=floating;
  return root;
}
let _glow;function glowTex(){if(_glow)return _glow;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,240,180,1)');g.addColorStop(.4,'rgba(255,213,74,.5)');g.addColorStop(1,'rgba(255,213,74,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return _glow=new THREE.CanvasTexture(c)}

/* ---------- scenes & cameras ---------- */
let envTex;
function makeScene(renderer){
  const sc=new THREE.Scene();
  if(!envTex){const pm=new THREE.PMREMGenerator(renderer);envTex=pm.fromScene(new RoomEnvironment(renderer),.04).texture}
  sc.environment=envTex;sc.environmentIntensity=.55;
  const key=new THREE.DirectionalLight(0xfff4e0,2.6);key.position.set(3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.radius=6;key.shadow.bias=-.0005;
  const sc2=key.shadow.camera;sc2.left=sc2.bottom=-4;sc2.right=sc2.top=4;sc2.near=1;sc2.far=20;sc.add(key);
  const fill=new THREE.DirectionalLight(0xcfe7ff,.9);fill.position.set(-5,3,3);sc.add(fill);
  const rim=new THREE.DirectionalLight(0x9fd7ff,1.8);rim.position.set(0,4,-6);sc.add(rim);
  sc.add(new THREE.HemisphereLight(0xffffff,0x6b4fd8,.5));
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:.32}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;sc.add(ground);
  return sc;
}
function fitCamera(cam,obj,pad=1.08){
  obj.updateMatrixWorld(true);
  const box=new THREE.Box3();
  obj.traverse(o=>{if(o.isMesh&&!o.userData.nofit){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);box.union(b)}});
  box.min.y=Math.min(box.min.y,-.05);
  const size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
  const tan=Math.tan(THREE.MathUtils.degToRad(cam.fov/2));
  const d=Math.max(size.y/2/tan,size.x/2/(tan*cam.aspect),size.z/2/tan*.6)*pad+size.z/2;
  cam.position.set(c.x+d*.05,c.y+d*.28,c.z+d);cam.lookAt(c.x,c.y-size.y*.04,c.z);cam.updateProjectionMatrix();
  return {center:c,d};
}

/* ---------- thumbnails ---------- */
let tR,tScene,tCam;const thumbCache=new Map();
function initThumb(){
  tR=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  tR.shadowMap.enabled=true;tR.shadowMap.type=THREE.PCFSoftShadowMap;tR.toneMapping=THREE.ACESFilmicToneMapping;tR.toneMappingExposure=1.05;tR.outputColorSpace=THREE.SRGBColorSpace;tR.setClearColor(0,0);
  tScene=makeScene(tR);tCam=new THREE.PerspectiveCamera(30,1,.1,100);
}
C3D.thumb=function(c,size=384){
  const key=c.id+'@'+size;if(thumbCache.has(key))return thumbCache.get(key);
  const obj=buildCreature(c);obj.rotation.y=-.3;tScene.add(obj);
  tR.setPixelRatio(1);tR.setSize(size,size,false);fitCamera(tCam,obj);
  tR.render(tScene,tCam);const url=tR.domElement.toDataURL('image/png');
  tScene.remove(obj);thumbCache.set(key,url);return url;
};

/* ---------- live view ---------- */
let lR,lScene,lCam,lObj,lEl,raf,t0=0,lMode='idle';
function initLive(){
  lR=new THREE.WebGLRenderer({antialias:true,alpha:true});
  lR.shadowMap.enabled=true;lR.shadowMap.type=THREE.PCFSoftShadowMap;lR.toneMapping=THREE.ACESFilmicToneMapping;lR.toneMappingExposure=1.05;lR.outputColorSpace=THREE.SRGBColorSpace;lR.setClearColor(0,0);
  lR.domElement.style.cssText='width:100%;height:100%;display:block';
  lScene=makeScene(lR);lCam=new THREE.PerspectiveCamera(30,1,.1,100);
}
C3D.mount=function(c,el,opts={}){
  C3D.unmount();lEl=el;lMode=opts.mode||'idle';
  lObj=buildCreature(c);lScene.add(lObj);
  const w=el.clientWidth||300,h=el.clientHeight||300;
  lR.setPixelRatio(Math.min(2,(window.devicePixelRatio||1)*1.2));lR.setSize(w,h,false);lCam.aspect=w/h;
  fitCamera(lCam,lObj,lMode==='party'?1.05:1.15);
  el.appendChild(lR.domElement);t0=performance.now();loop();
};
C3D.unmount=function(){if(raf)cancelAnimationFrame(raf);raf=0;if(lObj){lScene.remove(lObj);lObj=null}if(lR&&lR.domElement.parentNode)lR.domElement.parentNode.removeChild(lR.domElement);lEl=null};
function loop(){
  raf=requestAnimationFrame(loop);
  if(!lObj||!lEl||!lEl.isConnected){C3D.unmount();return}
  const t=(performance.now()-t0)/1000,U=lObj.userData;
  lObj.rotation.y=lMode==='party'?(t<1.4?(1-Math.pow(1-t/1.4,3))*Math.PI*2:0)+Math.sin(t*1.3)*.5:Math.sin(t*.6)*.55-.1;
  lObj.position.y=(U.floating?Math.sin(t*2)*.12+.1:Math.abs(Math.sin(t*3))*.06);
  U.flappers.forEach(({p,k})=>p.rotation.z=k*Math.sin(t*(U.flappers.length&&p.children[0]&&p.children[0].material.transmission?40:7))*.35);
  U.wiggle.forEach((w,i)=>w.rotation.x=Math.sin(t*3+i)*.12);
  const bl=((t*1.0)%4)>3.85?.1:1;U.eyes.forEach(e=>e.scale.y=bl);
  U.sparkles.forEach((s,i)=>{const k=.8+Math.sin(t*5+i)*.35;s.scale.setScalar(s.userData.b||(s.userData.b=s.scale.x));s.scale.multiplyScalar(k);s.rotation.y=t*2+i});
  if(U.ring)U.ring.rotation.z=t*.5;if(U.flame)U.flame.scale.set(1,1+Math.sin(t*20)*.15,1);if(U.tongue)U.tongue.scale.y=.22*(1+Math.sin(t*8)*.2);
  lR.render(lScene,lCam);
}

/* ---------- init ---------- */
try{
  const test=document.createElement('canvas').getContext('webgl2')||document.createElement('canvas').getContext('webgl');
  if(!test)throw new Error('no webgl');
  initThumb();initLive();C3D.ok=true;
}catch(e){console.warn('3D unavailable, using drawn creatures',e);C3D.ok=false}
