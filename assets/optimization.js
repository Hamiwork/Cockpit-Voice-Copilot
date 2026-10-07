'use strict';
// 第三阶段仅保存页面内存草稿，独立于 Feedback / Issue 的人工决定。
function newOptimizationState(){return {activeId:null,sessions:new Map()};}
let optimizationState=newOptimizationState();
function resetOptimization(){optimizationState=newOptimizationState();}
function optimizationSourceKey(issue){return JSON.stringify([issue.name,issue.module,issue.object,issue.intent,issue.manifestation,issue.evidenceIds.map(id=>{const item=findFeedback(id);return [id,item?.raw,item?.current.object,item?.current.intent,item?.manifestation];})]);}
function supportsOptimizationMock(issue){const mock=window.DEMO_OPTIMIZATION;return issue?.id===mock.issueId&&['module','object','intent','manifestation'].every(key=>issue[key]===mock[key]);}
function optimizationSession(){return optimizationState.sessions.get(optimizationState.activeId);}
function optimizationIssue(){return findIssue(optimizationState.activeId);}
function optimizationEvidence(issue=optimizationIssue()){return (issue?.evidenceIds||[]).map(findFeedback).filter(Boolean);}
function expressionSources(text,issue=optimizationIssue()){return optimizationEvidence(issue).filter(item=>text.trim()&&item.raw.includes(text.trim())).map(item=>item.id);}
function expressionRisk(text){return window.DEMO_OPTIMIZATION.uncertainObjects.some(value=>text.includes(value))||/旁边|那个|这边|那边/.test(text);}
function extractOptimizationExpressions(issue){
  const mock=window.DEMO_OPTIMIZATION;
  const groups=[['object',mock.objects,false],['object',mock.uncertainObjects,true],['action',mock.actions,false]];
  let next=1;
  return groups.flatMap(([kind,values,risk])=>{
    const defaults=kind==='object'?mock.defaultObjects:mock.defaultActions;
    return values.filter(text=>expressionSources(text,issue).length||(!risk&&defaults.includes(text))).map(text=>{
      const sourceIds=expressionSources(text,issue),defaultRecommended=!risk&&defaults.includes(text);
      return {id:`EXP-${next++}`,kind,text,originalText:text,origin:sourceIds.length?'mock':'demo',risk,defaultRecommended,selected:defaultRecommended,sourceIds};
    });
  });
}
function makeOptimizationSession(issue,previous){
  return {issueId:issue.id,sourceKey:optimizationSourceKey(issue),type:supportsOptimizationMock(issue)?'generalization':'',accepted:false,expressions:supportsOptimizationMock(issue)?extractOptimizationExpressions(issue):[],slotName:'微开动作',optional:window.DEMO_OPTIMIZATION.optional.filter(text=>optimizationEvidence(issue).some(item=>item.raw.includes(text))).join('|'),rule:'',manualRule:false,coverage:null,revision:0,savedDraft:previous?.savedDraft||null};
}
function canEnterOptimization(issue){return Boolean(issue?.confirmed&&issue.evidenceIds.length);}
function openOptimization(id){
  refreshIssueAnalysis();const issue=findIssue(id);
  if(!canEnterOptimization(issue)){notify('请先确认当前 Issue 和 Evidence，再进入优化');return;}
  const detail=$('#issue-detail-dialog');if(detail?.open)detail.close();
  optimizationState.activeId=id;
  if(!optimizationState.sessions.has(id))optimizationState.sessions.set(id,makeOptimizationSession(issue));
  state.page='optimization';render();
}
function optimizationCurrent(){const issue=optimizationIssue(),session=optimizationSession();return Boolean(canEnterOptimization(issue)&&session?.sourceKey===optimizationSourceKey(issue));}
function optimizationBack(){state.page='issues';render();}
function optimizationIssueSummary(issue){
  return `<section class="card optimization-issue"><div><span class="detail-id">${escapeHTML(issue.id)} · CONFIRMED ISSUE</span><h2>${escapeHTML(issue.name)}</h2>${issueStatus(issue)}</div><dl>${[['功能模块',issue.module],['功能对象',issue.object],['用户意图',issue.intent],['异常表现',issue.manifestation],['Evidence',`${issue.evidenceIds.length} 条`]].map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl></section>`;
}
function optimizationGate(){
  refreshIssueAnalysis();
  const issue=optimizationIssue(),session=optimizationSession();
  if(!issue||!session){state.page='issues';issueAnalysisPage();return false;}
  if(!canEnterOptimization(issue)){
    layout(`<div class="page-heading"><div><div class="eyebrow">05 / OPTIMIZATION</div><h1>请重新确认来源 Issue</h1><p>Issue 或 Evidence 已发生变化，请在 Issue Analysis 核对后确认。</p></div><button class="btn" id="optimization-back">返回 Issue Analysis</button></div>${optimizationIssueSummary(issue)}<p class="optimization-note">已保存的草稿保留在本次演示内存中；来源变化后需重新审核。</p>`);
    $('#optimization-back').addEventListener('click',optimizationBack);return false;
  }
  return true;
}
function recommendationPage(){
  if(!optimizationGate())return;
  const issue=optimizationIssue(),session=optimizationSession(),supported=supportsOptimizationMock(issue),current=optimizationCurrent(),mock=window.DEMO_OPTIMIZATION;
  layout(`<div class="page-heading"><div><div class="eyebrow">05 / OPTIMIZATION RECOMMENDATION</div><h1>Optimization Recommendation</h1><p>从已确认的 Issue 出发，由 PM 判断合适的优化方向。</p></div><button class="btn" id="optimization-back">${icon('link')}返回 Issue Analysis</button></div>${optimizationIssueSummary(issue)}
    ${!current?'<div class="optimization-warning">来源 Issue 定义或 Evidence 已变更。确认下一步时将按当前来源重新准备候选；旧草稿保留并标记需要重新审核。</div>':''}
    <div class="recommendation-grid"><section class="card"><div class="card-header"><div><div class="eyebrow">AI RECOMMENDATION</div><h2>${supported?'原有功能语料泛化':'当前 Issue 暂无预设建议'}</h2></div><span class="mock-pill">Demo Mock Result</span></div><div class="card-body"><p class="recommendation-reason">${supported?mock.reason:'Demo 仅为副驾车窗微开主案例提供预设推荐。此处保留优化类型选项，其他 Issue 暂无提取与工作台 Mock。'}</p><span class="badge badge-pending">需 PM / 平台确认</span><p class="optimization-note">AI 建议供 PM 判断；是否已有定制能力仍需核对。</p><section class="mock-verification"><div><strong>现有能力检查</strong><span class="mock-pill">Mock verification</span></div>${supported?`<ul>${mock.verification.map(value=>`<li>${icon('check')}${escapeHTML(value)}</li>`).join('')}</ul>`:'<p>当前 Issue 未提供现有能力的 Mock 验证结果。</p>'}<small>演示信息未查询真实业务平台。</small></section></div></section>
    <section class="card"><div class="card-header"><div><div class="eyebrow">PM DECISION</div><h2>确认优化方式</h2></div><span class="pm-icon">PM</span></div><div class="card-body">${supported?'<button class="text-link" id="accept-recommendation">接受 AI 建议</button>':''}<fieldset class="optimization-types"><legend>修改优化类型</legend>${window.OPTIMIZATION_TYPES.map(type=>`<label class="optimization-type"><input type="radio" name="optimization-type" value="${type.id}" ${session.type===type.id?'checked':''}><span><strong>${type.label}</strong><small>${type.description}</small></span></label>`).join('')}</fieldset><p class="optimization-note" id="optimization-type-hint"></p><button class="btn btn-primary full-width" id="confirm-generalization">${icon('check')}确认并进入语料泛化</button></div></section></div>${session.savedDraft?draftSummary(session.savedDraft,issue):''}<p class="issue-footnote">AI recommends, PM decides. · 保存审核草稿后可导出 V1 Demo 模板。</p>`);
  $('#optimization-back').addEventListener('click',optimizationBack);
  function updateType(){
    const general=session.type==='generalization';
    $('#confirm-generalization').disabled=!general||!supported;
    $('#optimization-type-hint').textContent=!session.type?'请由 PM 选择优化类型。':!general?'该选项暂未开发对应工作台；不会进入语料泛化。':!supported?'当前 V1 仅提供副驾车窗微开主案例的语料泛化工作台。':'PM 确认 Mock 现有能力信息后，进入表达审核。';
  }
  document.querySelectorAll('[name="optimization-type"]').forEach(input=>input.addEventListener('change',()=>{session.type=input.value;updateType();}));
  $('#accept-recommendation')?.addEventListener('click',()=>{session.type='generalization';$('[name="optimization-type"][value="generalization"]').checked=true;updateType();notify('已选择 AI 建议，请由 PM 确认进入工作台');});
  $('#confirm-generalization').addEventListener('click',()=>{
    refreshIssueAnalysis();if(!canEnterOptimization(optimizationIssue())||session.type!=='generalization'||!supportsOptimizationMock(optimizationIssue()))return;
    let next=session;
    if(!optimizationCurrent()){next=makeOptimizationSession(optimizationIssue(),session);optimizationState.sessions.set(issue.id,next);}
    next.type='generalization';next.accepted=true;if(!next.rule)next.rule=generateOptimizationRule(next);state.page='generalization';render();
  });updateType();bindSemanticTemplateDelivery();
}
function selectedExpressions(session,kind){return session.expressions.filter(expression=>expression.selected&&expression.text.trim()&&expression.kind===kind);}
function generateOptimizationRule(session){
  const objects=selectedExpressions(session,'object').map(item=>item.text.trim());
  if(!objects.length||!selectedExpressions(session,'action').length||!session.slotName.trim())return '';
  return `(${[...new Set(objects)].join('|')})${session.optional.trim()?`[${session.optional.trim()}]`:''}<${session.slotName.trim()}>`;
}
function invalidateOptimization(session){session.revision++;session.coverage=null;}
function syncOptimizationRule(session){invalidateOptimization(session);if(!session.manualRule)session.rule=generateOptimizationRule(session);}
function literalRuleText(text){return text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
// 仅支持本 Demo 的有限文本语法。输入不会作为 JS 或任意正则执行。
function compileCandidateRule(rule,slotName,values){
  if(!rule.trim())throw new Error('请先选择对象、动作并填写规则。');
  if(rule.length>6000)throw new Error('Demo 规则最多 6000 个字符。');
  const alternatives=text=>{
    const parts=text.split('|').map(value=>value.trim());
    if(parts.some(value=>!value)||parts.length>100)throw new Error('可替换表达不能为空，最多 100 个。');
    return `(?:${parts.map(literalRuleText).join('|')})`;
  };
  let result='',usedSlot=false;
  for(let i=0;i<rule.length;){
    const character=rule[i],close={'(':')','[':']','<':'>'}[character];
    if(close){
      const end=rule.indexOf(close,i+1);if(end===-1)throw new Error('规则括号未闭合。');
      const content=rule.slice(i+1,end);if(/[()[\]<>]/.test(content))throw new Error('Demo 不支持嵌套括号。');
      if(character==='<'){
        if(content.trim()!==slotName.trim())throw new Error(`未定义槽位：${content}。请与槽位名称保持一致。`);
        if(!values.length)throw new Error('槽位至少保留一个候选动作。');
        result+=alternatives(values.join('|'));usedSlot=true;
      }else result+=alternatives(content)+(character==='['?'?':'');
      i=end+1;
    }else{
      if(/[)\]>|]/.test(character))throw new Error('规则包含不匹配的括号或游离的 |。');
      result+=literalRuleText(character);i++;
    }
  }
  if(!usedSlot)throw new Error('规则需包含当前动作槽位 <槽位名称>。');
  return new RegExp(result,'u');
}
function validateOptimizationRule(session){
  if(session.expressions.some(item=>item.selected&&(!item.text.trim()||/[()[\]<>|]/.test(item.text))))throw new Error('已选表达不能为空，也不能包含规则括号或 |。');
  const group=session.rule.match(/^\(([^()]*)\)/);
  if(!group)throw new Error('规则需以 (对象表达) 开始。');
  const objects=new Set(selectedExpressions(session,'object').map(item=>item.text.trim()));
  if(group[1].split('|').some(text=>!objects.has(text.trim())))throw new Error('规则中的对象需在中栏添加并主动勾选；删除或修改表达后，请同步修改规则或按所选表达重建。');
  return compileCandidateRule(session.rule,session.slotName,selectedExpressions(session,'action').map(item=>item.text.trim()));
}
function optimizationCoverage(session,issue){
  const matcher=validateOptimizationRule(session);
  return optimizationEvidence(issue).map(item=>{
    const riskText=window.DEMO_OPTIMIZATION.uncertainObjects.find(text=>item.raw.includes(text));
    const riskApproved=riskText&&selectedExpressions(session,'object').some(expression=>expression.risk&&expression.text.includes(riskText));
    const match=matcher.exec(item.raw);
    const status=riskText&&!riskApproved?'needs-review':match?'covered':'uncovered';
    return {id:item.id,raw:item.raw,status,matched:match?.[0]||'',reason:status==='needs-review'?'上下文依赖表达未由 PM 主动加入。':status==='uncovered'?'当前规则未匹配这条原文；请核对对象、动作和可选内容。':riskText?'PM 已主动加入；该表达仍依赖座位 / 对话上下文。':'Demo 规则已匹配当前文本表达。',risk:Boolean(riskText)};
  });
}
function expressionReviewLabel(expression){return expression.risk?'需要确认':expression.origin==='pm'?'PM 手动添加':expression.text!==expression.originalText?'PM 已修改':expression.origin==='demo'?'待实测验证':expression.defaultRecommended?'默认加入':'按需加入';}
function expressionWithoutSourceLabel(expression){return expression.origin==='demo'&&expression.text===expression.originalText?'Demo 补充候选 · 原文无直接匹配':'PM 手动表达 · 原文未找到直接匹配';}
function expressionRow(expression){
  const sources=expressionSources(expression.text),risk=expression.risk;
  return `<article class="expression-row ${risk?'expression-risk':''}"><div class="expression-edit"><input type="checkbox" data-expression-select="${expression.id}" aria-label="加入表达 ${escapeHTML(expression.text)}" ${expression.selected?'checked':''}><input class="expression-text" data-expression-text="${expression.id}" aria-label="编辑表达 ${escapeHTML(expression.text)}" value="${escapeHTML(expression.text)}" maxlength="80"><button class="icon-btn" data-expression-delete="${expression.id}" aria-label="删除表达 ${escapeHTML(expression.text)}">${icon('close')}</button></div><div class="expression-meta">${sources.length?`<button class="text-link" data-expression-trace="${expression.id}">来自 ${sources.length} 条 Evidence</button>`:`<span>${expressionWithoutSourceLabel(expression)}</span>`}<span>${expressionReviewLabel(expression)}</span></div>${risk?`<p>${window.DEMO_OPTIMIZATION.riskReason}</p>`:''}${expression.text!==expression.originalText&&expression.origin==='mock'?`<small>PM 已修改 · 提取原词：${escapeHTML(expression.originalText)}</small>`:''}</article>`;
}
function expressionGroup(session,kind){
  const expressions=session.expressions.filter(item=>item.kind===kind),recommended=expressions.filter(item=>!item.risk&&(item.defaultRecommended||item.origin==='pm')),more=expressions.filter(item=>!item.risk&&!item.defaultRecommended&&item.origin!=='pm'),uncertain=expressions.filter(item=>item.risk);
  return `<section class="expression-group"><div class="expression-group-title"><h3>${kind==='object'?'对象表达':'微开动作表达'}</h3><span>${expressions.filter(item=>item.selected).length} / ${expressions.length} 已选</span></div><div class="expression-label">默认加入 · PM 可调整</div>${recommended.map(expressionRow).join('')||'<p class="optimization-note">暂无表达，可手动添加。</p>'}${uncertain.length?`<div class="expression-label risk-label">需要确认 · 默认不加入</div>${uncertain.map(expressionRow).join('')}`:''}${more.length?`<details class="expression-more" data-more-expressions="${kind}"><summary>更多原文表达 · 按需加入 <span>${more.length}</span></summary>${more.map(expressionRow).join('')}</details>`:''}<form class="expression-add" data-expression-kind="${kind}"><label class="sr-only" for="add-${kind}">新增${kind==='object'?'对象':'动作'}表达</label><input id="add-${kind}" placeholder="手动添加${kind==='object'?'对象':'动作'}表达" maxlength="80" required><button class="btn" type="submit">添加</button></form></section>`;
}
function workspaceEvidenceCard(item){return `<article class="workspace-evidence"><header><span class="detail-id">${item.id}</span><span>${escapeHTML(item.source)}</span></header><blockquote>${escapeHTML(item.raw)}</blockquote><button class="text-link" data-optimization-evidence="${item.id}">查看原始 Feedback ${icon('chevron')}</button></article>`;}
function generalizationPage(){
  if(!optimizationGate())return;
  const session=optimizationSession(),issue=optimizationIssue();
  if(!session.accepted||session.type!=='generalization'||!optimizationCurrent()){state.page='optimization';recommendationPage();return;}
  layout(`<div class="page-heading optimization-heading"><div><div class="eyebrow">06 / UTTERANCE GENERALIZATION</div><h1>语料泛化工作台</h1><p>原始 Demo Evidence → Expression Patterns → Candidate Rule → PM Review</p></div><button class="btn" id="back-recommendation">返回优化推荐</button></div>${optimizationIssueSummary(issue)}
    <div class="optimization-principle">${icon('spark')}<span><strong>AI recommends, PM decides.</strong> 原文表达可追溯，Demo 补充候选单独标记；歧义表达默认不加入，由 PM 确认。</span><span class="mock-pill">Demo Candidate Rule</span></div>
    <div class="generalization-grid"><section class="card workspace-panel evidence-panel"><header class="workspace-panel-header"><span class="eyebrow">01 / EVIDENCE</span><h2>原始 Evidence <span>${issue.evidenceIds.length}</span></h2><p>原文保留，可查看每条原始 Feedback。</p></header><div class="workspace-panel-scroll">${optimizationEvidence().map(workspaceEvidenceCard).join('')}</div></section>
    <section class="card workspace-panel expression-panel"><header class="workspace-panel-header"><span class="eyebrow">02 / EXPRESSION PATTERNS</span><h2>AI 提炼表达方式</h2><p>原文提取与 Demo 补充 · 可选择、编辑或增加。</p></header><div class="workspace-panel-scroll" id="expression-groups">${['object','action'].map(kind=>expressionGroup(session,kind)).join('')}</div></section>
    <section class="card workspace-panel rule-panel"><header class="workspace-panel-header"><span class="eyebrow">03 / CANDIDATE RULE</span><h2>候选泛化规则</h2><p>Demo Candidate Rule · 由 PM 审核。</p></header><div class="workspace-panel-scroll"><div class="rule-toolbar"><span id="rule-edit-state"></span><button class="text-link" id="regenerate-rule">按所选表达重建</button></div><div class="field"><label for="candidate-rule">Candidate Generalization Rule</label><textarea id="candidate-rule" maxlength="6000" spellcheck="false">${escapeHTML(session.rule)}</textarea><small id="rule-validation" aria-live="polite"></small></div><dl class="rule-legend"><div><dt>()</dt><dd>必有内容，| 分隔可替换说法</dd></div><div><dt>&lt;&gt;</dt><dd>槽位，包含一组常用表达</dd></div></dl><details class="slot-details"><summary><span>槽位 <code id="slot-summary-name">&lt;${escapeHTML(session.slotName)}&gt;</code></span><span id="slot-value-count"></span>${icon('chevron')}</summary><div class="slot-details-body"><div class="field"><label for="slot-name">槽位名称</label><input id="slot-name" value="${escapeHTML(session.slotName)}" maxlength="40"></div><div class="slot-values"><span>候选值 · 在中栏编辑、取消或增加动作</span><div id="slot-value-list"></div></div></div></details><details class="rule-advanced"><summary>更多规则设置</summary><div class="field"><label for="rule-optional">可选礼貌词 [ ]</label><input id="rule-optional" value="${escapeHTML(session.optional)}" placeholder="如：请|给我|帮我" maxlength="500"><small class="field-hint">用 | 分隔；方向与否定表达需单独核对。手动规则模式下，请同步编辑规则。</small></div></details><section class="coverage-preview"><div><h3>Evidence Coverage Preview</h3><button class="btn" id="check-coverage">覆盖检查</button></div><p class="optimization-note">仅检查当前规则对文本的 Demo 匹配，不等于语音识别准确率，也不代表线上执行结果。</p><div id="coverage-result" aria-live="polite"></div></section></div></section></div>
    <section class="card optimization-review"><div><span class="eyebrow">04 / PM REVIEW</span><h2>保存为优化草稿</h2><p id="optimization-review-count"></p><p class="optimization-note">本次页面内存保存，刷新后清空。</p></div><button class="btn btn-primary" id="save-optimization-draft">${icon('book')}保存为优化草稿</button></section><div id="saved-optimization-draft"></div>`);
  $('#back-recommendation').addEventListener('click',()=>{state.page='optimization';render();});
  bindExpressionEditors();
  $('#candidate-rule').addEventListener('input',event=>{session.rule=event.target.value;session.manualRule=true;invalidateOptimization(session);updateOptimizationControls();});
  $('#slot-name').addEventListener('input',event=>{session.slotName=event.target.value;syncOptimizationRule(session);updateOptimizationControls();});
  $('#rule-optional').addEventListener('input',event=>{session.optional=event.target.value;syncOptimizationRule(session);updateOptimizationControls();});
  $('#regenerate-rule').addEventListener('click',()=>{session.manualRule=false;session.rule=generateOptimizationRule(session);invalidateOptimization(session);updateOptimizationControls();notify('已按当前所选表达重新生成候选规则');});
  $('#check-coverage').addEventListener('click',()=>{try{session.coverage={revision:session.revision,rows:optimizationCoverage(session,issue)};updateOptimizationControls();}catch(error){$('#coverage-result').innerHTML=`<p class="optimization-warning">${escapeHTML(error.message)}</p>`;}});
  $('#save-optimization-draft').addEventListener('click',saveOptimizationDraft);
  document.querySelectorAll('[data-optimization-evidence]').forEach(button=>button.addEventListener('click',()=>openOptimizationTrace([button.dataset.optimizationEvidence])));
  updateOptimizationControls();
}
function bindExpressionEditors(){
  const session=optimizationSession();
  const find=id=>session.expressions.find(item=>item.id===id);
  document.querySelectorAll('[data-expression-select]').forEach(input=>input.addEventListener('change',()=>{find(input.dataset.expressionSelect).selected=input.checked;syncOptimizationRule(session);updateOptimizationControls();}));
  document.querySelectorAll('[data-expression-text]').forEach(input=>input.addEventListener('input',()=>{
    const expression=find(input.dataset.expressionText),text=input.value.trim(),row=input.closest('.expression-row');
    expression.text=text;expression.sourceIds=expressionSources(text);
    const risk=expressionRisk(text);if(risk&&!expression.risk)expression.selected=false;expression.risk=risk;
    input.setAttribute('aria-label',`编辑表达 ${text}`);
    const checkbox=$('[data-expression-select]',row);checkbox.checked=expression.selected;checkbox.setAttribute('aria-label',`加入表达 ${text}`);
    $('[data-expression-delete]',row).setAttribute('aria-label',`删除表达 ${text}`);
    row.classList.toggle('expression-risk',risk);
    const meta=$('.expression-meta',row),sources=expression.sourceIds;
    meta.innerHTML=`${sources.length?`<button class="text-link">来自 ${sources.length} 条 Evidence</button>`:`<span>${expressionWithoutSourceLabel(expression)}</span>`}<span>${expressionReviewLabel(expression)}</span>`;
    $('.text-link',meta)?.addEventListener('click',()=>openOptimizationTrace(expressionSources(expression.text),expression.text));
    $('p',row)?.remove();if(risk)row.insertAdjacentHTML('beforeend',`<p>${window.DEMO_OPTIMIZATION.riskReason}</p>`);
    $('small',row)?.remove();if(expression.origin==='mock'&&text!==expression.originalText)row.insertAdjacentHTML('beforeend',`<small>PM 已修改 · 提取原词：${escapeHTML(expression.originalText)}</small>`);
    syncOptimizationRule(session);updateOptimizationControls();
  }));
  document.querySelectorAll('[data-expression-delete]').forEach(button=>button.addEventListener('click',()=>{session.expressions=session.expressions.filter(item=>item.id!==button.dataset.expressionDelete);syncOptimizationRule(session);renderExpressionGroups();}));
  document.querySelectorAll('[data-expression-trace]').forEach(button=>button.addEventListener('click',()=>{const expression=find(button.dataset.expressionTrace);openOptimizationTrace(expressionSources(expression.text),expression.text);}));
  document.querySelectorAll('[data-expression-kind]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();const input=$('input',form),text=input.value.trim(),kind=form.dataset.expressionKind;
    if(!text||/[()[\]<>|]/.test(text)){notify('请填写不含规则括号或 | 的表达');return;}
    if(session.expressions.some(item=>item.kind===kind&&item.text===text)){notify('该维度中已有此表达，请直接勾选或修改');return;}
    session.expressions.push({id:`EXP-PM-${session.revision}-${session.expressions.length}`,kind,text,originalText:text,origin:'pm',risk:expressionRisk(text),selected:false,sourceIds:expressionSources(text)});syncOptimizationRule(session);renderExpressionGroups();notify('已添加 PM 表达，请主动勾选是否加入');
  }));
}
function renderExpressionGroups(){const session=optimizationSession(),root=$('#expression-groups'),scroll=root.scrollTop,expanded=new Set([...root.querySelectorAll('[data-more-expressions][open]')].map(element=>element.dataset.moreExpressions));root.innerHTML=['object','action'].map(kind=>expressionGroup(session,kind)).join('');root.querySelectorAll('[data-more-expressions]').forEach(element=>element.open=expanded.has(element.dataset.moreExpressions));bindExpressionEditors();root.scrollTop=scroll;updateOptimizationControls();}
function expressionCounts(session){return {selected:session.expressions.filter(item=>item.selected&&item.text.trim()).length,pending:session.expressions.filter(item=>item.risk&&!item.selected).length};}
function updateOptimizationControls(){
  const session=optimizationSession(),count=expressionCounts(session);
  if(!session.manualRule)$('#candidate-rule').value=session.rule;
  document.querySelectorAll('.expression-group').forEach(group=>{const kind=$('[data-expression-kind]',group).dataset.expressionKind;const expressions=session.expressions.filter(item=>item.kind===kind);$('.expression-group-title>span',group).textContent=`${expressions.filter(item=>item.selected).length} / ${expressions.length} 已选`;});
  $('#rule-edit-state').textContent=session.manualRule?'PM 手动编辑 · 重建将替换规则':'随所选表达更新';
  const slotValues=selectedExpressions(session,'action');
  $('#slot-summary-name').textContent=`<${session.slotName.trim()||'槽位名称'}>`;
  $('#slot-value-count').textContent=`查看 ${slotValues.length} 个候选值`;
  $('#slot-value-list').innerHTML=slotValues.map(expression=>`<span>${escapeHTML(expression.text)}</span>`).join('')||'<small>暂无动作，请在中栏选择。</small>';
  $('#optimization-review-count').textContent=`已选 ${count.selected} 个表达 · ${count.pending} 个歧义表达待确认 · 保存即确认当前选择和规则。`;
  let error='';try{validateOptimizationRule(session);}catch(problem){error=problem.message;}
  $('#save-optimization-draft').disabled=Boolean(error)||!selectedExpressions(session,'object').length||!optimizationCurrent();
  $('#save-optimization-draft').title=error;
  $('#rule-validation').textContent=error;
  $('#rule-validation').className=error?'rule-validation-error':'';
  const coverage=session.coverage;
  $('#coverage-result').innerHTML=coverage?`<strong>${coverage.rows.filter(row=>row.status==='covered').length} / ${coverage.rows.length} Evidence covered</strong><details open><summary>查看逐条覆盖结果</summary>${coverage.rows.map(row=>`<article class="coverage-row ${row.status}"><div><span>${row.status==='covered'?'✓ 已覆盖':row.status==='needs-review'?'⚠ 需要确认':'○ 未覆盖'}</span><button class="text-link" data-coverage-evidence="${row.id}">${row.id}</button></div><p>${escapeHTML(row.raw)}</p><small>${escapeHTML(row.reason)}${row.matched?` 匹配片段：${escapeHTML(row.matched)}`:''}</small></article>`).join('')}</details>`:'<p class="coverage-placeholder">点击覆盖检查，查看当前规则对各条原文的匹配。修改后需重新检查。</p>';
  document.querySelectorAll('[data-coverage-evidence]').forEach(button=>button.addEventListener('click',()=>openOptimizationTrace([button.dataset.coverageEvidence])));
  $('#saved-optimization-draft').innerHTML=session.savedDraft?draftSummary(session.savedDraft,optimizationIssue(),session):'';
  bindSemanticTemplateDelivery($('#saved-optimization-draft'));

}
function saveOptimizationDraft(){
  refreshIssueAnalysis();const session=optimizationSession(),issue=optimizationIssue();
  if(!optimizationCurrent()){state.page='optimization';render();notify('来源已变化，请重新确认优化方向');return;}
  try{validateOptimizationRule(session);}catch(error){notify(error.message);return;}
  if(!selectedExpressions(session,'object').length)return;
  const count=expressionCounts(session);
  session.savedDraft={issueId:issue.id,issueName:issue.name,issueInfo:{id:issue.id,name:issue.name,module:issue.module,object:issue.object,intent:issue.intent,manifestation:issue.manifestation},template:JSON.parse(JSON.stringify(window.DEMO_OPTIMIZATION.semanticTemplate)),objectValues:selectedExpressions(session,'object').map(item=>item.text.trim()),type:'语料泛化',sourceKey:optimizationSourceKey(issue),evidence:optimizationEvidence().map(item=>({id:item.id,raw:item.raw})),expressions:session.expressions.map(item=>({...item,sourceIds:expressionSources(item.text)})),confirmedCount:count.selected,pendingCount:count.pending,rule:session.rule,slotName:session.slotName,slotValues:selectedExpressions(session,'action').map(item=>item.text.trim()),coverage:session.coverage?JSON.parse(JSON.stringify(session.coverage)):null,revision:session.revision,status:'优化草稿'};
  updateOptimizationControls();$('#saved-optimization-draft').scrollIntoView({behavior:'smooth',block:'start'});notify('已保存为优化草稿，当前所选表达和候选规则已由 PM 确认');
}
function draftSummary(draft,issue,session){
  const stale=draft.sourceKey!==optimizationSourceKey(issue),edited=session&&session.revision!==draft.revision;
  return `<section class="card saved-draft"><header><div><span class="eyebrow">SAVED DRAFT</span><h2>优化草稿</h2></div><span class="badge badge-pm">${draft.status}</span></header>${stale?'<p class="optimization-warning">来源已变更，需重新审核并保存草稿。</p>':edited?'<p class="optimization-warning">当前有未保存修改，下方为上次保存的草稿。</p>':''}<dl>${[['优化类型',draft.type],['来源 Issue',draft.issueName],['Evidence',`${draft.evidence.length} 条`],['PM 已确认表达',`${draft.confirmedCount} 个`],['待确认表达',`${draft.pendingCount} 个`]].map(([key,value])=>`<div><dt>${key}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl><label>Candidate Rule</label><pre>${escapeHTML(draft.rule)}</pre><p class="optimization-note">槽位：${escapeHTML(draft.slotName)} · ${escapeHTML(draft.slotValues.join(' / '))}</p><p class="optimization-note">Demo Candidate Rule · 仅保存当前演示内存，刷新清空。</p>${semanticTemplateDelivery(draft,issue,session)}</section>`;
}
function openOptimizationTrace(ids,expression=''){
  const items=ids.map(findFeedback).filter(Boolean);if(!items.length)return;
  const dialog=document.createElement('dialog');dialog.className='similar-dialog optimization-trace';dialog.setAttribute('aria-labelledby','optimization-trace-title');
  dialog.innerHTML=`<header class="similar-header"><div><div class="eyebrow">TRACEABLE EVIDENCE</div><h2 id="optimization-trace-title">${expression?`表达来源：${escapeHTML(expression)}`:'原始 Feedback'}</h2><p>${items.length} 条完整原文 · Evidence 不改写</p></div><button class="icon-btn" aria-label="关闭原始 Feedback">${icon('close')}</button></header><div class="candidate-scroll">${items.map(item=>`<article class="issue-evidence-card"><header><span class="detail-id">${item.id}</span><span>${escapeHTML(item.source)}</span></header><blockquote>${escapeHTML(item.raw)}</blockquote><div class="issue-evidence-context">车型：${escapeHTML(item.model)} · 版本：${escapeHTML(item.version)} · 日期：${escapeHTML(item.date)}</div><p class="optimization-note">AI 初始判断（Mock）：${escapeHTML(item.ai.object)} / ${escapeHTML(item.ai.intent||'待确认')} / ${escapeHTML(typeLabel(item.ai.type))}</p><p class="optimization-note">PM 当前审核：${escapeHTML(item.current.object)} / ${escapeHTML(item.current.intent||'待确认')} / ${escapeHTML(reviewTypeLabel(item))}</p></article>`).join('')}</div><footer class="similar-footer"><p class="optimization-note">Every insight must be traceable to evidence.</p><button class="btn" id="close-optimization-trace">返回工作台</button></footer>`;
  document.body.append(dialog);$('.icon-btn',dialog).addEventListener('click',()=>dialog.close());$('#close-optimization-trace',dialog).addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
}
