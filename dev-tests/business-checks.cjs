// 无依赖的业务回归检查；真实交互和视觉仍在浏览器中验证。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
function element(){return {value:'',innerHTML:'',textContent:'',disabled:false,hidden:false,checked:false,scrollTop:0,open:false,dataset:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},setAttribute(){},setCustomValidity(){},append(){},remove(){},focus(){},close(){this.open=false;},showModal(){this.open=true;},querySelector(){return element();},querySelectorAll(){return [];},replaceChildren(){},scrollIntoView(){},getBoundingClientRect(){return {left:0,right:1000};}};}
const document={querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);},querySelectorAll(){return [];},createElement(){return element();},body:element(),addEventListener(){}};
const context=vm.createContext({console,document,Intl,Date,Map,Set,JSON,RegExp,TextEncoder,setTimeout:callback=>{callback();return 1;},clearTimeout(){},requestAnimationFrame(){return 1;},cancelAnimationFrame(){}});
context.window=context;context.addEventListener=()=>{};
const root=path.resolve(__dirname,'..');
for(const file of ['mock-data.js','preparation.js','issue-mock.js','issue-analysis.js','optimization-mock.js','optimization.js','semantic-template-base.js','semantic-export.js','app.js']){let code=fs.readFileSync(path.join(root,'assets',file),'utf8');if(file==='app.js')code=code.replace(/render\(\);\s*$/,'');vm.runInContext(code,context,{filename:file});}
const run=code=>vm.runInContext(code,context);
run('render=()=>{};reviewPage=()=>{};issueAnalysisPage=()=>{};updateDetailActions=()=>{};updateIssueDetailActions=()=>{};updateOptimizationControls=()=>{};notify=()=>{};');
(async()=>{
  await run("state.text=DEMO_FEEDBACK.map(item=>'【'+item.source+'】'+item.raw).join('\\n');state.demo=true;startRecognition()");
  assert.equal(run('state.feedback.length'),28);
  assert.equal(run("state.feedback.filter(item=>item.disposition==='pending'&&!needsConfirmation(item)).length"),14);
  const original=run('JSON.stringify(state.feedback.map(item=>[item.raw,item.ai,item.remembered]))');
  // 第一阶段：单条修正、默认未选的相似候选、仅应用所选，记住仍独立。
  run("detailSession={id:'FB-015',draft:{...findFeedback('FB-015').current,object:'车窗',intent:'小幅打开副驾车窗'},rememberChecked:false};saveCurrent()");
  run("similarSession={selected:new Set(['FB-016']),ids:['FB-016','FB-017'],correction:{...findFeedback('FB-015').current},origin:'FB-015',typeChanged:false};applySelected()");
  assert.equal(run("findFeedback('FB-016').pmConfirmed"),true);
  assert.equal(run("findFeedback('FB-017').pmConfirmed"),false);
  assert.equal(run('JSON.stringify(state.feedback.map(item=>[item.raw,item.ai,item.remembered]))'),original);
  run('detailSession=null;applyPendingWindowReview();refreshIssueAnalysis();issueAnalysisState.analyzed=true;');
  assert.equal(run('issueEligibleFeedback().length'),26);
  assert.equal(run('issueAnalysisState.issues.length'),15);
  assert.equal(run("findIssue('ISS-001').evidenceIds.length"),12);
  assert.equal(run("canEnterOptimization(findIssue('ISS-001'))"),false);
  // Issue 分区和全局完成门槛：模块筛选不能绕过其他模块的待确认项。
  assert.equal(run('issueReviewGroups().pending.length'),15);
  assert.equal(run('issueReviewGroups().confirmed.length'),0);
  assert.equal(run('completeIssueAnalysis()'),false);
  assert.equal(run('optimizationState.activeId'),null);
  run("issueAnalysisState.module='车窗';visibleIssues().forEach(issue=>issue.confirmed=true)");
  assert.equal(run('issueReviewGroups().pending.length'),0);
  assert.equal(run('issueReviewGroups().confirmed.length'),3);
  assert.equal(run('canCompleteIssueAnalysis()'),false);
  run('issueAnalysisState.issues.forEach(issue=>issue.confirmed=true);issueAnalysisState.issues.at(-1).confirmed=false');
  assert.equal(run('completeIssueAnalysis()'),false);
  run('issueAnalysisState.issues.at(-1).confirmed=true');
  assert.equal(run('canCompleteIssueAnalysis()'),true);
  assert.equal(run('completeIssueAnalysis()'),true);
  assert.equal(run('state.page'),'optimization');
  assert.equal(run('optimizationState.activeId'),'ISS-001');
  run('resetOptimization();issueAnalysisState.module="all";state.page="issues"');
  // 第二阶段：归属变化与确认门槛、独立的 PM 定义。
  run("findIssue('ISS-001').confirmed=true;assignIssueEvidence('FB-018','ISS-002')");
  assert.equal(run("findIssue('ISS-001').confirmed"),false);
  assert.equal(run("findIssue('ISS-001').evidenceIds.length"),11);
  assert.equal(run('canCompleteIssueAnalysis()'),false);
  assert.equal(run('issueReviewGroups().pending.length'),2);
  run("assignIssueEvidence('FB-018','ISS-001');findIssue('ISS-001').confirmed=true;optimizationState.activeId='ISS-001';optimizationState.sessions.set('ISS-001',makeOptimizationSession(findIssue('ISS-001')));optimizationSession().accepted=true;optimizationSession().rule=generateOptimizationRule(optimizationSession());");
  assert.equal(run('optimizationCurrent()'),true);
  assert.equal(run('optimizationSession().expressions.filter(item=>item.risk&&item.selected).length'),0);
  // 默认四个对象 + 六个动作，复杂原文表达按需加入，两个指代始终默认未选。
  assert.equal(run('optimizationSession().rule'),'(副驾窗|副驾驶窗|右前窗|副驾玻璃)<微开动作>');
  assert.equal(run('optimizationSession().optional'),'');
  assert.equal(run('JSON.stringify(selectedExpressions(optimizationSession(),"action").map(item=>item.text))'),JSON.stringify(['开一点','降一点','留条缝','开个小口','放下来一点','降一小截']));
  assert.equal(run('expressionCounts(optimizationSession()).selected'),10);
  assert.equal(run('expressionCounts(optimizationSession()).pending'),2);
  // 模板仅读取已保存的审核快照；未保存编辑不得导出旧结果。
  const beforeExportChecks=run('JSON.stringify(optimizationSession())');
  assert.equal(run('semanticTemplateExportState(optimizationSession().savedDraft,optimizationIssue()).ready'),false);
  run('saveOptimizationDraft()');
  assert.equal(run('semanticTemplateExportState(optimizationSession().savedDraft,optimizationIssue()).ready'),true);
  const template=JSON.parse(run('JSON.stringify(semanticTemplateData(optimizationSession().savedDraft))'));
  assert.deepEqual(template.semanticRow.slice(0,6),['车窗','副驾车窗','副驾车窗微开','云端+本地','全场景','为“副驾车窗微开”的泛化，泛化到“副驾车窗微开”语义']);
  assert.equal(template.semanticRow[6],'(副驾窗|副驾驶窗|右前窗|副驾玻璃)<微开动作>');
  assert.equal(template.semanticRow[7],run('optimizationEvidence().map(item=>item.raw).join("\\n")'));
  assert.deepEqual(JSON.parse(template.semanticRow[8]),{operation:'SET',service:'windowControl',semantic:{slots:{windowPosition:'副驾',windowAction:'微开'}}});
  assert.match(template.notes.join('\n'),/Demo 协议示例/);
  assert.match(template.notes.join('\n'),/Fictional demo schema, not derived from production configuration\./);
  assert.match(template.notes.join('\n'),/Demo data \/ Mock AI output/);
  // 协议示例也属于已保存快照，不能被后续 Mock 配置修改覆盖。
  run("window.DEMO_OPTIMIZATION.semanticTemplate.suggestedSemantic.service='changedAfterSave'");
  assert.equal(JSON.parse(run('semanticTemplateData(optimizationSession().savedDraft).semanticRow[8]')).service,'windowControl');
  run("window.DEMO_OPTIMIZATION.semanticTemplate.suggestedSemantic.service='windowControl'");
  assert.deepEqual(template.slotRows.map(row=>row[1]),['开一点','降一点','留条缝','开个小口','放下来一点','降一小截']);
  const defaultBytes=Buffer.from(run('semanticTemplateBytes(optimizationSession().savedDraft)'));
  function readStoredWorkbook(bytes){
    const parts={};let offset=0;
    while(bytes.readUInt32LE(offset)===0x04034b50){
      assert.equal(bytes.readUInt16LE(offset+8),0);
      const length=bytes.readUInt32LE(offset+18),nameLength=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),start=offset+30+nameLength+extra;
      parts[bytes.subarray(offset+30,offset+30+nameLength).toString('utf8')]=bytes.subarray(start,start+length).toString('utf8');offset=start+length;
    }
    assert.equal(bytes.readUInt32LE(offset),0x02014b50);return parts;
  }
  const defaultParts=readStoredWorkbook(defaultBytes);
  assert.match(defaultParts['xl/workbook.xml'],/语义定制/);
  assert.match(defaultParts['xl/workbook.xml'],/槽位/);
  assert.equal(Object.keys(defaultParts).filter(name=>name.startsWith('xl/worksheets/')).length,2);
  assert.match(defaultParts['xl/worksheets/sheet1.xml'],/副驾车窗/);
  assert.match(defaultParts['xl/worksheets/sheet1.xml'],/windowControl/);
  assert.doesNotMatch(defaultParts['xl/worksheets/sheet1.xml'],/airControl|airflowDirection|待平台协议确认/);
  assert.match(defaultParts['xl/worksheets/sheet2.xml'],/Demo Template · Not connected to production system/);
  // 删除后必须先保存，导出的槽位 Sheet 不残留旧动作。
  run("optimizationSession().expressions=optimizationSession().expressions.filter(item=>item.text!=='开个小口');syncOptimizationRule(optimizationSession())");
  assert.equal(run('semanticTemplateExportState(optimizationSession().savedDraft,optimizationIssue()).ready'),false);
  run('saveOptimizationDraft()');
  const deletedParts=readStoredWorkbook(Buffer.from(run('semanticTemplateBytes(optimizationSession().savedDraft)')));
  assert.doesNotMatch(deletedParts['xl/worksheets/sheet2.xml'],/开个小口/);
  assert.equal(run('semanticTemplateData(optimizationSession().savedDraft).slotRows.length'),5);
  // PM 新增并选择后保存，槽位名 / 动作 / 规则均来自新快照。
  run("optimizationSession().expressions.push({id:'EXP-EXPORT-PM',kind:'action',text:'放下一点点',originalText:'放下一点点',origin:'pm',risk:false,selected:true,sourceIds:[]});optimizationSession().slotName='部分开启动作';syncOptimizationRule(optimizationSession());saveOptimizationDraft()");
  const addedParts=readStoredWorkbook(Buffer.from(run('semanticTemplateBytes(optimizationSession().savedDraft)')));
  assert.match(addedParts['xl/worksheets/sheet2.xml'],/放下一点点/);
  assert.match(addedParts['xl/worksheets/sheet2.xml'],/部分开启动作/);
  assert.doesNotMatch(addedParts['xl/worksheets/sheet2.xml'],/开个小口/);
  assert.match(addedParts['xl/worksheets/sheet1.xml'],/&lt;部分开启动作&gt;/);
  const evidenceBefore=run('JSON.stringify(optimizationIssue().evidenceIds)');
  run('optimizationIssue().evidenceIds.pop()');
  assert.equal(run('semanticTemplateExportState(optimizationSession().savedDraft,optimizationIssue()).ready'),false);
  run('optimizationIssue().evidenceIds=JSON.parse('+JSON.stringify(evidenceBefore)+')');
  // 任意 XML 特殊字符、换行和以 = 开始的字串都按文本存储，原文不改写。
  assert.match(run('semanticXmlCell("A2","=测试<&\\n原文",8)'),/t="inlineStr"/);
  assert.match(run('semanticXmlCell("A2","=测试<&\\n原文",8)'),/=测试&lt;&amp;\n原文/);

  run('optimizationState.sessions.set("ISS-001",JSON.parse('+JSON.stringify(beforeExportChecks)+'))');

  assert.equal(run('optimizationSession().expressions.every(item=>item.sourceIds.every(id=>findFeedback(id).raw.includes(item.text))&&(item.sourceIds.length>0||item.origin==="demo"))'),true);
  assert.equal(run('optimizationSession().expressions.filter(item=>!item.sourceIds.length).length'),1);
  assert.equal(run('expressionWithoutSourceLabel(optimizationSession().expressions.find(item=>item.text==="降一小截"))'),'Demo 补充候选 · 原文无直接匹配');
  assert.equal(run('optimizationCoverage(optimizationSession(),optimizationIssue()).filter(row=>row.status==="covered").length'),1);
  assert.equal(run('optimizationCoverage(optimizationSession(),optimizationIssue()).filter(row=>row.status==="needs-review").length'),2);
  // 确认歧义对象不等于覆盖原句：礼貌词需由 PM 主动加到规则中。
  run("optimizationSession().expressions.find(item=>item.text==='旁边那个窗').selected=true;syncOptimizationRule(optimizationSession())");
  assert.equal(run('optimizationCoverage(optimizationSession(),optimizationIssue()).find(row=>row.id==="FB-018").status'),'uncovered');
  assert.equal(run('optimizationCoverage(optimizationSession(),optimizationIssue()).find(row=>row.id==="FB-024").status'),'needs-review');
  run("optimizationSession().optional='给我|帮我';syncOptimizationRule(optimizationSession())");
  assert.equal(run('optimizationCoverage(optimizationSession(),optimizationIssue()).filter(row=>row.status==="covered").length'),3);
  // 取消对象 / 动作会减少实际匹配，手动规则不得保留未确认对象。
  run("optimizationSession().expressions.find(item=>item.text==='副驾驶窗').selected=false;syncOptimizationRule(optimizationSession())");
  assert.equal(run('optimizationCoverage(optimizationSession(),optimizationIssue()).find(row=>row.id==="FB-021").status'),'uncovered');
  run("optimizationSession().manualRule=true;optimizationSession().rule='(副驾驶窗)<微开动作>'");
  assert.throws(()=>run('validateOptimizationRule(optimizationSession())'),/规则中的对象需/);
  run("optimizationSession().expressions.find(item=>item.text==='副驾驶窗').selected=true;optimizationSession().manualRule=false;syncOptimizationRule(optimizationSession());optimizationSession().expressions.find(item=>item.text==='留条缝').selected=false;syncOptimizationRule(optimizationSession())");
  assert.equal(run('optimizationCoverage(optimizationSession(),optimizationIssue()).find(row=>row.id==="FB-015").status'),'uncovered');
  assert.throws(()=>run("compileCandidateRule('(副驾窗)<未知>','微开动作',['开一点'])"),/未定义槽位/);
  assert.throws(()=>run("compileCandidateRule('(副驾窗','微开动作',['开一点'])"),/未闭合/);
  assert.throws(()=>run("compileCandidateRule('(副驾窗)<微开动作>','微开动作',[])"),/至少保留/);
  assert.equal(run("compileCandidateRule('(a.b)[请]<微开动作>','微开动作',['开一点']).test('axb开一点')"),false);
  // 手工修订、独立保存快照和来源变更失效。
  run("optimizationSession().slotName='小幅开启';optimizationSession().rule=generateOptimizationRule(optimizationSession());optimizationSession().coverage={revision:optimizationSession().revision,rows:optimizationCoverage(optimizationSession(),optimizationIssue())};saveOptimizationDraft()");
  assert.equal(run('optimizationSession().savedDraft.status'),'优化草稿');
  assert.equal(run('optimizationSession().savedDraft.evidence.length'),12);
  assert.equal(run('optimizationSession().savedDraft.rule'),run('optimizationSession().rule'));
  const saved=run('JSON.stringify(optimizationSession().savedDraft)');
  run("optimizationSession().expressions[0].text='PM 新表达';invalidateOptimization(optimizationSession())");
  assert.equal(run('optimizationSession().coverage'),null);
  assert.equal(run('JSON.stringify(optimizationSession().savedDraft)'),saved);
  run("findIssue('ISS-001').name='PM 更名后的车窗 Issue'");
  assert.equal(run('optimizationCurrent()'),false);
  run("optimizationState.sessions.set('ISS-001',makeOptimizationSession(findIssue('ISS-001'),optimizationSession()))");
  assert.equal(run('JSON.stringify(optimizationSession().savedDraft)'),saved);
  assert.equal(run('supportsOptimizationMock(optimizationIssue())'),true);
  run("findIssue('ISS-001').object='其他对象'");
  assert.equal(run('supportsOptimizationMock(optimizationIssue())'),false);
  // 只影响阶段三，Feedback 原文、AI 初始值、独立记住记录保持原样。
  assert.equal(run('JSON.stringify(state.feedback.map(item=>[item.raw,item.ai,item.remembered]))'),original);
  run('resetOptimization()');assert.equal(run('optimizationState.sessions.size'),0);
  console.log('Phase 1–3 business checks passed: pending/confirmed groups, global completion and optimization handoff, evidence preservation, explicit decisions, simple rule defaults, explicit supplemental candidates and literal coverage, editable rules, draft snapshots, source invalidation and reset.');
})().catch(error=>{console.error(error);process.exitCode=1;});
