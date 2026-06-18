# 音频素材

本目录放《山那边》的背景音乐与交互音效。当前版本已接入外部可复用素材，并保留 WebAudio 合成音作为兜底：如果文件加载失败，游戏仍可发声。

## 风格基准

- 整体：安静、留白、乡村支教题材，不做强电子/强商业广告感。
- 教室/商店/日志：轻快但不吵，保持 1998 年乡村学校的朴素感。
- 私聊/家访：匹配黑白漫画网点页，声音更冷、更薄、更像纸页与低饱和叙事。
- 结局：温暖、慢速、克制。

## BGM

4 段 BGM 均来自 OpenGameArt 的 `Short Loops Background Music Pack`，作者 hernandack，CC0。原始 OGG 已转为 MP3 以配合当前加载器。

| 文件 | 游戏场景 | 原始曲目 |
| --- | --- | --- |
| `bgm/theme.mp3` | 标题页 | `A Brand New Wisdom.ogg` |
| `bgm/class.mp3` | 教室 / 商店 / 日志 | `Swinging Sweet.ogg` |
| `bgm/chat.mp3` | 私聊 / 家访 | `Winter Dust.ogg` |
| `bgm/ending.mp3` | 结局 | `Just Saying Tho.ogg` |

来源: https://opengameart.org/content/short-loops-background-music-pack

## SFX

| 文件 | 用途 | 来源 |
| --- | --- | --- |
| `sfx/tap.mp3` | 通用按钮点击 | Mixkit `Select click` |
| `sfx/page.mp3` | 剧情/家访对白翻页 | Mixkit `Page turn single` |
| `sfx/card.mp3` | 任务卡选择 | Mixkit `Paper slide` |
| `sfx/coin.mp3` | 打工小游戏金币 | Mixkit `Winning a coin, video game` |
| `sfx/buy.mp3` | 商店购买 | Mixkit `Clinking coins` |
| `sfx/up.mp3` | 正向反馈 | Mixkit `Magic notification ring` |
| `sfx/down.mp3` | 负向反馈 | OpenGameArt `UI Sound Effects` / `negative_sound2.ogg` |
| `sfx/talent.mp3` | 天赋显现 | Mixkit `Fairy magic sparkle` |
| `sfx/drop.mp3` | 学期负面事件 | OpenGameArt Kenney Interface Sounds / `drop_004.ogg` |
| `sfx/win.mp3` | 好结局/成功 | Mixkit `Game success alert` |
| `sfx/toast.mp3` | 轻提示 | OpenGameArt Kenney Interface Sounds / `confirmation_001.ogg` |

Mixkit 声音来自 https://mixkit.co/free-sound-effects/ ，按 Mixkit Sound Effects Free License 使用。

OpenGameArt `UI Sound Effects`: https://opengameart.org/content/ui-sound-effects-button-clicks-user-feedback-notifications ，CC0。

OpenGameArt Kenney `Interface Sounds`: https://opengameart.org/content/interface-sounds ，CC0。

## 替换规则

同名覆盖即可替换素材。文件名不要改，代码会按固定路径加载：

- BGM: `assets/audio/bgm/{theme,class,chat,ending}.mp3`
- SFX: `assets/audio/sfx/{tap,page,card,coin,buy,up,down,talent,drop,win,toast}.mp3`

替换外部素材时，必须同时更新本文件的来源与授权说明。
