# 山那边 · 九学期版（v2）

返乡支教青年与老校长老陈一起，带一个班的 9 个山村孩子，用 9 个学期把他们尽量送出大山。

## 玩法一句话
养兴趣 → 灌学习 → 打工攒钱买道具 → 顾好每个孩子别辍学 → 9 学期后看几个走出大山（学习值 ≥ 70）。

## 本地试玩
直接双击打开 `index.html` 即可游玩（纯前端，零构建）。
> 本地双击时无服务端，私聊/家访会自动使用**本地模板对话**，游戏完整可玩。

如果要在本机测试 AI 私聊/家访，用内置开发服务器，不要用 `python3 -m http.server`：

```bash
cd /Users/ruoyu/Documents/GitHub/xueshen/山那边_v2
YUNWU_API_KEY=你的云雾Key node dev-server.js 8081
```

也可以把 Key 写入本目录 `.env.local`：

```bash
YUNWU_API_KEY=你的云雾Key
# 可选：YUNWU_MODEL=gpt-4o-mini
# 可选：YUNWU_BASE=https://api3.wlai.vip/v1
```

## 启用 AI（私聊/家访/状态文案动态生成）
AI 走云雾 API（OpenAI 兼容），Key 放服务端环境变量，**绝不写进前端**。

```bash
npm i -g vercel
vercel                       # 在本目录部署
vercel env add YUNWU_API_KEY # 填入你的云雾 Key（如 k-xxxx）
# 可选：vercel env add YUNWU_MODEL   （默认 gpt-4o-mini）
#       vercel env add YUNWU_BASE    （云雾可用 https://api3.wlai.vip/v1）
vercel --prod
```
部署后，私聊/家访会优先调 AI 生成对白；超时或失败 → 自动切回本地模板，玩家无感。

> ⚠️ 你之前在对话里贴过的 Key 已暴露，建议在云雾后台**重置一个新 Key** 再用。

## 文件结构
```
├── index.html      # 游戏主体：数据层 / 引擎层(reducer) / 界面层(React)，单文件
├── api/ai.js       # serverless：调云雾生成对白（chat/visit/status）
├── data/personas/  # 每个角色独立人格知识库，AI 私聊/家访会读取
├── dev-server.js   # 本地开发服务：静态文件 + /api/ai
├── vercel.json     # 部署配置
└── README.md
```

## 架构
- **数据层**：9 名学生、商店、任务卡、事件、私聊/家访本地模板——都是可编辑列表。
- **引擎层**：一个 reducer“总管” + 纯函数规则（学习兴趣公式、走出大山判定、辍学、结算），100% 本地、可单测。
- **界面层**：React 组件（教室拖拽换位、对话、吃金币小游戏、商店、班级日志、结算、结局）。
- **角色知识库**：每个角色一个 JSON 文件，记录说话方式、家庭矛盾、恐惧、需求、私聊/家访可用信息。
- **AI 层**：仅在“对话文本”这层帮忙，挂了就用本地模板；数值、选项效果和结局仍由本地 reducer 决定。

## 美术资产
当前角色头像为代码占位图。`Avatar` 组件预留替换位，后续可接入上传的立绘/QQ人。

## 数值
核心常量集中在 `index.html` 顶部 `window.GAME_DATA`（学期数、体力、走出线、辍学阈值、商店、任务卡等）。已通过蒙特卡洛平衡验证（见同级目录 `平衡模拟_sim9.js`）。
