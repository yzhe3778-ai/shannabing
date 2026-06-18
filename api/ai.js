// 云雾 API (OpenAI 兼容) serverless 函数 · 私聊/家访/换位/状态文案生成
// Key 必须放环境变量 YUNWU_API_KEY，绝不写进前端。
// 前端任何失败/超时都会自动降级到本地模板，所以这里只管"尽力而为"。

const fs = require('fs');
const path = require('path');

const BASE = (process.env.YUNWU_BASE || 'https://yunwu.ai/v1').replace(/\/$/, '');
const MODEL = process.env.YUNWU_MODEL || 'gpt-4o-mini';
const API_TIMEOUT_MS = Number(process.env.YUNWU_TIMEOUT_MS || 12000);

const VOICE = `你在为一款乡村支教题材的叙事游戏《山那边》生成对白。
风格要求:生活化、有温度、靠潜台词和留白传情,绝不说教,绝不煽情。
主角是返乡支教的青年教师(玩家),当年是老校长老陈的学生。
只输出 JSON,不要任何解释或代码块标记。`;

const OUTCOME_TAGS = {
  chat: ['trust_built','pressure_relief','study_confidence','interest_rekindled','family_disclosure','discipline_focus','emotional_support','talent_seen'],
  visit: ['family_understood','burden_reduced','study_agreement','family_trust','resource_plan','child_voice']
};

function readPersona(id){
  if(!id || !/^[a-z0-9_-]+$/i.test(String(id))) return null;
  try {
    const file = path.join(__dirname, '..', 'data', 'personas', `${id}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function personaBlock(p){
  const persona = p.persona || readPersona(p.id);
  if(!persona) return '无独立人格知识库,只使用请求中的基础性格和家庭字段。';
  const compact = {
    id: persona.id,
    name: persona.name,
    role: persona.role,
    core: persona.core,
    surface: persona.surface,
    need: persona.need,
    fear: persona.fear,
    family: persona.family,
    talent: persona.talent,
    voice: persona.voice,
    relationship: persona.relationship,
    chatKnowledge: persona.chatKnowledge,
    visitKnowledge: persona.visitKnowledge,
    values: persona.values,
    memories: persona.memories,
    dialogueRules: persona.dialogueRules
  };
  return JSON.stringify(compact).slice(0, 3600);
}

function memoryBlock(p){
  const m = p.memory || {};
  return JSON.stringify({
    summary: m.summary || '',
    notes: Array.isArray(m.notes) ? m.notes.slice(-8) : [],
    interactions: Array.isArray(m.interactions) ? m.interactions.slice(-6) : []
  }).slice(0, 2600);
}

function dialogueBlock(p){
  return (p.dialogueLines || []).slice(-18)
    .map(x => `${x.speaker || '未知'}:${String(x.text || '').slice(0, 80)}`)
    .join('\n') || '暂无';
}

function isTeacherSpeaker(speaker){
  return /老师|周老师|主角/.test(String(speaker || ''));
}

function lineText(line){
  return String((line && (line.text || line.t)) || '').replace(/\s+/g, ' ').trim();
}

function oneNpcBubble(type, result, p){
  const raw = Array.isArray(result.lines) ? result.lines : [];
  const fallback = type === 'chat' ? p.name : (p.kind === 'chat' ? p.name : '家长');
  const npc = raw.filter(x => lineText(x) && !isTeacherSpeaker(x && x.speaker));
  const first = npc[0] || raw.find(x => lineText(x)) || {};
  let speaker = String(first.speaker || fallback || '家长').slice(0, 12);
  if(isTeacherSpeaker(speaker)) speaker = fallback || '家长';
  if(type === 'chat' || p.kind === 'chat') speaker = p.name || speaker;

  const sameSpeaker = npc.filter(x => String(x.speaker || speaker).slice(0, 12) === speaker);
  const source = sameSpeaker.length ? sameSpeaker : (npc.length ? [npc[0]] : [first]);
  const text = source.map(lineText).filter(Boolean).join(' ').slice(0, 180);
  result.lines = [{ speaker, text: text || '我听见了。' }];
  return result;
}

function sanitizeSwap(result, p){
  const a = (p && p.a) || {};
  const b = (p && p.b) || {};
  const names = [a.name, b.name].filter(Boolean).map(String);
  const raw = Array.isArray(result.lines) ? result.lines : [];
  result.lead = String(result.lead || `${a.name || '学生甲'} 和 ${b.name || '学生乙'} 换了座。`).replace(/\s+/g, ' ').trim().slice(0, 160);
  result.lines = raw.map((x, i) => {
    const fallbackSpeaker = names[i % Math.max(1, names.length)] || '学生';
    let speaker = String((x && x.speaker) || fallbackSpeaker).slice(0, 12);
    if(names.length && !names.includes(speaker)) speaker = fallbackSpeaker;
    return { speaker, text: lineText(x).slice(0, 100) };
  }).filter(x => x.text).slice(0, 4);
  if(result.lines.length < 2 && names.length === 2){
    result.lines = [
      { speaker: names[0], text: '以后咱俩一桌,有不会的就互相问。' },
      { speaker: names[1], text: '行。那这学期我们都别掉队。' }
    ];
  }
  delete result.opts;
  delete result.settlement;
  return result;
}

function sanitizeResult(type, result, p){
  if(!result || typeof result !== 'object') return result;
  if(result.teacherOpen) result.teacherOpen = String(result.teacherOpen).replace(/\s+/g, ' ').trim().slice(0, 140);
  if(type === 'swap') return sanitizeSwap(result, p || {});
  if(type === 'chat' || type === 'visit' || type === 'reply') result = oneNpcBubble(type, result, p || {});
  const lineLimit = type === 'chat' ? 1 : (type === 'visit' ? 1 : (type === 'reply' ? 1 : 0));
  if(lineLimit && Array.isArray(result.lines)) result.lines = result.lines.slice(0, lineLimit);
  if(Array.isArray(result.opts)) result.opts = result.opts.slice(0, 3);
  if(type === 'reply'){
    const kind = p && p.kind === 'visit' ? 'visit' : 'chat';
    const allowed = OUTCOME_TAGS[kind];
    const raw = result.settlement && typeof result.settlement === 'object' ? result.settlement : {};
    const outcomeTag = allowed.includes(raw.outcomeTag) ? raw.outcomeTag : allowed[0];
    result.settlement = {
      ready: !!raw.ready,
      outcomeTag,
      title: String(raw.title || '').slice(0, 24),
      teacherSummary: String(raw.teacherSummary || raw.summary || '').slice(0, 140),
      studentReaction: String(raw.studentReaction || '').slice(0, 120),
      profileUpdate: String(raw.profileUpdate || '').slice(0, 60),
      memoryNote: String(raw.memoryNote || result.memoryNote || '').slice(0, 60),
      memorySummary: String(raw.memorySummary || result.memorySummary || '').slice(0, 90)
    };
  }
  return result;
}

function buildPrompt(type, p){
	  if(type === 'chat'){
	    return `学生:${p.name}。性格:${p.per}。家庭:${p.family}。天赋方向:${p.talent||'未知'}。
当前学期:${p.term||1}。当前数值:信任${p.trust}/100,学习兴趣${p.interest}/10,学习${p.study||0}/100,压力${p.press||0}/100,家庭压迫${p.fam||0}/100。
最近班级日志:${(p.recentLog||[]).join('；')||'暂无'}。
该角色独立人格知识库:${personaBlock(p)}
该角色历史记忆:${memoryBlock(p)}
					请生成"老师私聊该学生"的文游式开场,后续会由玩家用选项或输入继续推进。
					要求:
					- 必须优先遵守该角色人格知识库,保持这个学生的说话方式、恐惧、需求和家庭处境。
					- 必须参考历史记忆,如果过去老师说过承诺或发生过事件,这次对白要自然延续,不要像第一次见面。
					- teacherOpen 是老师主动发起私聊的第一句话,要像班主任自然关心,不要太刻意。
					- lines 必须只有 1 个元素,只生成学生对老师开场后的回应,不要在 lines 里生成老师台词。
					- speaker 必须是"${p.name}"。
			- text 控制在 20~90 个汉字,可以包含 1~3 个短句,像真实聊天气泡。
			- 可使用知识库里的细节,也可补少量不冲突的生活细节;不要改写家庭设定和天赋设定。
			- 这个开场要给老师留下继续追问或安抚的空间,再给老师 3 个快捷回应选项(各16字内),顺序必须固定:
			  1. A 安慰:顺着学生的话共情、安抚压力;
			  2. B 施压:直接推动学生学习、带一点要求感;
			  3. C 干扰:话题跳脱、轻松意外,可以引到兴趣爱好。
			- 可选:给一句更新后的学生简介 newPer(20字内)。
				- 输出 memoryNote: 这段互动应该写入该角色长期记忆的一句话(30字内)。
				- 输出 memorySummary: 更新后的角色对老师关系摘要(40字内)。
				输出 JSON: {"teacherOpen":"老师开场","lines":[{"speaker":"${p.name}","text":"一条学生回应"}],"opts":[{"t":"A 安慰:..."},{"t":"B 施压:..."},{"t":"C 干扰:..."}],"newPer":"可选","memoryNote":"记忆点","memorySummary":"关系摘要"}`;
	  }
	  if(type === 'visit'){
	    return `家访学生:${p.name}。家庭矛盾:${p.family}。当前家庭压迫${p.fam}/100。
当前学期:${p.term||1}。当前数值:信任${p.trust||0}/100,学习${p.study||0}/100,压力${p.press||0}/100。
最近班级日志:${(p.recentLog||[]).join('；')||'暂无'}。
该角色独立人格知识库:${personaBlock(p)}
该角色历史记忆:${memoryBlock(p)}
				请生成"老师上门家访、与家长就孩子前途交谈"的文游式开场,后续会由玩家用选项或输入继续推进。
				要求:
				- 必须优先遵守该角色人格知识库,尤其是家庭矛盾、孩子恐惧、家访说服路径。
				- 必须参考历史记忆,延续此前老师与孩子/家庭的承诺和冲突。
				- teacherOpen 是老师上门说明来意的一句话,要具体、温和、有边界。
				- lines 必须只有 1 个元素,只生成对方对老师开场后的回应,不要在 lines 里生成老师台词。
				- speaker 只能使用"家长"或"${p.name}",开场优先用"家长"。
				- text 控制在 20~100 个汉字,可以包含 1~3 个短句,像真实聊天气泡。
				- 家长不是反派,要体现现实难处;老师不能空喊口号,要给具体办法。
				- 这个开场要给老师留下继续沟通的空间,再给老师 3 个快捷回应选项(各16字内)。
				- 输出 memoryNote: 这次家访应该写入该角色长期记忆的一句话(30字内)。
			- 输出 memorySummary: 更新后的家庭/师生关系摘要(40字内)。
			输出 JSON: {"teacherOpen":"老师开场","lines":[{"speaker":"家长","text":"一条家长或学生回应"}],"opts":[{"t":"选项1"},{"t":"选项2"},{"t":"选项3"}],"memoryNote":"记忆点","memorySummary":"关系摘要"}`;
	  }
	  if(type === 'reply'){
		    const speakerRule = p.kind === 'visit'
		      ? `speaker 只能使用"家长"或"${p.name}",根据玩家刚才问的是家长问题还是孩子问题选择一个最相关的人回应`
		      : `speaker 必须是"${p.name}"`;
		    const optExample = p.kind === 'visit'
		      ? `[{"t":"具体沟通行动1"},{"t":"具体沟通行动2"},{"t":"具体沟通行动3"}]`
		      : `[{"t":"A 安慰:..."},{"t":"B 施压:..."},{"t":"C 干扰:..."}]`;
	    return `你正在继续一段${p.kind==='visit'?'家访':'私聊'}互动。
角色:${p.name}。当前学期:${p.term||1}。当前数值:${JSON.stringify(p.stats||{})}。
该角色独立人格知识库:${personaBlock(p)}
该角色历史记忆:${memoryBlock(p)}
当前对话上下文:
${dialogueBlock(p)}

玩家刚刚让老师说:${p.playerText}

	这是一个类似 Gal Game/文游的对话推进系统。请根据角色人格、历史记忆和当前上下文,生成对方的一条自然回应,并判断这轮是否适合收束结算。
	要求:
	- lines 必须只有 1 个元素。
	- ${speakerRule},不要出现旁白,不要生成"老师"台词,不要替玩家继续说话。
	- 必须回应玩家刚刚输入的话,不能无视。
	- 如果历史记忆里有相关承诺、旧事、矛盾,要自然提到或体现。
	- text 控制在 20~140 个汉字,可以包含 1~4 个短句,但必须在同一个气泡里。
	- 结尾给 3 个可点击回应选项,各16字内;私聊时顺序必须固定为 A 安慰、B 施压、C 干扰;家访时给 3 个具体沟通行动。
	- settlement.ready 只有在话题已经自然收束、学生/家长态度有明确变化、或已经聊了几轮时才为 true。
	- settlement.outcomeTag 必须从这些标签里选择: ${(p.outcomeTags&&p.outcomeTags.length?p.outcomeTags:OUTCOME_TAGS[p.kind==='visit'?'visit':'chat']).join(', ')}。
	- 不要输出具体数值变化,数值由本地系统决定。
	- 输出 memoryNote: 这次自由输入互动应写入长期记忆的一句话(30字内)。
	- 输出 memorySummary: 更新后的关系摘要(40字内)。
	输出 JSON: {"lines":[{"speaker":"${p.kind==='visit'?'家长':p.name}","text":"一条对方回应"}],"opts":${optExample},"settlement":{"ready":false,"outcomeTag":"trust_built","title":"结算标题","teacherSummary":"老师总结话术","studentReaction":"学生或家长反应","profileUpdate":"档案更新","memoryNote":"记忆点","memorySummary":"关系摘要"},"memoryNote":"记忆点","memorySummary":"关系摘要","newPer":"可选"}`;
	  }
	  if(type === 'swap'){
	    const a = p.a || {};
	    const b = p.b || {};
	    return `你正在为乡村支教叙事游戏生成"换位后新同桌短对白"。
当前学期:${p.term||1}。
学生A:${a.name}。性格:${a.per}。标签:${a.tag}。家庭:${a.family}。当前数值:兴趣${a.interest}/10,学习${a.study}/100,压力${a.press}/100,信任${a.trust}/100。
学生A人格知识库:${personaBlock({id:a.id, persona:a.persona})}
学生A历史记忆:${memoryBlock({memory:a.memory})}
学生B:${b.name}。性格:${b.per}。标签:${b.tag}。家庭:${b.family}。当前数值:兴趣${b.interest}/10,学习${b.study}/100,压力${b.press}/100,信任${b.trust}/100。
学生B人格知识库:${personaBlock({id:b.id, persona:b.persona})}
学生B历史记忆:${memoryBlock({memory:b.memory})}
本地换位判断:${p.line||'新同桌慢慢熟了'}。
最近班级日志:${(p.recentLog||[]).join('；')||'暂无'}。

要求:
- 只写${a.name}和${b.name}之间的短对白,不要出现老师、旁白、数值、系统说明。
- 必须贴合两人的性格、家庭处境和当前关系,像刚换座后压低声音说的真话。
- 2 到 4 行,每行 12 到 45 个汉字;可以有停顿和口语,不要说教。
- 对白要自然带出"互相学习/重新有点兴趣"的感觉,但不要直说属性增加。
- speaker 只能是"${a.name}"或"${b.name}"。
输出 JSON: {"lead":"${a.name}和${b.name}换了座。","lines":[{"speaker":"${a.name}","text":"一句话"},{"speaker":"${b.name}","text":"一句话"}]}`;
	  }
	  if(type === 'status'){
    const list = (p.students||[]).map(s=>`${s.id}:${s.name}(性格:${s.per};家庭压迫${s.fam};压力${s.press};兴趣${s.interest};学习${s.study})`).join('；');
    return `为下列学生各写一句20字内的"当前状态"白描(贴合其数值与性格,含蓄、有画面感,不直接报数值):${list}。
输出 JSON,键为学生 id,值为状态文案: {"id1":"状态","id2":"状态",...}`;
  }
  return null;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'method' });
    if (!process.env.YUNWU_API_KEY) return res.status(200).json({ ok:false, error:'no_key' });

    const { type, payload } = req.body || {};
    const userPrompt = buildPrompt(type, payload || {});
    if (!userPrompt) return res.status(200).json({ ok:false, error:'bad_type' });

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), Math.max(1000, API_TIMEOUT_MS));
    let r;
    try {
      r = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.YUNWU_API_KEY}`, 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: MODEL,
          messages: [ { role:'system', content: VOICE }, { role:'user', content: userPrompt } ],
          temperature: 0.85,
          max_tokens: type === 'status' ? 500 : (type === 'swap' ? 700 : (type === 'reply' ? 1000 : 1200)),
          response_format: { type: 'json_object' }
        })
      });
    } catch (e) {
      if (e && e.name === 'AbortError') return res.status(200).json({ ok:false, error:'timeout' });
      throw e;
    } finally {
      clearTimeout(timeout);
    }
    if (!r.ok) return res.status(200).json({ ok:false, error:'upstream_'+r.status });

    const data = await r.json();
    const txt = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!txt) return res.status(200).json({ ok:false, error:'empty' });

    let result;
    try { result = JSON.parse(txt); }
    catch(e){ const m = txt.match(/\{[\s\S]*\}/); result = m ? JSON.parse(m[0]) : null; }
    if (!result) return res.status(200).json({ ok:false, error:'parse' });
    result = sanitizeResult(type, result, payload || {});

    return res.status(200).json({ ok:true, result });
  } catch (e) {
    return res.status(200).json({ ok:false, error:String(e && e.message || e) });
  }
};
