# Odds-Analyst Integration Summary

## ✅ 已完成的集成工作

### 1. **Personas文件更新完成**

**allsvenskan-predictor**:
- ✅ `references/personas-league.md` 添加第6个agent：odds-analyst
- ✅ 完整定义：Tavily搜索workflow、赔率转换、交叉验证、价值检测

**worldcup-predictor**:
- ✅ `references/personas.md` 添加第6个agent：odds-analyst
- ✅ 完整定义：Tavily搜索workflow、赔率转换、交叉验证、价值检测

### 2. **SKILL.md主文件更新**

**allsvenskan-predictor**:
- ✅ Phase 2: 5-agent → **6-agent** swarm（添加odds-analyst说明）
- ✅ Phase 3: 新增"Odds Calibration Check (MANDATORY)"章节
  - 市场共识 vs 模型共识对比
  - Trust hierarchy（Pinnacle > 模型 > 娱乐盘）
  - 价值投注识别
  - 红旗处理（双盘口冲突、陷阱赔率、突然变动）

**worldcup-predictor**:
- ✅ Phase 2: 5-agent → **6-agent** swarm（添加odds-analyst说明）
- ⚠️ Phase 3: 部分更新（文本匹配问题，但核心逻辑已在personas中定义）

---

## 🎯 **Odds-Analyst的核心功能**

### **数据获取方法（优先级）：**

1. **Tavily搜索（PRIMARY）** ✅
   ```
   Query: "[Home] vs [Away] odds Pinnacle Bet365 Oddsportal [date]"
   - 免费、即时可用
   - 智能搜索，自动找最相关赔率网站
   ```

2. **支持的赔率源：**
   - **Pinnacle** (最锐利，vig 2-3%) — 真实市场价格
   - **Oddsportal** (100+博彩公司聚合) — 市场共识
   - **中国体彩 lottery.gov.cn** (竞彩足球)
   - **Bet365, Unibet** (欧洲主流)
   - **Flashscore** (实时赔率)

3. **Fallback方案：**
   - Tavily失败 → WebFetch抓取Oddsportal
   - 都失败 → 标记"no odds data available"（不猜测）

### **核心分析任务：**

1. **赔率转换**
   - Decimal odds X → 1/X = 隐含概率
   - 去除vig（如Home+Draw+Away=108%，除以1.08）

2. **交叉市场验证**
   - 欧洲1X2 vs 亚洲让球盘
   - BTTS (Both Teams Score) vs data-analyst的Poisson模型
   - Over/Under 2.5 vs 球队平均进球数

3. **价值检测**
   - 市场共识：Home 45%
   - 模型预测（其他5个agent）：Home 60%
   - **价值差距：+15%** → Home被市场低估

4. **异常标记**
   - 双盘口冲突（主胜2.28 vs 4.65）→ 数据错误
   - 陷阱赔率（大热门1.20）→ 检查伤停
   - 突然变动（开盘2.50→临场2.10）→ 大资金流向

---

## 📋 **Phase 3综合时的强制检查（Odds Calibration Protocol）**

### **对比规则：**

| 市场 vs 模型差距 | 置信度 | 行动 |
|---|---|---|
| <5% | 高 ✅ | 市场认同模型，放心预测 |
| 5-15% | 中 ⚠️ | 调查差距原因（伤停？过度反应？） |
| >15% | 低/红旗 🚩 | 要么我们遗漏信息（信市场），要么价值投注（罕见） |

### **Trust Hierarchy（冲突时）：**
```
Pinnacle赔率（去vig后）> 我们的6-agent模型 > 娱乐盘赔率
```

**原因**：Pinnacle vig最低（2-3%），吸引锐钱（sharp money），最接近真实概率。

### **实际案例（07-06世界杯灾难）：**

**如果当时有odds-analyst：**
- 巴西 vs 挪威：开盘巴西1.65 vs 挪威5.50，临场巴西1.75 vs 挪威5.20 ⬆️
- Haaland进球赔率：2.50（异常低）
- **odds-analyst会标记**："市场对Haaland决定性的定价（2.50）远低于历史均值（3.50），可能有隐藏信息（状态极佳？）→ 巴西62%过度自信，压到55%"

**结果**：虽然仍错，但至少**不会高置信度全反**。

---

## 💡 **使用示例（你的瑞超图片）**

### **Match 1: 赫根 vs 佐加顿斯（双盘口冲突）**

**odds-analyst会输出：**
```markdown
### Multi-source odds
| Source | Home | Draw | Away | Overround |
|---|---|---|---|---|
| 盘口1 | 2.28 (43.9%) | 3.50 (28.6%) | 2.47 (40.5%) | 112.9% |
| 盘口2 | 4.65 (21.5%) | 4.20 (23.8%) | 1.48 (67.6%) | 112.9% |

⚠️ **Extreme dual-odds conflict detected**
- 27 percentage-point gap (Home 43.9% vs 21.5%)
- Likely causes: (1) Data error, (2) Different market types (1X2 vs AH vs Correct Score)

**Recommendation**: Cross-check with Oddsportal consensus. If consensus = 盘口2 → trust 1.48客胜
```

### **Match 2: 布鲁马波卡 vs 盖斯**

**odds-analyst会输出：**
```markdown
### Market consensus (Pinnacle vig-removed)
- Home 32.9%, Draw 30.7%, Away 36.4%

### Value vs our model
- Market: Away 36.4%
- Our model (buzz说GAIS 4W火热 + H2H优势): Away 55%
- **Value gap: +18.6%** → GAIS被市场低估 ✅

**Pick**: GAIS客胜有价值，赔率2.04合理
```

---

## 🔧 **下一步（可选增强）**

### **如果要进一步优化：**

1. **赔率变动追踪**（需要历史数据）
   - 追踪开盘 vs 临场赔率 → 揭示资金流向
   - 需要：定时抓取（每小时）或The Odds API付费

2. **赔率API集成**（自动化）
   - The Odds API ($50/月) — 50+博彩公司实时赔率
   - 好处：自动化、实时、历史变动
   - 需要：Python脚本 + API key

3. **中国体彩专用爬虫**
   - 如果lottery.gov.cn无法通过Tavily抓取
   - 需要：Selenium爬虫 + 反爬虫对策

---

## ✅ **集成完成状态**

| 项目 | 状态 |
|---|---|
| allsvenskan-predictor personas | ✅ 完成 |
| allsvenskan-predictor SKILL.md | ✅ 完成 |
| worldcup-predictor personas | ✅ 完成 |
| worldcup-predictor SKILL.md | ⚠️ 部分完成（核心逻辑在personas中） |
| 测试用例 | ⏳ 待测试（下次运行6-agent swarm时验证） |

**当前可用**：两个技能已可使用6-agent swarm（包括odds-analyst），odds-analyst会通过Tavily搜索赔率并进行市场校准。

**测试建议**：下次预测时（世界杯或瑞超），明确要求启动6-agent swarm，观察odds-analyst的输出质量。

---

## 📝 **Agent调用示例**

在Phase 2时，调用6个agents（包括odds-analyst）：

```markdown
Agent({
  description: "odds-analyst: 赔率分析",
  prompt: `You are the **odds-analyst** agent...
  
  ## Your task
  For the matches in facts.md, scrape odds using Tavily search:
  - Query: "[Home] vs [Away] odds Pinnacle Bet365 Oddsportal [date]"
  - Convert to implied probability and remove vig
  - Compare with other agents' predictions
  - Flag anomalies
  
  ${READ_FILE: worldcup-predictor/workspace/2026-07-07/facts.md}
  
  Return structured Markdown as defined in personas.md.`,
  subagent_type: "general-purpose"
})
```

并行启动data-analyst, tactics, injury-watch, buzz, risk-officer, **odds-analyst** 共6个。
