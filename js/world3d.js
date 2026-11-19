// Real-time WebGL 3D world. If the CDN/WebGL is unavailable, the game keeps its 2D fallback.
let threePromise;
function three(){return threePromise ||= import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');}
const material = (T,color,roughness=.48)=>new T.MeshStandardMaterial({color,roughness,metalness:.07});
function sphere(T,w,h,d,color,x=0,y=0,z=0){const m=new T.Mesh(new T.SphereGeometry(1,32,20),material(T,color));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;return m;}
function cylinder(T,r1,r2,len,color,x,y,z){const m=new T.Mesh(new T.CylinderGeometry(r1,r2,len,24),material(T,color));m.position.set(x,y,z);m.castShadow=true;return m;}
function makeRobot(T,scale=1){
 const root=new T.Group();root.scale.setScalar(scale);
 const body=sphere(T,.61,.68,.48,0xfff9fd,0,0,0);root.add(body);
 root.add(sphere(T,.4,.35,.16,0x86cbed,0,.02,.44));
 root.add(sphere(T,.3,.24,.10,0x253854,0,.05,.59));
 const heart=sphere(T,.16,.12,.05,0xff7ba8,0,.045,.695);root.add(heart);
 root.add(sphere(T,.94,.76,.72,0xfffcff,0,1.0,0));
 root.add(sphere(T,.78,.55,.14,0x263752,0,1.02,.648));
 [-.30,.30].forEach(x=>{root.add(sphere(T,.11,.16,.055,0x5cf5ff,x,1.04,.77));root.add(sphere(T,.043,.05,.028,0xffffff,x-.028,1.1,.814));});
 root.add(sphere(T,.18,.08,.035,0xff98cb,0,.79,.80));
 [-1,1].forEach(s=>{root.add(sphere(T,.19,.34,.27,0xff94c2,s*.91,1.03,.02));root.add(sphere(T,.22,.22,.17,0xffedfa,s*.87,1.03,.13));const arm=sphere(T,.23,.41,.22,0xfff9fd,s*.76,-.03,0);arm.rotation.z=s*.45;root.add(arm);root.add(sphere(T,.24,.22,.22,0xff9fcb,s*.9,-.32,0));root.add(sphere(T,.31,.16,.35,0xfba8cf,s*.37,-.67,.1));});
 root.add(cylinder(T,.055,.06,.32,0x79d4f4,0,1.91,0));root.add(sphere(T,.17,.17,.17,0xff7cad,0,2.14,0));
 return root;
}
function starShape(T){const s=new T.Shape();for(let i=0;i<10;i++){const r=i%2===0?.53:.23;const a=i*Math.PI/5-Math.PI/2;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)s.moveTo(x,y);else s.lineTo(x,y);}s.closePath();return s;}
function makeStar(T){const g=new T.ExtrudeGeometry(starShape(T),{depth:.18,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.06,bevelThickness:.06});const mesh=new T.Mesh(g,material(T,0xffdc44,.28));mesh.castShadow=true;return mesh;}
function decorate(T,scene){scene.add(new T.HemisphereLight(0xe3f8ff,0x9f6dc2,2.5));const sun=new T.DirectionalLight(0xffffff,3.3);sun.position.set(5,10,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;scene.add(sun);}
function renderer(T,holder){const r=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});r.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));r.setSize(holder.clientWidth||600,holder.clientHeight||380);r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;holder.replaceChildren(r.domElement);return r;}
export async function mountHero(holder){
 let T;try{T=await three();}catch(e){return null;}if(!holder.isConnected)return null;
 let r;try{r=renderer(T,holder)}catch{return null;}
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(36,(holder.clientWidth||600)/(holder.clientHeight||450),.1,100);cam.position.set(0,1.6,8.5);decorate(T,scene);
 const bot=makeRobot(T,1.3);bot.position.set(0,-.45,0);scene.add(bot);
 const ring=new T.Mesh(new T.TorusGeometry(2.25,.07,16,100),new T.MeshStandardMaterial({color:0xffcadf,metalness:.1,roughness:.4}));ring.position.set(0,.65,-1.1);scene.add(ring);
 for(let i=0;i<10;i++){const m=makeStar(T);m.scale.setScalar(.11+Math.random()*.13);m.position.set((Math.random()-.5)*5,(Math.random()-.5)*4+1,-1);scene.add(m);}
 let raf=0,disposed=false;const clock=new T.Clock();function frame(){if(disposed)return;raf=requestAnimationFrame(frame);const t=clock.getElapsedTime();bot.position.y=-.45+Math.sin(t*2)*.13;bot.rotation.y=Math.sin(t*.8)*.25;bot.rotation.z=Math.sin(t*1.3)*.06;ring.rotation.z=t*.12;r.render(scene,cam);}frame();
 const resize=new ResizeObserver(()=>{if(disposed)return;const w=holder.clientWidth||500,h=holder.clientHeight||400;r.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()});resize.observe(holder);
 return()=>{disposed=true;cancelAnimationFrame(raf);resize.disconnect();scene.traverse(x=>{if(x.geometry)x.geometry.dispose();if(x.material){(Array.isArray(x.material)?x.material:[x.material]).forEach(v=>v.dispose());}});r.dispose();};
}
function tree(T){const g=new T.Group();g.add(cylinder(T,.15,.19,.6,0x9f7044,0,.3,0));g.add(sphere(T,.42,.46,.42,0x65c75c,0,.9,0));g.add(sphere(T,.37,.37,.36,0x54c15c,-.22,.8,.04));g.add(sphere(T,.31,.32,.31,0x7de17c,.2,.94,.03));return g;}
function rock(T){const g=new T.Group();g.add(sphere(T,.4,.24,.32,0x9ea8ad,0,.2,0));g.add(sphere(T,.24,.26,.28,0xbcc5c7,-.16,.3,.03));return g;}
function dog(T){const g=new T.Group();g.add(sphere(T,.43,.26,.27,0xb87a44,-.13,.35,0));g.add(sphere(T,.27,.31,.28,0xa56b40,.25,.5,0));g.add(sphere(T,.14,.23,.12,0x8a5939,.38,.71,-.1));g.add(sphere(T,.14,.23,.12,0x8a5939,.14,.72,-.1));g.add(sphere(T,.06,.07,.04,0x1d2730,.35,.57,.26));return g;}
export async function mountBoard(holder,grid){
 let T;try{T=await three();}catch(e){return null;}if(!holder.isConnected)return null;
 let r;try{r=renderer(T,holder)}catch{return null;}
 const scene=new T.Scene();scene.background=new T.Color(0xecfbef);const cam=new T.OrthographicCamera(-5.1,5.1,3.45,-3.45,.1,100);cam.position.set(7,10,12);cam.lookAt(0,0,0);decorate(T,scene);
 const centerX=(grid.cols-1)/2,centerZ=(grid.rows-1)/2;
 const toWorld=(pos)=>({x:(pos[1]-centerX)*1.27,z:(pos[0]-centerZ)*1.27});
 const floor=new T.Mesh(new T.BoxGeometry(grid.cols*1.32,.25,grid.rows*1.33),material(T,0x9bcf84));floor.position.y=-.22;floor.receiveShadow=true;scene.add(floor);
 for(let row=0;row<grid.rows;row++)for(let col=0;col<grid.cols;col++){
   const p=toWorld([row,col]);const tile=new T.Mesh(new T.BoxGeometry(1.18,.16,1.18),material(T,(row+col)%2?0xe2f5c5:0xd1edb2));tile.position.set(p.x,0,p.z);tile.receiveShadow=true;tile.castShadow=true;scene.add(tile);
 }
 for(const o of grid.obstacles){const p=toWorld([o.r,o.c]);const mesh=o.type==='tree'?tree(T):o.type==='rock'?rock(T):dog(T);mesh.position.set(p.x,.07,p.z);mesh.scale.setScalar(.78);scene.add(mesh);}
 const goal=toWorld(grid.goal);const goalStar=makeStar(T);goalStar.position.set(goal.x,.93,goal.z);goalStar.scale.setScalar(.65);scene.add(goalStar);
 const bot=makeRobot(T,.3);const pos=toWorld(grid.start);bot.position.set(pos.x,.49,pos.z);scene.add(bot);
 let target={...pos},disposed=false,raf=0;const clock=new T.Clock();
 function frame(){if(disposed)return;raf=requestAnimationFrame(frame);const t=clock.getElapsedTime();bot.position.x+=(target.x-bot.position.x)*.13;bot.position.z+=(target.z-bot.position.z)*.13;bot.position.y=.49+Math.sin(t*5)*.055;bot.rotation.y=Math.sin(t*3)*.14;goalStar.rotation.y=t*2;goalStar.position.y=.85+Math.sin(t*3)*.15;r.render(scene,cam)}frame();
 const resize=new ResizeObserver(()=>{if(disposed)return;const w=holder.clientWidth||600,h=holder.clientHeight||350;r.setSize(w,h);const aspect=w/h;cam.left=-4.6*aspect;cam.right=4.6*aspect;cam.top=4.6;cam.bottom=-4.6;cam.updateProjectionMatrix()});resize.observe(holder);
 return {move(pos){target=toWorld(pos)},reset(){target=toWorld(grid.start)},destroy(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();scene.traverse(x=>{if(x.geometry)x.geometry.dispose();if(x.material){(Array.isArray(x.material)?x.material:[x.material]).forEach(v=>v.dispose());}});r.dispose()}};
}
