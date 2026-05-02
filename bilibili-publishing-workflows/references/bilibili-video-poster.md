# Archived skill: bilibili-video-poster

> Migration note: this file preserves historical behavior and command examples. Canonical execution now uses `scripts/bilibili_publish_cli.py`; old `scripts/generate_bilibili_poster.py` commands are archive-only.

Original path: `/root/.hermes/skills/bilibili-video-poster/SKILL.md`

---

---
name: bilibili-video-poster
description: 输入 B站链接、分享文案或 BV/AV 号，自动提取视频基础信息与热门评论，生成 B 站解析长图海报，并支持导出 HTML / PNG。
---

# B站视频解析长图 Skill

这个技能用于把 B站视频链接、分享文案或 BV/AV 号解析成一张可直接发送的长图海报。

适用场景：
- 用户发来一个 B站链接，想直接出海报
- 用户贴一段 B站分享文案，想自动提取链接并生成海报
- 用户只给 BV / AV 号，也要能生成结果
- 用户要把海报直接发到当前飞书会话

---

## 输出目标

生成结果是一张“B站内容解析海报”，通常包含：
- B站品牌区与标题
- 视频基础信息
- 视频封面
- 评论摘要
- 本地生成的二维码
- 底部工具信息

支持输出：
- HTML
- PNG

---

## 触发条件

当用户说出类似内容时，优先使用本技能：
- “解析这个 B 站链接”
- “把这条 B 站视频做成海报”
- “生成 B 站分析图”
- “把这段分享文案处理一下”
- “BV1xx411c7mD 做成长图”

---

## 工作流

1. 提取输入中的视频标识
   - 支持 BV...
   - 支持 av...
   - 支持 b23.tv 短链
   - 支持完整分享文案

2. 标准化输入
   - 若是 b23.tv，先跟随跳转获取真实地址
   - 若是 av，转换或直接按 aid 读取元数据
   - 最终统一为可生成海报的数据结构

3. 抓取视频元数据
   - 标题
   - 封面
   - UP 主
   - 时长
   - 播放 / 弹幕 / 评论 / 点赞 / 投币 / 收藏等统计

4. 抓取热门评论
   - 默认取前 1~2 条
   - 抓不到时自动降级，不阻断海报生成

5. 准备本地素材
   - 本地二维码
   - 本地 logo
   - 字体子集化
   - 失败时使用兜底素材

6. 渲染 HTML 并导出 PNG

---

## 实现文件

按用途分组如下：

### 脚本

- scripts/extract_bilibili_url.py
  - 从消息中提取 B站链接或 BV / AV 号
- scripts/fetch_bilibili_meta.py
  - 获取视频元数据
- scripts/fetch_bilibili_comments.py
  - 获取热门评论
- scripts/prepare_poster_assets.py
  - 准备二维码、logo、字体等本地素材
- scripts/render_poster.py
  - 生成海报 HTML
- scripts/html_to_png.py
  - 将 HTML 截图为 PNG
- scripts/generate_bilibili_poster.py
  - 一键串起完整链路
- scripts/send_to_feishu_chat_image.py
  - 将生成的 PNG 发到当前飞书会话
- scripts/setup_env.sh
  - 安装项目依赖并安装 Chromium

### 测试

- tests/test_extract_bilibili_url.py
  - 提取链接 / BV / AV 的回归测试
- tests/test_fetch_bilibili_meta.py
  - 获取视频元数据的回归测试
- tests/test_fetch_bilibili_comments.py
  - 评论抓取的回归测试
- tests/test_render_poster.py
  - HTML 渲染回归测试
- tests/test_html_to_png.py
  - HTML 到 PNG 的回归测试
- tests/test_generate_bilibili_poster.py
  - 端到端生成海报回归测试
- tests/test_combined_robustness.py
  - 输入与流程鲁棒性回归测试
- tests/test_qr_regression.py
  - 二维码生成回归测试

### 配置

- pyproject.toml
  - Python 项目依赖与 uv 配置
- uv.lock
  - 锁定依赖版本

### 资源

- assets/fonts/NotoSansSC-Regular.ttf
- assets/fonts/NotoSansSC-Bold.ttf
- assets/fonts/ZCOOLXiaoWei-Regular.ttf
- assets/logo/bilibili-pink-logo.jpg

### 运行时缓存

- tests/__pycache__/*
  - 运行时生成缓存，可忽略

---

## 一键生成 PNG

### 方式 1：直接传 URL

```bash
cd SKILL_DIR
uv sync
uv run python scripts/generate_bilibili_poster.py \
  --url 'https://www.bilibili.com/video/BV1xx411c7mD' \
  --output /tmp/bilibili-poster.png
```

### 方式 2：传分享文案

```bash
cd SKILL_DIR
uv run python scripts/generate_bilibili_poster.py \
  --message '23.71 复制打开B站，看看【测试UP的作品】 https://www.bilibili.com/video/BV1xx411c7mD/?spm_id_from=333.999.0.0' \
  --output /tmp/bilibili-poster.png
```

### 方式 3：只给 BV / AV 文本

```bash
cd SKILL_DIR
uv run python scripts/generate_bilibili_poster.py \
  --message '帮我把 BV1xx411c7mD 做成长图海报' \
  --output /tmp/bilibili-poster.png
```

---

## 常用参数

- --view-json /path/to/view.json
  - 使用本地视频元数据 fixture
- --comment-json /path/to/comments.json
  - 使用本地评论 fixture
- --limit 2
  - 控制评论数量
- --keep-html
  - 保留中间 HTML 文件
- --width 1080 --height 2400
  - height 仅作为初始视口高度，最终 PNG 高度由 DOM 实际内容决定

---

## 发送到当前飞书会话

如果你已经知道当前会话的 chat_id，可以直接发送 PNG：

```bash
cd SKILL_DIR
uv run python scripts/send_to_feishu_chat_image.py \
  /tmp/bilibili-poster.png \
  oc_xxx_current_chat_id
```

注意：
- 优先使用 当前会话 chat_id
- 不要默认切到用户 open_id
- 某些情况下 open_id 会触发 open_id cross app

---

## 环境初始化

推荐使用 uv 管理整个项目：

```bash
cd SKILL_DIR
uv sync
uv run playwright install chromium
```

也可以直接执行仓库内脚本：

```bash
cd SKILL_DIR
bash scripts/setup_env.sh
```

---

## 渲染逻辑

海报 HTML 通常包含：
- 左上品牌区
- 视频摘要区
- 右侧二维码区
- 封面图
- 评论列表
- 底部工具信息

二维码和 logo 都是本地处理，避免依赖不稳定的外部服务。

当前 logo 资源路径：
- assets/logo/bilibili-pink-logo.jpg

若该资源不可用，脚本会回退到程序化生成的默认 logo。

---

## 数据结构示例

```json
{
  "title": "示例：B站视频解析结果",
  "type": "视频",
  "url": "https://www.bilibili.com/video/BV1xx411c7mD",
  "bvid": "BV1xx411c7mD",
  "owner_name": "示例UP主",
  "duration": "03:21",
  "comment_count": "2条",
  "danmaku_count": "114条",
  "cover": "https://...",
  "comments": [
    {
      "nickname": "By",
      "badge": "UP主回复过",
      "content": "这个视频讲得很清楚，建议收藏。",
      "time": "3天前",
      "ip_location": "广东",
      "reply_count": "114",
      "like_count": "1996",
      "avatar": "https://..."
    }
  ]
}
```

---

## 设计原则

- 保持和示例图一致的“解析海报”风格
- 信息优先，排版简洁
- 默认只发图片结果，少说废话
- 失败时尽量降级，不要整个流程中断
- 优先使用 uv 管理环境，避免旧 venv/pip 兼容残留

---

## 维护提示

如果后续你改动了 logo、二维码、渲染布局或发送逻辑，记得同步更新：
- 本文件的流程说明
- 示例字段
- 常用参数
- 可能的回退策略
- 命令与环境说明
