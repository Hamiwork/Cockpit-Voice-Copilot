'use strict';
// 背景与处理状态均由 PM 显式批量应用，不更改原始证据。
const contextKeys=['model','version','date','source'];
const modelPresets=['X7','X9','S3','L6'];
const versionPresets=['V2.3.1','V2.4.0','V2.5.0','V3.0.0','V3.0.1'];
const dispositionLabels={pending:'待处理',resolved:'已解决',excluded:'已排除'};
let selectionScrollFrame=0;
function missingContext(item){return contextKeys.filter(key=>!item[key]||item[key]==='未提供');}
function visiblePreparationRows(){return state.feedback.filter(item=>state.prepFilter==='all'||state.prepFilter==='missing'&&item.disposition==='pending'&&missingContext(item).length||item.disposition===state.prepFilter);}
function todayDate(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');}
function newBackgroundDraft(){return {model:'',version:'',start:todayDate(),end:'',source:''};}
function metadataValue(value){return value==='未提供'?'<span class="missing-value">未提供</span>':escapeHTML(value);}
function preparationPage(){
  stopSelectionDrag();const draft=state.backgroundDraft;
  const rows=visiblePreparationRows();const missing=state.feedback.filter(item=>item.disposition==='pending'&&missingContext(item).length).length;
  const pending=state.feedback.filter(item=>item.disposition==='pending').length;
  layout(`<div class="page-heading"><div><div class="eyebrow">02 / PREPARE</div><h1>整理反馈</h1><p>${!pending?'没有待处理反馈，可查看已解决或已排除的记录。':missing?`${missing} 条待处理反馈缺少背景，可勾选后批量补充；已有信息优先保留。`:'待处理反馈的背景完整，无需补充。可先整理需要继续处理的反馈。'}</p></div><button class="btn btn-primary" id="continue-review">进入审核 <span class="button-count">${pending}</span></button></div>
    <div class="preparation-grid"><section class="card preparation-card"><div class="prep-topline"><label for="prep-filter">显示<select id="prep-filter" aria-label="显示">${[['all',`全部反馈 (${state.feedback.length})`],['missing',`缺失背景 (${missing})`],['pending',`待处理 (${pending})`],['resolved',`已解决 (${state.feedback.filter(item=>item.disposition==='resolved').length})`],['excluded',`已排除 (${state.feedback.filter(item=>item.disposition==='excluded').length})`]].map(([value,label])=>`<option value="${value}" ${state.prepFilter===value?'selected':''}>${label}</option>`).join('')}</select></label><span class="shortcut-hint">拖选左侧选择栏 · Shift 选择连续范围</span></div>
      <div class="bulk-toolbar prep-bulk-toolbar"><div class="bulk-selection"><span id="prep-selection-count">已选 0 条</span><button class="text-link" id="prep-clear" hidden>取消选择</button><button class="bulk-action selection-action" id="mark-resolved" aria-describedby="bulk-selection-hint">标记已解决</button><button class="bulk-action selection-action" id="exclude-feedback" aria-describedby="bulk-selection-hint">排除反馈</button><button class="bulk-action selection-action" id="restore-feedback" hidden>恢复待处理</button></div><span class="sr-only" id="bulk-selection-hint">先勾选下方反馈，再选择处理方式</span></div>
      <div class="table-scroll preparation-scroll" id="preparation-scroll"><table class="feedback-table preparation-table"><caption class="sr-only">勾选、按住鼠标拖动选择栏或 Shift 点击选择连续反馈。之后可应用背景或处理状态。</caption><thead><tr><th class="selection-cell"><input type="checkbox" id="prep-select-all" aria-label="全选当前显示的反馈"></th><th scope="col">#</th><th scope="col">原始反馈</th><th scope="col">车型 / 版本</th><th scope="col">日期 / 来源</th><th scope="col">背景补充</th></tr></thead><tbody>${rows.map(item=>`<tr data-background-id="${item.id}" class="${item.disposition==='excluded'?'excluded-row':''}"><td class="selection-cell" title="按住鼠标拖动此列可连续选择"><input type="checkbox" data-prep-checkbox="${item.id}" aria-label="选择 ${item.id}：${escapeHTML(item.raw)}"></td><td class="id-cell">${item.id.slice(3)}</td><td class="evidence-cell"><span class="raw-line">${escapeHTML(item.raw)}</span><div class="row-status">${item.disposition==='pending'?'':badge(dispositionLabels[item.disposition],item.disposition==='resolved'?'badge-resolved':'badge-neutral')}${item.disposition==='resolved'?`<span>上线版本：${escapeHTML(item.resolvedVersion||'待确认')}</span>`:''}${item.excludeReason&&item.disposition==='excluded'?`<span>${escapeHTML(item.excludeReason)}</span>`:''}</div></td><td class="background-meta">${metadataValue(item.model)}<small>${metadataValue(item.version)}</small></td><td class="background-meta">${metadataValue(item.date)}<small>${metadataValue(item.source)}</small></td><td>${item.background?badge('PM 已补充','badge-pm'):'<span class="unassigned">—</span>'}</td></tr>`).join('')||'<tr><td colspan="6"><div class="empty-state"><strong>没有符合条件的反馈</strong><span>切换筛选条件查看其他反馈</span></div></td></tr>'}</tbody></table></div>
      <div class="prep-selection-tip">${icon('info')}<span>从左侧方框按住鼠标向下拖动可选中多行，拖到列表边缘会自动滚动。</span></div><footer class="table-footer"><span>当前显示 ${rows.length} 条</span><span>已解决 / 已排除不进入后续审核和推荐</span></footer>
    </section><aside class="card background-editor"><div class="card-header"><div><h2>批量补充背景</h2><p>勾选反馈后填写，再批量应用</p></div></div><div class="card-body">
      <div class="field"><label for="background-model">车型</label><select id="background-model" data-background-field="model"><option value="">选择车型（可选）</option>${selectOptions([...new Set([...modelPresets,...state.feedback.map(item=>item.model).filter(value=>value!=='未提供')])],draft.model)}</select></div>
      <div class="field"><label for="background-version">软件版本</label><select id="background-version" data-background-field="version"><option value="">选择版本（可选）</option>${selectOptions([...new Set([...versionPresets,...state.feedback.map(item=>item.version).filter(value=>value!=='未提供')])],draft.version)}</select></div>
      <div class="field"><label for="background-start">数据日期 / 日期范围</label><div class="date-range"><input type="date" id="background-start" aria-label="背景开始日期" aria-describedby="background-date-hint" data-background-field="start" value="${draft.start}"><input type="date" id="background-end" aria-label="背景结束日期（可选）" aria-describedby="background-date-hint" data-background-field="end" value="${draft.end}"></div><small class="field-hint" id="background-date-hint">未选择日期时，默认今日。<br>只填写一个日期按单日记录，两个日期按范围记录。</small></div>
      <div class="field"><label for="background-source">来源</label><select id="background-source" data-background-field="source"><option value="">选择来源（可选）</option>${selectOptions(['用户评论','客服反馈','测试反馈','实车走查','不识别语料'],draft.source)}</select></div>
      <button class="btn btn-primary full-width" id="apply-background" disabled>应用背景到已选 0 条</button><p class="background-preserve-note">材料已有字段不覆盖。<br>选择下一组反馈后，可填写另一套背景。<br>无需补充时，直接进入审核。</p><div class="context-foot">${icon('info')}<span>车型和版本使用示例选项；当前不连接数据库。</span></div>
    </div></aside></div>`);
  $('#continue-review').addEventListener('click',()=>{stopSelectionDrag();state.page='review';state.filter='pending';render();});
  $('#prep-filter').addEventListener('change',event=>{state.prepFilter=event.target.value;state.selectedFeedback.clear();state.selectionAnchor=null;preparationPage();});
  document.querySelectorAll('[data-background-field]').forEach(input=>input.addEventListener('input',event=>{draft[input.dataset.backgroundField]=event.target.value;updatePreparationSelection();}));
  $('#apply-background').addEventListener('click',applyBackground);
  $('#prep-clear').addEventListener('click',()=>{state.selectedFeedback.clear();state.selectionAnchor=null;updatePreparationSelection();});
  $('#prep-select-all').addEventListener('change',event=>{for(const item of rows)event.target.checked?state.selectedFeedback.add(item.id):state.selectedFeedback.delete(item.id);updatePreparationSelection();});
  $('#mark-resolved').addEventListener('click',()=>openDispositionDialog('resolved'));
  $('#exclude-feedback').addEventListener('click',()=>openDispositionDialog('excluded'));
  $('#restore-feedback').addEventListener('click',()=>applyDisposition('pending'));
  bindFeedbackSelection(rows,'prepare');
  updatePreparationSelection();
}
function bindFeedbackSelection(rows,surface){
  const review=surface==='review',selector=review?'[data-feedback]':'[data-background-id]',key=review?'feedback':'backgroundId';
  document.querySelectorAll(selector).forEach((row,index)=>{
    const cell=$('.selection-cell',row),input=$('input',cell);
    cell.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='mouse'||event.button!==0)return;event.preventDefault();
      const selected=review?state.reviewSelection:state.selectedFeedback,anchor=review?state.reviewAnchor:state.selectionAnchor;
      const mode=!selected.has(row.dataset[key]);
      const start=event.shiftKey&&anchor!=null?anchor:index;
      state.drag={surface,start,mode,base:new Set(selected),pointerId:event.pointerId,x:event.clientX,y:event.clientY,ids:rows.map(item=>item.id)};
      selectPreparationRange(start,index,mode,state.drag.ids,surface);
      if(review)state.reviewAnchor=event.shiftKey?start:index;else state.selectionAnchor=event.shiftKey?start:index;
      startSelectionScroll();
    });
    cell.addEventListener('click',event=>{event.stopPropagation();if(event.detail>0){event.preventDefault();requestAnimationFrame(review?updateReviewSelection:updatePreparationSelection);}});
    input.addEventListener('change',()=>{const selected=review?state.reviewSelection:state.selectedFeedback;input.checked?selected.add(row.dataset[key]):selected.delete(row.dataset[key]);if(review)state.reviewAnchor=index;else state.selectionAnchor=index;(review?updateReviewSelection:updatePreparationSelection)();});
  });
}
function selectPreparationRange(start,end,mode,ids,surface='prepare'){const review=surface==='review';const selected=state.drag?new Set(state.drag.base):review?state.reviewSelection:state.selectedFeedback;for(let index=Math.min(start,end);index<=Math.max(start,end);index++)mode?selected.add(ids[index]):selected.delete(ids[index]);if(review)state.reviewSelection=selected;else state.selectedFeedback=selected;(review?updateReviewSelection:updatePreparationSelection)();}
function updatePreparationSelection(){
  if(state.page!=='prepare'||!$('#prep-select-all'))return;
  const visible=visiblePreparationRows(),count=state.selectedFeedback.size,selectedVisible=visible.filter(item=>state.selectedFeedback.has(item.id)).length;
  document.querySelectorAll('[data-prep-checkbox]').forEach(input=>{input.checked=state.selectedFeedback.has(input.dataset.prepCheckbox);input.closest('tr').classList.toggle('selected-row',input.checked);});
  $('#prep-select-all').checked=visible.length>0&&selectedVisible===visible.length;$('#prep-select-all').indeterminate=selectedVisible>0&&selectedVisible<visible.length;
  $('#prep-selection-count').textContent=`已选 ${count} 条`;
  const draft=state.backgroundDraft;const invalidDate=draft.start&&draft.end&&draft.end<draft.start;
  $('#background-end').setCustomValidity(invalidDate?'结束日期不能早于开始日期':'');
  $('#apply-background').textContent=`应用背景到已选 ${count} 条`;
  $('#apply-background').disabled=!count||Boolean(invalidDate);
  $('#mark-resolved').disabled=!count;$('#exclude-feedback').disabled=!count;
  const canRestore=[...state.selectedFeedback].some(id=>findFeedback(id)?.disposition!=='pending');
  $('#restore-feedback').disabled=!canRestore;$('#restore-feedback').hidden=!canRestore&&!['resolved','excluded'].includes(state.prepFilter);
  $('#bulk-selection-hint').textContent=count?'将只处理已选反馈；排除和已解决的记录仍可恢复':'先勾选下方反馈，再选择处理方式';
  $('#prep-clear').hidden=!count;
}
function applyBackground(){
  const draft=state.backgroundDraft;if(!state.selectedFeedback.size)return;
  if(draft.start&&draft.end&&draft.end<draft.start){$('#background-end').reportValidity();return;}
  const date=draft.start&&draft.end?`${draft.start} ~ ${draft.end}`:draft.start||draft.end||todayDate();
  const values={model:draft.model,version:draft.version,source:draft.source,date};let count=0;
  for(const id of state.selectedFeedback){const item=findFeedback(id);if(!item)continue;
    const applied={};
    for(const key of contextKeys)if((!item.originalContext[key]||item.originalContext[key]==='未提供')&&values[key]&&item[key]!==values[key]){item[key]=values[key];applied[key]=values[key];}
    if(Object.keys(applied).length){item.background={...item.background,...applied,providedBy:'PM'};count++;}
  }
  state.selectedFeedback.clear();state.selectionAnchor=null;preparationPage();notify(count?`已补充 ${count} 条反馈的背景，仅更新选中条目`:'所选反馈的背景无需更新');
}
function openDispositionDialog(disposition,selectedIds=[...(state.page==='review'?state.reviewSelection:state.selectedFeedback)]){
  const ids=[...new Set(selectedIds)].filter(id=>findFeedback(id));if(!ids.length)return;
  const resolved=disposition==='resolved';
  const currentVersion=ids.length===1?findFeedback(ids[0]).resolvedVersion||'':'';
  const dialog=document.createElement('dialog');dialog.className='status-dialog';dialog.id='status-dialog';dialog.setAttribute('aria-labelledby','status-dialog-title');
  dialog.innerHTML=`<header class="status-header"><div><div class="eyebrow">PM DECISION</div><h2 id="status-dialog-title">${resolved?'标记为已解决':'排除反馈'}</h2></div><button class="icon-btn" id="close-status" aria-label="关闭处理状态">${icon('close')}</button></header><div class="status-body"><p>将更新已选的 <strong>${ids.length}</strong> 条反馈。</p>${resolved?`<div class="field"><label for="resolved-version">上线版本</label><select id="resolved-version"><option value="">暂未确认上线版本</option>${selectOptions(versionPresets,currentVersion)}</select></div><p class="field-hint">已解决的反馈不会进入后续审核和相似推荐。</p>`:`<div class="field"><label for="exclude-reason">排除原因</label><select id="exclude-reason">${selectOptions(['暂不纳入本次分析','用户表达缺少对象','用户操作问题','重复或无效反馈','其他'],'暂不纳入本次分析')}</select></div><p class="field-hint">原始记录保留，可在“已排除”筛选中恢复待处理。</p>`}</div><footer class="status-footer"><button class="btn" id="cancel-status">取消</button><button class="btn btn-primary" id="confirm-status">${resolved?'确认标记已解决':'确认排除'} ${ids.length} 条</button></footer>`;
  document.body.append(dialog);$('#close-status').addEventListener('click',()=>dialog.close());$('#cancel-status').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>dialog.remove());
  $('#confirm-status').addEventListener('click',()=>{const extra=resolved?{resolvedVersion:$('#resolved-version').value}:{excludeReason:$('#exclude-reason').value};dialog.close();applyDisposition(disposition,extra,ids);});dialog.showModal();
}
function applyDisposition(disposition,extra={},ids=[...(state.page==='review'?state.reviewSelection:state.selectedFeedback)]){
  let count=0;for(const id of ids){const item=findFeedback(id);if(!item)continue;item.disposition=disposition;item.resolvedVersion=disposition==='resolved'?extra.resolvedVersion||'':'';item.excludeReason=disposition==='excluded'?extra.excludeReason||'':'';count++;}
  state.selectedFeedback.clear();state.reviewSelection.clear();state.reviewAnchor=null;state.selectionAnchor=null;stopSelectionDrag();render();
  if(detailSession){detailSession.candidates=null;detailSession.rememberChecked=false;$('#similar-result')?.replaceChildren();updateDetailActions();}
  notify(`已将 ${count} 条反馈${disposition==='pending'?'恢复为待处理':disposition==='resolved'?'标记为已解决':'排除出后续流程'}`);
}
function updateDragFromPointer(){
  if(!state.drag)return;const review=state.drag.surface==='review';const container=$(review?'#review-scroll':'#preparation-scroll');if(!container)return;
  const rect=container.getBoundingClientRect();const x=Math.max(rect.left+20,Math.min(rect.right-20,state.drag.x));const y=Math.max(rect.top+55,Math.min(rect.bottom-5,state.drag.y));
  const row=document.elementFromPoint(x,y)?.closest(review?'[data-feedback]':'[data-background-id]');if(!row)return;
  const index=state.drag.ids.indexOf(row.dataset[review?'feedback':'backgroundId']);if(index>=0)selectPreparationRange(state.drag.start,index,state.drag.mode,state.drag.ids,state.drag.surface);
}
function startSelectionScroll(){
  cancelAnimationFrame(selectionScrollFrame);
  const tick=()=>{if(!state.drag)return;const container=$(state.drag.surface==='review'?'#review-scroll':'#preparation-scroll');if(!container)return;const rect=container.getBoundingClientRect();let delta=0;
    if(state.drag.y>rect.bottom-42)delta=Math.min(20,4+(state.drag.y-rect.bottom+42)/3);
    if(state.drag.y<rect.top+70)delta=-Math.min(20,4+(rect.top+70-state.drag.y)/3);
    if(delta){container.scrollTop+=delta;updateDragFromPointer();}selectionScrollFrame=requestAnimationFrame(tick);
  };selectionScrollFrame=requestAnimationFrame(tick);
}
function stopSelectionDrag(){state.drag=null;cancelAnimationFrame(selectionScrollFrame);selectionScrollFrame=0;}
document.addEventListener('pointermove',event=>{if(!state.drag)return;state.drag.x=event.clientX;state.drag.y=event.clientY;updateDragFromPointer();});
document.addEventListener('pointerup',stopSelectionDrag);document.addEventListener('pointercancel',stopSelectionDrag);window.addEventListener('blur',stopSelectionDrag);
