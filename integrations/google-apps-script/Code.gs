/** sreda.ai — Google Sheets inbox and Telegram notifications.
 * Keep SPREADSHEET_ID, TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Script Properties.
 * This file is deployed separately and is never included in the public site build.
 */
const HEADERS_=['Получено','ID заявки','Ваше имя','Номер телефона','Вы представляете','Задача','Telegram','Попытки Telegram','Последняя попытка'];
const REPRESENTATIONS_=['Бренд или компанию','Рекламное / креативное агентство','Личный бренд / блог','Частный заказ','Другое'];

function doGet(){return json_({service:'sreda.ai contact form'});}

function doPost(event){
  let lock;
  try{
    const body=event&&event.postData&&event.postData.contents;
    if(!body||body.length>20000)return json_({ok:false,error:'invalid_request'});
    const lead=validateLead_(JSON.parse(body));
    const config=config_();
    lock=LockService.getScriptLock();
    if(!lock.tryLock(10000))return json_({ok:false,error:'busy'});
    const sheet=inbox_(config);
    let row=findLead_(sheet,lead.requestId);
    if(row){
      // A retry with the same ID acknowledges the original, already saved request.
      const previous=sheet.getRange(row,3,1,4).getDisplayValues()[0];
      if(JSON.stringify(previous)!==JSON.stringify([lead.name,lead.phone,lead.representation,lead.task])){
        return json_({ok:false,error:'request_id_conflict'});
      }
    }else{
      row=sheet.getLastRow()+1;
      sheet.getRange(row,3,1,4).setNumberFormat('@');
      sheet.getRange(row,1,1,HEADERS_.length).setValues([[new Date(),lead.requestId,safeCell_(lead.name),safeCell_(lead.phone),safeCell_(lead.representation),safeCell_(lead.task),'pending',0,'']]);
      sheet.getRange(row,1).setNumberFormat('dd.MM.yyyy HH:mm:ss');
      SpreadsheetApp.flush();
      // Persist first; Telegram failures never discard the client's request.
      try{notifyRow_(sheet,row,config);}catch{/* The pending row is picked up by retryTelegram. */}
    }
    return json_({ok:true,requestId:lead.requestId});
  }catch{
    // Do not expose provider errors, tokens, phone numbers or sheet contents.
    return json_({ok:false,error:'request_failed'});
  }finally{if(lock&&lock.hasLock())lock.releaseLock();}
}

function validateLead_(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid request');
  const read=(key,max,optional)=>{
    if(optional&&data[key]===undefined)return '';
    if(typeof data[key]!=='string')throw new Error('Invalid field');
    const value=data[key].trim();
    if((!optional&&!value)||value.length>max)throw new Error('Invalid field');
    return value;
  };
  const lead={requestId:read('requestId',64),name:read('name',100),phone:read('phone',32),representation:read('representation',80),task:read('task',5000,true)};
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead.requestId))throw new Error('Invalid request ID');
  if(!/^\+?[\d\s().-]+$/.test(lead.phone)||lead.phone.replace(/\D/g,'').length<7||lead.phone.replace(/\D/g,'').length>15)throw new Error('Invalid phone');
  if(REPRESENTATIONS_.indexOf(lead.representation)===-1)throw new Error('Invalid representation');
  return lead;
}

function config_(){
  const properties=PropertiesService.getScriptProperties();
  const config={
    spreadsheetId:properties.getProperty('SPREADSHEET_ID'),
    sheetName:properties.getProperty('SHEET_NAME')||'Sreda заявки',
    token:properties.getProperty('TELEGRAM_BOT_TOKEN'),
    chatId:properties.getProperty('TELEGRAM_CHAT_ID'),
  };
  if(!config.spreadsheetId||!config.token||!config.chatId)throw new Error('Set Script Properties first');
  return config;
}

function inbox_(config){
  const spreadsheet=SpreadsheetApp.openById(config.spreadsheetId);
  const sheet=spreadsheet.getSheetByName(config.sheetName)||spreadsheet.insertSheet(config.sheetName);
  if(sheet.getLastRow()===0){
    sheet.appendRow(HEADERS_);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,HEADERS_.length).setFontWeight('bold');
    sheet.setColumnWidth(3,180);sheet.setColumnWidth(4,180);
    sheet.setColumnWidth(5,260);sheet.setColumnWidth(6,450);
  }else if(JSON.stringify(sheet.getRange(1,1,1,HEADERS_.length).getDisplayValues()[0])!==JSON.stringify(HEADERS_)){
    throw new Error('Existing sheet has different columns. Choose a new SHEET_NAME.');
  }
  return sheet;
}

function findLead_(sheet,id){
  if(sheet.getLastRow()<2)return null;
  const match=sheet.getRange(2,2,sheet.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).useRegularExpression(false).findNext();
  return match?match.getRow():null;
}

function safeCell_(value){
  // Preserve leading + in phone numbers and prevent user input becoming a formula.
  return /^[=+\-@'\t\r]/.test(value)?"'"+value:value;
}

function notifyRow_(sheet,row,config){
  const values=sheet.getRange(row,1,1,HEADERS_.length).getDisplayValues()[0];
  if(values[6]==='sent')return;
  const attempts=Number(values[7])||0;
  if(attempts>=8)return;
  const task=values[5]||'Не указана';
  const excerpt=task.length>2500?task.slice(0,2500).replace(/[\uD800-\uDBFF]$/,'')+'…\nПолное описание — в таблице.':task;
  const text=`Новая заявка · sreda.ai\n\nИмя: ${values[2]}\nТелефон: ${values[3]}\nВы представляете: ${values[4]}\n\nЗадача: ${excerpt}\n\nТаблица: https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit#gid=${sheet.getSheetId()}&range=A${row}\nID: ${values[1]}`;
  sheet.getRange(row,7,1,3).setValues([['pending',attempts+1,new Date()]]);
  SpreadsheetApp.flush();
  let sent=false;
  try{
    const response=UrlFetchApp.fetch(`https://api.telegram.org/bot${config.token}/sendMessage`,{
      method:'post',contentType:'application/json',muteHttpExceptions:true,
      payload:JSON.stringify({chat_id:config.chatId,text,link_preview_options:{is_disabled:true}}),
    });
    sent=response.getResponseCode()===200&&JSON.parse(response.getContentText()).ok===true;
  }catch{/* Retry from the durable queue, without logging the secret-bearing URL. */}
  sheet.getRange(row,7).setValue(sent?'sent':attempts+1>=8?'failed':'pending');
  SpreadsheetApp.flush();
}

/** Run once in Apps Script after filling Script Properties and authorizing. */
function setup(){
  const config=config_();
  const sheet=inbox_(config);
  sheet.setFrozenRows(1);
  sheet.getRange(1,1,1,HEADERS_.length).setFontWeight('bold');
  sheet.setColumnWidth(1,160);sheet.setColumnWidth(2,280);sheet.setColumnWidth(3,180);
  sheet.setColumnWidth(4,180);sheet.setColumnWidth(5,260);sheet.setColumnWidth(6,450);
  if(!ScriptApp.getProjectTriggers().some(trigger=>trigger.getHandlerFunction()==='retryTelegram')){
    ScriptApp.newTrigger('retryTelegram').timeBased().everyMinutes(5).create();
  }
}

/** Run once after the owner starts @sreda_ai_requests_bot and saves its token. */
function connectTelegram(){
  const properties=PropertiesService.getScriptProperties();
  const token=(properties.getProperty('TELEGRAM_BOT_TOKEN')||'').trim();
  if(!token)throw new Error('Добавьте TELEGRAM_BOT_TOKEN в свойства скрипта.');
  const call=method=>{
    try{
      const response=UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/${method}`,{muteHttpExceptions:true});
      const data=JSON.parse(response.getContentText());
      if(response.getResponseCode()===200&&data.ok===true)return data.result;
    }catch{/* Never include Telegram's token-bearing URL in an error or log. */}
    throw new Error('Не удалось подключиться к Telegram. Проверьте токен и повторите.');
  };
  if(call('getMe').username!=='sreda_ai_requests_bot')throw new Error('Это токен другого бота. Нужен @sreda_ai_requests_bot.');
  if(properties.getProperty('TELEGRAM_CHAT_ID')){
    setup();return;
  }
  const chats=new Set();
  call('getUpdates').forEach(update=>{
    const message=update.message;
    if(message&&message.chat.type==='private'&&/^\/start(?:\s|$)/.test(message.text||''))chats.add(String(message.chat.id));
  });
  if(chats.size===0)throw new Error('Отправьте боту /start и снова запустите connectTelegram.');
  if(chats.size!==1)throw new Error('Бот получил /start от нескольких людей. Укажите свой TELEGRAM_CHAT_ID вручную.');
  properties.setProperty('TELEGRAM_BOT_TOKEN',token);
  properties.setProperty('TELEGRAM_CHAT_ID',[...chats][0]);
  setup();
}

/** Retry queued notifications in bounded batches. Run manually to retry failed rows too. */
function retryTelegram(event){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  try{
    const config=config_(),sheet=inbox_(config),count=sheet.getLastRow()-1;
    if(count<1)return;
    const rows=sheet.getRange(2,7,count,3).getValues();
    let processed=0;
    for(let i=0;i<rows.length&&processed<10;i++){
      const [status,rawAttempts,lastDate]=rows[i];
      if(status==='sent')continue;
      let attempts=Number(rawAttempts)||0;
      if(attempts>=8){
        if(event)continue;
        attempts=0;sheet.getRange(i+2,8).setValue(0);
      }
      const last=lastDate instanceof Date?lastDate.getTime():0;
      if(event&&last&&Date.now()-last<Math.min(3600000,Math.pow(2,attempts)*60000))continue;
      notifyRow_(sheet,i+2,config);processed++;
    }
  }finally{lock.releaseLock();}
}

function json_(body){return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);}
