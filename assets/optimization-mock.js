'use strict';
// 第三阶段独立 Mock：只引用现有 Feedback 原文，不扩写或替换 Evidence。
window.DEMO_OPTIMIZATION = {
  issueId:'ISS-001', module:'车窗', object:'副驾车窗', intent:'微开 / 部分开启', manifestation:'未响应 / 未执行',
  recommendation:'generalization',
  semanticTemplate:{
    functionalName:'副驾车窗微开',
    // 按 PM 提供的 operation / service / semantic.slots 结构改写的 Demo 示例。
    suggestedSemantic:{operation:'SET',service:'windowControl',semantic:{slots:{windowPosition:'副驾',windowAction:'微开'}}},
    protocolNote:'Fictional demo schema, not derived from production configuration. 建议语义为 Demo 协议示例；字段及取值需平台确认。',
  },
  reason:'当前问题集中在同一已有车窗控制意图，但多种自然表达未被稳定支持，建议优先检查是否需要扩充该意图下的语料覆盖。',
  verification:['已存在“副驾车窗控制”能力','已存在对应语义意图','Demo Mock：已确认属于已有能力'],
  defaultObjects:['副驾窗','副驾驶窗','右前窗','副驾玻璃'],
  objects:['副驾窗','副驾驶窗','右前窗','副驾玻璃','右边前面的玻璃','副驾驶窗户','副驾那块玻璃','右前边窗户','副驾驶那侧','右前玻璃'],
  uncertainObjects:['旁边那个窗','旁边窗户'],
  defaultActions:['开一点','降一点','留条缝','开个小口','放下来一点','降一小截'],
  actions:['开一点','降一点','留条缝','开个小口','放下来一点','降一小截','留一点缝','放一小截','降下来一些','开个小缝'],
  optional:[], // 默认展示简洁规则；礼貌词可由 PM 在更多规则设置中添加。
  riskReason:'该表达依赖当前座位 / 对话上下文，直接泛化可能产生歧义。',
};
window.OPTIMIZATION_TYPES = [
  {id:'generalization',label:'语料泛化',description:'已有功能存在，补充真实表达的覆盖。'},
  {id:'customization',label:'语义定制',description:'新增功能，需确认是否缺少对应语义能力。'},
  {id:'conflict',label:'语义拆分 / 冲突处理',description:'检查表达被匹配到其他功能的情况。'},
  {id:'recognition',label:'识别优化',description:'需结合音频与转写核对识别偏差。'},
  {id:'defer',label:'暂不处理',description:'保留 Issue，稍后再判断优化方向。'},
];
