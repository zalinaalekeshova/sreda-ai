/** Particle veil for entering a project. Drawn locally, no image assets. */
export function createTransition(dialog) {
  const canvas=document.createElement('canvas');canvas.className='transition-particles';canvas.setAttribute('aria-hidden','true');dialog.append(canvas);
  const ctx=canvas.getContext('2d');let raf=0;
  function stop(){cancelAnimationFrame(raf);ctx.clearRect(0,0,canvas.width,canvas.height);canvas.style.opacity='0';}
  function play(accent,origin,reduced){
    stop();if(reduced)return;
    const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio,1.5);
    canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);canvas.style.opacity='1';
    const media=dialog.querySelector('#detail-media').getBoundingClientRect();
    const target={x:media.left+media.width/2,y:media.top+media.height/2};
    const from={x:origin?origin.left+origin.width/2:target.x,y:origin?origin.top+origin.height/2:target.y};
    const points=Array.from({length:w<760?650:1500},()=>({angle:Math.random()*Math.PI*2,radius:.7+Math.random()*.35,speed:.3+Math.random()*.7,size:.5+Math.random()*2.3,drift:Math.random(),light:Math.random()>.75}));
    const began=performance.now();
    function draw(now){
      const p=Math.min(1,(now-began)/1300),e=1-Math.pow(1-p,3);
      ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='screen';
      const cx=from.x+(target.x-from.x)*e,cy=from.y+(target.y-from.y)*e;
      for(const dot of points){
        const angle=dot.angle+e*dot.speed*2.2;
        const radius=dot.radius*(.45+e*1.05);
        const x=cx+Math.cos(angle)*Math.min(media.width*.53,550)*radius;
        const y=cy+Math.sin(angle)*Math.min(media.height*.53,340)*radius;
        ctx.globalAlpha=Math.sin(p*Math.PI)*(.15+dot.drift*.6)*Math.pow(1-p, .4);
        ctx.fillStyle=dot.light?'#d9ece8':accent;
        ctx.beginPath();ctx.arc(x,y,dot.size*(1-p*.6),0,Math.PI*2);ctx.fill();
      }
      if(p<1&&dialog.open)raf=requestAnimationFrame(draw);else stop();
    }
    raf=requestAnimationFrame(draw);
  }
  return {play,stop};
}
