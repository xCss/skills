# Archived skill: productivity/bilibili-video-poster-feishu-send

> Migration note: this file preserves historical Feishu delivery behavior. Poster generation now uses `scripts/bilibili_publish_cli.py`; old absolute Hermes script paths are archive-only.

Original path: `/root/.hermes/skills/productivity/bilibili-video-poster-feishu-send/SKILL.md`

---

---
name: bilibili-video-poster-feishu-send
category: productivity
description: Generate a Bilibili poster and send it to the current Feishu DM correctly using the image upload flow.
---

# B站海报生成并发送到飞书当前 DM

当用户给出 B 站链接、BV/AV 号或分享文案，并且要求“直接发给我/发到当前聊天”时使用本流程。

## 目标

1. 生成 B 站解析长图海报 PNG
2. 通过飞书图片专用链路发送到**当前 DM**，不要误发到群聊
3. 发送成功后只报告结果，不要再让用户手动提醒

## 关键判断

- **不要**把 `MEDIA:/path/to.png` 直接当作飞书文本消息发送
- 飞书 DM 发图要走：**本地图片 -> 上传 -> 获取 image_key -> 发送 `msg_type=image`**
- 发送目标必须使用当前会话的 `chat_id`，不要默认用 home group

## 正确流程

### 1. 生成海报

在 `bilibili-video-poster` 技能目录下运行：

```bash
uv run python scripts/generate_bilibili_poster.py \
  --url 'https://www.bilibili.com/video/BV...' \
  --output /tmp/bilibili-poster.png
```

或用 `--message` / `--bvid` 输入。

### 2. 获取当前飞书 DM chat_id

当前会话若是飞书 DM，优先使用会话里已有的 chat_id：

- `oc_b904bb8f890430e73d5d5fa662c76e33`

若不确定，先用 `send_message(action='list')` 查看可用目标，确认当前 DM，而不是群聊。

### 3. 发送图片

使用脚本：

```bash
python3 /root/.hermes/skills/bilibili-video-poster/scripts/send_to_feishu_chat_image.py \
  /tmp/bilibili-poster.png \
  oc_b904bb8f890430e73d5d5fa662c76e33
```

该脚本内部会：
- 导入 `~/.hermes/skills/feishu-video-sender/feishu_video_sender.py`
- 获取飞书 token
- 上传本地图片，拿到 `image_key`
- 调用飞书 IM API：`receive_id_type=chat_id`
- 发送 `msg_type=image`

### 4. 验证

成功时应返回 JSON，包含：
- `ok: true`
- `message_id`
- `chat_id`
- `image_path`

## 常见错误

### 错误 1：把图片路径当文本发

症状：消息里只出现 `MEDIA:/...png` 或纯文本说明，而不是图片。

修复：必须用 `send_to_feishu_chat_image.py`。

### 错误 2：发到卧龙岗群而不是当前 DM

症状：用户说“怎么发到群里了”。

修复：
- 明确使用当前 DM 的 `chat_id`
- 不要用默认 home channel
- 不要用“裸平台名 feishu”发送图片

### 错误 3：以为飞书接口不支持发图

事实：支持。关键是要先上传获取 `image_key` 再发 `msg_type=image`。

## 发送前自检

- [ ] 海报文件已存在
- [ ] 目标是当前 DM 的 chat_id
- [ ] 使用了图片专用脚本
- [ ] 没有把 `MEDIA:` 当普通文本发

## 维护提示

如果图片发送脚本路径、飞书上传方式或当前 DM chat_id 变化，要同步更新本技能。
