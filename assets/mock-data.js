'use strict';
// Demo data / Mock AI output: public portfolio examples, not production records.
// 28 条演示材料；第 28 条按 PM 要求替换为未出现过的已解决案例，来源在导入示例文本中明确展示。
// 问题类型按实际回复和执行表现分类；证据不足时留空，不将未响应推断为不回复。
// 第 03 条 Mock 标为提示语错误；7 条待处理及 1 条已解决案例明确执行了错误对象/内容，标为错误执行。
// 示例批次额外提供 PM 整理状态：其他模块已确认，车窗第 15–26 条待确认。
// 第 27 条已排除、第 28 条已解决；新粘贴文本不自动套用这些演示决定。
window.DEMO_FEEDBACK = [
  {
    "id": "FB-001",
    "source": "测试反馈",
    "raw": "说打开主驾座椅加热，结果开成了副驾",
    "utterance": "打开主驾座椅加热",
    "ai": {
      "status": "已识别",
      "object": "座椅加热",
      "intent": "主驾开启",
      "type": "错误执行"
    },
    "manifestation": "对象识别错误",
    "similarityGroup": null
  },
  {
    "id": "FB-002",
    "source": "用户评论",
    "raw": "空调调到二十四度，结果给我调成二十度",
    "utterance": "空调调到二十四度",
    "ai": {
      "status": "已识别",
      "object": "空调",
      "intent": "设置温度",
      "type": "错误执行"
    },
    "manifestation": "参数识别错误",
    "similarityGroup": null
  },
  {
    "id": "FB-003",
    "source": "实车走查",
    "raw": "说关闭空调，它回复已经关闭，但风还在吹",
    "utterance": "关闭空调",
    "ai": {
      "status": "已识别",
      "object": "空调",
      "intent": "关闭",
      "type": "提示语错误"
    },
    "manifestation": "回复与执行不一致",
    "similarityGroup": null
  },
  {
    "id": "FB-004",
    "source": "客服反馈",
    "raw": "用户说副驾温度调高一点，结果主驾温度变了",
    "utterance": "副驾温度调高一点",
    "ai": {
      "status": "已识别",
      "object": "空调",
      "intent": "副驾升温",
      "type": "错误执行"
    },
    "manifestation": "对象识别错误",
    "similarityGroup": null
  },
  {
    "id": "FB-005",
    "source": "用户评论",
    "raw": "导航去上海虹桥站，结果导到虹桥机场了",
    "utterance": "导航去上海虹桥站",
    "ai": {
      "status": "已识别",
      "object": "导航",
      "intent": "设置目的地",
      "type": "错误执行"
    },
    "manifestation": "地点识别错误",
    "similarityGroup": null
  },
  {
    "id": "FB-006",
    "source": "测试反馈",
    "raw": "说取消导航以后还一直播路线",
    "utterance": "取消导航",
    "ai": {
      "status": "已识别",
      "object": "导航",
      "intent": "取消导航",
      "type": ""
    },
    "manifestation": "执行异常",
    "similarityGroup": null
  },
  {
    "id": "FB-007",
    "source": "实车走查",
    "raw": "导航回家喊了两遍都没有反应",
    "utterance": "导航回家",
    "ai": {
      "status": "已识别",
      "object": "导航",
      "intent": "回家",
      "type": ""
    },
    "manifestation": "未响应",
    "similarityGroup": null
  },
  {
    "id": "FB-008",
    "source": "用户评论",
    "raw": "播放五月天，结果给我放了五条人",
    "utterance": "播放五月天",
    "ai": {
      "status": "已识别",
      "object": "音乐",
      "intent": "播放歌手",
      "type": "错误执行"
    },
    "manifestation": "内容识别错误",
    "similarityGroup": null
  },
  {
    "id": "FB-009",
    "source": "测试反馈",
    "raw": "说下一首，页面有反应但是歌曲没切换",
    "utterance": "下一首",
    "ai": {
      "status": "已识别",
      "object": "音乐",
      "intent": "下一首",
      "type": ""
    },
    "manifestation": "执行异常",
    "similarityGroup": null
  },
  {
    "id": "FB-010",
    "source": "客服反馈",
    "raw": "用户反馈暂停音乐以后歌曲还在继续播放",
    "utterance": "暂停音乐",
    "ai": {
      "status": "已识别",
      "object": "音乐",
      "intent": "暂停",
      "type": ""
    },
    "manifestation": "执行异常",
    "similarityGroup": null
  },
  {
    "id": "FB-011",
    "source": "实车走查",
    "raw": "打开副驾车窗，结果主驾车窗开了",
    "utterance": "打开副驾车窗",
    "ai": {
      "status": "已识别",
      "object": "车窗",
      "intent": "副驾开启",
      "type": "错误执行"
    },
    "manifestation": "对象识别错误",
    "similarityGroup": null
  },
  {
    "id": "FB-012",
    "source": "测试反馈",
    "raw": "关闭所有车窗以后右后车窗还是开着",
    "utterance": "关闭所有车窗",
    "ai": {
      "status": "已识别",
      "object": "车窗",
      "intent": "全部关闭",
      "type": ""
    },
    "manifestation": "执行异常",
    "similarityGroup": null
  },
  {
    "id": "FB-013",
    "source": "用户评论",
    "raw": "让它打开天窗，结果只把遮阳帘打开了",
    "utterance": "打开天窗",
    "ai": {
      "status": "已识别",
      "object": "天窗",
      "intent": "开启",
      "type": "错误执行"
    },
    "manifestation": "功能识别错误",
    "similarityGroup": null
  },
  {
    "id": "FB-014",
    "source": "实车走查",
    "raw": "说打开新风，空调状态完全没变化",
    "utterance": "打开新风",
    "ai": {
      "status": "已识别",
      "object": "空调",
      "intent": "开启新风",
      "type": ""
    },
    "manifestation": "执行异常",
    "similarityGroup": null
  },
  {
    "id": "FB-015",
    "source": "用户评论",
    "raw": "副驾窗给我留条缝，一直没反应",
    "utterance": "副驾窗给我留条缝",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未响应",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-016",
    "source": "测试反馈",
    "raw": "右边前面的玻璃降一点，没动",
    "utterance": "右边前面的玻璃降一点",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未响应",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-017",
    "source": "客服反馈",
    "raw": "用户说副驾驶窗户别全开，稍微开一点，但是没执行",
    "utterance": "副驾驶窗户别全开，稍微开一点",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未执行",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-018",
    "source": "实车走查",
    "raw": "旁边那个窗帮我开个小口，喊了两次都没用",
    "utterance": "旁边那个窗开个小口",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未响应",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-019",
    "source": "测试反馈",
    "raw": "右前窗往下降一点点，车机没反应",
    "utterance": "右前窗往下降一点点",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未响应",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-020",
    "source": "用户评论",
    "raw": "副驾那块玻璃放下来一点，说完完全没动作",
    "utterance": "副驾那块玻璃放下来一点",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未执行",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-021",
    "source": "实车走查",
    "raw": "副驾驶窗开一点就好，系统完全没动静",
    "utterance": "副驾驶窗开一点",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未响应",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-022",
    "source": "客服反馈",
    "raw": "用户让右前边窗户留一点缝，一直没反应",
    "utterance": "右前边窗户留一点缝",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未响应",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-023",
    "source": "测试反馈",
    "raw": "副驾玻璃往下放一小截，语音说完没动作",
    "utterance": "副驾玻璃往下放一小截",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未执行",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-024",
    "source": "用户评论",
    "raw": "旁边窗户稍微降下来一些，说了也不执行",
    "utterance": "旁边窗户稍微降下来一些",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未执行",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-025",
    "source": "实车走查",
    "raw": "副驾驶那侧不要关死，留条缝，没有反应",
    "utterance": "副驾驶那侧不要关死，留条缝",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未响应",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-026",
    "source": "测试反馈",
    "raw": "右前玻璃开个小缝，喊了之后完全没变化",
    "utterance": "右前玻璃开个小缝",
    "ai": {
      "status": "待确认",
      "object": "待确认",
      "intent": "",
      "type": ""
    },
    "manifestation": "未响应",
    "similarityGroup": "front-passenger-window"
  },
  {
    "id": "FB-027",
    "source": "用户评论",
    "raw": "那个帮我调一下，系统不知道调什么",
    "utterance": "那个帮我调一下",
    "ai": {
      "status": "待确认",
      "object": "无法判断",
      "intent": "",
      "type": ""
    },
    "manifestation": "无明确系统 Bug",
    "similarityGroup": null
  },
  {
    "id": "FB-028",
    "source": "测试反馈",
    "raw": "说把音乐播放模式设为顺序播放，结果切换成了单曲循环",
    "utterance": "把音乐播放模式设为顺序播放",
    "ai": {
      "status": "已识别",
      "object": "音乐",
      "intent": "设置顺序播放",
      "type": "错误执行"
    },
    "manifestation": "误切换为单曲循环",
    "similarityGroup": null
  }
];

// PM 已处理的 Demo 预设，独立于 AI 初始判断；不改写原始语料或补造问题类型。
window.DEMO_REVIEW_PRESET = {
  ...Object.fromEntries(window.DEMO_FEEDBACK.slice(0,14).map(item=>[item.id,{pmConfirmed:true}])),
  'FB-027':{disposition:'excluded',excludeReason:'用户表达缺少对象'},
  'FB-028':{disposition:'resolved',resolvedVersion:'V3.0.1'},
};
