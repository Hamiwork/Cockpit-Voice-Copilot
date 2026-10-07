'use strict';
// 独立的第二阶段前端状态；不写入 Feedback 原文、AI 判断、PM 修正或记住记录。
function newIssueAnalysisState(){return {analyzed:false, loading:false, issues:[], module:'all', signature:'', selectedIds:new Set(), evidenceAssignments:new Map(), customIssues:[], nextCustomIssue:1};}
let issueAnalysisState = newIssueAnalysisState();
let issueDetailSession = null;
function resetIssueAnalysis(){issueAnalysisState=newIssueAnalysisState();}
function issueEligibleFeedback(){return state.feedback.filter(item=>item.disposition==='pending'&&!needsObjectIntentConfirmation(item));}
function issueInputSignature(items){return JSON.stringify(items.map(item=>[item.id,item.raw,item.current.object,item.current.intent,item.manifestation]));}
function pendingWindowFeedback(){return state.feedback.filter(item=>item.disposition==='pending'&&item.similarityGroup==='front-passenger-window'&&needsConfirmation(item)&&(unknownObject(item.current.object)||item.current.object==='车窗'));}
function applyPendingWindowReview(){
  const candidates=pendingWindowFeedback();if(!candidates.length)return;
  // PM 主动一键应用，只补充这组车窗的缺失字段，保留已有修正、类型与原文。
  for(const item of candidates){
    item.current={...item.current,object:unknownObject(item.current.object)?'车窗':item.current.object,intent:unknownObject(item.current.intent)?'小幅打开副驾车窗':item.current.intent,status:'已确认'};
    item.pmConfirmed=true;item.corrected=fingerprint(item.current)!==fingerprint(item.ai);
  }
  state.reviewSelection.clear();state.reviewAnchor=null;if(state.filter==='unknown'&&!state.feedback.some(item=>item.disposition==='pending'&&needsConfirmation(item)))state.filter='confirmed';reviewPage();
  if(detailSession)updateDetailActions();
  notify(`已应用并确认 ${candidates.length} 条车窗反馈，原始语料和问题类型保留，未自动记住`);
}
function issueReviewHandoff(){
  const eligible=issueEligibleFeedback().length;
  const pending=state.feedback.filter(item=>item.disposition==='pending'&&needsObjectIntentConfirmation(item)).length;
  const windows=pendingWindowFeedback();
  return `<div class="issue-review-handoff"><p>${icon('link')}<span>${eligible} 条功能与意图可用，可进入 Issue 分析${pending?` · ${pending} 条功能或意图未识别，暂不参与`:''}。已排除和已解决的反馈不参与。</span></p>${windows.length?`<div class="window-review-shortcut"><div><strong>${windows.length} 条待确认车窗语料</strong><small>补充为「车窗 / 小幅打开副驾车窗」，已有字段保留。问题类型证据不足时，确认保留未分类。</small></div><button class="btn btn-primary" id="apply-window-review">${icon('check')}一键应用 ${windows.length} 条</button></div>`:''}</div>`;
}
function bindIssueReviewActions(){
  $('#analyze-product-issues').addEventListener('click',startIssueAnalysis);
  $('#apply-window-review')?.addEventListener('click',applyPendingWindowReview);
}
function buildCandidateIssues(items,previous=[]){
  return [...window.DEMO_PRODUCT_ISSUES,...issueAnalysisState.customIssues].flatMap(template=>{
    const sourceRaw=new Set(template.sourceIds.map(id=>window.DEMO_FEEDBACK.find(item=>item.id===id)?.raw));
    const old=previous.find(issue=>issue.id===template.id);
    const defaultIds=new Set(items.filter(item=>sourceRaw.has(item.raw)&&item.current.object===template.module).map(item=>item.id));
    // PM 的归属决定优先于 Mock 映射；明确移出的记录不会在重新分析时自动归回。
    const evidence=items.filter(item=>issueAnalysisState.evidenceAssignments.has(item.id)?issueAnalysisState.evidenceAssignments.get(item.id)===template.id:defaultIds.has(item.id)&&!old?.removedEvidenceIds.includes(item.id));
    const knownIds=new Set([...defaultIds,...(old?.sourceEvidenceIds||[]),...evidence.map(item=>item.id)]);
    const sourceEvidenceIds=items.filter(item=>knownIds.has(item.id)).map(item=>item.id);
    if(!sourceEvidenceIds.length)return [];
    const evidenceIds=evidence.map(item=>item.id);
    const removedEvidenceIds=sourceEvidenceIds.filter(id=>!evidenceIds.includes(id));
    const sourceSignature=JSON.stringify([issueInputSignature(items.filter(item=>knownIds.has(item.id))),evidenceIds]);
    return [{...template,createdBy:template.createdBy||'ai',aiName:template.createdBy==='pm'?null:template.name,name:old?.name||template.name,module:old?.module||template.module,
      object:old?.object||template.object,intent:old?.intent||template.intent,manifestation:old?.manifestation||template.manifestation,edited:Boolean(old?.edited),sourceEvidenceIds,
      evidenceIds,removedEvidenceIds,
      sourceSignature,confirmed:Boolean(old?.confirmed&&old.sourceSignature===sourceSignature)}];
  });
}
function refreshIssueAnalysis(force=false){
  const items=issueEligibleFeedback(),signature=issueInputSignature(items);
  if(!force&&issueAnalysisState.signature===signature)return;
  const previous=issueAnalysisState.issues;
  issueAnalysisState.issues=buildCandidateIssues(items,previous);
  for(const id of issueAnalysisState.selectedIds){
    const issue=findIssue(id);
    if(!issue||issue.sourceSignature!==previous.find(item=>item.id===id)?.sourceSignature)issueAnalysisState.selectedIds.delete(id);
  }
  issueAnalysisState.signature=signature;
}
async function startIssueAnalysis(){
  if(issueAnalysisState.loading||!issueEligibleFeedback().length)return;
  if(issueAnalysisState.analyzed){refreshIssueAnalysis();state.page='issues';render();return;}
  issueAnalysisState.loading=true;stopSelectionDrag();
  const overlay=document.createElement('div');overlay.className='loading-overlay';overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
  overlay.innerHTML=`<div class="loading-content"><div class="loading-symbol">${icon('spark')}</div><h2>正在分析 Product Issues</h2><p>按功能对象、用户意图和异常表现整理 Evidence</p><div class="loading-bar"><span></span></div><small>模拟 AI 分析 · Demo Mock Result<br>Candidate Issues 由 PM 最终确认</small></div>`;
  document.body.append(overlay);
  await new Promise(resolve=>setTimeout(resolve,1200));
  refreshIssueAnalysis();issueAnalysisState.analyzed=true;issueAnalysisState.loading=false;overlay.remove();state.page='issues';render();
}
function findIssue(id){return issueAnalysisState.issues.find(issue=>issue.id===id);}
function issueStatusLabel(issue){return issue.confirmed?'PM 已确认':issue.createdBy==='pm'?'PM 待确认':'AI 建议';}
function issueStatus(issue){return badge(issueStatusLabel(issue),issue.confirmed?'badge-pm':'badge-pending');}
function issueDefinitionOrigin(issue){return issue.createdBy==='pm'?'PM 自定义':issue.edited?'PM 已修改':'AI 建议 · Mock';}
function canConfirmIssue(issue){return Boolean(issue&&!issue.confirmed&&issue.name.trim()&&issue.evidenceIds.length);}
function visibleIssues(){return issueAnalysisState.issues.filter(issue=>issueAnalysisState.module==='all'||issue.module===issueAnalysisState.module);}
function issueReviewGroups(issues=visibleIssues()){return {pending:issues.filter(issue=>!issue.confirmed),confirmed:issues.filter(issue=>issue.confirmed)};}
function canCompleteIssueAnalysis(){return issueAnalysisState.issues.length>0&&issueAnalysisState.issues.every(issue=>issue.confirmed&&issue.evidenceIds.length>0);}
function completeIssueAnalysis(){
  refreshIssueAnalysis();
  if(!canCompleteIssueAnalysis()){notify('请先确认全部模块中的 Issue，再进入下一步');return false;}
  const issue=issueAnalysisState.issues.find(supportsOptimizationMock)||issueAnalysisState.issues[0];
  issueAnalysisState.selectedIds.clear();openOptimization(issue.id);return true;
}
function issueModuleGroups(issues,modules){
  return modules.filter(module=>issues.some(issue=>issue.module===module)).map(module=>{
    const group=issues.filter(issue=>issue.module===module);
    return `<section class="card issue-module"><header class="issue-module-heading"><h3>${escapeHTML(module)}</h3><span>${group.length} 个 Issue · ${group.reduce((total,issue)=>total+issue.evidenceIds.length,0)} 条 Evidence</span></header><div class="issue-list">${group.map(issueRow).join('')}</div></section>`;
  }).join('');
}
function updateIssueSelection(){
  const selectable=visibleIssues().filter(canConfirmIssue),ids=new Set(selectable.map(issue=>issue.id));
  for(const id of issueAnalysisState.selectedIds)if(!ids.has(id))issueAnalysisState.selectedIds.delete(id);
  const count=issueAnalysisState.selectedIds.size;
  document.querySelectorAll('[data-issue-checkbox]').forEach(input=>{
    input.checked=issueAnalysisState.selectedIds.has(input.dataset.issueCheckbox);
    input.closest('.issue-row').classList.toggle('issue-selected',input.checked);
  });
  $('#issue-select-all').checked=selectable.length>0&&count===selectable.length;
  $('#issue-select-all').indeterminate=count>0&&count<selectable.length;
  $('#issue-select-all').disabled=!selectable.length;
  $('#issue-selection-count').textContent=`已选 ${count} 个 Issue`;
  $('#issue-clear-selection').disabled=!count;
  $('#confirm-selected-issues').disabled=!count;
  $('#confirm-selected-issues').innerHTML=icon('check')+`一键确认所选 ${count} 个`;
}
function confirmSelectedIssues(){
  refreshIssueAnalysis();
  const selected=visibleIssues().filter(issue=>issueAnalysisState.selectedIds.has(issue.id)&&canConfirmIssue(issue));
  if(!selected.length){updateIssueSelection();return;}
  for(const issue of selected)issue.confirmed=true;
  issueAnalysisState.selectedIds.clear();issueAnalysisPage();
  notify(`${selected.length} 个 Issue 已由 PM 确认`);
}
function issueRow(issue){
  return `<div class="issue-row"><label class="issue-select" title="${issue.confirmed?'PM 已确认':!issue.evidenceIds.length?'暂无 Evidence，无法确认':'勾选 Issue'}"><input type="checkbox" data-issue-checkbox="${issue.id}" aria-label="选择 ${escapeHTML(issue.name)}" ${canConfirmIssue(issue)?'':'disabled'}></label><button class="issue-row-open" data-issue-id="${issue.id}" aria-label="查看 ${escapeHTML(issue.name)}，${issue.evidenceIds.length} 条 Evidence，${issueStatusLabel(issue)}"><span class="issue-row-main"><span class="detail-id">${issue.id}</span><strong>${escapeHTML(issue.name)}</strong><span class="issue-row-meta">${escapeHTML(issue.module)} <span>·</span> ${issue.evidenceIds.length} 条 Evidence${issue.createdBy==='pm'?' · PM 自定义':''}${!issue.evidenceIds.length?' · 暂无 Evidence，无法确认':''}</span></span>${issueStatus(issue)}${icon('chevron')}</button></div>`;
}
function issueCounts(){
  const issues=issueAnalysisState.issues;
  const eligible=issueEligibleFeedback();
  const associated=new Set(issues.flatMap(issue=>issue.evidenceIds));
  const removed=new Set(issues.flatMap(issue=>issue.removedEvidenceIds).filter(id=>!associated.has(id)));
  const unassigned=eligible.filter(item=>!associated.has(item.id));
  return {eligible,associated,removed,unassigned,unmapped:unassigned.filter(item=>!removed.has(item.id))};
}
function issueAnalysisPage(){
  stopSelectionDrag();refreshIssueAnalysis();
  const issues=issueAnalysisState.issues,counts=issueCounts();
  const modules=window.DEMO_ISSUE_MODULES.filter(module=>issues.some(issue=>issue.module===module));
  if(issueAnalysisState.module!=='all'&&!modules.includes(issueAnalysisState.module))issueAnalysisState.module='all';
  const shown=issueAnalysisState.module==='all'?modules:[issueAnalysisState.module];
  const groups=issueReviewGroups(),pendingCount=issues.filter(issue=>!issue.confirmed).length,complete=canCompleteIssueAnalysis();
  layout(`<div class="page-heading"><div><div class="eyebrow">04 / PRODUCT ISSUES</div><h1>Issue Analysis</h1><p>按功能模块查看候选问题，用原始 Evidence 核对每一个建议。</p></div><div class="issue-heading-actions"><div class="review-heading-actions"><button class="btn" id="back-feedback-review">${icon('list')}返回 Feedback Review</button><button class="btn btn-primary" id="complete-issue-analysis" aria-describedby="issue-completion-progress" ${complete?'':'disabled'}>${icon('check')}确认完毕，进入下一步</button></div><p id="issue-completion-progress" aria-live="polite">${complete?`全部 ${issues.length} 个 Issue 已确认，可进入优化`:issues.length?`全部模块还有 ${pendingCount} 个 Issue 待确认`:'暂无可确认的 Issue'}</p></div></div>
    <div class="review-summary issue-summary"><div class="summary-item"><span class="summary-number">${counts.eligible.length}</span><span>条有效 Feedback</span></div><span class="summary-divider"></span><div class="summary-item"><span class="summary-number">${modules.length}</span><span>个功能模块</span></div><span class="summary-divider"></span><div class="summary-item"><span class="summary-number">${issues.length}</span><span>个 Candidate Issues</span></div></div>
    <div class="issue-principle">${icon('spark')}<div><strong>AI recommends, PM decides.</strong><p>按「功能对象 + 用户意图 + 异常表现」提出候选问题。每一个建议都可以追溯到原始 Feedback。</p></div><span class="mock-pill">Demo Mock Result</span></div>
    <section class="issue-module-filter" aria-label="功能模块"><button class="module-chip ${issueAnalysisState.module==='all'?'active':''}" data-issue-module="all" aria-pressed="${issueAnalysisState.module==='all'}">全部模块</button>${modules.map(module=>`<button class="module-chip ${issueAnalysisState.module===module?'active':''}" data-issue-module="${module}" aria-pressed="${issueAnalysisState.module===module}">${module}<span>${issues.filter(issue=>issue.module===module).length}</span></button>`).join('')}</section>
    <section class="issue-review-section issue-pending-section" aria-labelledby="issue-pending-heading"><header class="issue-review-section-heading"><div><h2 id="issue-pending-heading">待确认 <span>${groups.pending.length}</span></h2><p>核对 Issue 定义和原始 Evidence，确认后自动移入下方。</p></div><span class="badge badge-pending">待 PM 确认</span></header>
    <div class="issue-selection-toolbar"><label for="issue-select-all"><input type="checkbox" id="issue-select-all">全选当前待确认</label><button class="text-link" id="issue-clear-selection" disabled>取消选择</button><span id="issue-selection-count" aria-live="polite">已选 0 个 Issue</span><button class="btn btn-primary" id="confirm-selected-issues" disabled>${icon('check')}一键确认所选 0 个</button></div>
    <div class="issue-module-list">${issueModuleGroups(groups.pending,shown)||`<div class="issue-group-empty">${complete?'全部 Issue 已确认，点击右上角进入下一步。':issues.length?'当前模块已全部确认，可继续核对其他模块。':'当前没有候选 Issue，可返回审核检查 Feedback。'}</div>`}</div></section>
    <section class="issue-review-section issue-confirmed-section" aria-labelledby="issue-confirmed-heading"><header class="issue-review-section-heading"><div><h2 id="issue-confirmed-heading">已确认 <span>${groups.confirmed.length}</span></h2><p>已由 PM 确认；修改定义或 Evidence 后将回到待确认。</p></div><span class="badge badge-pm">PM 已确认</span></header><div class="issue-module-list">${issueModuleGroups(groups.confirmed,shown)||'<div class="issue-group-empty">当前还没有已确认的 Issue。</div>'}</div></section>
    <div class="issue-coverage" aria-live="polite">${counts.associated.size} 条 Feedback 已关联 Evidence${counts.unassigned.length?` · ${counts.unassigned.length} 条待归类（原始反馈保留）`:''}</div>
    ${counts.unassigned.length?`<section class="card issue-unassigned-panel"><header class="issue-module-heading"><h2>待归类 Feedback</h2><span>${counts.unassigned.length} 条</span></header><p>已移出或尚未匹配的反馈保留在这里。查看原文后，可由 PM 选择一个 Issue 归类。</p><div id="issue-unassigned-list">${counts.unassigned.map(item=>`<article class="issue-evidence-card"><header><span class="detail-id">${item.id}</span><span>${escapeHTML(item.source)}</span><span>${counts.removed.has(item.id)?'已移出 · 待归类':'尚未匹配 · 待归类'}</span></header><blockquote>${escapeHTML(item.raw)}</blockquote><div class="issue-evidence-context">${escapeHTML(item.model)} · ${escapeHTML(item.version)} · ${escapeHTML(item.date)}</div>${evidenceAssignmentEditor(item,'pool')}</article>`).join('')}</div></section>`:''}
    <p class="issue-footnote">Every insight must be traceable to evidence. · 当前仅模拟聚合；刷新后演示状态清空。</p>`);
  $('#back-feedback-review').addEventListener('click',()=>{issueAnalysisState.selectedIds.clear();state.page='review';render();});
  document.querySelectorAll('[data-issue-module]').forEach(button=>button.addEventListener('click',()=>{issueAnalysisState.module=button.dataset.issueModule;issueAnalysisState.selectedIds.clear();issueAnalysisPage();$(`[data-issue-module="${issueAnalysisState.module}"]`).focus();}));
  document.querySelectorAll('[data-issue-id]').forEach(button=>button.addEventListener('click',()=>openIssueDetail(button.dataset.issueId)));
  document.querySelectorAll('[data-issue-checkbox]').forEach(input=>input.addEventListener('change',()=>{input.checked?issueAnalysisState.selectedIds.add(input.dataset.issueCheckbox):issueAnalysisState.selectedIds.delete(input.dataset.issueCheckbox);updateIssueSelection();}));
  $('#issue-select-all').addEventListener('change',event=>{issueAnalysisState.selectedIds=event.target.checked?new Set(visibleIssues().filter(canConfirmIssue).map(issue=>issue.id)):new Set();updateIssueSelection();});
  $('#issue-clear-selection').addEventListener('click',()=>{issueAnalysisState.selectedIds.clear();updateIssueSelection();});
  $('#confirm-selected-issues').addEventListener('click',confirmSelectedIssues);
  $('#complete-issue-analysis').addEventListener('click',completeIssueAnalysis);
  bindEvidenceAssignments($('#issue-unassigned-list'));
  updateIssueSelection();
}
function evidenceOwner(id){return issueAnalysisState.issues.find(issue=>issue.evidenceIds.includes(id));}
function evidenceAssignmentEditor(item,scope){
  const owner=evidenceOwner(item.id);
  const inputId=`assignment-${scope}-${item.id}`;
  return `<details class="evidence-reassign"><summary>${owner?'归类到其他 Issue':'选择 Issue 归类'}</summary><div class="evidence-reassign-form"><fieldset class="assignment-module-step"><legend>1. 选择一级功能</legend><div class="assignment-module-chips">${window.DEMO_ISSUE_MODULES.map(module=>`<button type="button" class="module-chip" data-assignment-module="${module}" aria-pressed="false">${module}</button>`).join('')}</div></fieldset><div class="assignment-issue-step" hidden><label for="${inputId}">2. 选择产品问题 / Issue</label><select id="${inputId}" data-evidence-target="${item.id}" disabled><option value="">请先选择一级功能</option></select><div class="assignment-custom-fields" hidden>${[['name','自定义问题类型 / Issue 名称'],['object','功能对象'],['intent','用户意图'],['manifestation','异常表现']].map(([field,label])=>`<div class="field"><label for="${inputId}-${field}">${label}</label><input id="${inputId}-${field}" data-custom-issue-field="${field}" maxlength="160" ${field==='name'?'placeholder="填写列表中没有的产品问题"':''}></div>`).join('')}<p>新问题由 PM 定义，创建后仍需确认。</p></div><button class="btn btn-primary" data-assign-evidence="${item.id}" disabled>确认归类</button></div><small>${owner?'归类后从原 Issue 移除，原 Issue 和目标 Issue 需重新确认。':'原始 Feedback 保留，目标 Issue 需重新确认。'}</small></div></details>`;
}
function evidenceAssignmentTargets(id,module){return issueAnalysisState.issues.filter(issue=>issue.module===module&&issue.id!==evidenceOwner(id)?.id);}
function assignmentCustomDraft(editor){
  return {module:editor.dataset.module||'',...Object.fromEntries(['name','object','intent','manifestation'].map(field=>[field,$(`[data-custom-issue-field="${field}"]`,editor).value.trim()]))};
}
function updateEvidenceAssignmentForm(editor){
  const select=$('[data-evidence-target]',editor),button=$('[data-assign-evidence]',editor),custom=select.value==='__custom__';
  $('.assignment-custom-fields',editor).hidden=!custom;
  button.textContent=custom?'创建并归类':'确认归类';
  button.disabled=custom?!validIssueDraft(assignmentCustomDraft(editor)):!evidenceAssignmentTargets(select.dataset.evidenceTarget,editor.dataset.module).some(issue=>issue.id===select.value);
}
function selectEvidenceAssignmentModule(editor,module){
  const select=$('[data-evidence-target]',editor),item=findFeedback(select.dataset.evidenceTarget);
  if(!item||!window.DEMO_ISSUE_MODULES.includes(module))return;
  editor.dataset.module=module;
  editor.querySelectorAll('[data-assignment-module]').forEach(button=>{button.classList.toggle('active',button.dataset.assignmentModule===module);button.setAttribute('aria-pressed',String(button.dataset.assignmentModule===module));});
  $('.assignment-issue-step',editor).hidden=false;select.disabled=false;
  const targets=evidenceAssignmentTargets(item.id,module);
  select.innerHTML=`<option value="">${targets.length?'请选择该功能下的 Issue':'该功能暂无其他 Issue'}</option>${targets.map(issue=>`<option value="${issue.id}">${escapeHTML(issue.name)} · ${issue.evidenceIds.length} 条 Evidence</option>`).join('')}<option value="__custom__">其他问题 / 自定义 Issue…</option>`;
  select.value='';
  const draft={name:'',object:module,intent:module===item.current.object?item.current.intent:'',manifestation:unknownObject(item.manifestation)?'':item.manifestation};
  for(const field of Object.keys(draft))$(`[data-custom-issue-field="${field}"]`,editor).value=draft[field];
  updateEvidenceAssignmentForm(editor);
}
function bindEvidenceAssignments(root){
  if(!root)return;
  root.querySelectorAll('.evidence-reassign').forEach(editor=>{
    editor.querySelectorAll('[data-assignment-module]').forEach(button=>button.addEventListener('click',()=>selectEvidenceAssignmentModule(editor,button.dataset.assignmentModule)));
    const select=$('[data-evidence-target]',editor);
    select.addEventListener('change',()=>{updateEvidenceAssignmentForm(editor);if(select.value==='__custom__')$('[data-custom-issue-field="name"]',editor).focus();});
    editor.querySelectorAll('[data-custom-issue-field]').forEach(input=>input.addEventListener('input',()=>updateEvidenceAssignmentForm(editor)));
    $('[data-assign-evidence]',editor).addEventListener('click',()=>{
      if(select.value==='__custom__')createAndAssignIssue(select.dataset.evidenceTarget,assignmentCustomDraft(editor));
      else if(evidenceAssignmentTargets(select.dataset.evidenceTarget,editor.dataset.module).some(issue=>issue.id===select.value))assignIssueEvidence(select.dataset.evidenceTarget,select.value);
    });
  });
}
function createAndAssignIssue(id,values){
  const draft=Object.fromEntries(['name','module','object','intent','manifestation'].map(field=>[field,String(values[field]??'').trim()]));
  if(!issueEligibleFeedback().some(item=>item.id===id)||!validIssueDraft(draft))return null;
  const existing=[...issueAnalysisState.issues,...issueAnalysisState.customIssues].find(issue=>Object.keys(draft).every(field=>issue[field]===draft[field]));
  if(existing){if(evidenceOwner(id)?.id===existing.id)notify('这条 Evidence 已属于该 Issue');else assignIssueEvidence(id,existing.id);return existing.id;}
  const issue={...draft,id:`ISS-PM-${String(issueAnalysisState.nextCustomIssue++).padStart(3,'0')}`,createdBy:'pm',sourceIds:[]};
  issueAnalysisState.customIssues.push(issue);
  if(!issueDetailSession){issueAnalysisState.module=draft.module;issueAnalysisState.selectedIds.clear();}
  assignIssueEvidence(id,issue.id);
  notify(`已创建「${issue.name}」并归类 ${id}，请检查 Evidence 后确认`);
  return issue.id;
}
function assignIssueEvidence(id,targetId){
  const item=issueEligibleFeedback().find(item=>item.id===id),target=targetId?(findIssue(targetId)||issueAnalysisState.customIssues.find(issue=>issue.id===targetId)):null,source=evidenceOwner(id);
  if(!item||targetId&&!target||targetId===source?.id||!targetId&&!source)return;
  for(const issue of [source,target].filter(Boolean)){issue.confirmed=false;issueAnalysisState.selectedIds.delete(issue.id);}
  issueAnalysisState.evidenceAssignments.set(id,targetId||null);
  refreshIssueAnalysis(true);issueAnalysisPage();
  if(issueDetailSession){renderIssueEvidence();updateIssueDetailActions();}
  notify(target?`${id} 已归类到「${target.name}」，请重新确认 Issue`:`${id} 已移到待归类 Feedback，原始反馈保留`);
}
function issueEvidenceCard(item){
  return `<article class="issue-evidence-card"><header><span class="detail-id">${item.id}</span><span>${escapeHTML(item.source)}</span><button class="text-link evidence-remove" data-remove-evidence="${item.id}" aria-label="将 ${item.id} 移到待归类 Feedback">移到待归类</button></header><blockquote>${escapeHTML(item.raw)}</blockquote><div class="issue-evidence-context">${escapeHTML(item.model)} · ${escapeHTML(item.version)} · ${escapeHTML(item.date)}</div>${evidenceAssignmentEditor(item,'detail')}</article>`;
}
function openIssueDetail(id){
  const issue=findIssue(id);if(!issue)return;
  issueDetailSession={id,draft:issue.name,module:issue.module,object:issue.object,intent:issue.intent,manifestation:issue.manifestation};
  const dialog=document.createElement('dialog');dialog.id='issue-detail-dialog';dialog.className='detail-dialog issue-detail-dialog';dialog.setAttribute('aria-labelledby','issue-detail-title');
  dialog.innerHTML=`<header class="detail-header"><div><span class="detail-id" id="issue-detail-meta">${issue.id} · ${escapeHTML(issue.module)}</span><h2 id="issue-detail-title">${escapeHTML(issue.name)}</h2><div id="issue-detail-status">${issueStatus(issue)}</div></div><button class="icon-btn" id="close-issue-detail" aria-label="关闭 Issue 详情">${icon('close')}</button></header>
    <div class="detail-content"><section class="issue-dimensions"><div class="section-label">${icon('spark')}Issue 判断依据 <span id="issue-dimensions-origin">${issueDefinitionOrigin(issue)}</span></div><dl><div><dt>功能对象</dt><dd id="issue-detail-object">${escapeHTML(issue.object)}</dd></div><div><dt>用户意图</dt><dd id="issue-detail-intent">${escapeHTML(issue.intent)}</dd></div><div><dt>异常表现</dt><dd id="issue-detail-manifestation">${escapeHTML(issue.manifestation)}</dd></div><div><dt>Evidence</dt><dd id="issue-dimension-count">${issue.evidenceIds.length} 条</dd></div></dl></section>
    <details class="issue-name-section"><summary class="section-label pm-label"><span class="pm-icon">PM</span>修改 Issue <span class="issue-edit-caption">名称与分类</span>${icon('chevron')}</summary><div class="issue-name-editor"><div class="field"><label for="issue-name">Issue 名称</label><input id="issue-name" value="${escapeHTML(issue.name)}" maxlength="160" required></div><div class="field"><label for="issue-module">功能模块</label><select id="issue-module">${window.DEMO_ISSUE_MODULES.map(module=>`<option value="${module}" ${module===issue.module?'selected':''}>${module}</option>`).join('')}</select></div>${[['object','功能对象'],['intent','用户意图'],['manifestation','异常表现']].map(([field,label])=>`<div class="field"><label for="issue-edit-${field}">${label}</label><input id="issue-edit-${field}" value="${escapeHTML(issue[field])}" maxlength="160" required></div>`).join('')}<p class="field-hint">保存后需重新确认 Issue；原始 Feedback 和 AI 初始判断保留。</p><button class="btn full-width" id="save-issue-name">保存修改</button></div></details>
    <section class="issue-evidence-section"><div class="section-label">${icon('file')}原始 Evidence <span id="issue-evidence-count">${issue.evidenceIds.length} 条 · 保留原文</span></div><p class="issue-evidence-hint">归属不合适时，可直接归类到其他 Issue，或移到待归类后再处理。原始 Feedback 始终保留。</p><div id="issue-evidence-list"></div><div id="issue-removed-evidence"></div></section></div>
    <footer class="issue-detail-footer"><p id="issue-confirm-hint">检查名称和 Evidence 后，由 PM 最终确认。</p><button class="btn btn-primary full-width" id="confirm-issue">${icon('check')}确认 Issue</button><button class="btn btn-primary full-width" id="enter-optimization" hidden>${icon('spark')}进入优化</button></footer>`;
  document.body.append(dialog);
  $('#close-issue-detail',dialog).addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right)dialog.close();}});
  dialog.addEventListener('close',()=>{dialog.remove();issueDetailSession=null;($(`[data-issue-id="${id}"]`)||$(`[data-issue-module="${issueAnalysisState.module}"]`))?.focus();});
  $('#issue-name',dialog).addEventListener('input',event=>{issueDetailSession.draft=event.target.value;updateIssueDetailActions();});
  $('#issue-module',dialog).addEventListener('change',event=>{issueDetailSession.module=event.target.value;updateIssueDetailActions();});
  for(const field of ['object','intent','manifestation'])$(`#issue-edit-${field}`,dialog).addEventListener('input',event=>{issueDetailSession[field]=event.target.value;updateIssueDetailActions();});
  $('#save-issue-name',dialog).addEventListener('click',saveIssueName);
  $('#confirm-issue',dialog).addEventListener('click',confirmIssue);
  $('#enter-optimization',dialog).addEventListener('click',()=>openOptimization(id));
  renderIssueEvidence();updateIssueDetailActions();dialog.showModal();
}
function renderIssueEvidence(){
  const issue=findIssue(issueDetailSession?.id);if(!issue)return;
  $('#issue-evidence-list').innerHTML=issue.evidenceIds.map(findFeedback).filter(Boolean).map(issueEvidenceCard).join('')||'<div class="issue-no-evidence">当前 Issue 没有 Evidence，不能确认。可恢复或重新归类下方反馈。</div>';
  $('#issue-evidence-count').textContent=`${issue.evidenceIds.length} 条 · 保留原文`;
  $('#issue-dimension-count').textContent=`${issue.evidenceIds.length} 条`;
  $('#issue-removed-evidence').innerHTML=issue.removedEvidenceIds.length?`<details class="removed-evidence" open><summary>已调整归属 ${issue.removedEvidenceIds.length} 条 · 原始 Feedback 保留</summary>${issue.removedEvidenceIds.map(findFeedback).filter(Boolean).map(item=>{const owner=evidenceOwner(item.id);return `<article><span class="detail-id">${item.id}</span><p class="evidence-owner">${owner?`已归入：${escapeHTML(owner.module)} / ${escapeHTML(owner.name)}`:'待归类 · 也可在 Issue 列表下方重新归类'}</p><blockquote>${escapeHTML(item.raw)}</blockquote><button class="text-link" data-restore-evidence="${item.id}">${owner?'改回当前 Issue':'恢复到当前 Issue'}</button>${evidenceAssignmentEditor(item,'removed')}</article>`;}).join('')}</details>`:'';
  document.querySelectorAll('[data-remove-evidence]').forEach(button=>button.addEventListener('click',()=>changeIssueEvidence(button.dataset.removeEvidence,false)));
  document.querySelectorAll('[data-restore-evidence]').forEach(button=>button.addEventListener('click',()=>changeIssueEvidence(button.dataset.restoreEvidence,true)));
  bindEvidenceAssignments($('#issue-evidence-list'));bindEvidenceAssignments($('#issue-removed-evidence'));
}
function issueDetailDraft(issue){
  return {name:issueDetailSession.draft.trim(),module:issueDetailSession.module??issue.module,...Object.fromEntries(['object','intent','manifestation'].map(field=>[field,(issueDetailSession[field]??issue[field]).trim()]))};
}
function validIssueDraft(draft){return window.DEMO_ISSUE_MODULES.includes(draft.module)&&['name','object','intent','manifestation'].every(field=>draft[field]);}
function issueDraftChanged(issue,draft){return Object.keys(draft).some(field=>draft[field]!==issue[field]);}
function saveIssueDraft(issue,draft){
  if(issueDraftChanged(issue,draft)){Object.assign(issue,draft);issue.confirmed=false;issue.edited=true;issueAnalysisState.selectedIds.delete(issue.id);}
  const custom=issueAnalysisState.customIssues.find(item=>item.id===issue.id);if(custom)Object.assign(custom,draft);
  issueDetailSession={id:issue.id,draft:issue.name,module:issue.module,object:issue.object,intent:issue.intent,manifestation:issue.manifestation};
  $('#issue-name').value=issue.name;$('#issue-module').value=issue.module;$('#issue-detail-title').textContent=issue.name;
  $('#issue-detail-meta').textContent=`${issue.id} · ${issue.module}`;
  for(const field of ['object','intent','manifestation']){$(`#issue-edit-${field}`).value=issue[field];$(`#issue-detail-${field}`).textContent=issue[field];}
  $('#issue-dimensions-origin').textContent=issueDefinitionOrigin(issue);
}
function updateIssueDetailActions(){
  const issue=findIssue(issueDetailSession?.id);if(!issue)return;
  const draft=issueDetailDraft(issue),valid=validIssueDraft(draft),changed=issueDraftChanged(issue,draft);
  $('#issue-name').setCustomValidity(draft.name?'':'请填写 Issue 名称');
  for(const field of ['object','intent','manifestation'])$(`#issue-edit-${field}`).setCustomValidity(draft[field]?'':'请填写判断维度');
  $('#save-issue-name').disabled=!valid||!changed;
  $('#confirm-issue').disabled=!valid||!issue.evidenceIds.length||issue.confirmed&&!changed;
  $('#confirm-issue').innerHTML=icon('check')+(issue.confirmed&&!changed?'PM 已确认':changed?'保存修改并确认 Issue':'确认 Issue');
  $('#issue-confirm-hint').textContent=!valid?'请填写 Issue 名称、功能模块和三个判断维度。':!issue.evidenceIds.length?'至少保留 1 条 Evidence 后才能确认。':changed?'确认时会同时保存你修改的 Issue 定义。':issue.confirmed?'当前 Issue 定义和 Evidence 已由 PM 确认。':'检查 Issue 定义和 Evidence 后，由 PM 最终确认。';
  $('#enter-optimization').hidden=!issue.confirmed||changed;
  $('#enter-optimization').disabled=!canEnterOptimization(issue)||changed;
  $('#issue-detail-status').innerHTML=changed?`${issueStatus(issue)}<span class="issue-draft-note">有未保存修改</span>`:issueStatus(issue);
}
function saveIssueName(){
  const issue=findIssue(issueDetailSession?.id);if(!issue)return;
  const draft=issueDetailDraft(issue);if(!validIssueDraft(draft))return;
  saveIssueDraft(issue,draft);issueAnalysisPage();updateIssueDetailActions();notify('Issue 修改已保存，请检查 Evidence 后确认');
}
function changeIssueEvidence(id,restore){
  const issue=findIssue(issueDetailSession?.id);if(!issue)return;
  if(!(restore?issue.removedEvidenceIds:issue.evidenceIds).includes(id))return;
  assignIssueEvidence(id,restore?issue.id:null);
  (restore?$(`[data-remove-evidence="${id}"]`):$('summary',$('#issue-removed-evidence')))?.focus();
}
function confirmIssue(){
  const issue=findIssue(issueDetailSession?.id);if(!issue||!issue.evidenceIds.length)return;
  const draft=issueDetailDraft(issue);if(!validIssueDraft(draft))return;
  saveIssueDraft(issue,draft);issue.confirmed=true;
  issueAnalysisPage();updateIssueDetailActions();notify('Issue 已由 PM 确认');
}
