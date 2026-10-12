// Keep Russian function words with the following word in static and dynamic UI.
(() => {
 const words='в|во|на|над|надо|под|подо|с|со|к|ко|у|о|об|обо|от|ото|до|из|изо|за|по|для|без|безо|при|про|через|перед|передо|между|и|а|но|или|либо|да|что|чтобы|как|если|то|не|ни';
 const pattern=new RegExp('(?<![А-Яа-яЁё])('+words+') +(?=\\S)','giu');
 function fix(root){
  if(root.nodeType===Node.TEXT_NODE){
   if(root.parentElement?.closest('script,style,textarea,pre,code,svg,[contenteditable]'))return;
   const next=root.data.replace(pattern,'$1\u00a0');
   if(next!==root.data)root.data=next;
   return;
  }
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;while(node=walker.nextNode())fix(node);
 }
 fix(document.documentElement);
 new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='characterData')fix(record.target);
   else for(const node of record.addedNodes)fix(node);
  }
 }).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
