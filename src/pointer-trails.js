/** A small, bounded flock of silver streaks, active only over the opening scene. */
export function createPointerTrails() {
  const canvas=document.createElement('canvas');
  canvas.id='pointer-trails';canvas.setAttribute('aria-hidden','true');
  document.querySelector('#scene').after(canvas);
  const ctx=canvas.getContext('2d');
  const strands=Array.from({length:24},(_,i)=>({
    x:0,y:0,vx:0,vy:0,
    spreadX:Math.cos(i*2.399)*Math.sqrt(i/24)*64,
    spreadY:Math.sin(i*2.399)*Math.sqrt(i/24)*48,
    lag:2+i%9,width:.55+(i%4)*.23,history:[],
  }));
  let width=innerWidth,height=innerHeight,lastMove=-Infinity,enabled=false,painted=false;
  let pointer={x:0,y:0},samples=[];
  function clear(){
    if(painted)ctx.clearRect(0,0,width,height);
    painted=false;samples=[];
    for(const strand of strands)strand.history.length=0;
  }
  function resize(){
    width=innerWidth;height=innerHeight;
    const dpr=Math.min(devicePixelRatio,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);clear();
  }
  function move(event){
    if(!enabled||event.pointerType==='touch')return;
    const now=performance.now();
    if(now-lastMove>650){
      samples=[];
      for(const strand of strands){
        strand.x=event.clientX+strand.spreadX*.7;strand.y=event.clientY+strand.spreadY*.7;
        strand.vx=0;strand.vy=0;strand.history.length=0;
      }
    }
    pointer={x:event.clientX,y:event.clientY};lastMove=now;
  }
  function update(now,delta,opacity,allowMotion){
    enabled=allowMotion&&opacity>.05;
    const idle=(now-lastMove)/1000;
    if(!enabled||idle>1.35){clear();return;}
    const dt=Math.min(delta,1/30);
    samples.unshift(pointer);if(samples.length>32)samples.length=32;
    ctx.clearRect(0,0,width,height);painted=true;
    ctx.lineCap='round';ctx.lineJoin='round';
    const fade=opacity*Math.pow(Math.max(0,1-idle/1.35),1.5);
    for(let i=0;i<strands.length;i++){
      const strand=strands[i],target=samples[Math.min(strand.lag,samples.length-1)];
      // Slightly different delays produce a folding fan on changes of direction.
      const tx=target.x+strand.spreadX,ty=target.y+strand.spreadY;
      strand.vx+=(tx-strand.x)*(39+i%5)*dt;
      strand.vy+=(ty-strand.y)*(39+i%5)*dt;
      const damping=Math.exp(-6.6*dt);strand.vx*=damping;strand.vy*=damping;
      strand.x+=strand.vx*dt;strand.y+=strand.vy*dt;
      strand.history.unshift({x:strand.x,y:strand.y});if(strand.history.length>15)strand.history.pop();
      const points=strand.history;
      if(points.length<3)continue;
      const speed=Math.hypot(strand.vx,strand.vy);
      const alpha=fade*Math.min(1,speed/125)*.7;
      if(alpha<.01)continue;
      const head=points[0],tail=points[points.length-1];
      const gradient=ctx.createLinearGradient(tail.x,tail.y,head.x,head.y);
      gradient.addColorStop(0,'rgba(207,199,226,0)');
      gradient.addColorStop(.58,'rgba(220,211,235,.28)');
      gradient.addColorStop(.9,'rgba(236,234,246,.65)');
      gradient.addColorStop(1,'rgba(255,255,255,1)');
      ctx.globalAlpha=alpha;ctx.strokeStyle=gradient;ctx.lineWidth=strand.width;
      ctx.beginPath();ctx.moveTo(tail.x,tail.y);
      for(let j=points.length-2;j>0;j--){
        const p=points[j],next=points[j-1];ctx.quadraticCurveTo(p.x,p.y,(p.x+next.x)/2,(p.y+next.y)/2);
      }
      ctx.lineTo(head.x,head.y);ctx.stroke();
      // Bright short tip, like the reflective shards in the reference.
      const previous=points[1],length=Math.hypot(head.x-previous.x,head.y-previous.y)||1;
      const tip=Math.min(5.5,length*1.2);
      ctx.strokeStyle='#f6f7ff';ctx.lineWidth=strand.width+1;ctx.globalAlpha=Math.min(1,alpha*1.4);
      ctx.beginPath();ctx.moveTo(head.x,head.y);ctx.lineTo(head.x-(head.x-previous.x)/length*tip,head.y-(head.y-previous.y)/length*tip);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  resize();
  return {move,update,resize,clear};
}
