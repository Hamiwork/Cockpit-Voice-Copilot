'use strict';
const $ = (selector,root=document) => root.querySelector(selector);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const state = {
  page:'import',text:'',files:[],feedback:[],demo:false,filter:'pending',selectedId:null,loading:false,
  backgroundDraft:newBackgroundDraft(),selectedFeedback:new Set(),prepFilter:'all',selectionAnchor:null,drag:null,
  reviewSelection:new Set(),reviewAnchor:null,problemType:'all',
};
let toastTimeout;
function notify(message){
  $('#notifications').innerHTML=`<div class="toast">${icon('check')}<span>${escapeHTML(message)}</span></div>`;
  clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#notifications').replaceChildren(),4500);
}
function layout(content){
  $('#app').innerHTML=`<aside class="sidebar">
    <div class="brand"><div class="brand-mark">${icon('layers')}</div><div class="brand-name">智能座舱<br><span>语音优化工作台</span></div></div>
    <div class="workspace-label">FEEDBACK WORKSPACE</div>
    <nav aria-label="工作台导航">
      <button class="nav-item ${state.page==='import'?'active':''}" data-page="import" aria-label="Import Feedback">${icon('upload')}<span class="nav-label">Import Feedback</span></button>
      <button class="nav-item ${state.page==='prepare'?'active':''}" data-page="prepare" aria-label="整理反馈" ${state.feedback.length?'':'disabled'}>${icon('layers')}<span class="nav-label">整理反馈</span></button>
      <button class="nav-item ${state.page==='review'?'active':''}" data-page="review" aria-label="Feedback Review" ${state.feedback.length?'':'disabled'}>${icon('list')}<span class="nav-label">Feedback Review</span>${state.feedback.length?`<span class="nav-count">${state.feedback.filter(item=>item.disposition==='pending').length}</span>`:''}</button>
      <button class="nav-item ${state.page==='issues'?'active':''}" data-page="issues" aria-label="Issue Analysis" ${issueAnalysisState.analyzed?'':'disabled'}>${icon('link')}<span class="nav-label">Issue Analysis</span></button>
      <button class="nav-item ${['optimization','generalization'].includes(state.page)?'active':''}" data-page="optimization" aria-label="Issue Optimization" ${optimizationState.activeId?'':'disabled'}>${icon('spark')}<span class="nav-label">Issue Optimization</span></button>
    </nav>
    <div class="sidebar-bottom"><div class="principle-note"><strong>AI 辅助，PM 决策</strong>每一次修正，都由你确认。<br>Correction ≠ Learning</div><div class="profile"><div class="avatar">PM</div><div>智能座舱 · 语音产品<small>${['optimization','generalization'].includes(state.page)?'Phase 03':state.page==='issues'?'Phase 02':'Phase 01'} · 前端原型</small></div></div></div>
  </aside><main class="main"><header class="topbar"><div class="breadcrumb"><span>工作空间</span>${icon('chevron')}<strong>智能座舱语音</strong>${icon('chevron')}<span>${state.page==='generalization'?'语料泛化':state.page==='optimization'?'优化推荐':state.page==='issues'?'Issue Analysis':'反馈整理'}</span></div><span class="mock-pill" title="Demo data / Mock AI output · 未连接真实生产系统">Demo / Mock AI</span></header><div class="content">${content}</div></main>`;
  document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{stopSelectionDrag();state.page=button.dataset.page;render();}));
}
function workflow(){
  return `<div class="workflow">${[['import','导入反馈'],['prepare','整理 · 可选'],['review','人工审核']].map(([page,label],index)=>`${index?'<span class="workflow-line"></span>':''}<span class="workflow-step ${state.page===page?'active':''}"><b class="step-num">${index+1}</b>${label}</span>`).join('')}</div>`;
}
function importPage(){
  layout(`<div class="page-heading"><div><div class="eyebrow">01 / COLLECT</div><h1>Import Feedback</h1><p>导入本次迭代的语音反馈，让零散信息成为可审核的证据。</p></div>${workflow()}</div>
    <div class="import-grid"><section class="card"><div class="card-header"><div><h2>原始反馈</h2><p>上传材料，或直接粘贴多条反馈</p></div><span class="small-label">EVIDENCE</span></div>
      <div class="card-body"><div class="upload-zone" id="upload-zone"><div class="upload-top">${icon('upload')}</div><div class="upload-title">将文件拖拽到这里</div><div class="upload-sub">支持截图、Excel 和 Word · 当前仅模拟上传</div>
        <div class="file-choices"><button class="file-choice" data-upload="Screenshot">${icon('image')}Screenshot</button><button class="file-choice" data-upload="Excel">${icon('sheet')}Excel</button><button class="file-choice" data-upload="Word">${icon('file')}Word</button></div>
        <input type="file" id="file-input" class="hidden" multiple><div id="file-list" class="file-list"></div><button class="text-link" id="choose-local" style="margin-top:12px;font-size:12px">选择本地文件</button>
      </div><div class="divider-label">或粘贴文本</div><div class="input-label-row"><label for="feedback-text">反馈内容</label><button class="text-link" id="load-demo">${icon('file')}载入示例反馈</button></div>
      <textarea id="feedback-text" class="feedback-text" placeholder="Paste feedback here…&#10;&#10;例如：副驾窗给我留条缝，一直没反应&#10;说打开车窗，结果打开了天窗">${escapeHTML(state.text)}</textarea>
      <div class="input-footer"><span>每行一条反馈，保留原始表达与上下文</span><span id="text-count">0 条文本</span></div></div></section>
      <section class="card context-card"><div class="card-header"><div><h2>材料背景信息</h2><p>开始识别后，再检查背景字段</p></div></div><div class="card-body"><div class="import-context-steps"><p><span>01</span>点击“开始识别”，整理原始反馈。</p><p><span>02</span>在下一步查看每条反馈的背景字段。</p><p><span>03</span>按需勾选多条反馈，批量补充，也可跳过。</p></div><div class="context-foot">${icon('info')}<span>当前文件仅模拟上传，尚未读取文件内的背景字段。</span></div></div></section>
    </div><div class="import-actions"><p>${icon('spark')}背景信息将在识别后按需补充。</p><button class="btn btn-primary" id="start-recognition">${icon('spark')}开始识别</button></div><div class="process-note">原始证据<span></span>整理与背景补充<span></span>PM 审核<span></span>确认后应用</div>`);
  $('#feedback-text').addEventListener('input',event=>{state.text=event.target.value;state.demo=false;updateImportStatus();});
  $('#load-demo').addEventListener('click',()=>{state.text=window.DEMO_FEEDBACK.map(item=>`【${item.source}】${item.raw}`).join('\n');state.demo=true;importPage();notify(`已载入 ${lines().length} 条示例文本，尚未开始识别`);});
  document.querySelectorAll('[data-upload]').forEach(button=>button.addEventListener('click',()=>{
    const names={Screenshot:'用户评论截图.png',Excel:'语音测试反馈.xlsx',Word:'实车走查记录.docx'};
    addFiles([{name:names[button.dataset.upload],mock:true}]);
  }));
  const zone=$('#upload-zone');
  zone.addEventListener('dragover',event=>{event.preventDefault();zone.classList.add('dragging');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragging'));
  zone.addEventListener('drop',event=>{event.preventDefault();zone.classList.remove('dragging');addFiles([...event.dataTransfer.files].map(file=>({name:file.name,mock:false})));});
  const fileInput=$('#file-input');
  fileInput.addEventListener('change',()=>{addFiles([...fileInput.files].map(file=>({name:file.name,mock:false})));fileInput.value='';});
  $('#choose-local').addEventListener('click',()=>{fileInput.accept='.png,.jpg,.jpeg,.webp,.gif,.xlsx,.xls,.csv,.doc,.docx';fileInput.click();});
  $('#start-recognition').addEventListener('click',startRecognition);renderFiles();updateImportStatus();
}
function addFiles(files){
  const accepted=files.filter(file=>/\.(png|jpe?g|webp|gif|xlsx?|csv|docx?)$/i.test(file.name));
  if(accepted.length!==files.length)notify('请选择截图、Excel 或 Word 文件');
  state.files.push(...accepted.map(file=>({...file,id:Date.now()+Math.random()})));renderFiles();updateImportStatus();
  if(accepted.length)notify('文件已上传（模拟），当前不解析文件内容');
}
function renderFiles(){
  const container=$('#file-list');if(!container)return;
  container.innerHTML=state.files.map(file=>`<div class="file-row">${icon('check')}<span>${escapeHTML(file.name)}</span><span>已上传 · Mock</span><button class="icon-btn" aria-label="移除 ${escapeHTML(file.name)}" data-remove-file="${file.id}">${icon('close')}</button></div>`).join('');
  container.querySelectorAll('[data-remove-file]').forEach(button=>button.addEventListener('click',()=>{state.files=state.files.filter(file=>String(file.id)!==button.dataset.removeFile);renderFiles();updateImportStatus();}));renderMaterialInfo();
}
function renderMaterialInfo(){
  if(!$('.context-card'))return;$('#material-info')?.remove();
  const count=lines().length;
  const content=`<strong>${icon('info')}尚未开始分析</strong><dl><div><dt>文本条数</dt><dd>${count} 条</dd></div><div><dt>已上传文件</dt><dd>${state.files.length} 个</dd></div></dl><p>这里只统计已导入的材料。识别完成后，再查看背景信息是否需要补充。</p>`;
  $('.context-card .card-header').insertAdjacentHTML('afterend',`<div id="material-info" class="material-info">${content}</div>`);
}
function lines(){return state.text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);}
function updateImportStatus(){const count=lines().length;$('#text-count').textContent=`${count} 条文本`;$('#start-recognition').disabled=!count&&!state.files.length;renderMaterialInfo();}
async function startRecognition(){
  if(state.loading||(!lines().length&&!state.files.length))return;state.loading=true;
  const overlay=document.createElement('div');overlay.className='loading-overlay';overlay.setAttribute('role','status');overlay.innerHTML=`<div class="loading-content"><div class="loading-symbol">${icon('spark')}</div><h2>正在整理原始反馈</h2><p>保留原始证据，检查缺失的背景信息</p><div class="loading-bar"><span></span></div><small>模拟 AI 整理 · 不确定项保持待确认，不推断缺失信息</small></div>`;document.body.append(overlay);
  await new Promise(resolve=>setTimeout(resolve,1400));
  const rawLines=lines();state.batchType=rawLines.length?(state.demo?'示例批次':'粘贴文本批次'):'文件演示批次';
  const importedLines=rawLines.length?rawLines:window.DEMO_FEEDBACK.map(item=>`【${item.source}】${item.raw}`);
  const demoBatch=state.demo||!rawLines.length;
  state.feedback=importedLines.map((line,index)=>{
    const sourcePrefix=line.match(/^【(用户评论|客服反馈|测试反馈|实车走查|不识别语料)】\s*/);
    const raw=sourcePrefix?line.slice(sourcePrefix[0].length):line;
    const match=window.DEMO_FEEDBACK.find(item=>item.raw===raw||item.utterance===raw);
    const metadata={source:sourcePrefix?.[1]||'未提供',date:'未提供',model:'未提供',version:'未提供'};
    // 来源只读取输入中可见的前缀；纯反馈文本不借用示例的隐藏背景。
    return {id:`FB-${String(index+1).padStart(3,'0')}`,raw,utterance:match?.utterance||'未提取',ai:match?{...match.ai}:{status:'待确认',object:'待确认',type:'',intent:''},manifestation:match?.manifestation||'未提取',...metadata,similarityGroup:match?.similarityGroup||null,demoDecision:demoBatch?window.DEMO_REVIEW_PRESET[match?.id]||null:null};
  }).map(item=>({...item,ai:{...item.ai},current:{...item.ai,...(item.demoDecision?.pmConfirmed?{status:'已确认'}:{})},pmConfirmed:false,corrected:false,remembered:null,originalContext:{model:item.model,version:item.version,date:item.date,source:item.source},background:null,disposition:'pending',resolvedVersion:'',excludeReason:'',...item.demoDecision}));
  resetIssueAnalysis();resetOptimization();
  state.backgroundDraft=newBackgroundDraft();state.selectedFeedback.clear();state.reviewSelection.clear();state.reviewAnchor=null;state.selectionAnchor=null;state.prepFilter='all';state.filter='pending';state.problemType='all';state.page='prepare';state.loading=false;overlay.remove();render();
}
function render(){state.page==='import'?importPage():state.page==='prepare'?preparationPage():state.page==='issues'?issueAnalysisPage():state.page==='optimization'?recommendationPage():state.page==='generalization'?generalizationPage():reviewPage();}

const objectOptions=['待确认','无法判断','车窗','天窗','座椅加热','空调','导航','音乐','其他'];
const typeOptions=['只回复标准化提示语','旧人设化提示语','TTS回复','不回复','提示语错误','错误执行'];
function typeLabel(value){return unknownObject(value)?'待确认':value;}
function reviewTypeLabel(item){return unknownObject(item.current.type)&&item.pmConfirmed?'证据不足':typeLabel(item.current.type);}
function correctionTypeOptions(selected,confirmed=false){return `<option value="" ${!selected?'selected':''}>${confirmed?'证据不足（已确认保留未分类）':'待确认（分类证据不足）'}</option>${selectOptions(typeOptions,selected)}`;}
function unknownObject(value){return !String(value??'').trim()||['待确认','无法判断','未识别','未提取','未提供'].includes(String(value).trim());}
function missingReviewFields(classification){return [['object','功能对象'],['intent','用户意图'],['type','问题类型']].filter(([key])=>unknownObject(classification[key])).map(([,label])=>label);}
// 已识别完整的结果无需重复确认；PM 可显式确认保留证据不足的问题类型。
function unresolvedReviewFields(item){return missingReviewFields(item.current).filter(field=>field!=='问题类型'||!item.pmConfirmed);}
function needsConfirmation(item){return unresolvedReviewFields(item).length>0;}
// Issue V1 的聚合维度不包含问题类型；功能和意图可用即可参与聚合。
function needsObjectIntentConfirmation(item){return unknownObject(item.current.object)||unknownObject(item.current.intent);}
let detailSession=null;
let similarSession=null;
function badge(text,style=''){return `<span class="badge ${style}">${escapeHTML(text)}</span>`;}
function feedbackRow(item){return `<tr tabindex="0" data-feedback="${item.id}" aria-label="查看 ${item.id}：${escapeHTML(item.raw)}"><td class="selection-cell" title="按住鼠标拖动此列可连续选择"><input type="checkbox" data-review-checkbox="${item.id}" aria-label="选择 ${item.id}：${escapeHTML(item.raw)}"></td><td class="id-cell">${item.id.slice(3)}</td><td class="evidence-cell"><span class="raw-line">${escapeHTML(item.raw)}</span>${item.corrected?'<span class="pm-mark">PM 已修正</span>':''}${item.disposition!=='pending'?`<div class="row-status">${badge(dispositionLabels[item.disposition],item.disposition==='resolved'?'badge-resolved':'badge-neutral')}<span>${escapeHTML(item.disposition==='resolved'?`上线版本：${item.resolvedVersion||'待确认'}`:item.excludeReason)}</span></div>`:''}</td><td class="utterance-cell">${escapeHTML(item.utterance)}</td><td class="object-intent-cell">${badge(item.current.object,unknownObject(item.current.object)?'badge-pending':item.corrected?'badge-pm':'badge-neutral')}<small>${escapeHTML(item.current.intent||'意图待确认')}</small></td><td class="manifestation-cell">${escapeHTML(item.manifestation)}</td><td>${badge(reviewTypeLabel(item),unknownObject(item.current.type)&&!item.pmConfirmed?'badge-pending':'badge-neutral')}</td><td class="meta-cell">${escapeHTML(item.source)}</td><td class="meta-cell date-cell">${escapeHTML(item.date)}</td><td class="model-cell">${escapeHTML(item.model)}<small>${escapeHTML(item.version)}</small></td><td class="row-chevron">${icon('chevron')}</td></tr>`;}
function reviewPage(){
  stopSelectionDrag();
  const active=state.feedback.filter(item=>item.disposition==='pending');
  const pending=active.filter(item=>needsConfirmation(item)).length;
  const recognized=active.filter(item=>!needsConfirmation(item)).length;
  const statusFiltered=state.feedback.filter(item=>state.filter==='all'||state.filter==='unknown'&&item.disposition==='pending'&&needsConfirmation(item)||state.filter==='confirmed'&&item.disposition==='pending'&&!needsConfirmation(item)||item.disposition===state.filter);
  const filtered=statusFiltered.filter(item=>state.problemType==='all'||(state.problemType==='unconfirmed'?unknownObject(item.current.type)&&!item.pmConfirmed:item.current.type===state.problemType));
  const visibleIds=new Set(filtered.map(item=>item.id));
  for(const id of state.reviewSelection)if(!visibleIds.has(id))state.reviewSelection.delete(id);
  layout(`<div class="page-heading"><div><div class="eyebrow">03 / REVIEW</div><h1>Feedback Review</h1><p>核对原始证据，修正 AI 判断，并确认真正相似的反馈。</p></div><div class="review-heading-actions"><button class="btn" id="back-import">${icon('layers')}补充背景</button><button class="btn btn-primary" id="analyze-product-issues" ${issueEligibleFeedback().length?'':'disabled'}>${icon('spark')}分析 Product Issues</button></div></div>
    <div class="review-summary"><div class="summary-item"><span class="summary-number">${state.feedback.length}</span><span>条 Feedback</span></div><span class="summary-divider"></span><div class="summary-item"><span class="summary-number pending-number">${pending}</span><span>条待 PM 确认</span></div><span class="summary-divider"></span><div class="summary-item"><span class="summary-number">${recognized}</span><span>条已确认</span></div><span class="batch-tag">${active.length} 条待处理 · ${state.feedback.filter(item=>item.disposition==='resolved').length} 条已解决 · ${state.feedback.filter(item=>item.disposition==='excluded').length} 条已排除</span></div>
    ${issueReviewHandoff()}
    <section class="card review-card"><div class="review-toolbar"><div class="review-tabs" role="group" aria-label="反馈筛选">${[['pending','待处理',active.length],['unknown','待确认',pending],['confirmed','已确认',recognized],['all','全部',state.feedback.length],['resolved','已解决',state.feedback.filter(item=>item.disposition==='resolved').length],['excluded','已排除',state.feedback.filter(item=>item.disposition==='excluded').length]].map(([value,label,count])=>`<button class="review-tab ${state.filter===value?'active':''}" aria-pressed="${state.filter===value}" data-filter="${value}">${label} <span>${count}</span></button>`).join('')}</div><label class="review-problem-filter" for="problem-type-filter">问题类型<select id="problem-type-filter" aria-label="问题类型筛选"><option value="all">全部问题类型</option><option value="unconfirmed" ${state.problemType==='unconfirmed'?'selected':''}>待确认 (${statusFiltered.filter(item=>unknownObject(item.current.type)&&!item.pmConfirmed).length})</option>${typeOptions.map(type=>`<option value="${type}" ${state.problemType===type?'selected':''}>${type} (${statusFiltered.filter(item=>item.current.type===type).length})</option>`).join('')}</select></label></div>
      <div class="bulk-toolbar review-bulk-toolbar"><div class="bulk-selection"><span id="review-selection-count">已选 0 条</span><button class="text-link" id="review-clear" hidden>取消选择</button><button class="bulk-action selection-action" id="review-mark-resolved" aria-describedby="review-selection-hint">标记已解决</button><button class="bulk-action selection-action" id="review-exclude-feedback" aria-describedby="review-selection-hint">排除反馈</button><button class="bulk-action selection-action" id="review-restore-feedback" hidden>恢复待处理</button></div><span class="sr-only" id="review-selection-hint">先勾选反馈，再进行批量处理</span></div>
      <div class="table-scroll review-scroll" id="review-scroll"><table class="feedback-table review-table"><caption class="sr-only">反馈审核表。左侧方框支持勾选、鼠标拖选、Shift 连选。点击原始反馈打开详情，也可单条处理。</caption><thead><tr><th class="selection-cell"><input type="checkbox" id="review-select-all" aria-label="全选当前显示的反馈"></th><th scope="col">#</th><th scope="col">原始反馈 <span>EVIDENCE</span></th><th scope="col">用户语料</th><th scope="col">功能对象 / 意图</th><th scope="col">异常表现</th><th scope="col">问题类型</th><th scope="col">来源</th><th scope="col">日期</th><th scope="col">车型 / 版本</th><th scope="col"><span class="sr-only">详情</span></th></tr></thead><tbody>${filtered.length?filtered.map(feedbackRow).join(''):`<tr><td colspan="11"><div class="empty-state">${icon('check')}<strong>当前筛选下没有反馈</strong><span>切换到“全部”查看所有条目及处理状态</span><button class="text-link" id="show-all">查看全部反馈</button></div></td></tr>`}</tbody></table></div><footer class="table-footer"><span>显示 ${filtered.length} 条 / 共 ${state.feedback.length} 条</span><span>原始 Evidence 始终保留</span></footer></section>
    <div class="review-note">${icon('spark')}<span>${state.batchType==='文件演示批次'?'文件尚未解析，当前展示的是 28 条演示反馈。':state.batchType==='粘贴文本批次'?'当前按行保留文本，使用示例规则模拟分类；新表达的功能对象保持待确认，分类证据不足时问题类型留待确认。':'当前使用示例反馈模拟 AI 整理。'} 已识别完整的反馈无需重复确认。未识别的功能和意图由 PM 补充，问题类型证据不足时可确认保留未分类。示例待确认只保留车窗这一组，支持一键应用；修正不会自动学习。</span></div>`);
  $('#back-import').addEventListener('click',()=>{state.page='prepare';render();});
  bindIssueReviewActions();
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.filter=button.dataset.filter;state.problemType='all';state.reviewSelection.clear();state.reviewAnchor=null;reviewPage();$(`[data-filter="${state.filter}"]`).focus();}));
  document.querySelectorAll('[data-feedback]').forEach(row=>{
    row.addEventListener('click',event=>{if(!event.target.closest('.selection-cell'))openDetail(row.dataset.feedback);});
    row.addEventListener('keydown',event=>{if(event.target===row&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openDetail(row.dataset.feedback);}});
  });
  $('#show-all')?.addEventListener('click',()=>{state.filter='all';reviewPage();});
  $('#problem-type-filter').addEventListener('change',event=>{state.problemType=event.target.value;state.reviewSelection.clear();state.reviewAnchor=null;reviewPage();$('#problem-type-filter').focus();});
  $('#review-clear').addEventListener('click',()=>{state.reviewSelection.clear();state.reviewAnchor=null;updateReviewSelection();});
  $('#review-select-all').addEventListener('change',event=>{for(const item of filtered)event.target.checked?state.reviewSelection.add(item.id):state.reviewSelection.delete(item.id);updateReviewSelection();});
  $('#review-mark-resolved').addEventListener('click',()=>openDispositionDialog('resolved'));
  $('#review-exclude-feedback').addEventListener('click',()=>openDispositionDialog('excluded'));
  $('#review-restore-feedback').addEventListener('click',()=>applyDisposition('pending',{},[...state.reviewSelection]));
  bindFeedbackSelection(filtered,'review');updateReviewSelection();
}
function updateReviewSelection(){
  if(state.page!=='review'||!$('#review-select-all'))return;
  const inputs=[...document.querySelectorAll('[data-review-checkbox]')],count=state.reviewSelection.size;
  let visibleSelected=0;
  for(const input of inputs){input.checked=state.reviewSelection.has(input.dataset.reviewCheckbox);input.closest('tr').classList.toggle('selected-row',input.checked);if(input.checked)visibleSelected++;}
  $('#review-select-all').checked=inputs.length>0&&visibleSelected===inputs.length;
  $('#review-select-all').indeterminate=visibleSelected>0&&visibleSelected<inputs.length;
  $('#review-selection-count').textContent=`已选 ${count} 条`;$('#review-clear').hidden=!count;
  $('#review-mark-resolved').disabled=!count;$('#review-exclude-feedback').disabled=!count;
  const canRestore=[...state.reviewSelection].some(id=>findFeedback(id)?.disposition!=='pending');
  $('#review-restore-feedback').hidden=!canRestore&&!['resolved','excluded'].includes(state.filter);$('#review-restore-feedback').disabled=!canRestore;
  $('#review-selection-hint').textContent=count?'将只处理已选反馈，确认后更新；原始证据保留':'先勾选反馈，再进行批量处理';
}
function selectOptions(options,selected){return options.map(value=>`<option value="${escapeHTML(value)}" ${value===selected?'selected':''}>${escapeHTML(value)}</option>`).join('');}
function findFeedback(id){return state.feedback.find(item=>item.id===id);}
function fingerprint(correction){return JSON.stringify({object:correction.object,intent:correction.intent,type:correction.type});}
function closeDialog(dialog){if(dialog?.open)dialog.close();}
function openDetail(id){
  const item=findFeedback(id);if(!item)return;
  state.selectedId=id;
  detailSession={id,draft:{...item.current},saved:item.pmConfirmed,candidates:null,searching:false,rememberChecked:false};
  const dialog=document.createElement('dialog');dialog.id='detail-dialog';dialog.className='detail-dialog';dialog.setAttribute('aria-labelledby','detail-title');
  dialog.innerHTML=`<header class="detail-header"><div><span class="detail-id">${item.id}</span><h2 id="detail-title">Feedback 详情</h2></div><button class="icon-btn" id="close-detail" aria-label="关闭反馈详情">${icon('close')}</button></header><div class="detail-content"><section class="evidence-section"><div class="section-label">${icon('file')}原始 Evidence <span>保留原文</span></div><blockquote>${escapeHTML(item.raw)}</blockquote><div class="evidence-meta"><span>${escapeHTML(item.source)}</span><span>${escapeHTML(item.date)}</span><span>${escapeHTML(item.model)} · ${escapeHTML(item.version)}</span></div><div class="utterance-block"><span>用户语料</span><p>${item.utterance==='未提取'?'未提取':`“${escapeHTML(item.utterance)}”`}</p></div></section><section class="ai-section"><div class="section-label ai-label">${icon('spark')}AI 初始判断 <span>Mock</span></div><div class="ai-fields"><div><span>AI 整理状态</span>${badge(missingReviewFields(item.ai).length?'待补充':'已识别',missingReviewFields(item.ai).length?'badge-pending':'badge-neutral')}</div><div><span>功能对象</span>${badge(item.ai.object,unknownObject(item.ai.object)?'badge-pending':'badge-neutral')}</div><div><span>问题类型</span>${badge(typeLabel(item.ai.type),!item.ai.type?'badge-pending':'badge-neutral')}</div><div><span>用户意图</span><strong class="ai-value">${escapeHTML(item.ai.intent||'待确认')}</strong></div><div><span>异常表现</span><strong class="ai-value">${escapeHTML(item.manifestation)}</strong></div></div><p class="ai-hint">已识别的字段无需重复确认，可按需修正。未识别的字段由 PM 补充；问题类型按实际表现标注，证据不足时保留待确认。</p></section><section class="correction-section"><div class="section-label pm-label"><span class="pm-icon">PM</span>人工修正<span id="correction-state"></span></div><div class="field"><label for="correction-object">功能对象</label><select id="correction-object">${selectOptions(objectOptions,item.current.object)}</select></div><div class="field"><label for="correction-intent">用户意图</label><input id="correction-intent" placeholder="例如：小幅打开副驾车窗" value="${escapeHTML(item.current.intent)}" maxlength="160"></div><div class="field"><label for="correction-type">问题类型 <span class="optional-label">按实际表现选择</span></label><select id="correction-type">${correctionTypeOptions(item.current.type,item.pmConfirmed)}</select><small class="field-hint">根据实测回复或执行结果选择；证据不足时可暂留待确认。</small></div><button class="btn btn-primary full-width" id="save-current">${icon('check')}仅保存本条</button><p class="save-note" id="save-note">只修改当前 Feedback，不会自动学习。</p></section><section class="similar-section"><div class="section-label">${icon('link')}应用到相似反馈</div><p>AI 推荐候选，由你查看原文并逐条确认。</p><button class="btn full-width" id="find-similar">${icon('spark')}应用到相似反馈</button><div id="similar-result"></div></section><section class="memory-section"><label class="memory-choice" for="remember-check"><input type="checkbox" id="remember-check"><div><strong>${icon('book')}记住用于以后</strong><p>以后遇到相似表达时，可参考这次分类。<br>这是独立操作，默认不记住。</p></div></label><button class="btn full-width" id="save-memory" disabled>记住这次分类</button><p class="save-note" id="memory-note">仅模拟规则记录；刷新页面后清空。</p></section><details class="detail-secondary-actions"><summary id="detail-secondary-label" title="标记已解决、排除反馈或恢复待处理">其他反馈操作</summary><div class="detail-disposition"><div class="detail-status-summary" id="detail-status-summary"></div><div class="bulk-actions"><button class="bulk-action" id="detail-mark-resolved">${icon('check')}标记已解决</button><button class="bulk-action" id="detail-exclude-feedback">${icon('close')}排除反馈</button><button class="bulk-action" id="detail-restore-feedback" hidden>恢复待处理</button></div><p class="detail-status-note">只处理当前反馈，不需要返回整理页。</p></div></details></div><footer class="detail-footer">Correction ≠ Learning <span>最终判断由 PM 完成</span></footer>`;
  document.body.append(dialog);
  $('#close-detail',dialog).addEventListener('click',()=>closeDialog(dialog));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right)closeDialog(dialog);}});
  dialog.addEventListener('close',()=>{dialog.remove();detailSession=null;state.selectedId=null;const row=$(`[data-feedback="${id}"]`);(row||$('[data-filter="all"]'))?.focus();});
  [['correction-object','object'],['correction-intent','intent'],['correction-type','type']].forEach(([input,key])=>$('#'+input,dialog).addEventListener('input',event=>{detailSession.draft[key]=event.target.value;detailSession.candidates=null;$('#similar-result').replaceChildren();updateDetailActions();}));
  $('#detail-mark-resolved',dialog).addEventListener('click',()=>openDispositionDialog('resolved',[id]));
  $('#detail-exclude-feedback',dialog).addEventListener('click',()=>openDispositionDialog('excluded',[id]));
  $('#detail-restore-feedback',dialog).addEventListener('click',()=>applyDisposition('pending',{},[id]));
  $('#save-current',dialog).addEventListener('click',saveCurrent);
  $('#find-similar',dialog).addEventListener('click',discoverSimilar);
  $('#remember-check',dialog).addEventListener('change',event=>{detailSession.rememberChecked=event.target.checked;updateDetailActions();});
  $('#save-memory',dialog).addEventListener('click',rememberCorrection);
  updateDetailActions();dialog.showModal();
}
function draftValid(){return detailSession&&!unknownObject(detailSession.draft.object)&&!unknownObject(detailSession.draft.intent);}
function isSavedDraft(){const item=findFeedback(detailSession?.id);return Boolean(item&&!needsObjectIntentConfirmation(item)&&fingerprint(item.current)===fingerprint({...detailSession.draft,intent:detailSession.draft.intent.trim()}));}
function updateDetailActions(){
  if(!detailSession)return;
  const valid=draftValid(),saved=isSavedDraft(),item=findFeedback(detailSession.id);
  const archived=item.disposition!=='pending';
  $('#detail-secondary-label').textContent=archived?`其他反馈操作 · ${dispositionLabels[item.disposition]}`:'其他反馈操作';
  $('#detail-status-summary').innerHTML=`${badge(dispositionLabels[item.disposition],item.disposition==='resolved'?'badge-resolved':archived?'badge-neutral':'badge-pm')}<span>${escapeHTML(item.disposition==='resolved'?`上线版本：${item.resolvedVersion||'待确认'}`:item.disposition==='excluded'?`排除原因：${item.excludeReason}`:'继续参与审核和相似推荐')}</span>`;
  $('#detail-mark-resolved').textContent=item.disposition==='resolved'?'修改上线版本':'标记已解决';
  $('#detail-exclude-feedback').disabled=item.disposition==='excluded';$('#detail-restore-feedback').hidden=!archived;
  for(const selector of ['#correction-object','#correction-intent','#correction-type'])$(selector).disabled=archived;

  const unchanged=fingerprint({...detailSession.draft,intent:detailSession.draft.intent.trim()})===fingerprint(item.current);
  const missing=unresolvedReviewFields(item);
  $('#correction-type option[value=""]').textContent=item.pmConfirmed?'证据不足（已确认保留未分类）':'待确认（分类证据不足）';
  $('#save-current').disabled=!valid||saved||item.disposition!=='pending';
  $('#save-current').innerHTML=icon('check')+(unchanged&&!missing.length?(item.corrected?'本条已保存':item.pmConfirmed?'本条已确认':'已识别，无需确认'):unchanged&&item.corrected?'本条已保存':'仅保存本条');
  $('#correction-state').textContent=!unchanged?'有未保存修改':missing.length?`待补充：${missing.join('、')}`:unknownObject(item.current.type)?'已确认，问题类型保留未分类':'已识别完整';
  $('#find-similar').disabled=!saved||detailSession.searching||item.disposition!=='pending';
  $('#save-note').textContent=archived?'本条已退出待处理，恢复后可继续修正。':!unchanged?'仅保存本条修改；未补齐的字段继续待确认，不会自动学习。':missing.length?`请补充未识别的${missing.join('、')}；已识别的字段无需重复确认。`:unknownObject(item.current.type)?'本条已确认，问题类型按证据不足保留未分类；可按需修改。':'问题类型、功能对象和意图已识别完整，无需手动确认；可按需修改。';
  const remembered=Boolean(item.remembered&&fingerprint(item.remembered.correction)===fingerprint(item.current));
  $('#remember-check').disabled=!saved||remembered||item.disposition!=='pending';$('#remember-check').checked=remembered||detailSession.rememberChecked;
  $('#save-memory').disabled=!saved||!detailSession.rememberChecked||remembered||item.disposition!=='pending';
  $('#save-memory').textContent=remembered?'已记住这次分类 · Mock':'记住这次分类';
  $('#memory-note').textContent=remembered?'已记录这次表达与分类，仅用于本次演示。':'仅模拟规则记录；刷新页面后清空。';
}
function saveCurrent(){
  if(!detailSession||!draftValid())return;
  const item=findFeedback(detailSession.id);if(item.disposition!=='pending')return;item.current={...detailSession.draft,intent:detailSession.draft.intent.trim(),status:'已确认'};item.pmConfirmed=true;item.corrected=fingerprint(item.current)!==fingerprint(item.ai);detailSession.draft={...item.current};detailSession.saved=true;detailSession.rememberChecked=false;
  reviewPage();updateDetailActions();notify(`已保存 ${item.id}${needsConfirmation(item)?'，功能或意图仍待补充':'，本条已确认'}，未修改其他反馈，也未记住分类`);
}
async function discoverSimilar(){
  if(!detailSession||!isSavedDraft()||detailSession.searching)return;
  const session=detailSession,item=findFeedback(session.id);session.searching=true;updateDetailActions();
  $('#find-similar').innerHTML=icon('spark')+'正在查找相似表达…';
  await new Promise(resolve=>setTimeout(resolve,850));
  if(detailSession!==session)return;
  session.searching=false;
  if(!isSavedDraft()){updateDetailActions();$('#find-similar').innerHTML=icon('spark')+'应用到相似反馈';return;}
  session.candidates=item.disposition==='pending'?state.feedback.filter(candidate=>candidate.id!==item.id&&candidate.disposition==='pending'&&item.similarityGroup&&candidate.similarityGroup===item.similarityGroup).map(candidate=>candidate.id):[];
  $('#find-similar').innerHTML=icon('spark')+'重新查找相似反馈';updateDetailActions();
  const count=session.candidates.length;
  $('#similar-result').innerHTML=count?`<div class="similar-result"><div>${icon('spark')}<span>发现 <strong>${count}</strong> 条相似反馈</span><button class="text-link" id="view-similar">查看 ${count} 条</button></div><p>可能包含不同功能，需查看原文后选择。</p></div>`:`<div class="similar-result"><p>当前 Mock 数据中没有可推荐的相似反馈。</p></div>`;
  $('#view-similar')?.addEventListener('click',openSimilar);
}
function rememberCorrection(){
  if(!detailSession||!isSavedDraft()||!detailSession.rememberChecked)return;
  const item=findFeedback(detailSession.id);item.remembered={utterance:item.utterance,correction:{...item.current}};detailSession.rememberChecked=false;updateDetailActions();notify('已记住这次分类（Mock），没有触发真实 AI 学习');
}
function openSimilar(){
  if(!detailSession?.candidates?.length||!isSavedDraft())return;
  const item=findFeedback(detailSession.id);
  const candidates=detailSession.candidates.map(findFeedback).filter(Boolean);
  // Snapshot: 编辑尚未保存的表单不能在后台悄悄改变待应用修正。
  similarSession={selected:new Set(),ids:candidates.map(candidate=>candidate.id),correction:{...item.current},origin:item.id,typeChanged:item.current.type!==item.ai.type};
  const dialog=document.createElement('dialog');dialog.id='similar-dialog';dialog.className='similar-dialog';dialog.setAttribute('aria-labelledby','similar-title');
  dialog.innerHTML=`<header class="similar-header"><div><div class="eyebrow">AI RECOMMENDS · YOU DECIDE</div><h2 id="similar-title">查看相似反馈 <span>${candidates.length}</span></h2><p>表达相近不代表功能相同，请根据原始反馈选择。</p></div><button class="icon-btn" id="close-similar" aria-label="关闭相似反馈">${icon('close')}</button></header><div class="apply-preview"><span class="apply-label"><span class="pm-icon">PM</span>本次应用</span><strong>${escapeHTML(item.current.object)}</strong><span class="preview-slash">/</span><span>${escapeHTML(item.current.intent)}</span><span class="type-preserve">${similarSession.typeChanged?`问题类型：${escapeHTML(typeLabel(item.current.type))}`:'问题类型保留各条原值'}</span></div><div class="selection-toolbar"><label for="select-all"><input type="checkbox" id="select-all">全选 ${candidates.length} 条</label><button class="text-link" id="clear-selection">取消选择</button><span id="selection-count">已选 0 条</span></div><div class="candidate-scroll"><div class="candidate-grid">${candidates.map(candidate=>`<label class="candidate-card" for="candidate-${candidate.id}"><input type="checkbox" id="candidate-${candidate.id}" data-candidate="${candidate.id}"><div class="candidate-content"><div class="candidate-top"><span>${candidate.id}</span><div class="candidate-tags">${badge(candidate.current.object,unknownObject(candidate.current.object)?'badge-pending':'badge-neutral')}${badge(typeLabel(candidate.current.type),!candidate.current.type?'badge-pending':'badge-neutral')}</div></div><p>“${escapeHTML(candidate.raw)}”</p><div class="candidate-meta"><span>${escapeHTML(candidate.source)}</span><span>${escapeHTML(candidate.date)}</span>${candidate.corrected?'<span class="pm-mark">PM 已修正</span>':''}</div></div></label>`).join('')}</div></div><footer class="similar-footer"><div>${icon('info')}<span>仅更新已选条目，未选反馈保持原值。<small>不会自动记住这次修正</small></span></div><div class="footer-actions"><button class="btn" id="cancel-similar">取消</button><button class="btn btn-primary" id="apply-selected" disabled>应用到已选 0 条</button></div></footer>`;
  document.body.append(dialog);
  $('#close-similar',dialog).addEventListener('click',()=>closeDialog(dialog));$('#cancel-similar',dialog).addEventListener('click',()=>closeDialog(dialog));
  dialog.addEventListener('close',()=>{dialog.remove();similarSession=null;$('#view-similar')?.focus();});
  dialog.querySelectorAll('[data-candidate]').forEach(input=>input.addEventListener('change',()=>{input.checked?similarSession.selected.add(input.dataset.candidate):similarSession.selected.delete(input.dataset.candidate);updateSelection();}));
  $('#select-all',dialog).addEventListener('change',event=>{similarSession.selected=event.target.checked?new Set(similarSession.ids):new Set();updateSelection();});
  $('#clear-selection',dialog).addEventListener('click',()=>{similarSession.selected.clear();updateSelection();});
  $('#apply-selected',dialog).addEventListener('click',applySelected);
  dialog.showModal();updateSelection();
}
function updateSelection(){
  if(!similarSession)return;
  const count=similarSession.selected.size;
  document.querySelectorAll('[data-candidate]').forEach(input=>{input.checked=similarSession.selected.has(input.dataset.candidate);input.closest('.candidate-card').classList.toggle('selected',input.checked);});
  $('#select-all').checked=count===similarSession.ids.length;$('#select-all').indeterminate=count>0&&count<similarSession.ids.length;
  $('#selection-count').textContent=`已选 ${count} 条`;$('#apply-selected').textContent=`应用到已选 ${count} 条`;$('#apply-selected').disabled=count===0;
}
function applySelected(){
  if(!similarSession?.selected.size)return;
  const session=similarSession;let count=0;
  for(const id of session.selected){if(!session.ids.includes(id)||id===session.origin)continue;const item=findFeedback(id);if(!item||item.disposition!=='pending')continue;item.current={...item.current,object:session.correction.object,intent:session.correction.intent,...(session.typeChanged?{type:session.correction.type}:{})};item.pmConfirmed=true;item.current.status=needsConfirmation(item)?'待确认':'已确认';item.corrected=fingerprint(item.current)!==fingerprint(item.ai);count++;}
  closeDialog($('#similar-dialog'));reviewPage();updateDetailActions();
  $('#similar-result').innerHTML=`<div class="similar-result applied-result"><div>${icon('check')}<span>已应用到 <strong>${count}</strong> 条已选反馈</span><button class="text-link" id="view-similar">再次查看</button></div><p>未选反馈保持原值。你仍可单独选择“记住用于以后”。</p></div>`;
  $('#view-similar').addEventListener('click',openSimilar);notify(`已更新 ${count} 条已选反馈，其余 ${state.feedback.length-count-1} 条保持原值`);
}
// 可选浏览器能力：只读当前演示结果，无外部请求或 AI API。
if(document.modelContext?.registerTool){
  try{Promise.resolve(document.modelContext.registerTool({name:'read_feedback_review',title:'读取当前反馈审核结果',description:'只读当前前端演示批次及人工修正，不进行推荐、批量修改或学习。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:input=>{if(input==null||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('该只读工具只接受空对象');return {batch:state.batchType||null,feedback:state.feedback.map(item=>({id:item.id,raw:item.raw,model:item.model,version:item.version,date:item.date,source:item.source,utterance:item.utterance,manifestation:item.manifestation,disposition:item.disposition,resolvedVersion:item.resolvedVersion,background:item.background,ai:{...item.ai},current:{...item.current},pmConfirmed:item.pmConfirmed,corrected:item.corrected,remembered:Boolean(item.remembered)}))};}})).catch(()=>{});}catch{}
}
render();
