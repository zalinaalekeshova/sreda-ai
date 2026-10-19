/** Delivery is configured by the site owner; no request is sent without a destination. */
export function createContactForm(site){
  const form=document.querySelector('#project-form');
  const status=document.querySelector('#form-status');
  const availability=document.querySelector('#form-availability');
  const submit=form.querySelector('button[type="submit"]');
  const buttonLabel=submit.querySelector('span');
  const required=['name','phone','representation'].map(name=>form.elements.namedItem(name));
  let sending=false,lastPayload='',requestId='';

  availability.textContent=site.formEndpoint?'':'Приём заявок скоро откроется.';
  availability.hidden=!availability.textContent;

  function validate(field){
    const value=field.value.trim();
    let error='';
    if(!value)error={name:'Пожалуйста, укажите ваше имя.',phone:'Пожалуйста, укажите номер телефона.',representation:'Выберите, кого вы представляете.'}[field.name];
    else if(field.name==='phone'){
      const digits=value.replace(/\D/g,'');
      if(!/^\+?[\d\s().-]+$/.test(value)||digits.length<7||digits.length>15)error='Проверьте номер: от 7 до 15 цифр.';
    }
    field.setCustomValidity(error);
    field.setAttribute('aria-invalid',String(Boolean(error)));
    document.querySelector(`#${field.name}-error`).textContent=error;
    return !error;
  }
  for(const field of required){
    field.addEventListener('blur',()=>validate(field));
    field.addEventListener('input',()=>{if(field.getAttribute('aria-invalid')==='true')validate(field);});
    field.addEventListener('change',()=>validate(field));
  }
  function report(message,state){status.textContent=message;status.dataset.state=state;}
  form.addEventListener('input',()=>{if(!sending)report('','');});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(sending)return;
    const invalid=required.filter(field=>!validate(field));
    if(invalid.length){report('Проверьте выделенные поля.','error');invalid[0].focus();return;}
    const payload={
      name:form.elements.namedItem('name').value.trim(),
      phone:form.elements.namedItem('phone').value.trim(),
      representation:form.elements.namedItem('representation').value,
      task:form.elements.namedItem('task').value.trim(),
    };
    if(!site.formEndpoint){report('Приём заявок пока недоступен. Пожалуйста, попробуйте позже.','notice');return;}
    const serialized=JSON.stringify(payload);
    // A retry after a timeout must not create another row in the spreadsheet.
    if(serialized!==lastPayload||!requestId){lastPayload=serialized;requestId=crypto.randomUUID();}
    payload.requestId=requestId;
    sending=true;submit.disabled=true;form.setAttribute('aria-busy','true');buttonLabel.textContent='Отправляем…';
    // Keep a submitted request stable until delivery succeeds or fails.
    const fields=[...form.querySelectorAll('input,select,textarea')];
    fields.forEach(field=>field.disabled=true);
    report('Отправляем вашу заявку…','pending');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch(site.formEndpoint,{
        // text/plain keeps the Apps Script request free of a CORS preflight.
        method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8',Accept:'application/json'},
        body:JSON.stringify(payload),signal:controller.signal,credentials:'omit',
      });
      if(!response.ok)throw new Error('Delivery failed');
      const result=await response.json();
      if(result.ok!==true&&result.success!==true)throw new Error('Delivery not confirmed');
      if(result.requestId&&result.requestId!==requestId)throw new Error('Mismatched request');
      form.reset();
      requestId='';lastPayload='';
      required.forEach(field=>{field.setCustomValidity('');field.removeAttribute('aria-invalid');});
      report('Спасибо! Заявка отправлена. Свяжемся с вами, чтобы обсудить проект.','success');
    }catch{
      report('Не удалось подтвердить отправку. Данные остались в форме — попробуйте ещё раз.','error');
    }finally{
      clearTimeout(timeout);sending=false;submit.disabled=false;fields.forEach(field=>field.disabled=false);
      form.removeAttribute('aria-busy');buttonLabel.textContent='Обсудить проект';
    }
  });
}
