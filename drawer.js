// Demo group choices; the interface keeps actual enrollment separate from a waitlist.
const drawerLayer=document.createElement('div');
drawerLayer.className='drawer-layer';drawerLayer.hidden=true;
document.documentElement.append(drawerLayer);
let activeDrawer=null,returnFocus=null,closeTimer;
const group=(id,day,teacher,room='B208',campus='Дукат',extra={})=>({id,day,teacher,room,campus,period:'Каждую неделю, 15 янв – 30 июн',...extra});
function prepareGroups(row){
 if(row.groups)return;
 row.groups=[];
 const otherWaiting=courses.flatMap(course=>course.rows).find(item=>item!==row&&(item.waitingGroup||item.status==='waiting'));
 const otherSlot=otherWaiting?.waitingGroup||otherWaiting;
 if(row.status==='waiting'){
  row.currentGroup=group('current','Понедельник, 12:00–16:40','Смирнов Антон');
  row.waitingGroup=group('waiting',row.day,row.teacher,'B208','Дукат',{full:true,more:row.more});
 }else if(row.status==='enrolled')row.currentGroup=group('current',row.day,row.teacher,'B208','Дукат',{period:row.period,more:row.more});
 row.groups=[...(row.currentGroup?[row.currentGroup]:[]),...(row.waitingGroup?[row.waitingGroup]:[]),
  ...(row.waitingGroup?[group('free-wait-conflict',row.waitingGroup.day,'Пискорский Антуан','B208','Дукат',{period:row.waitingGroup.period,teachers:['Пискорский Антуан','Кирьянова Ольга','Стельмах Иван']})]:[]),
  group('free-1','Вторник, 11:00–12:50','Петрова Алевтина','B202','Телеграф'),
  group('free-2','Среда, 15:00–16:40','Ким Анатолий','B304','Дукат'),
  ...(otherSlot?[group('other-wait-conflict',otherSlot.day,'Стельмах Иван','B208','Телеграф',{full:true,period:otherSlot.period,teachers:['Стельмах Иван','Кирьянова Ольга']})]:[]),
  group('full','Пятница, 12:00–13:40','Гаспарян Артем','B206','Телеграф',{full:true}),
  group('closed','Четверг, 18:00–19:20','Пискорский Антуан','B208','Дукат',{full:true,noWaitlist:true,teachers:['Пискорский Антуан','Кирьянова Ольга','Стельмах Иван']}),
  group('conflict','Четверг, 18:00–19:20','Селищева Елена','B208','Дукат',{conflicts:['Дифференциальные уравнения, лекция']}),
  group('full-conflict','Понедельник, 12:00–13:40','Пискорский Антуан','B202','Телеграф',{full:true,conflicts:['Дифференциальные уравнения, семинар','Математический анализ, семинар']})];
}
const drawerBadge=(text,state)=>`<span class="badge ${state}">${text}</span>`;
const teacherNames=['Гаспарян Артем','Ким Анатолий','Кирьянова Ольга','Селищева Елена','Пискорский Антуан'];
function groupCard(g,row){
 const current=row.currentGroup?.id===g.id,waiting=row.waitingGroup?.id===g.id;
 const disabled=false;
 return `<label class="group-card ${activeDrawer.selected===g.id?'is-selected':''} ${disabled?'is-disabled':''}">
 <input type="radio" name="group" value="${g.id}" ${activeDrawer.selected===g.id?'checked':''} ${disabled?'disabled':''}>
 <span class="group-content"> <span class="group-badges">${current?drawerBadge('Записан','enrolled'):waiting?drawerBadge(`В листе ожидания: ${waitlistPosition(row)}`,'waiting'):g.noWaitlist?drawerBadge('Нет мест','conflict-danger'):g.full?drawerBadge(`Есть лист ожидания: ${g.queueSize??5}`,'waiting'):''}
 ${g.conflicts?drawerBadge(g.conflicts.length>1?'Пересечение с рядом пар':'Пересечение с парой',g.conflicts.length>1?'conflict-danger':'conflict-badge'):''}</span><span class="group-top"><span class="group-time">${g.day}</span></span>
 <span class="group-period">${g.period}, ${g.room} · ${g.campus}</span>
 <span class="group-teachers">${[...new Set(g.teachers||[g.teacher,...(g.more===1?['Петрова Алевтина']:g.more?teacherNames:current&&row.type==='Лекция'&&g.teacher==='Пискорский Антуан'?['Кирьянова Ольга','Стельмах Иван']:[])])].map(name=>`<span class="group-person"><span class="person-icon" aria-hidden="true"><img src="assets/teacher.svg" alt=""></span><span>${name}</span></span>`).join('')}</span>


 ${g.conflicts?`<span class="group-conflicts">${g.conflicts.map(text=>`<span class="conflict-link">${text}</span>`).join('')}</span>`:''}</span>
 </label>`;
}
function compareGroupOptions(a,b){
 const rank=g=>g.noWaitlist?3:g.conflicts?.length?2:g.full?1:0;
 const time=g=>{
  const days=['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'];
  const match=g.day?.toLowerCase().match(/^([^,]+),\s*(\d{1,2}):(\d{2})/);
  const day=match?days.indexOf(match[1]):-1;
  return day<0?Infinity:day*1440 + +match[2]*60 + +match[3];
 };
 return rank(a)-rank(b)||time(a)-time(b);
}
function renderDrawer(){
 const previousScroll=drawerLayer.querySelector('.drawer-scroll')?.scrollTop||0;
 const {course,row}=activeDrawer;
 const selected=row.groups.find(g=>g.id===activeDrawer.selected);
 const isCurrent=!!selected&&selected.id===row.currentGroup?.id,isWaiting=!!selected&&selected.id===row.waitingGroup?.id;
 let primary=selected?.full?'Записаться в лист ожидания':'Записаться';
 const hasOtherWaitlist=!!selected?.full&&!selected.noWaitlist&&!!row.waitingGroup&&!isWaiting;
 const needsEnrollment=!!selected?.full&&!selected.noWaitlist&&!row.currentGroup;
 let helper='';
 if(selected?.noWaitlist){primary='Записаться'}
 const actionTip=selected?.noWaitlist?'На эту пару нет свободных мест и листа ожидания':hasOtherWaitlist?'Чтобы записаться в этот лист ожидания, сначала выйди из текущего':needsEnrollment?'Чтобы встать в лист ожидания, сначала запишись на пару со&nbsp;свободными местами':'';

 const list=(arr)=>arr.map(g=>groupCard(g,row)).join('');
 const owned=[row.currentGroup,row.waitingGroup].filter(Boolean);
 const ownedIds=new Set(owned.map(g=>g.id));
 const other=row.groups.filter(g=>!ownedIds.has(g.id)).sort(compareGroupOptions);
 drawerLayer.innerHTML=`<div class="drawer-backdrop"></div><section class="enrollment-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1">
 <div class="drawer-header"><button class="drawer-close" aria-label="Закрыть"><svg class="desktop-close" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg><span class="mobile-back">←</span></button>
 <h2 id="drawer-title">${row.currentGroup||row.waitingGroup?'Изменить запись':'Выбрать время'}</h2><p>${row.type} «${course.name}»</p><img class="drawer-clock" src="assets/drawer-clock.png" alt=""></div>
 <div class="drawer-panel"><div class="drawer-scroll">
 ${owned.length?`<div class="group-list">${list(owned)}</div><h3>Другие варианты для записи</h3>`:''}
 <div class="group-list">${list(other)}</div></div>
 <div class="drawer-footer" ${!selected?'hidden':''}>${helper?`<p class="drawer-helper">${helper}</p>`:''}<div class="drawer-actions">
 ${isCurrent||isWaiting?`<button class="drawer-primary" data-manage="${isWaiting?'leave':'cancel'}">Отменить запись</button>`:''}
 <div class="drawer-submit-wrap" ${actionTip?'tabindex="0" aria-describedby="enrollment-tip"':''} ${!selected||isCurrent||isWaiting?'hidden':''}>${actionTip?`<div class="drawer-enrollment-tip ${selected?.noWaitlist?'no-places-tip':''}" id="enrollment-tip" role="tooltip">${actionTip}</div>`:''}<button class="drawer-primary ${needsEnrollment?'needs-enrollment':''}" data-submit ${selected?.noWaitlist||needsEnrollment||hasOtherWaitlist?'disabled':''} ${actionTip?'aria-describedby="enrollment-tip"':''}>${primary}</button></div></div></div></div></section>`;
 drawerLayer.querySelector('.drawer-scroll').scrollTop=previousScroll;
 drawerLayer.querySelector('.enrollment-drawer').classList.toggle('is-scrolled',previousScroll>16);
 drawerLayer.querySelector('.drawer-close').onclick=closeDrawer;
 drawerLayer.querySelector('.drawer-backdrop').onclick=closeDrawer;
 drawerLayer.querySelectorAll('input[name="group"]').forEach(input=>input.onchange=()=>{
  const scroll=drawerLayer.querySelector('.drawer-scroll').scrollTop;
  activeDrawer.selected=input.value;renderDrawer();
  drawerLayer.querySelector('.drawer-scroll').scrollTop=scroll;
  drawerLayer.querySelector(`input[value="${input.value}"]`).focus({preventScroll:true});
 });
 drawerLayer.querySelectorAll('.more').forEach(b=>b.onclick=e=>{e.preventDefault();b.focus()});
 const submit=drawerLayer.querySelector('[data-submit]');
 if(submit)submit.onclick=()=>{
  if(!selected){closeDrawer();return}
  if(selected.noWaitlist||(selected.full&&(!row.currentGroup||(row.waitingGroup&&row.waitingGroup.id!==selected.id))))return;
  if(isCurrent||isWaiting){closeDrawer();return}
  const overlaps=!selected.full?enrollmentOverlaps(selected,row):[];
  if(overlaps.length)confirmDrawer('Записаться на это время?',`Эта пара пересекается с твоими занятиями: ${overlaps.join('; ')}. Если запишешься, пары будут проходить одновременно`,()=>commitGroup(selected),'Записаться');
  else if(selected.full&&waitlistOverlaps(selected,row,true))confirmDrawer('Записаться в лист ожидания?','Ты уже в листе ожидания другой пары на это время. Если тебя запишут на нее, запись в новый лист ожидания отменится, когда подойдет твоя очередь',()=>commitGroup(selected),'Записаться');
  else if(!selected.full&&waitlistOverlaps(selected,row))confirmDrawer('Записаться на это время?','Эта пара пересекается с парой из твоего листа ожидания. Если пересечение останется, уберем тебя из листа ожидания, когда подойдет очередь',()=>commitGroup(selected),'Записаться');
  else if(selected.conflicts)confirmDrawer('Выбрать это время?','У выбранной группы есть пересечение с твоими занятиями. Проверь расписание перед записью.',()=>commitGroup(selected));
  else commitGroup(selected);
 };
 drawerLayer.querySelector('[data-manage]')?.addEventListener('click',e=>{
  const leave=e.currentTarget.dataset.manage==='leave';
  confirmDrawer(leave?'Отменить запись в лист ожидания?':'Отменить запись?',leave?'Уберем тебя из очереди на пару. Ты сможешь записаться снова, но окажешься в конце очереди':row.waitingGroup?'Ты также выйдешь из листа ожидания этой пары. Затем можно будет выбрать другое время.':'После отмены нужно будет выбрать другое время',()=>{
   if(leave){
    const previous=row.waitingGroup;
    try{row.waitingGroup=null;syncRow(row);finishDrawer('Запись в лист ожидания отменена','Ты больше не в очереди на эту пару')}
    catch(error){row.waitingGroup=previous;syncRow(row);showNotice('Не удалось отменить запись','Попробуй еще раз',true)}
   }
   else{row.currentGroup=null;row.waitingGroup=null;syncRow(row);finishDrawer('Запись отменена')}
  },'Отменить запись');
 });
 drawerLayer.querySelector('.drawer-scroll').onscroll=e=>drawerLayer.querySelector('.enrollment-drawer').classList.toggle('is-scrolled',e.target.scrollTop>16);
}
function confirmDrawer(title,description,onConfirm,label='Подтвердить'){
 const modal=document.createElement('div');modal.className='drawer-confirm';modal.innerHTML=`<div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" tabindex="-1"><button class="confirm-close" aria-label="Закрыть подтверждение"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button><h3 id="confirm-title">${title}</h3><p>${description}</p><div><button class="drawer-secondary" data-back>Назад</button><button class="drawer-primary" data-confirm>${label}</button></div></div>`;
 drawerLayer.append(modal);drawerLayer.querySelector('.enrollment-drawer').inert=true;
 modal.querySelector('[data-back]').onclick=()=>{modal.remove();drawerLayer.querySelector('.enrollment-drawer').inert=false;(drawerLayer.querySelector('[data-manage]')||drawerLayer.querySelector('[data-submit]')).focus()};
 modal.querySelector('.confirm-close').onclick=()=>modal.querySelector('[data-back]').click();
 modal.querySelector('[data-confirm]').onclick=onConfirm;modal.querySelector('[data-back]').focus();
}
function syncRow(row){
 const g=row.waitingGroup||row.currentGroup;
 row.status=row.waitingGroup?'waiting':row.currentGroup?'enrolled':'empty';
 for(const key of ['day','period','teacher','more']){if(g&&g[key]!==undefined)row[key]=g[key];else delete row[key]}
 row.location=g?`${g.room} · ${g.campus}`:null;
}
// Demo schedules recur over the same teaching period; compare weekday and time.
function slotsOverlap(a,b){
 if(!a?.day||!b?.day)return false;
 const parse=slot=>{const match=slot.day.match(/^(.*?),\s*(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})/);return match?{day:match[1].toLowerCase(),start:+match[2]*60 + +match[3],end:+match[4]*60 + +match[5]}:null};
 const first=parse(a),second=parse(b);
 return !!first&&!!second&&first.day===second.day&&first.start<second.end&&second.start<first.end;
}
function enrollmentOverlaps(slot,row){
 return courses.flatMap(course=>course.rows.filter(item=>item!==row&&slotsOverlap(slot,item.currentGroup||(item.status==='enrolled'?item:null))).map(item=>`${course.name}, ${item.type.toLowerCase()}`));
}
function waitlistOverlaps(slot,row,otherOnly=false){
 return courses.some(course=>course.rows.some(item=>(!otherOnly||item!==row)&&slotsOverlap(slot,item.waitingGroup||(item.status==='waiting'?item:null))));
}
// Called when a place becomes available, rather than when a free slot is booked.
function processWaitlistTurn(c,r){
 const row=courses[c]?.rows[r],waiting=row?.waitingGroup;
 if(!waiting)return false;
 const conflict=courses.some(course=>course.rows.some(item=>slotsOverlap(item.currentGroup||(item.status==='enrolled'?item:null),waiting)));
 if(conflict){row.waitingGroup=null;syncRow(row);renderCourses();showNotice('Запись в лист ожидания отменена','Пара пересекается с твоими занятиями')}
 else{row.currentGroup={...waiting,full:false};row.waitingGroup=null;syncRow(row);renderCourses();showNotice('Ты записан',`Время занятия: ${waiting.day}`)}
 if(activeDrawer?.row===row)renderDrawer();
 return true;
}
function commitGroup(g){
 const row=activeDrawer.row,hadRecord=!!row.currentGroup;
 if(g.noWaitlist)return;
 if(g.full&&(!row.currentGroup||(row.waitingGroup&&row.waitingGroup.id!==g.id)))return;
 const previousCurrent=row.currentGroup,previousWaiting=row.waitingGroup;
 try{
  // A URL flag makes the server-error branch reproducible in this static prototype.
  if(g.full&&new URLSearchParams(location.search).has('waitlist-error'))throw new Error('Demo waitlist error');
  if(g.full)row.waitingGroup={...g,queuePosition:(g.queueSize??5)+1};
  else row.currentGroup=g;
  syncRow(row);
  finishDrawer(g.full?'Ты в листе ожидания':hadRecord?'Запись изменена':'Ты записан',g.full?'Как только подойдет твоя очередь и не будет пересечений, запишем тебя на пару':`${hadRecord?'Новое время':'Время занятия'}: ${g.day.charAt(0).toLowerCase()+g.day.slice(1)}`);
 }catch(error){
  row.currentGroup=previousCurrent;row.waitingGroup=previousWaiting;syncRow(row);
  drawerLayer.querySelector('.drawer-confirm')?.remove();
  showNotice(g.full?'Не удалось записаться в лист ожидания':'Не удалось записаться','Попробуй еще раз',true);
  drawerLayer.querySelector('.drawer-submit-wrap')?.focus({preventScroll:true});
 }
}
function finishDrawer(message,detail=''){
 renderCourses();closeDrawer();showNotice(message,detail);
}
function showNotice(message,detail='',error=false){
 document.querySelector('.notice')?.remove();
 const n=document.createElement('div');n.className='notice'+(error?' notice-error':'');n.setAttribute('role',error?'alert':'status');
 n.innerHTML='<svg class="notice-check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12"/><path d="m7 12 3 3 7-7"/></svg><div class="notice-copy"><div class="notice-title"></div><div class="notice-detail"></div></div><button class="notice-close" aria-label="Закрыть уведомление">×</button>';
 if(error)n.querySelector('.notice-check').innerHTML='<path d="M12 1 24 22H0Z"/><path class="notice-warning-mark" d="M12 8v6m0 3v1"/>';
 n.querySelector('.notice-title').textContent=message;n.querySelector('.notice-detail').textContent=detail;
 document.documentElement.append(n);let timer=setTimeout(()=>n.remove(),7000);
 n.querySelector('button').onclick=()=>{clearTimeout(timer);n.remove()};
 n.onmouseenter=()=>clearTimeout(timer);n.onmouseleave=()=>{timer=setTimeout(()=>n.remove(),7000)};
}
function openDrawer(c,r,button){
 clearTimeout(closeTimer);const course=courses[c],row=course.rows[r];prepareGroups(row);
 returnFocus=button;activeDrawer={course,row,c,r,selected:null};
 renderDrawer();drawerLayer.hidden=false;document.body.inert=true;document.documentElement.classList.add('drawer-open');
 // Commit the off-screen position before starting the 300ms slide.
 drawerLayer.classList.remove('is-open');
 void drawerLayer.offsetWidth;
 drawerLayer.classList.add('is-open');
 drawerLayer.querySelector('.drawer-close').focus({preventScroll:true});
}
function closeDrawer(){
 drawerLayer.classList.remove('is-open');document.body.inert=false;document.documentElement.classList.remove('drawer-open');
 const target=returnFocus?.isConnected?returnFocus:document.querySelector(`[data-course="${activeDrawer?.c}"][data-row="${activeDrawer?.r}"]`);target?.focus({preventScroll:true});
 closeTimer=setTimeout(()=>{drawerLayer.hidden=true;drawerLayer.innerHTML='';activeDrawer=null},300);
}
document.querySelector('#courses').addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button)openDrawer(+button.dataset.course,+button.dataset.row,button)});
drawerLayer.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();const back=drawerLayer.querySelector('.drawer-confirm [data-back]');if(back)back.click();else closeDrawer()}
 if(e.key==='Tab'){
  const scope=drawerLayer.querySelector('.drawer-confirm')||drawerLayer.querySelector('.enrollment-drawer');
  const items=[...scope.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
  if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus()}
  else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus()}
 }
});
