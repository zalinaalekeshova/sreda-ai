import { site, works } from './content.js';
import { createScene } from './scene.js';
import { createTransition } from './transition.js';
import { createPointerTrails } from './pointer-trails.js';
import { createProjectDetails } from './project-details.js';
import { createContactForm } from './contact-form.js';

const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];
const clamp = (v,a=0,b=1) => Math.min(b,Math.max(a,v));
const smooth = (a,b,v) => {const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const pad = n => String(n).padStart(2,'0');
const reduceQuery=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=reduceQuery.matches;
const scene=createScene($('#scene'),reduced);
const transition=createTransition($('#project-dialog'));
const trails=createPointerTrails();
const projectDetails=createProjectDetails();
createContactForm(site);
const ui=Object.fromEntries(['intro','hero-copy','intro-caption','gallery','portal-copy','lab','lab-panel','contact'].map(name=>[name,$('.'+name)]));
const currentNumber=$('#current-number'),progressThumb=$('#progress-thumb'),cursorLabel=$('#cursor-label');
const projectDialog=$('#project-dialog'),indexDialog=$('#index-dialog');
const layerStates=new WeakMap();
const CARD_RANGE=2.25;
let visibleFirst=-1,visibleLast=-1,nearestCard=-1,previousCardFrame='';
const GALLERY_START=2.15, STEP=.82;
let filtered=[...works], filter='all', current=0, units=scrollY/innerHeight, scrollTarget=units;
let galleryEnd=0,labStart=0,contactStart=0,totalUnits=0;
let mouse={x:0,y:0}, detailAmount=0, activeWork=null, lastFocus=null, raf=0,lastTime=0, cardElements=[];
let dialogScroll=0;

function route(){
  galleryEnd=GALLERY_START+Math.max(0,filtered.length-1)*STEP+.5;
  labStart=galleryEnd+2.7;contactStart=labStart+2.1;totalUnits=contactStart+1;
  $('#scroll-space').style.height=`${(totalUnits+1)*innerHeight}px`;
}
function applyLayer(el,opacity,interactive=false){
  const inactive=opacity<.18,visible=opacity>.005;
  const value=opacity.toFixed(4),previous=layerStates.get(el);
  if(previous?.value!==value)el.style.opacity=value;
  if(previous?.visible!==visible)el.style.visibility=visible?'visible':'hidden';
  if(previous?.inactive!==inactive){el.inert=inactive;el.style.pointerEvents=interactive&&!inactive?'auto':'none';}
  layerStates.set(el,{value,visible,inactive});
}
function buildCards(){
  const fragment=document.createDocumentFragment();
  cardElements=filtered.map((work,i)=>{
    const button=document.createElement('button');button.className='work-card';button.hidden=true;button.tabIndex=-1;button.inert=true;button.style.setProperty('--accent',work.accent);
    button.setAttribute('aria-label',`${work.type==='video'?'Видеоклип':'Постер'} ${work.title.split(' ')[1]} — открыть`);
    button.dataset.id=work.id;
    if(work.cover||(work.type==='poster'&&work.src)){
      const image=document.createElement('img');image.className='card-image';image.src=work.cover||work.src;image.alt='';image.loading='lazy';button.append(image);
    }
    const content=document.createElement('div');content.className='card-content';
    const brand=document.createElement('span');brand.className='card-brand';brand.textContent='sreda.ai';content.append(brand);
    if(work.type==='video'){const play=document.createElement('span');play.className='play-mark';play.textContent='▷';content.append(play);}
    const title=document.createElement('h2');title.className='card-title';
    work.title.split(' ').forEach(word=>{const span=document.createElement('span');span.textContent=word;title.append(span);});content.append(title);
    const kind=document.createElement('span');kind.className='card-kind';kind.textContent=work.type==='video'?'AI MOTION':'AI POSTER';content.append(kind);button.append(content);
    for(const [cls,text] of [['card-corner',`${pad(i+1)} / ${pad(filtered.length)}`],['card-open','↗'],['card-placeholder-label',work.src?'SELECTED WORK / 2026':'PLACEHOLDER / 2026']]){const span=document.createElement('span');span.className=cls;span.textContent=text;button.append(span);}
    button.addEventListener('click',()=>{if(Math.abs(current-i)>.8)goToIndex(i);else openWork(work,button);});
    button.addEventListener('pointerenter',()=>{if(innerWidth>760)$('#cursor-label').style.opacity='1';});
    button.addEventListener('pointerleave',()=>$('#cursor-label').style.opacity='0');
    button.addEventListener('focus',()=>{if(button.matches(':focus-visible')&&Math.abs(current-i)>.7)goToIndex(i);});
    fragment.append(button);return button;
  });
  visibleFirst=-1;visibleLast=-1;nearestCard=-1;previousCardFrame='';
  $('#cards').replaceChildren(fragment);$('#total-number').textContent=pad(filtered.length);route();
}
function scrollToUnit(unit,instant=false){
  window.scrollTo({top:unit*innerHeight,behavior:instant||reduced?'instant':'smooth'});
  if(instant){scrollTarget=unit;units=unit;current=(unit-GALLERY_START)/STEP;}
}
function goToIndex(i,instant=false){scrollToUnit(GALLERY_START+clamp(i,0,filtered.length-1)*STEP,instant);}
function setFilter(type){
  filter=type;filtered=works.filter(w=>type==='all'||w.type===type);
  $$('.filters button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===type)));
  buildCards();goToIndex(0,true);
}
$$('.filters button').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));

function lockScroll(){dialogScroll=window.scrollY;document.body.style.overflow='hidden';}
function unlockScroll(){document.body.style.overflow='';window.scrollTo({top:dialogScroll,behavior:'instant'});}
function projectHash(work){return `#project/${work.id}`;}
function openWork(work,origin=null,updateHash=true){
  activeWork=work;lastFocus=origin||document.activeElement;
  $('#cursor-label').style.opacity='0';
  if(!$('#project-dialog').open){lockScroll();$('#project-dialog').showModal();}
  fillDetail(work);
  transition.play(work.accent,origin?.getBoundingClientRect(),reduced);
  if(updateHash)history.pushState({project:work.id},'',projectHash(work));
}
function fillDetail(work){
  const dialog=$('#project-dialog');dialog.style.setProperty('--detail-accent',work.accent);
  $('#detail-title').textContent=work.title;
  $('#detail-meta').textContent=`${work.year} / ${work.type==='video'?'AI MOTION':'AI POSTER'}`;
  $('#detail-description').textContent=work.description||'Описание проекта скоро появится.';
  projectDetails.render(work);
  dialog.scrollTop=0;
  $('#detail-number').textContent=`${pad(works.indexOf(work)+1)} / ${pad(works.length)}`;
  const container=$('#detail-media');container.querySelector('video')?.pause();container.replaceChildren();
  if(work.src){
    const media=document.createElement(work.type==='video'?'video':'img');media.src=work.src;
    if(work.type==='video'){media.controls=true;media.playsInline=true;media.preload='metadata';if(work.cover)media.poster=work.cover;}else media.alt=work.title;
    media.addEventListener('error',()=>{container.replaceChildren(placeholder(work,'Файл пока недоступен'));},{once:true});container.append(media);
  }else container.append(placeholder(work,'Скоро здесь появится работа'));
  container.animate([{opacity:0,filter:'blur(8px)',transform:'translateY(14px) scale(.97)'},{opacity:1,filter:'blur(0)',transform:'translateY(0) scale(1)'}],{duration:reduced?0:700,easing:'cubic-bezier(.16,1,.3,1)'});
  $('.project-panel').animate([{opacity:0,transform:'translateX(16px)'},{opacity:1,transform:'translateX(0)'}],{duration:reduced?0:650,easing:'cubic-bezier(.16,1,.3,1)'});
  document.title=`${work.title} — ${site.name}`;
}
function placeholder(work,label){
  const div=document.createElement('div');div.className='detail-placeholder';
  if(work.type==='video'){const icon=document.createElement('span');icon.className='play-mark';icon.textContent='▷';div.append(icon);}
  const small=document.createElement('small');small.textContent='SREDA.AI / '+(work.type==='video'?'MOTION':'POSTER');
  const title=document.createElement('span');title.className='placeholder-title';title.textContent=work.title;
  const note=document.createElement('small');note.textContent=label;div.append(small,title,note);return div;
}
function closeWork(updateHash=true){
  if(!$('#project-dialog').open)return;
  projectDetails.closeReference();transition.stop();$('#detail-media video')?.pause();$('#project-dialog').close();activeWork=null;unlockScroll();
  if(updateHash&&location.hash.startsWith('#project/'))history.replaceState(null,'','#work');
  document.title='sreda.ai — AI art & motion';lastFocus?.focus({preventScroll:true});
}
function nextWork(direction){
  const at=works.indexOf(activeWork);activeWork=works[(at+direction+works.length)%works.length];fillDetail(activeWork);transition.play(activeWork.accent,null,reduced);history.replaceState({project:activeWork.id},'',projectHash(activeWork));
}
$('#close-project').addEventListener('click',()=>closeWork());$('#back-to-work').addEventListener('click',()=>closeWork());
$('#prev-project').addEventListener('click',()=>nextWork(-1));$('#next-project').addEventListener('click',()=>nextWork(1));
$('#project-dialog').addEventListener('cancel',event=>{event.preventDefault();closeWork();});
$('#project-dialog').addEventListener('click',event=>{if(event.target===$('#project-dialog'))closeWork();});

function buildIndex(){
  for(const work of works){
    const button=document.createElement('button');button.className='index-item';button.style.setProperty('--accent',work.accent);
    button.setAttribute('aria-label',`Открыть ${work.title}`);
    const thumb=document.createElement('span');thumb.className='index-thumb';
    const cover=work.cover||(work.type==='poster'?work.src:'');
    if(cover){const img=document.createElement('img');img.src=cover;img.alt='';img.loading='lazy';thumb.append(img);}else thumb.textContent=work.title;
    const meta=document.createElement('span');meta.className='index-meta';
    const title=document.createElement('span');title.textContent=work.type==='video'?'AI MOTION ↗':'AI POSTER ↗';
    const status=document.createElement('span');status.textContent=work.src?work.year:'PLACEHOLDER';meta.append(title,status);button.append(thumb,meta);
    button.addEventListener('click',()=>{
      closeIndex();if(filter!=='all')setFilter('all');goToIndex(works.indexOf(work),true);openWork(work,cardElements[works.indexOf(work)]);
    });$('#index-grid').append(button);
  }
}
function closeIndex(){if(!$('#index-dialog').open)return;$('#index-dialog').close();unlockScroll();$('#open-index').focus({preventScroll:true});}
$('#open-index').addEventListener('click',()=>{lockScroll();$('#index-dialog').showModal();});
$('#close-index').addEventListener('click',closeIndex);$('#index-dialog').addEventListener('cancel',e=>{e.preventDefault();closeIndex();});

function handleRoute(instant=false){
  const hash=location.hash;
  if(hash.startsWith('#project/')){
    const work=works.find(w=>w.id===decodeURIComponent(hash.slice(9)));
    if(work){if(filter!=='all')setFilter('all');goToIndex(works.indexOf(work),true);openWork(work,null,false);return;}
  }
  closeWork(false);
  if(hash==='#work')goToIndex(0,instant);
  else if(hash==='#contact'){ui.contact.scrollTop=0;scrollToUnit(contactStart+.4,instant);}
  else if(hash==='#home')scrollToUnit(0,instant);
}
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault();if($('#index-dialog').open)closeIndex();closeWork(false);
  history.pushState(null,'',a.getAttribute('href'));handleRoute();
}));
window.addEventListener('popstate',()=>handleRoute());
window.addEventListener('keydown',event=>{
  if(projectDetails.isReferenceOpen())return;
  if($('#project-dialog').open){if(event.key==='ArrowRight'){event.preventDefault();nextWork(1);}if(event.key==='ArrowLeft'){event.preventDefault();nextWork(-1);}return;}
  if($('#index-dialog').open||['BUTTON','INPUT','TEXTAREA','SELECT','A'].includes(document.activeElement.tagName))return;
  if(units>=GALLERY_START-.5&&units<=galleryEnd+.5){
    if(['ArrowDown','ArrowRight'].includes(event.key)){event.preventDefault();goToIndex(Math.round(current)+1);}
    if(['ArrowUp','ArrowLeft'].includes(event.key)){event.preventDefault();goToIndex(Math.round(current)-1);}
    if(event.key==='Enter'){event.preventDefault();openWork(filtered[clamp(Math.round(current),0,filtered.length-1)]);}
  }
});
window.addEventListener('scroll',()=>{scrollTarget=scrollY/innerHeight;},{passive:true});
window.addEventListener('pointermove',e=>{
  trails.move(e);
  mouse.x=e.clientX/innerWidth*2-1;mouse.y=e.clientY/innerHeight*2-1;
  cursorLabel.style.left=`${e.clientX}px`;cursorLabel.style.top=`${e.clientY}px`;
},{passive:true});
window.addEventListener('resize',()=>{const prevUnits=scrollTarget;route();scene.resize();trails.resize();scrollToUnit(prevUnits,true);});
reduceQuery.addEventListener('change',e=>{reduced=e.matches;if(reduced)trails.clear();});
window.addEventListener('blur',()=>trails.clear());

function frame(now){
  const dt=Math.min((now-lastTime)/1000||.016,.25);lastTime=now;
  const ease=reduced?1:1-Math.exp(-dt*8.5);
  units+=(scrollTarget-units)*ease;
  if(Math.abs(scrollTarget-units)<.00001)units=scrollTarget;
  const isDetail=projectDialog.open;
  detailAmount+=((isDetail?1:0)-detailAmount)*(1-Math.exp(-dt*5));
  current=(units-GALLERY_START)/STEP;
  const introOpacity=1-smooth(1.55,2.22,units);
  applyLayer(ui['intro'],introOpacity);
  const textOpacity=smooth(.12,.88,units)*(1-smooth(1.45,1.95,units));
  ui['hero-copy'].style.opacity=textOpacity;
  ui['hero-copy'].style.transform=`translateY(${(1-textOpacity)*45-(Math.max(0,units-1.4)*130)}px)`;
  ui['intro-caption'].style.opacity=1-smooth(.25,.9,units);
  const galleryOpacity=smooth(1.7,2.15,units)*(1-smooth(galleryEnd+.1,galleryEnd+1,units));
  applyLayer(ui['gallery'],galleryOpacity);
  const mobile=innerWidth<760;
  const nearest=clamp(Math.round(current),0,filtered.length-1);
  // Only nearby cards own compositor layers. Distant cards have no GPU surfaces.
  const first=galleryOpacity>.005?Math.max(0,Math.ceil(current-CARD_RANGE)):0;
  const last=galleryOpacity>.005?Math.min(filtered.length-1,Math.floor(current+CARD_RANGE)):-1;
  if(first!==visibleFirst||last!==visibleLast){
    cardElements.forEach((el,i)=>{
      const visible=i>=first&&i<=last;
      if(el.hidden===visible){el.hidden=!visible;el.inert=!visible;el.tabIndex=visible?0:-1;}
    });
    visibleFirst=first;visibleLast=last;
  }
  if(nearest!==nearestCard){
    cardElements.forEach((el,i)=>{
      el.setAttribute('aria-current',String(i===nearest));
      // Stable stacking between crossings, instead of reordering every frame.
      el.style.zIndex=String(20-Math.abs(i-nearest));
    });
    currentNumber.textContent=pad(nearest+1);nearestCard=nearest;
  }
  const cardFrame=`${current.toFixed(5)}:${mouse.x.toFixed(3)}:${mouse.y.toFixed(3)}:${galleryOpacity.toFixed(4)}:${innerWidth}:${innerHeight}`;
  if(cardFrame!==previousCardFrame){
    for(let i=first;i<=last;i++){
      const el=cardElements[i],offset=i-current,angle=offset*.92;
      const x=Math.sin(angle)*innerWidth*(mobile?.61:.375);
      const y=offset*innerHeight*(mobile?.24:.32);
      const z=(Math.cos(angle)-1)*(mobile?230:360)-Math.abs(offset)*45;
      const rotation=clamp(-offset*36,-78,78);
      const fade=1-smooth(1.5,CARD_RANGE,Math.abs(offset));
      const enter=(1-galleryOpacity)*innerHeight*.48;
      el.style.transform=`translate(-50%,-50%) translate3d(${(x+mouse.x*3).toFixed(2)}px,${(y+enter+mouse.y*3).toFixed(2)}px,${z.toFixed(2)}px) rotateY(${rotation.toFixed(3)}deg) rotateZ(${(-offset*1.5).toFixed(3)}deg)`;
      el.style.opacity=(fade*(.62+.38*(1-clamp(Math.abs(offset)/2.5)))).toFixed(4);
    }
    previousCardFrame=cardFrame;
  }
  const portalOpacity=smooth(galleryEnd+.6,galleryEnd+1.5,units)*(1-smooth(labStart-.7,labStart-.1,units));
  applyLayer(ui['portal-copy'],portalOpacity);
  const labOpacity=smooth(labStart-.6,labStart+.15,units)*(1-smooth(contactStart-1,contactStart-.2,units));
  applyLayer(ui['lab'],labOpacity);ui['lab-panel'].style.transform=`perspective(900px) translateY(${(labStart+.3-units)*innerHeight*.28}px) rotateY(${-4+mouse.x*3}deg)`;
  applyLayer(ui['contact'],smooth(contactStart-.7,contactStart+.1,units),true);
  progressThumb.style.transform=`translateY(${clamp(units/totalUnits)*(innerHeight*.7-28)}px)`;
  scene.update({units,index:current,galleryStart:GALLERY_START,galleryEnd,mouse:reduced?{x:0,y:0}:mouse,detail:detailAmount,labStart,contactStart,reducedMotion:reduced});
  trails.update(now,dt,1-smooth(1.15,1.75,units),!reduced&&!isDetail&&!indexDialog.open);
  raf=requestAnimationFrame(frame);
}

const links=$('#contact-links');
for(const [label,url] of [[site.email,site.email?`mailto:${site.email}`:''],['TELEGRAM ↗',site.telegram],['INSTAGRAM ↗',site.instagram]]){
  if(!url)continue;const a=document.createElement('a');a.textContent=label;a.href=url;if(!url.startsWith('mailto:')){a.target='_blank';a.rel='noopener noreferrer';}links.append(a);
}
links.hidden=!links.children.length;
$('#year').textContent=new Date().getFullYear();
buildCards();buildIndex();route();
requestAnimationFrame(()=>{handleRoute(true);$('#loading').classList.add('ready');raf=requestAnimationFrame(frame);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);trails.clear();}else{lastTime=performance.now();raf=requestAnimationFrame(frame);}});
window.addEventListener('pagehide',()=>cancelAnimationFrame(raf));
window.addEventListener('pageshow',e=>{if(e.persisted){lastTime=performance.now();raf=requestAnimationFrame(frame);}});
// Read-only diagnostic values for local browser QA.
window.sreda={getState:()=>({filter,count:filtered.length,posters:works.filter(w=>w.type==='poster').length,videos:works.filter(w=>w.type==='video').length,units,current,galleryEnd,labStart,contactStart,activeWork:activeWork?.id??null})};
