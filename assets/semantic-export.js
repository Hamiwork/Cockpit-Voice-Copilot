'use strict';
// 基于 Artifact Tool 制作的双 Sheet 模板，在浏览器内写入已保存的 PM 快照。
// 仅生成本地 XLSX，不查询平台协议、不发送网络请求。
const SEMANTIC_TEMPLATE_NOTICE='Demo Template · Not connected to production system';
function semanticTemplateExportState(draft,issue,session=optimizationState.sessions.get(draft?.issueId)){
  if(!draft)return {ready:false,reason:'请先保存优化草稿，再导出模板。'};
  if(!canEnterOptimization(issue)||draft.sourceKey!==optimizationSourceKey(issue))return {ready:false,reason:'来源 Issue 或 Evidence 已变化，请重新审核并保存草稿后导出。'};
  if(!session||session.revision!==draft.revision)return {ready:false,reason:'当前有未保存修改，请先保存优化草稿再导出。'};
  if(!supportsOptimizationMock(issue)||draft.type!=='语料泛化')return {ready:false,reason:'当前 V1 仅提供副驾车窗微开案例的语料泛化模板。'};
  if(!draft.issueInfo||!draft.template?.suggestedSemantic||!draft.objectValues?.length||!draft.slotValues?.length)return {ready:false,reason:'请重新保存当前审核结果，再导出模板。'};
  return {ready:true,reason:'读取当前已保存的 PM 审核结果。'};
}
function semanticTemplateData(draft){
  if(!draft?.template?.suggestedSemantic||!draft.issueInfo||!draft.rule||!draft.slotName||!draft.evidence?.length||!draft.objectValues?.length||!draft.slotValues?.length)throw new Error('优化草稿信息不完整，请重新保存。');
  const name=draft.template.functionalName;
  return {
    semanticRow:[draft.issueInfo.module,draft.issueInfo.object,name,'云端+本地','全场景',`为“${name}”的泛化，泛化到“${name}”语义`,draft.rule,draft.evidence.map(item=>item.raw).join('\n'),JSON.stringify(draft.template.suggestedSemantic,null,2)],
    slotRows:draft.slotValues.map(value=>[draft.slotName,value]),
    notes:[SEMANTIC_TEMPLATE_NOTICE,'Demo data / Mock AI output','当前导出用于 V1 Demo，正式环境需匹配实际平台模板字段与校验规则。',`来源 Issue：${draft.issueId} · ${draft.issueName}`,`PM 已确认对象：${draft.objectValues.join(' / ')}`,draft.template.protocolNote],
    filename:`语义定制模板_${name}_${draft.issueId}.xlsx`.replace(/[\\/:*?"<>|]/g,'_'),
  };
}
function semanticXmlText(value){
  const text=String(value);
  if(text.length>32767||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text))throw new Error('当前内容超出 Excel 单元格支持范围，请核对后保存。');
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/\r/g,'&#13;');
}
function semanticXmlCell(address,value,style){return `<x:c r="${address}" s="${style}" t="inlineStr"><x:is><x:t xml:space="preserve">${semanticXmlText(value)}</x:t></x:is></x:c>`;}
function semanticTextLines(text,width){return String(text).split('\n').reduce((total,line)=>total+Math.max(1,Math.ceil([...line].reduce((n,c)=>n+(c.charCodeAt(0)>255?2:1),0)/width)),0);}
function semanticWorksheetXml(data){
  const base=window.SEMANTIC_TEMPLATE_BASE.semantic;
  const height=Math.min(409.5,Math.max(80,...data.semanticRow.map((value,i)=>semanticTextLines(value,base.widths[i]-2)*15+16)));
  const body=`<x:row r="2" ht="${height}" customHeight="1">${data.semanticRow.map((value,i)=>semanticXmlCell(`${String.fromCharCode(65+i)}2`,value,base.bodyStyles[i])).join('')}</x:row>`;
  const notes=data.notes.map((value,i)=>`<x:row r="${i+4}" ht="20" customHeight="1">${semanticXmlCell(`A${i+4}`,value,base.noteStyle)}</x:row>`).join('');
  return base.before+base.header+body+notes+base.after;
}
function semanticSlotsXml(data){
  const base=window.SEMANTIC_TEMPLATE_BASE.slots;
  const rows=data.slotRows.map((values,i)=>`<x:row r="${i+2}" ht="${Math.max(25,Math.min(409.5,Math.max(semanticTextLines(values[0],24),semanticTextLines(values[1],36))*15+10))}" customHeight="1">${values.map((value,j)=>semanticXmlCell(`${j?'B':'A'}${i+2}`,value,base.bodyStyles[j])).join('')}</x:row>`).join('');
  const noteRow=data.slotRows.length+3;
  return base.before+base.header+rows+`<x:row r="${noteRow}" ht="20" customHeight="1">${semanticXmlCell(`A${noteRow}`,SEMANTIC_TEMPLATE_NOTICE,base.noteStyle)}</x:row>`+base.after;
}
function semanticCrc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
// ZIP32 stored entries：仅打包 UTF-8 XML，避免引入在线 CDN 或运行时依赖。
function semanticZip(parts){
  const encoder=new TextEncoder(),chunks=[],directory=[];let offset=0,centralSize=0;
  for(const [name,text] of Object.entries(parts)){
    const path=encoder.encode(name),bytes=encoder.encode(text),crc=semanticCrc32(bytes),local=new Uint8Array(30+path.length),view=new DataView(local.buffer);
    view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x0800,true);view.setUint16(12,33,true);view.setUint32(14,crc,true);view.setUint32(18,bytes.length,true);view.setUint32(22,bytes.length,true);view.setUint16(26,path.length,true);local.set(path,30);
    chunks.push(local,bytes);
    const central=new Uint8Array(46+path.length),cv=new DataView(central.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(14,33,true);cv.setUint32(16,crc,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,path.length,true);cv.setUint32(42,offset,true);central.set(path,46);
    directory.push(central);centralSize+=central.length;offset+=local.length+bytes.length;
  }
  const end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,directory.length,true);ev.setUint16(10,directory.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
  const output=new Uint8Array(offset+centralSize+end.length);let cursor=0;
  for(const chunk of [...chunks,...directory,end]){output.set(chunk,cursor);cursor+=chunk.length;}
  return output;
}
function semanticTemplateBytes(draft){
  const data=semanticTemplateData(draft),parts={...window.SEMANTIC_TEMPLATE_BASE.parts,'xl/worksheets/sheet1.xml':semanticWorksheetXml(data),'xl/worksheets/sheet2.xml':semanticSlotsXml(data)};
  return semanticZip(parts);
}
function exportSavedSemanticTemplate(){
  refreshIssueAnalysis();const session=optimizationSession(),draft=session?.savedDraft,status=semanticTemplateExportState(draft,optimizationIssue(),session);
  if(!status.ready){notify(status.reason);return;}
  try{
    const data=semanticTemplateData(draft),blob=new Blob([semanticTemplateBytes(draft)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=data.filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已导出语义定制模板 · Demo');
  }catch(error){notify(error.message||'模板导出失败，请重新保存后重试。');}
}
function showVoicePlatformDemo(){
  const dialog=document.createElement('dialog');dialog.className='similar-dialog platform-demo-dialog';dialog.setAttribute('aria-labelledby','platform-demo-title');
  dialog.innerHTML=`<header class="similar-header"><div><div class="eyebrow">DEMO</div><h2 id="platform-demo-title">提交到语音平台</h2></div><button class="icon-btn" aria-label="关闭平台提示">${icon('close')}</button></header><div class="platform-demo-body"><p>当前 Demo 未接入真实语音生产平台。</p><p>正式版本可将审核后的语义定制模板提交至下游语义 / 车控平台。</p></div><footer class="similar-footer"><button class="btn btn-primary" id="close-platform-demo">知道了</button></footer>`;
  document.body.append(dialog);dialog.querySelector('.icon-btn').addEventListener('click',()=>dialog.close());dialog.querySelector('#close-platform-demo').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
}
function semanticTemplateDelivery(draft,issue,session){
  const status=semanticTemplateExportState(draft,issue,session);
  return `<div class="draft-delivery"><div class="draft-delivery-actions"><div><button class="btn btn-primary" data-export-semantic-template ${status.ready?'':'disabled'}>${icon('sheet')}导出语义定制模板</button><small>Excel · 泛化提单格式</small></div><button class="btn" data-submit-voice-platform>${icon('upload')}提交到语音平台 <span class="mock-pill">Demo</span></button></div>${!status.ready?`<p class="draft-export-blocked">${escapeHTML(status.reason)}</p>`:''}<p class="optimization-note">当前导出用于 V1 Demo，正式环境需匹配实际平台模板字段与校验规则。</p><p class="optimization-note">Fictional demo schema, not derived from production configuration.</p></div>`;
}
function bindSemanticTemplateDelivery(root=document){
  root.querySelector('[data-export-semantic-template]')?.addEventListener('click',exportSavedSemanticTemplate);
  root.querySelector('[data-submit-voice-platform]')?.addEventListener('click',showVoicePlatformDemo);
}
