/** Each project owns its description and its reference photos in content.js. */
export function createProjectDetails(){
  const grid=document.querySelector('#reference-grid');
  const count=document.querySelector('#reference-count');
  const emptyNote=document.querySelector('#reference-empty-note');
  const dialog=document.querySelector('#reference-dialog');
  const image=document.querySelector('#reference-view-image');
  const title=document.querySelector('#reference-view-title');
  const caption=document.querySelector('#reference-view-caption');
  const number=document.querySelector('#reference-view-number');
  const previous=document.querySelector('#prev-reference');
  const next=document.querySelector('#next-reference');
  const panel=document.querySelector('.project-panel');
  let references=[],current=0,projectTitle='',origin=null;
  const pad=n=>String(n).padStart(2,'0');
  function show(index){
    current=(index+references.length)%references.length;
    const reference=references[current];
    image.alt=reference.alt||reference.caption||`Референс ${current+1} — ${projectTitle}`;
    image.src=reference.src;
    title.textContent=`${projectTitle} / РЕФЕРЕНСЫ`;
    caption.textContent=reference.caption||`Референс ${pad(current+1)}`;
    number.textContent=`${pad(current+1)} / ${pad(references.length)}`;
    previous.disabled=next.disabled=references.length<2;
  }
  function closeReference(){
    if(!dialog.open)return;
    dialog.close();image.removeAttribute('src');origin?.focus({preventScroll:true});
  }
  function open(index,button){
    origin=button;show(index);dialog.showModal();
  }
  function render(work){
    closeReference();projectTitle=work.title;
    references=(work.references||[]).filter(reference=>reference&&typeof reference.src==='string'&&reference.src.trim());
    count.textContent=references.length?pad(references.length):'—';
    emptyNote.hidden=references.length>0;
    grid.replaceChildren();panel.scrollTop=0;
    if(!references.length){
      for(let i=1;i<=2;i++){
        const item=document.createElement('div');item.className='reference-placeholder';
        const mark=document.createElement('span');mark.className='reference-placeholder-icon';mark.textContent='+';mark.setAttribute('aria-hidden','true');
        const label=document.createElement('span');label.textContent=`РЕФЕРЕНС ${pad(i)}`;
        item.append(mark,label);grid.append(item);
      }
      return;
    }
    references.forEach((reference,i)=>{
      const figure=document.createElement('figure');figure.className='reference-item';
      const button=document.createElement('button');button.className='reference-photo';
      button.setAttribute('aria-label',`Увеличить: ${reference.caption||reference.alt||`референс ${i+1}`}`);
      const img=document.createElement('img');img.src=reference.src;img.alt=reference.alt||reference.caption||`Референс ${i+1}`;img.loading='lazy';img.decoding='async';
      const zoom=document.createElement('span');zoom.className='reference-zoom';zoom.textContent='↗';zoom.setAttribute('aria-hidden','true');
      img.addEventListener('error',()=>{button.disabled=true;button.classList.add('reference-error');img.remove();zoom.textContent='Изображение недоступно';},{once:true});
      button.append(img,zoom);button.addEventListener('click',()=>open(i,button));
      const text=document.createElement('figcaption');text.textContent=reference.caption||`Референс ${pad(i+1)}`;
      figure.append(button,text);grid.append(figure);
    });
  }
  document.querySelector('#close-reference').addEventListener('click',closeReference);
  previous.addEventListener('click',()=>show(current-1));next.addEventListener('click',()=>show(current+1));
  dialog.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();closeReference();});
  dialog.addEventListener('click',event=>{if(event.target===dialog||event.target.classList.contains('reference-view-media'))closeReference();});
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();event.stopPropagation();show(current-1);}
    if(event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();show(current+1);}
  });
  return {render,closeReference,isReferenceOpen:()=>dialog.open};
}
