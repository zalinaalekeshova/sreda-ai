import * as THREE from '../vendor/three.module.js';

const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t*t*(3-2*t); };
let seed = 1729;
function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

/** A self-contained procedural scene. No reference footage or external 3D assets. */
export function createScene(canvas, reducedMotion) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'high-performance'});
  } catch (error) {
    document.body.classList.add('no-webgl');
    console.warn('WebGL unavailable; the portfolio continues in CSS mode.', error);
    return { resize(){}, update(){}, dispose(){} };
  }
  renderer.setClearColor(0x080e11, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.5 : 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, innerWidth/innerHeight, .1, 70);
  camera.position.set(0, 0, 9);
  const clock = new THREE.Clock();
  // Soft studio reflections make the procedural metal readable without an HDR download.
  const envCanvas=document.createElement('canvas');envCanvas.width=1024;envCanvas.height=512;
  const ctx=envCanvas.getContext('2d');ctx.fillStyle='#141d29';ctx.fillRect(0,0,1024,512);
  for(const [x,y,r,color] of [[180,150,260,'#d4ede7'],[750,230,210,'#758bba'],[480,390,190,'#7c568c'],[940,60,160,'#b3e2d1']]){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#141d2900');ctx.fillStyle=g;ctx.fillRect(0,0,1024,512);
  }
  ctx.fillStyle='#e2e7e1';ctx.fillRect(70,70,70,290);ctx.fillRect(570,40,20,160);
  const envTexture=new THREE.CanvasTexture(envCanvas);envTexture.mapping=THREE.EquirectangularReflectionMapping;envTexture.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(envTexture);
  scene.environment=environment.texture;envTexture.dispose();pmrem.dispose();
  const metal=new THREE.MeshPhysicalMaterial({color:0xa6b1bb,metalness:1,roughness:.18,envMapIntensity:1.35,iridescence:.65,iridescenceIOR:1.35,iridescenceThicknessRange:[160,380],clearcoat:1,clearcoatRoughness:.12});
  const dimMetal = new THREE.MeshStandardMaterial({color:0x334245,metalness:.92,roughness:.26});
  scene.add(new THREE.HemisphereLight(0xb7dfe7,0x251b39,1.3));
  for (const [color,intensity,x,y,z] of [[0xa8e1e0,32,3,3,4],[0x9675cc,26,-3,-1,3],[0xcfb4ed,16,0,-3,2]]){
    const light=new THREE.PointLight(color,intensity,18,2);light.position.set(x,y,z);scene.add(light);
  }

  function tube(points, radius, material, closed=false, segments=140){
    const curve=new THREE.CatmullRomCurve3(points,closed);
    return new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,7,closed),material);
  }

  const hero=new THREE.Group();scene.add(hero);
  const emblem=new THREE.Group();hero.add(emblem);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.83,.063,20,140),metal);emblem.add(ring);
  const fineRing=new THREE.Mesh(new THREE.TorusGeometry(.93,.009,6,140),metal);fineRing.rotation.y=.08;emblem.add(fineRing);
  const letterPoints=[[.23,.29,0],[-.12,.32,0],[-.28,.2,0],[-.15,.04,0],[.16,-.03,0],[.26,-.17,0],[.11,-.3,0],[-.25,-.28,0]].map(p=>new THREE.Vector3(...p));
  const letter=tube(letterPoints,.043,metal,false,70);emblem.add(letter);
  const smallRing=new THREE.Mesh(new THREE.TorusGeometry(.46,.018,7,90),metal);emblem.add(smallRing);
  const tendrils=new THREE.Group();hero.add(tendrils);
  for(let strand=0;strand<3;strand++){
    const points=[];
    for(let j=0;j<120;j++){const t=j/119;const a=t*Math.PI*2.1+strand*Math.PI*.95;points.push(new THREE.Vector3(Math.sin(a)*(.3+t*.9),-t*5.4-.75,Math.cos(a)*.35));}
    tendrils.add(tube(points,strand===2?.006:.012,metal));
  }
  const ribbons=new THREE.Group();hero.add(ribbons);
  for(let r=0;r<8;r++){
    const points=[];
    for(let j=0;j<65;j++){const t=j/64;const a=t*5.4+r*.09;points.push(new THREE.Vector3(Math.sin(a)*(.7+t*1.1)+1.15,2.8-t*5.4+r*.028,Math.cos(a)*.48-1.2));}
    ribbons.add(tube(points,.006+(r%3)*.003,metal,false,90));
  }

  const spine=new THREE.Group();scene.add(spine);
  const vertebraGeometry=new THREE.TorusGeometry(.29,.095,7,12);
  const bones=new THREE.InstancedMesh(vertebraGeometry,metal,62);
  const shards=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.23,1),metal,186);
  const dummy=new THREE.Object3D();const parent=new THREE.Object3D();
  for(let i=0;i<62;i++){
    parent.position.set(Math.sin(i*.3)*.07,(i-31)*.34,0);parent.rotation.y=i*.36;parent.updateMatrix();
    dummy.position.set(0,0,0);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.set(1.1,.8,1);dummy.updateMatrix();
    bones.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(parent.matrix,dummy.matrix));
    for(let j=0;j<3;j++){
      const a=j*Math.PI*2/3;dummy.position.set(Math.cos(a)*.35,.07,Math.sin(a)*.35);dummy.scale.set(1.7,.36,.65);dummy.rotation.set(0,-a,.35);dummy.updateMatrix();
      shards.setMatrixAt(i*3+j,new THREE.Matrix4().multiplyMatrices(parent.matrix,dummy.matrix));
    }
  }
  spine.add(bones,shards);
  for(let r=0;r<3;r++){
    const points=[];
    for(let j=0;j<160;j++){const y=j/159*23-11.5;points.push(new THREE.Vector3(Math.sin(y*1.4+r*2.1)*.43,y,Math.cos(y*1.4+r*2.1)*.43));}
    spine.add(tube(points,.012,metal));
  }

  function particles(count, mode){
    const positions=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count);
    const color=new THREE.Color();
    for(let i=0;i<count;i++){
      let x,y,z;
      if(mode==='helix'){
        y=(rand()-.5)*24;const side=rand()>.5?1:-1;const a=y*.8+side*2.4;
        const width=.16+Math.pow(rand(),2)*.75;
        const radius=1.45+Math.sin(y*1.7)*.4;
        x=Math.sin(a)*radius+(rand()-.5)*width;z=Math.cos(a)*radius+(rand()-.5)*width;
        color.setHSL(.52+.32*(Math.sin(y*.67)*.5+.5),.53,.44+rand()*.25);
      }else{
        const a=rand()*Math.PI*2;const r=1+rand()*5;y=(rand()-.5)*12;x=Math.sin(a)*r;z=Math.cos(a)*r-3;
        color.setHSL(.42+rand()*.27,.3,.34+rand()*.26);
      }
      positions.set([x,y,z],i*3);colors.set([color.r,color.g,color.b],i*3);sizes[i]=mode==='helix'?1.1+rand()*3.2:.5+rand()*1.7;
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,
      uniforms:{uTime:{value:0},uOpacity:{value:1},uSpread:{value:0},uPixelRatio:{value:renderer.getPixelRatio()}},
      vertexShader:`attribute float aSize;uniform float uTime;uniform float uSpread;uniform float uPixelRatio;varying vec3 vColor;
        void main(){vColor=color;vec3 p=position;p.x+=sin(p.y*1.4+uTime*.3+p.z)*.07;p.z+=cos(p.x*1.9+uTime*.2)*.08;p.xy*=1.+uSpread*.55;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(aSize*(11./-mv.z)*uPixelRatio,1.,5.);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying vec3 vColor;uniform float uOpacity;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=pow(1.-d*2.,1.6);gl_FragColor=vec4(vColor*1.3,a*uOpacity);}`
    });
    const object=new THREE.Points(geometry,material);return object;
  }
  const dust=particles(innerWidth<768?1700:3400,'space');scene.add(dust);
  const coral=particles(innerWidth<768?12000:32000,'helix');spine.add(coral);

  const portal=new THREE.Group();scene.add(portal);
  const cage=new THREE.Group();portal.add(cage);
  for(const y of [-1.7,1.65,2.05]){
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(1.6,.05,8,100),metal);mesh.rotation.x=Math.PI/2;mesh.position.y=y;cage.add(mesh);
    const inner=new THREE.Mesh(new THREE.TorusGeometry(1.46,.018,6,100),metal);inner.rotation.x=Math.PI/2;inner.position.y=y-.07;cage.add(inner);
  }
  for(let i=0;i<14;i++){
    const a=i/14*Math.PI*2;
    const points=[];for(let j=0;j<30;j++){const t=j/29;const r=1.55+Math.sin(t*Math.PI)*.11;points.push(new THREE.Vector3(Math.cos(a)*r,t*3.8-1.75,Math.sin(a)*r));}
    cage.add(tube(points,.012,metal,false,35));
    if(i%2===0){const cable=[];for(let j=0;j<40;j++){const t=j/39;const r=1.6+t*2.6;cable.push(new THREE.Vector3(Math.cos(a)*r,1.85-Math.sin(t*Math.PI)*1.2,Math.sin(a)*r));}cage.add(tube(cable,.008,metal,false,50));}
  }
  const portalEmblem=emblem.clone();portalEmblem.scale.setScalar(1.3);portalEmblem.rotation.y=-.3;portal.add(portalEmblem);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.9,.12,80),dimMetal);pedestal.position.y=-1.83;portal.add(pedestal);
  // Low rocky plinth and floor, generated from geometry rather than images.
  for(let i=0;i<60;i++){
    const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.15+rand()*.35,0),dimMetal);
    const a=rand()*Math.PI*2,r=1.8+rand()*3;rock.position.set(Math.cos(a)*r,-1.95,Math.sin(a)*r);rock.scale.set(1.4,.35+rand()*.4,1);rock.rotation.set(rand(),rand(),rand());portal.add(rock);
  }
  const floorMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float uTime;void main(){vec2 p=(vUv-.5)*20.;float w=sin(p.x*5.+sin(p.y*3.+uTime*.3)*1.8)*sin(p.y*6.+sin(p.x*2.-uTime*.2));float light=pow(abs(w),9.);float fade=1.-smoothstep(2.,10.,length(p));vec3 c=mix(vec3(.035,.075,.09),vec3(.3,.55,.59),light)*fade;gl_FragColor=vec4(c,fade*.7);}`
  });
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-2.05;portal.add(floor);
  const portalDust=particles(2500,'space');portalDust.scale.set(.4,.4,.4);portal.add(portalDust);

  function resize(){
    renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<768?1.5:1.7));
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  }
  function update({units,index,galleryStart,galleryEnd,mouse,detail,labStart,contactStart,reducedMotion:reduceNow}){
    let t=clock.getElapsedTime();if(reduceNow ?? reducedMotion)t=8;
    const g=smooth(galleryStart-.65,galleryStart+.1,units)*(1-smooth(galleryEnd+.15,galleryEnd+1.3,units));
    const h=1-smooth(1.4,galleryStart+.3,units);
    const p=smooth(galleryEnd+.05,galleryEnd+1.5,units)*(1-smooth(labStart-.3,labStart+.8,units));
    const aspectScale=innerWidth<768?.73:1;
    metal.envMapIntensity=1.35-detail*.4;
    camera.position.x=mouse.x*.16;camera.position.y=mouse.y*-.10;camera.lookAt(0,0,0);
    hero.visible=h>.002;
    hero.position.y=-.12-Math.min(units,2)*.12;
    const expansion=1+smooth(.15,1.25,units)*1.6;
    hero.scale.setScalar(expansion*aspectScale*h);
    emblem.rotation.y=Math.sin(t*.22)*.33+smooth(.3,1.3,units)*.75;
    emblem.rotation.z=Math.sin(t*.16)*.12;
    ribbons.rotation.y=t*.09;ribbons.rotation.z=Math.sin(t*.13)*.3;
    tendrils.rotation.y=Math.sin(t*.12)*.5;
    spine.visible=g>.002;
    spine.scale.setScalar(g*aspectScale);
    // The column is long enough for the entire gallery; wrapping it caused visible jumps.
    spine.position.y=Math.max(index,0)*.33;
    spine.position.z=-.8;
    spine.rotation.y=index*.34+t*.035;
    spine.rotation.z=Math.sin(t*.08)*.035;
    coral.rotation.y=-t*.045;
    coral.material.uniforms.uTime.value=t;
    coral.material.uniforms.uOpacity.value=1.15*(1-detail*.6);
    coral.material.uniforms.uSpread.value=detail*3;
    dust.rotation.y=t*.012;dust.rotation.z=Math.sin(t*.06)*.13;
    dust.material.uniforms.uTime.value=t;dust.material.uniforms.uOpacity.value=.42;
    dust.material.uniforms.uSpread.value=detail;
    portal.visible=p>.002;
    portal.scale.setScalar(p*aspectScale);
    portal.position.y=-(units-galleryEnd-1.1)*.7;
    cage.rotation.y=t*.025;portalEmblem.rotation.y=Math.sin(t*.26)*.45;
    portalDust.rotation.y=t*.1;portalDust.material.uniforms.uTime.value=t;
    floorMaterial.uniforms.uTime.value=t;
    if(units>contactStart-.8){
      hero.visible=true;const reveal=smooth(contactStart-.8,contactStart,units);hero.scale.setScalar(.7*aspectScale*reveal);hero.position.set(2.1*aspectScale,.2,-1);emblem.rotation.y=t*.2;
    }else{hero.position.x=0;hero.position.z=0;}
    renderer.render(scene,camera);
  }
  function dispose(){scene.traverse(o=>{o.geometry?.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});environment.dispose();renderer.dispose();}
  return {resize,update,dispose};
}
