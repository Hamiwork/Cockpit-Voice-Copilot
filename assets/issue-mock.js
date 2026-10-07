'use strict';
// Demo data / Mock AI output: public portfolio examples, not production records.
// 第二阶段固定 Demo Result。仅描述功能对象、用户意图、异常表现，不推断技术根因。
// sourceIds 指向原有 28 条材料；运行时通过原文匹配当前批次，再引用实际 Feedback ID。
window.DEMO_ISSUE_MODULES = ['车窗', '空调', '导航', '音乐', '座椅加热', '天窗'];
window.DEMO_PRODUCT_ISSUES = [
  {id:'ISS-001', module:'车窗', name:'副驾车窗微开指令无响应', object:'副驾车窗', intent:'微开 / 部分开启', manifestation:'未响应 / 未执行', sourceIds:['FB-015','FB-016','FB-017','FB-018','FB-019','FB-020','FB-021','FB-022','FB-023','FB-024','FB-025','FB-026']},
  {id:'ISS-002', module:'车窗', name:'副驾车窗开启误执行为主驾', object:'副驾车窗', intent:'开启', manifestation:'误执行为主驾车窗开启', sourceIds:['FB-011']},
  {id:'ISS-003', module:'车窗', name:'全部车窗关闭时右后车窗未执行', object:'全部车窗', intent:'全部关闭', manifestation:'右后车窗未关闭', sourceIds:['FB-012']},
  {id:'ISS-004', module:'空调', name:'空调温度参数识别错误', object:'空调温度', intent:'设置为 24 度', manifestation:'误设置为 20 度', sourceIds:['FB-002']},
  {id:'ISS-005', module:'空调', name:'副驾温控误作用于主驾', object:'副驾空调温度', intent:'调高温度', manifestation:'主驾温度被改变', sourceIds:['FB-004']},
  {id:'ISS-006', module:'空调', name:'关闭空调回复与实际执行不一致', object:'空调', intent:'关闭', manifestation:'回复已关闭，但仍在送风', sourceIds:['FB-003']},
  {id:'ISS-007', module:'空调', name:'开启新风指令未执行', object:'空调新风', intent:'开启新风', manifestation:'空调状态未变化', sourceIds:['FB-014']},
  {id:'ISS-008', module:'导航', name:'导航目的地识别错误', object:'导航目的地', intent:'导航去上海虹桥站', manifestation:'导航到了虹桥机场', sourceIds:['FB-005']},
  {id:'ISS-009', module:'导航', name:'取消导航指令未执行', object:'导航', intent:'取消导航', manifestation:'仍在播报路线', sourceIds:['FB-006']},
  {id:'ISS-010', module:'导航', name:'“导航回家”指令无响应', object:'导航', intent:'导航回家', manifestation:'未响应', sourceIds:['FB-007']},
  {id:'ISS-011', module:'音乐', name:'歌手名称识别错误', object:'音乐歌手', intent:'播放五月天', manifestation:'播放了五条人', sourceIds:['FB-008']},
  {id:'ISS-012', module:'音乐', name:'“下一首”指令未执行', object:'音乐', intent:'切换下一首', manifestation:'页面有反应，但歌曲未切换', sourceIds:['FB-009']},
  {id:'ISS-013', module:'音乐', name:'暂停音乐指令未执行', object:'音乐', intent:'暂停播放', manifestation:'歌曲仍在播放', sourceIds:['FB-010']},
  {id:'ISS-014', module:'座椅加热', name:'主驾座椅加热误执行为副驾', object:'主驾座椅加热', intent:'开启', manifestation:'副驾座椅加热被开启', sourceIds:['FB-001']},
  {id:'ISS-015', module:'天窗', name:'开启天窗误执行为开启遮阳帘', object:'天窗', intent:'开启', manifestation:'仅遮阳帘被开启', sourceIds:['FB-013']},
];
