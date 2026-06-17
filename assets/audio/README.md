# 音频素材放这里

游戏**无需任何音频文件也能玩**：音效会用 WebAudio 合成发声。放入下面的文件后会**自动优先使用文件**。

## 背景音乐（可选，放了就循环播放）
- `bgm/theme.mp3` — 标题页 / 结局
- `bgm/class.mp3` — 教室主界面 / 商店 / 日志
- `bgm/chat.mp3` — 私聊 / 家访
- `bgm/ending.mp3` — 结局（不放则用 theme）

建议风格：民谣吉他 + 竹笛/口风琴小编制，暖、安静。循环段 1–2 分钟即可。

## 音效（可选，覆盖合成音）
放在 `sfx/` 下，文件名对应：`tap / coin / buy / up / down / talent / drop / win / toast / card / page`（`.mp3`）。
> 注：目前音效默认走合成，若要用文件需在 `index.html` 的 AUDIO 模块里把对应名字加载进 `sfxFiles`（告诉我，我来接）。

## 免费可商用素材源
- Pixabay（pixabay.com）、Mixkit（mixkit.co）— CC0 免署名
- Freesound（freesound.org）— 按 CC0 过滤
- 爱给网（aigei.com/music/cc）— 中国风民谣/竹笛
