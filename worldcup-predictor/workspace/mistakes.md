# Mistake Log & Lessons

## 2026-06-23 Session

### Lesson 1: injury-watch source strategy is too vague
**What happened:** injury-watch ran "searches across official channels and beat reporters" and returned zero usable sources for both Algeria and Jordan. The section was explicitly flagged as "do not weight" — dead weight in the swarm.
**Root cause:** The persona brief says "official source (club statement, federation announcement, reputable beat reporter)" without naming fallback URLs. When primary sources 503, agent has nothing to try.
**Fix:** Add named fallback sources to the injury-watch brief: sportsmole.co.uk team-news pages, transfermarkt.com injuries, goal.com team previews, sports.yahoo.com previews. Also check MD1 disciplinary records from Wikipedia group pages (yellows/reds are always there).

### Lesson 2: cross-agent contradictions not surfaced in synthesis
**What happened:** risk-officer built a heat-suppresses-intensity argument for Portugal vs Uzbekistan (Houston NRG). injury-watch (a different agent) found that NRG Stadium has a retractable roof + AC, which kills that mechanism entirely. The contradiction was buried in footnotes, not surfaced in the synthesis table.
**Fix:** Add an explicit "cross-agent contradiction check" step in Phase 3 synthesis: scan for cases where one agent's mechanism is invalidated by another agent's finding (e.g. "venue is indoor/AC" cancels "heat risk"). Flag these in the synthesis rather than letting them sit in archive files.

### Lesson 3: risk-officer draw-probability was well-argued but wrong
**What happened:** Risk-officer argued draw ~28-30% for Algeria-Jordan (must-win mutual fear, low total, Algeria fragility). Actual: Algeria won 2-1 (narrow, exactly as tactics predicted). The draw case was plausible but overrated.
**Pattern:** In must-win symmetric elimination games, the team with better individual quality still wins more often than the draw case implies. A 2-goal quality gap (FIFA rank 28 vs 63) is not fully neutralized by desperation context.
**Lesson:** When data-analyst AND tactics BOTH point to the same narrow win with medium+ confidence, and the risk-officer's upset mechanism relies primarily on psychological factors (fear, fragility) rather than a structural tactical edge, lean into the consensus. Psychological upsets are real but don't override a 35-place ranking gap.

### Lesson 5: England 0-0 Ghana — top-of-group Round 2 clashes produce mutual defensive paralysis
**What happened:** Predicted England 2-1 (high confidence). Actual: 0-0. Both teams entered on 3pts, both with elimination stakes if they lost.
**Root cause:** When two teams at the top of a group meet in Round 2, BOTH have strong disincentive to lose — the match becomes strategically paralyzed. England's attacking intent was neutralized by Ghana's Partey-led defensive shape. We correctly flagged Partey as "today's biggest single variable" but still didn't revise the pick down to a draw.
**Lesson:** In Round 2 top-of-group clashes where BOTH teams are on 3pts and a loss means danger, raise draw probability to 35%+. Quality gap alone does not overcome symmetric loss aversion. Partey-type midfield returns that switch an opponent from passive to active must trigger a mandatory pick reconsideration, not just a "caveat."

### Lesson 6: big-margin underestimation when must-win pressure teams face poor opposition
**What happened:** Portugal 5-0 Uzbekistan. We predicted 2-0 or 3-1 (high confidence on direction, but capped at 3-1 max).
**Root cause:** Portugal under MD1 drop-points pressure, facing Uzbekistan (0pts, leaky defense). We correctly identified the structural argument but anchored the score too conservatively.
**Lesson:** When a quality team (top-10 FIFA) is in must-win mode after dropping unexpected points, and the opponent is both winless AND has a known defensive vulnerability (Ashurmatov injury), remove the mental cap on margin. In these "demolition context" matches, 4+ goals is a real mode, not just a tail outcome.

### Lesson 4: blind retrospective scores confirm strong calibration on clear favorites
**What happened:** Blind-predicted 2:0 Argentina, 3:0 France, 2:1 Norway — hit 3/3 on 1X2, 2/3 exact scores (Norway off by 1 goal each direction).
**Lesson:** When the data shows a large quality gap (ranking diff > 30 places, heavy moneyline favorite) AND the opposition leaked 3+ goals on MD1, the high-confidence "large win" prediction is well-calibrated. Don't second-guess it with unnecessary hedging.

---

## 2026-06-25 Session

### Lesson 7: Asymmetric must-win vs draw-suffices creates massive motivation gap
**What happened:** 
- Switzerland 2-1 Canada (predicted 1-1 draw): We correctly identified Canada had "draw suffices" and would sit deep, but underestimated how Switzerland's "must win" pressure would convert to attacking fuel that tears open a passive opponent.
- South Africa 1-0 South Korea (predicted Korea 1-0 or 0-0): Korea had "draw suffices" → played conservatively. South Africa had "must win" → home crowd + desperation → upset win.

**Root cause:** When one side MUST win and the other side is satisfied with a draw, the motivation asymmetry dominates quality gap. The team that needs a result will push forward and create chances; the team that is happy to sit back becomes passive and vulnerable.

**Lesson:** In must-win vs draw-suffices matchups, DEFAULT to favoring the must-win side UNLESS there is a 40+ FIFA ranking gap. Motivation asymmetry >> 10-20 place quality gap. The "draw suffices" team will play not-to-lose, which is structurally weaker than playing-to-win. Raise upset probability to 40%+ when the must-win side has home advantage.

### Lesson 8: High altitude (2000m+) impact on European teams systematically underestimated
**What happened:** Czech 0-3 Mexico at Estadio Azteca (2240m). We predicted Czech 2-1, identifying Mexico's rotation but flagging altitude as "the only structural constraint." Actual: Mexico B-team demolished Czech full-strength squad.

**Root cause:** We treated altitude as a "risk factor" when it is a "decisive factor." At 2240m, European teams without acclimatization lose 20%+ aerobic output after 60 minutes. This is not a psychological edge — it is a physiological ceiling. Czech ran out of gas in the second half and collapsed.

**Lesson:** At 2000m+ altitude (Azteca, BBVA Monterrey, Denver), European teams without prior acclimatization face a HARD CAP on sustained intensity. If the opponent is technically competent (even a B-team from a top-20 nation), altitude alone can flip a 2-1 predicted win into a 0-3 loss. Do NOT predict European away wins at 2000m+ unless the quality gap is 50+ FIFA places. For 2200m+ (Azteca), treat it as home advantage worth +1.5 goals.

### Lesson 9: B-team rotation ≠ technical weakness (for top-tier nations)
**What happened:** Mexico B-team (Ochoa 40yo, Plan B roster) beat Czech full-strength 3-0. We identified the rotation but still predicted Czech would exploit it.

**Root cause:** Rotation affects intensity and cohesion, NOT technical quality. Mexico B-team still had superior ball control, passing, and tactical discipline vs Czech. Combined with altitude advantage, Mexico B > Czech A.

**Lesson:** When a top-20 FIFA nation rotates at HOME with altitude/crowd advantage, their B-team can still dominate mid-tier European opposition (FIFA 30-50). Only predict the rotated-team to lose if: (1) away game, (2) opponent is top-15 FIFA, OR (3) no structural advantage (altitude/crowd). For CONCACAF giants at Azteca, B-team rotation is a 20% downgrade, not a 50% downgrade.

### Lesson 10: "Draw suffices" + quality edge does NOT guarantee passive dominance
**What happened:** Canada had draw suffices + better FIFA ranking + GD advantage, playing at home in Vancouver. We predicted 1-1 draw. Switzerland (must win) attacked and won 2-1.

**Root cause:** We assumed "draw suffices" would let Canada sit deep and control the result. But Switzerland's desperation created genuine attacking chances, and Canada's passive posture made them vulnerable to being carved open.

**Lesson:** "Draw suffices" is a defensive posture that trades initiative for safety. It works when the opponent lacks quality to break through. But against a top-15 FIFA team (Switzerland #14) with technical midfield control (Xhaka), sitting deep invites pressure and cracks will appear. Do NOT auto-assign high draw probability just because one side is satisfied with it — check if the must-win side has the technical quality to punish passivity. If yes, favor the must-win side.

---

## 2026-06-26 Session (4/6 命中, 67% — 回升)

### Lesson 11: 两条规则同向触发时，必须翻转预测方向（不能只加caveat）
**What happened:** 厄瓜多尔 2-1 德国（预测德国 1-0 或 1-1）。Rule 3（德国已出线+确认大轮换）和 Rule 6（厄瓜多尔 must-win）**两条规则都指向厄瓜多尔**，但综合预测仍选了德国，理由是"厄瓜多尔2场0进球"。结果厄瓜多尔进了2球击败德国B队晋级。

**Root cause:** 我们用一个"历史进攻数据弱"的反向信号，去对冲两条结构性规则的同向触发。但"0进球"的样本恰恰来自前两轮面对德国A队和科特迪瓦的强防守——面对德国B队这个样本不可迁移。我们犯了用旧context的统计去否决新context的结构判断的错误（与Lesson 9同源：B队轮换≠原对手强度）。

**Lesson:** 当 **2条及以上 forced-reassessment 规则同向触发同一支球队**时，强制翻转预测到该方，置信度标"中"。单条反向统计信号（尤其是来自不同对手强度的历史进球数）不足以否决双规则共识。"0进球"针对的是A队防守，不能用来预测对B队的进攻产出。

### Lesson 12: 已出局球队 + 球星个人动机 ≠ 零战意，尤其面对对手B队
**What happened:** 土耳其 3-2 美国（预测美国 2-1）。美国已锁头名、轮换4名累积黄牌主力；土耳其已出局0分。我们假设"已出局=低动力"，预测轮换美国B队仍靠结构优势取胜。实际土耳其全力出击，Güler自由发挥，3-2逆转。

**Root cause:** 两个误判叠加：(1) 把"已出局"等同于"零战意"，忽略了球星的个人荣誉动机（转会窗口曝光、世界杯舞台个人表现）；(2) 低估了"全力首发的已出局队 vs 轮换B队"的实际战力对比——动机+阵容完整性双双倒向土耳其。这是 06-26 第二次栽在"已出线方轮换"上（与厄/德同一根因：B队被高估）。

**Lesson:** 已出局球队若拥有 (a) 个人荣誉驱动的球星（转会窗、首秀舞台），且 (b) 对手是已出线的轮换B队 → 把它当作"无压力全力释放"场景，而非"零战意"。已出线方轮换B队 vs 已出局方全力首发，**默认偏向全力首发方或至少升draw/upset到40%**。不要假设头名球队的B队能靠"结构纪律"碾压一支全力出击的球队。

## 2026-06-27 Session (4/6 命中, 67%)

### Lesson 14: Rule 9 "至多平局"≠ 自动翻转到对手胜——顶级豪门B队仍是顶级
**What happened:** 挪威 vs 法国。法国确认5人大轮换+Deschamps缺席，Rule 9+11双触发强制预测挪威胜。实际法国B队 4-1 碾压挪威。

**Root cause:** Rule 9 的"至多平局"是对旋转方的硬上限，但它不等于"对手赢"——除非对手的质量足以在法国B队主防下得分+不失分。法国B队（Mbappé、Thuram等轮休后剩余阵容）个人质量仍远超挪威全主力。我们把"轮换≈降级到中等球队"等号了，但对FIFA前5强，B队≠中等球队。

**Lesson:** Rule 9 = 轮换方至多平局（硬上限），但决定预测方向时必须加入**绝对质量对比**：若轮换方仍是FIFA前5且对手是FIFA20+，默认**平局**（不是"对手赢"）。只有当对手能在"挪威级别质量"的轮换B队防线下得分，才翻转到对手赢。不要把规则触发和方向翻转直接等号——质量差距决定"至多平局"是否足够，还是应该是"对手赢"。

**修订规则：** Rule 9 触发后：
- 轮换方FIFA前5 + 对手FIFA 15-30 → 预测**平局**
- 轮换方FIFA前5 + 对手FIFA 10以内 → 预测**对手赢或平局各半**
- 轮换方FIFA 10-20 + 对手任意 → 原规则适用，翻转到对手

---

### Lesson 15: Rule 6（动力不对称）在顶级技术球队面前存在"精准一击"反制
**What happened:** 西班牙 1-0 乌拉圭。Rule 6触发：乌拉圭 must-win vs 西班牙 draw suffices。预测乌拉圭 1-0。实际西班牙坐深+精准反击 1-0 胜。

**Root cause:** Rule 6假设"draw suffices方坐深=被动=漏洞"，这在质量接近的球队间成立。但西班牙（FIFA #3，Pedri+Yamal+Morata）在"坐深保平"战术下仍保留了世界级的定位球/反击单刀能力。乌拉圭的must-win高压打开了防线纵深，反而给了西班牙精准一击的空间。

**Lesson:** Rule 6 的"默认must-win方"需新增一个逆向例外：当"draw suffices方"是FIFA前5且拥有世界级前锋/行动力（Morata、Mbappé、Ronaldo级别），他们的"坐深"包含deadly counter quality。must-win方的高压开放空间≠优势，而是给对方一个击穿的通道。修订：Rule 6触发后，若draw-suffices方FIFA前5，将预测调整为**平局50% / draw-suffices方赢40% / must-win方赢10%**，而不是默认must-win方。

---

### Lesson 17: 双出线零动力对决 → 0-0 比 1-1 更常见
**What happened:** 哥伦比亚 0-0 葡萄牙（预测1-1平）。两队均已出线，争头名动力也有限（Ronaldo轮休/哥伦比亚轮换）。

**Root cause:** 预测"平局"时默认锚定1-1，但双出线零动力场景下双方均倾向保守、不进攻，0-0是众数结果而非1-1。有控球质量的球队不一定把低动力场踢成进球丰富的比赛。

**Lesson:** 双出线末轮对决，若双方均已轮换（或放弃争头名）→ 预测 **0-0** 而非 **1-1**。将"平局"拆分：低动力双出线=0-0模式；must-win vs draw-suffices平局=1-1模式（双方均有攻防意图）。

### Lesson 18: Rule 6 高压场 → 总进球数膨胀（双向）
**What happened:** 阿尔及利亚 3-3 奥地利（预测1-1或阿 1-0）。阿尔及利亚 must-win 高位压，奥地利 draw suffices 防守+反击——但最终双方各进3球共6球。

**Root cause:** Rule 6高压场景创造的不仅是"必赢方进球"，更创造了**双向进球环境**：必赢方压上留空间→对方反击进球；对方进球后必赢方更压上→进更多球。在防线均有漏洞（Baumgartner缺阵）+ 高压战术时，6球比2球更可能。

**Lesson:** 当 must-win 方在防线有明确漏洞（主力缺阵/历史漏球多）+ draw-suffices 方有反击能力时，**总进球数可能超过3**。预测分值时用"多于2球"区间而非锚定"1-0或1-1"。

### Lesson 16: demolition幅度系统性低估 — 移除进球上限的触发条件
**Cross-cutting pattern (本届连续多场):**
- 06-24 葡萄牙 5-0 乌兹别克（预测3-1，低估2球）
- 06-27 塞内加尔 5-0 伊拉克（预测2-0，低估3球）
- 06-27 比利时 5-1 新西兰（预测2-1，低估3球）

**Root cause:** 我们对"赢家方向"判断准确，但反复给比分加心理上限（最多2-0/2-1）。在特定结构下，4+球是众数而非长尾。

**Lesson:** 当满足以下两条件之一时，**移除进球数上限**，默认预测4+球大胜模式：
- (a) 强队（FIFA前10或质量碾压）处于 must-win/争头名/球星纪录驱动 状态，且
- (b) 对手已出局或防线已崩盘（两场失6球以上 GA6+，或核心后卫缺阵）
满足(a)+(b)时，预测3-0/4-0/5-0而非2-0。这与Lesson 6同源但更具体化了触发阈值。

### Lesson 13: 已出线方Round 3轮换是本届系统性失分点 — 强制下调其预测
**Cross-cutting pattern (06-25 + 06-26 三连证):** 
- 06-25 捷克 0-3 墨西哥B队（轮换方反而赢，但因海拔）
- 06-26 厄 2-1 德国B队（轮换方输）
- 06-26 土耳其 3-2 美国B队（轮换方输）

**Root cause:** Rule 3 已存在（已出线方轮换→偏向非轮换方），但我们在执行时反复用其他理由（对手0进球、结构纪律、质量差距）把它推翻。问题不在规则缺失，而在**执行纪律**：每次都给轮换的强队"留面子"。

**Lesson:** Round 3 中任何**确认大轮换**的已出线球队，预测默认下调 **至多平局**，除非：(a) 海拔≥2000m且轮换方主场（Lesson 8），或 (b) 对手同样已出局且无个人动机。强队B队的"纸面质量"在末轮低强度赛中**不可靠**——动机驱动的弱队B队会咬住甚至击败它。这条是硬纪律，不接受单一反向统计信号否决。

## 2026-06-29 Session (1/1 命中, 100% — 淘汰赛首轮，首次应用xG污染修正)

### Lesson 19: xG/进攻数据污染修正 — 剔除人数不对称场次后重算真实进攻力 ✅已验证
**What happened:** 南非 vs 加拿大。加拿大组赛xG高达2.29/场，但其中60%进球（6/10）来自9v11的卡塔尔6-0（卡塔尔早早红牌）。我们**剔除该非正常场次**，将加拿大真实xG下调至1.43/场（vs波黑1-1、vs瑞士1-2的真实水平）。修正后泊松计算给加拿大胜52%（而非共识65%+），最可能低比分1-0。**实际：加拿大1-0精确命中。**

**Root cause（为何这是系统性方法而非个例）:** 单场人数优势（红牌、对手弃赛式崩盘）会把一支球队的进攻数据系统性抬高，污染整届样本均值。若不剔除，会把"打10人时的火力"误当成"打11人时的火力"，导致高估favorite的胜率和比分。这与Lesson 9（B队≠原对手强度）、Lesson 11（旧context统计不可迁移到新context）同源——**都是"样本语境不可迁移"问题**。

**Lesson（纳入Phase 1事实核查）:** 计算任一球队的xG/场均进球时，**先检查每场的人数状态**。若某场存在长时间11v10（对手30分钟内红牌、或对手大面积崩盘），将该场标记为"污染场次"并：
- (a) 从xG/场均进球的样本中**剔除**该场，用剩余正常场次重算真实进攻力；
- (b) 在facts.md的Key Stats中**同时列出"原始xG"和"剔除污染后xG"两个数字**，下游agent使用修正值；
- (c) data-analyst用修正后的xG跑泊松/概率分布，而非原始膨胀值。
这条已在06-29实战验证有效（加拿大2.29→1.43，预测1-0精确命中）。

### Lesson 21: 淘汰赛中 Lesson 16（demolition）被 Lesson 20（压力不对称）完全覆盖

**What happened:** 德国 vs 巴拉圭。5 agent全票偏德国，Lesson 16 demolition context高置信度预测2-0或3-0。实际：巴拉圭1-1逼平后点球3:4淘汰德国。

**Root cause:** 组赛数据（德国10进球/巴拉圭场均0.33进球）是小组赛语境。在淘汰赛中，巴拉圭作为首次晋级的"house money"ball，在低区块防守下完全封锁德国，拿到1:1平局后点球获胜。Lesson 16的"demolition触发条件"要求对手"防线崩盘"——但巴拉圭淘汰赛求生模式不是小组赛放弃的崩盘防线，而是严密low-block。我们把小组赛进攻数据（德国全主力 vs 弱旅）错误迁移到淘汰赛语境（德国 vs 巴拉圭最大动力防守）。这是Lesson 11/19的同源错误：旧context统计不可迁移新context。

**Lesson（淘汰赛权重修正）:** 在淘汰赛中，**Lesson 16 demolition 触发条件必须新增"对手无意志防守"**这一前提。仅凭小组赛进攻数据不足。当对手是：(a) 首次晋级淘汰赛的"历史突破"球队（house-money心态），或 (b) 组赛中表现出有能力拿到至少1分的low-block防守 → Lesson 16失效，改为预测"低比分险胜1-0/2-1或平局加时"。同时，德国作为FIFA#4被淘汰也验证了：**世界大赛淘汰赛≠组赛，大赛重置效应对强队demolition预测构成结构性挑战**。修订：Lesson 16仅适用于组赛或确认对手放弃的淘汰赛，不可默认用于淘汰赛首轮knockout vs motivated underdog。

### Lesson 20: 淘汰赛"压力不对称"——晋级压力 vs house-money心态，方向性有效
**What happened:** 南非 vs 加拿大。加拿大co-host（东道主之一）背负"不能输给FIFA低38位对手"的压力；南非首次进淘汰赛=zero downside的"house money"心态。buzz+risk-officer据此警告加拿大不会轻松取胜，南非非输概率42-46%（vs共识35-40%）。**实际：加拿大仅1-0险胜，南非全场表现接近，未被carry。**

**Lesson（淘汰赛专用，补充Rule 6在淘汰赛的空白）:** 淘汰赛无draw-suffices，但存在另一种动力不对称——**心理负担不对称**。当 (a) 一方是夺冠热门/东道主/被期待轻取，且 (b) 另一方是超额完成任务的黑马（首次晋级、历史最佳）→ favorite承受"必须赢且赢得漂亮"的压力，underdog无包袱大胆出击。此时**下调favorite的大胜概率，预测低比分险胜（1-0）或加时**，并提高underdog非输概率至40%+。这不取代质量判断，但解释了为何淘汰赛favorite常踢得艰难。

## 2026-07-01 Session (3/3 命中, 100% — 淘汰赛最佳日，2 exact scores)

### Lesson 22: Lesson 20（压力不对称）需要underdog具备"进攻兑现力"作为前提——进攻贫血的黑马不产生"favorite踢得艰难" ✅方向对/幅度错
**What happened:** 墨西哥 vs 厄瓜多尔。Lesson 20被判定为"最强触发"（共同东道主必须赢 vs 击败德国的house-money黑马），据此把墨西哥从"轻取"下调为"1-0险胜/加时live，Ecuador晋级38%"。buzz+risk双红灯支持。**实际：墨西哥上半场即2-0，全场15射3正、Ecuador仅1射正，轻松掌控晋级。** 方向（墨西哥晋级）对，但"favorite踢得艰难"的核心预测完全没兑现——这不是险胜，是控制局。

**Root cause:** Lesson 20的机制是"favorite承压→踢得拘谨→underdog无包袱出击→比赛胶着"。但这条链条隐含一个**未言明的前提：underdog必须有能力把'无包袱出击'转化为实际威胁（射门、进球、压迫）。** 厄瓜多尔组赛进攻贫血（0.67进球/场，3场2球），面对墨西哥组赛零封防线（9-0，3场clean sheet）——underdog的"大胆出击"撞在城墙上，压力不对称从未在比分上显形。我们把"Ecuador击败德国"当作进攻能力证明，但那是must-win高压下的单次爆发（Lesson 11语境），不是可持续的进攻兑现力。对比06-30荷兰vs摩洛哥（Lesson 20真实兑现）：摩洛哥有Amrabat/En-Nesyri的实际进攻威胁，才把荷兰拖进点球。**Lesson 20成立与否，取决于underdog有没有'牙齿'。**

**Lesson（Lesson 20的门槛修正）:** Lesson 20（淘汰赛压力不对称→下调favorite大胜幅度）**仅在underdog具备进攻兑现力时触发**。触发前必须检查underdog的进攻质量：
- **触发（favorite踢得艰难为真）：** underdog组赛场均≥1.3进球 **或** 有确认的世界级进攻威胁（En-Nesyri/Osimhen级别）+ 该威胁本场首发健康 → 保留Lesson 20，预测低比分险胜/加时。（06-30摩洛哥1-1荷兰点球晋级为正例）
- **不触发（favorite可正常发挥甚至轻取）：** underdog组赛进攻贫血（场均<1.0进球）**且** favorite防线组赛零封/极少失球 → Lesson 20降权，按质量差正常预测，不要人为压低favorite幅度。（07-01墨西哥2-0厄瓜多尔为反例：Ecuador 0.67进球 vs 墨西哥3场零封→压力不对称无法显形）
简言之：**house-money心态给的是"敢打"，但"敢打"只有在有兑现力时才转化为favorite的麻烦。** 单次爆发（Ecuador击败德国）≠可持续进攻力，勿用Lesson 11式的"单场样本"证明underdog有牙齿。这与Lesson 19/21同源：样本语境不可迁移——Ecuador打德国的2球不能迁移到打墨西哥零封防线。

### Lesson 23: 矛盾检查推翻虚假论据 = 淘汰赛决胜判断（方法论验证）✅
**What happened:** 科特迪瓦 vs 挪威。risk-officer基于"挪威0-4惨负法国=信心崩溃"建立36% upset概率。Phase 3矛盾检查发现：挪威那场是MD3全轮换（Haaland/Odegaard未上场，主力已休息10天），"0-4创伤"论据事实错误，下调upset至~25%。据此主预测挪威微弱favorite晋级。**实际：挪威2-1（Haaland 86'绝杀），主力新鲜兑现，方向+比分全中。**

**Lesson（强化矛盾检查纪律）:** 本场证明Phase 3的"跨agent矛盾检查"不是走过场，而是**能直接改变预测方向的决胜步骤**。一个agent（injury-watch）确认的事实（挪威轮换）可以彻底推翻另一个agent（risk-officer）的核心论据（0-4创伤）。**执行纪律：任何基于"某队近期惨败/崩盘"的心理论据，综合前必须核查那场比赛的阵容状态（是否轮换、主力是否上场）。** 一场轮换/替补阵容的失利不构成主力的心理创伤。这条与"样本语境不可迁移"（Lesson 11/19/21/22）是同一根：一场比赛的结论必须绑定它的语境（谁上场、什么动机、什么人数），脱离语境的统计/心理推断不可迁移。

## 2026-07-02 Session (3/3 命中, 100% — 淘汰赛连续两日全胜)

### Lesson 24: data的xG污染修正 优先于 buzz/risk的心理叙事红灯——别让"双红灯"压低已被证明进攻虚高的favorite比分 ✅方向对/幅度错（第二次同型错误）
**What happened:** 美国 vs 波黑。预测美国2-1、"若60分钟仍0-0加时/点球风险显著上升"，理由是buzz+risk双红灯（美国对欧12场0胜的心魔 + 东道主主场焦虑 + 波黑资格赛点球淘汰意大利的pedigree）。**实际：美国2-0轻松零封，波黑全场仅1射正，Balogun上半场破门后从未真正被威胁。** 方向对（美国晋级），但"过程惊险/可能加时"的核心判断完全没兑现——这是控制局，不是险胜。

**Root cause:** 同一份facts.md里，data-analyst已经用xG污染修正证明了波黑的进攻是**虚高**的：组赛5球来自约2.1 xG（+2.9 finishing overperformance），其中3球来自最弱旅卡塔尔，对加拿大/瑞士真实测试仅2球；且Džeko无速度、美国主力后防（Richards/Ream）回归可高线盯防。这份数据校正已经说明"波黑没有可持续的进攻兑现力"。**但综合时，buzz/risk的心理/历史叙事红灯（对欧0胜、主场压力）被当作了同等权重的对冲信号，把美国从"轻取"压到了"2-1加时险胜"。** 结果数据是对的，叙事红灯是噪音。这与07-01墨西哥2-0厄瓜多尔（Lesson 22反例）**完全同型**：favorite有零封防线（美国组赛+本届clean sheet记录）+ underdog进攻被证明虚高（污染修正后贫弱）→ 心理/压力叙事在比分上无法显形。连续两场同型错误说明这不是偶发，而是**综合阶段的系统性权重错配**。

**Lesson（综合阶段权重纪律，Lesson 22的执行层强化）:** 当 data-analyst 已通过 **xG污染修正 / finishing overperformance 拆解** 证明某 underdog 的进攻数据虚高（真实场均<1.0进球 或 主要进球来自被剔除的污染场次），**且** favorite 组赛/本届有零封或极少失球记录时：
- **buzz/risk 的"心理红灯/历史心魔/主场压力"叙事红灯，只能用来提高"过程不确定性"的描述，不能再用来压低 favorite 的比分幅度或方向。** 数据校正优先于叙事。
- 具体操作：这种情况下预测 favorite 正常质量取胜（含零封可能），而不是人为设定"1-0/2-1险胜+加时风险"。把叙事红灯降级为"小概率黑天鹅"备注，而非主预测的比分锚。
- 反向保留（勿矫枉过正）：若 data **没有**证明 underdog 进攻虚高（真实进攻兑现力过 Lesson 22 门槛，如06-30摩洛哥有Amrabat/En-Nesyri真实威胁），则 buzz/risk 红灯仍然有效，Lesson 20 压力不对称仍成立。
简言之：**Lesson 22 的门槛检查必须在综合阶段真正"落地为权重"——过不了门槛的 underdog，其对应的所有心理/叙事红灯也应一并降权，而不是嘴上说"underdog没牙齿"、手上还按"favorite会踢得艰难"下注比分。** 这是 Lesson 22 的执行纪律补丁：门槛不达标 → 叙事红灯同步失效。

## 2026-07-03 Session (3/3 命中, 100% — 淘汰赛连续三日全胜)

### Lesson 25: favorite零封防线 + underdog核心攻击点缺阵/被污染修正证明贫弱 → 默认favorite零封（clean sheet），"BTTS/lead-lapse/both-teams-score"叙事全部降权 ✅方向对/比分第3次同型错误
**What happened:** 瑞士 2-0 阿尔及利亚（预测瑞士2-1，押Algeria进1球）。综合时我们采信了三条"Algeria会进球"的叙事：(1) risk的"Swiss领先后失焦pattern"（Qatar 90'扳平、Canada 2-0后丢球），(2) data的"BTTS 53%（双方组赛场场丢球）"，(3) tactics/buzz的"Mahrez/Gouiri有牙齿→nick one"。**实际：Embolo 10'早早破门后瑞士全程掌控，2-0零封，Algeria全场仅被压制、核心机会寥寥。** 方向对（瑞士零封晋级），但"both-teams-score、2-1"的核心判断落空。

**Root cause（为何是系统性错误而非个例）:** 这是**连续第三场完全同型的错误**：
- 07-01 墨西哥 2-0 厄瓜多尔（预测1-0险胜/加时，实际零封控制）
- 07-02 美国 2-0 波黑（预测2-1加时风险，实际零封）
- 07-03 瑞士 2-0 阿尔及利亚（预测2-1 BTTS，实际零封）

三场的结构完全一致：**favorite有组赛/本届零封防线记录 + underdog的进攻要么被xG污染修正证明虚高、要么核心攻击点缺阵**，而我们每次都被某种"underdog会进球/favorite会踢得艰难"的叙事（压力不对称 / 心理心魔 / lead-lapse pattern / BTTS）说服，把比分从"favorite零封"改成了"underdog进1球"。Lesson 22/24已经建立了"门槛不达标→叙事降权"的原则，但**它们只针对'压力不对称(Lesson 20)'和'心理历史红灯(Lesson 24)'两类叙事，没有覆盖'BTTS统计'和'lead-lapse行为pattern'这两类**。本场Algeria尤其关键：injury已确认头号中锋Amoura缺阵，data也承认Algeria 1.67进球/场"边缘达标且主要靠弱旅"——两个信号都指向兑现力不足，但"BTTS 53%"这个**基于双方历史各自丢球率的独立统计**被当成了独立证据，绕过了门槛检查。BTTS是两个边际概率的乘积，它天然忽略了"当favorite零封防线遇上被削弱的underdog锋线"这个联合条件。

**Lesson（综合阶段权重纪律，Lesson 22/24的第三次执行层强化 —— 覆盖BTTS与lead-lapse两类新叙事）:** 当满足 **(a) favorite 组赛/本届有零封或极少失球记录（clean-sheet防线）**，**且 (b) underdog 的进攻兑现力不达标**（xG污染修正后真实<1.0进球/场，**或** 核心攻击点确认缺阵/伤限，**或** 主要进球来自被剔除的污染弱旅场）时：
- **默认主预测 favorite 零封取胜（clean sheet），比分锚定 1-0 / 2-0，而不是让 underdog 进1球。**
- 以下四类"underdog会进球/favorite会踢艰难"的叙事在此条件下**一律降权为"过程备注"，不得作为比分锚**：① 压力不对称(Lesson 20)、② 心理/历史心魔红灯(Lesson 24)、③ **BTTS统计（"双方场场丢球"）**、④ **favorite的"lead-lapse/领先后失焦"行为pattern**。
- 特别针对 **BTTS**：BTTS是两个边际丢球率的乘积，**默认忽略"favorite零封防线 × 被削弱underdog锋线"的联合抑制效应**。当(a)+(b)成立时，BTTS的历史百分比高估了underdog进球概率，必须下调，不能作为独立于门槛检查的证据。
- 特别针对 **lead-lapse pattern**：favorite"领先后丢球"的历史pattern，只有在 underdog **有兑现力**（过Lesson 22门槛）时才可能兑现。若underdog锋线被削弱（如Amoura缺），favorite即使松懈，underdog也无人惩罚——lead-lapse变成无害。
- 反向保留（勿矫枉过正）：若 underdog **过了Lesson 22门槛**（真实进攻兑现力≥1.3进球/场且核心攻击点健康首发，如06-30摩洛哥），则 BTTS 与 lead-lapse 仍有效，可预测 both-teams-score / 2-1。

简言之：**"BTTS/lead-lapse"和"压力不对称/心理红灯"是同一根问题的四张面孔——它们全都假设underdog有能力进球。underdog的'牙齿'门槛(Lesson 22)是这四类叙事共同的前置开关：门槛不达标 → 四类叙事全部同步失效，主预测回到'favorite零封'。** 连续三场同型（Mexico/USA/Switzerland 均2-0）证明这是综合阶段的系统性权重错配，必须固化为默认规则，而非每场重新辩论。

### Lesson 26: favorite自身"组赛进球少"的样本若来自强对手/控场，不能用作打无牙弱旅的比分上限 ✅方向对/幅度低估（demolition反向盲区）
**What happened:** 西班牙 3-0 奥地利（预测西班牙1-0或2-0）。我们正确执行了Lesson 24（Austria无牙齿→不被其叙事红灯压低方向），但把比分压在1-0/2-0，理由是"**西班牙自身组赛进攻贫弱**（除沙特外2场仅1球且靠门将失误）"。实际西班牙3-0轻取（Oyarzabal梅开二度+Pedro Porro）。

**Root cause:** 这是Lesson 6/16"demolition幅度低估"的一个**新变种、反向盲区**：我们对underdog的进攻数据做了污染修正（Austria剔除弱旅后≈0.5 xG），却**没有对favorite自己的"低进球"样本做同样的语境检查**。西班牙组赛进球少，是因为面对的是Uruguay(坐深强防)等强对手 + 控场型踢法，不是攻坚力本身的上限。当对手换成无牙齿的Austria、西班牙无须控场保平时，其真实攻坚力（Yamal fully fit + Oyarzabal + Merino）回归正常输出。**"样本语境不可迁移"这条铁律，必须对称地同时应用于favorite和underdog**——我们一直只用它给underdog的虚高数据"消肿"（Lesson 19/22/24），却忘了它也会给favorite的"虚低"数据"复原"。

**Lesson:** 在Phase 1的xG/进球污染检查中，**对favorite同样执行"低进球样本的语境检查"**：若一支强队(FIFA前10)组赛进球偏少，检查其低产是否来自 (a) 面对强防守对手，或 (b) 已出线/控场型踢法主动降速。若是，则该"低进球"样本**不可作为它打无牙弱旅时的比分上限**——demolition幅度应按"强队正常攻坚力 vs 弱旅崩盘防线"（Lesson 16）评估，而非按favorite被压低的组赛均值。具体：当 favorite(FIFA前10) 面对 已被证明无牙齿(Lesson 22不达标)且防线漏(GA高)的对手，且 favorite 核心进攻球员健康首发时 → **移除"favorite组赛低进球"这个比分上限，预测2-0/3-0正常取胜，不要锚1-0。**

## 2026-07-04 Session (2/3 命中 — 连续三日全胜终结；Lesson 25 首次预测阶段落地：一验一证伪)

### Lesson 27: Lesson 25 的"零封锚"需要分界阈值 —— toothless（被压制到零威胁）才锚零封；"防守有牙/进攻无牙"的韧性低块保留"被逼进加时/失1-2球"尾部 ⚠️方向对/零封核心读法错

**What happened:** 阿根廷 3-2 佛得角（AET）。我们**首次在预测阶段主动执行 Lesson 25 clean-sheet default**：CV进攻严重不达门槛（0.67 g/g、无世界级射手、Arcanjo伤缺）+ 阿根廷近零封防线 → 默认阿根廷零封 2-0，把 BTTS/house-money/"CV会进球"全部降为过程备注，唯一upset路径判为"0-0拖点球~12-15%"。**实际佛得角进2球**：Duarte ~59' 运动战扳平、**Lopes Cabral 103' 加时一记远角世界波再扳平2-2**，阿根廷靠 Borges 111' 乌龙才 3-2 惊险晋级（史上最接近的淘汰赛冷门之一，FIFA#1 vs #67）。方向对（阿根廷晋级），但"零封 2-0"的核心读法彻底失败。

**Root cause（为何 Lesson 25 在此过头）:** Lesson 25 把"underdog 进攻不达门槛（不会 **outscore**）"错误外推成了"underdog **一球不进**（favorite 零封）"。**这两者不是一回事。** 同一天的加纳（8射0正、0.26 xG）是"被压制到**零威胁**"的真 toothless，哥伦比亚 1-0 轻松零封——Lesson 25 完美成立。但佛得角是**另一个物种**：它的**开放式进攻**确实无牙（组赛对西/沙0球），可它是一支**防守有牙、能把比赛拖满 90+120 分钟的韧性低块**（正是 0-0 逼平西班牙27射的同一支队）。在**淘汰赛单场决胜**里，这类 underdog 即使不会 outscore，也会在120分钟内通过 **①定位球 ②favorite 领先后松懈/回收 ③个人质量一击（Lopes Cabral世界波）④favorite 防守失误** 拿到1-2球。Duarte 和 Lopes Cabral 的进球都不是垃圾时间安慰球，而是真正把阿根廷拖入险境的进球。**"进攻不达门槛"预测的是"不会赢/不会 outscore"，绝不等于"零封被打"。**

**Lesson（Lesson 25 的分界阈值修正，mandatory）:** 应用 clean-sheet default（默认 favorite 零封、锚1-0/2-0）前，必须先判定 underdog 属于哪一类：
- **A 类 = 被压制到零威胁的 toothless（锚零封成立）：** underdog 组赛真实近 **0 射正/极低 xG**，或本场预期会被早失球打开（无低块韧性证据）。此时 Lesson 25 全效，默认 favorite 零封。（07-04 加纳=正例：8射0正）
- **B 类 = "防守有牙 / 进攻无牙"的韧性低块（不锚零封）：** underdog 虽进攻不达门槛，但**曾用低块 0-0 逼平过强队**（防守韧性已证），或有一名能制造个人一击的球员，或本场大概率能拖满全场。此时**保留"favorite 赢但可能被逼进加时、失1-2球"的显著尾部，主预测锚 favorite 小胜（1-0/2-1）而非零封 2-0，并明确标注"被拖进加时/失球的尾部概率"。** BTTS/lead-lapse 在 B 类下**部分恢复**（低块 underdog 仍可能靠定位球/个人一击进球），不再一律降权到零。（07-04 佛得角=反例：0-0西班牙的韧性低块，进2球拖进加时）
- **判别要点：** Lesson 22 门槛管的是 underdog 的**进攻**牙齿（会不会 outscore）；本条新增的是 underdog 的**韧性/偷袭**牙齿（会不会在拖满全场里偷到1-2球）。**两者独立：进攻无牙 ≠ 零封被打。** 一支 0-0 逼平过顶级强队的低块，几乎从定义上就是 B 类。
- 与 Lesson 21 呼应：淘汰赛 house-money 韧性低块（德国被巴拉圭 low-block 拖进点球、荷兰被摩洛哥拖进点球、如今阿根廷被佛得角拖进加时）是本届反复出现的"强队难求零封/大胜"结构——Lesson 25 的零封锚绝不能盖过这个更底层的淘汰赛规律。

### Lesson 28: 点球大战方向不可用"队史点球转化率"预测 —— 高方差近随机事件上别制造虚假精度 ❌方向错

**What happened:** 澳大利亚 1-1 埃及 → **埃及点球 4-2 晋级**。我们把本场正确标为"本轮唯一🔥真coin-flip、两队均攻击贫血、最可能拖入加时/点球"——**过程判断全中**。但综合阶段做了一个多余动作：用"矛盾检查"把 buzz 的"The King is back → 埃及点球胜"（情绪读数）推翻，改采 risk 的数据"澳大利亚点球成功率~80%（大赛4/5，32队第2）+ 专门操练 vs 埃及队史6-7、最近一次点球2-4输球"，把**点球方向判给了澳大利亚**。实际 Salah 中路 Panenka 吊射罚进、澳大利亚 Souttar+Herrington 两罚失，埃及 4-2 完胜。

**Root cause:** 点球大战是**高方差、近随机**的事件，取决于当场球员心理、门将扑救、临场发挥——**队史累计点球转化率（尤其跨年代、跨阵容、样本量极小的数字）对"这一场谁罚进"几乎没有预测力。** 一名当场登场的世界级主罚手（Salah）的发挥 > 队史百分比。我们用一个弱信号（历史 pen%）去覆盖了另一个弱信号（buzz 情绪），本质是**在一个近随机结果上强行制造了虚假精度**。既然已判定 coin-flip，正确做法是把点球方向也标为 toss-up，而不是给出一个自信的方向。

**Lesson（点球校准，mandatory）:** 当一场被判为真 coin-flip 且大概率进入点球时：
- **点球方向默认标 toss-up（约五五），不要用队史点球转化率作为方向锚。** 队史 pen% 是小样本、跨语境的弱信号，不足以覆盖单场随机性。
- 允许作为**极轻微**倾向参考的，只有：(a) 本场确认首发的世界级主罚手（如 Salah/Messi 级别，且健康登场）——轻微偏其球队；(b) 对方门将有本届内**已展示的**扑点表现（如 Bounou/Gill 本届已扑点）——轻微偏门将方。除此之外，**点球判平**。
- 执行纪律：coin-flip 场次的最终预测写"90分钟微弱偏X；若点球，方向 toss-up（不预设胜方）"，而非"点球偏Y晋级"。**别让一个多余的、基于弱信号的方向判断，把一个本应诚实的 coin-flip 变成一个会被记为"方向错"的自信预测。**

## 2026-07-05 Session (2/2 命中, 100% — 16强首日全胜；Lesson 27 一验一"反向证伪"，锁定 A/B 判别的证据门槛)

### Lesson 29: Lesson 27 的 B 类判定必须"证据门槛化"，不可"叙事门槛化"——"主场+house-money+有反击点"≠ B类；只有"已证明的防守韧性"才算 B类 ⚠️方向对/反向误锚（把非B类当B类，发明了不存在的加时尾部）

**What happened:** 加拿大 0-3 摩洛哥。07-04 佛得角证伪 Lesson 25（把真 B 类误当 A 类、锚零封失败）后，本轮我们**首次在预测阶段主动应用 Lesson 27**，把加拿大判为"偏 B 类韧性低块"，据此**拒绝锚摩洛哥零封、给加拿大 1 球（预测 2-1）+ 25-35% 被拖进加时的尾部**。**实际摩洛哥 3-0 零封、全程掌控、无加时**——加拿大上半场仅一次早机会（Oluwaseyi 单刀被 Bounou 扑出）后即熄火，被 Ounahi 下半场梅开二度打崩，Rahimi 补时锦上添花。同日巴拉圭 0-1 法国则**正向验证**了 Lesson 27（真 B 类铁桶把法国逼到运动战 0 射正、仅靠点球 1-0）。一天之内，Lesson 27 一验（巴拉圭）一"反向证伪"（加拿大）。

**Root cause（为何是"反向"错误 —— 与 07-04 佛得角恰好镜像）:** 两次错误是**同一根判别失灵的两面**：
- **07-04 佛得角**：真 B 类（0-0 逼平过西班牙 27 射的韧性低块）被我们**误判为 A 类**（toothless）→ 错误锚了阿根廷零封 → CV 进 2 球拖进加时，零封锚被证伪。
- **07-05 加拿大**：**非 B 类**被我们**误判为 B 类**→ 错误地拒绝锚摩洛哥零封、发明了一个"加拿大进 1 球 + 加时"的尾部 → 摩洛哥干净 3-0，那个尾部根本不存在。
根因在于：**我们用错了 B 类的判别门槛。** Lesson 27 写的 B 类定义是"**曾用低块 0-0 逼平过强队**（防守韧性已证）"——这是一个**硬证据门槛**。但实操中，我们把加拿大归入 B 类，靠的却是三条**叙事/情绪信号**：①共同东道主主场氛围、②首进 R16 的 house-money 心态、③有 J.David/Buchanan 的反击点。**这些全是"敢打/有士气"的软信号，没有一条是"已证明的防守韧性"。** 事实恰恰相反：加拿大**从未 0-0 逼平过任何强队**，组赛失 4 球（3 球给瑞士），防线只是中档，R32 靠 1-0 小胜 FIFA#76 南非过关。按硬证据门槛，加拿大是 A 类（会被摩洛哥打开、锚零封），不是 B 类。我们犯的错与 Lesson 22/24/25 同源——**把软性叙事当成了硬性资格证据**，只不过这次错在 Lesson 27 的 B 类"入口"上。

**Lesson（Lesson 27 的 A/B 判别执行纪律，mandatory —— 与 Lesson 27 构成对称双门）:** 判定 underdog 属 A 类（锚 favorite 零封）还是 B 类（不锚零封、留加时尾部）时，**B 类资格必须由硬证据支撑，不接受叙事/情绪信号入场**：
- **B 类的唯一合格证据 = 已证明的防守韧性**：本届（或近期同批球员）曾用低块 **0-0 / 拖满 90+120 分钟逼平或淘汰过一支真正的强队**（巴拉圭之于德国、摩洛哥之于荷兰、佛得角之于西班牙）。或本场有**明确将大概率拖满全场**的结构证据（超硬 4-6-0 铁桶 + 门将点球劲绩）。
- **不构成 B 类资格的软信号（一律不得单独或叠加将 underdog 升为 B 类）**：主场/东道主氛围、house-money 心态、"有反击点/有个人一击球员"、媒体历史时刻叙事。这些只说明"敢打/士气高"，**不证明"能守住/能拖住"**。
- **判别的证伪测试：** 问一句"**这支球队本届有没有把任何一支强队挡在零封线外/拖满全场过？**"——答案是"没有"（如加拿大：失4、从未零封强队）→ **默认 A 类，锚 favorite 零封（1-0/2-0）**，不发明加时尾部。答案是"有"（如巴拉圭 0-0 拖垮德国）→ B 类，不锚零封、留显著加时/失球尾部。
- **对称提醒（与 Lesson 27 合并记忆）：** A/B 判别是一道**对称双门**，两个方向都会错——
  - 把 **B 误判为 A**（07-04 佛得角）→ 错锚零封，被拖加时打脸；
  - 把 **非B 误判为 B**（07-05 加拿大）→ 错误拒锚零封，发明假加时尾部、丢掉本该拿下的 exact score。
  两者的唯一正确分界都是同一条：**"有没有已证明的防守韧性硬证据"**。有 → B；无 → A。别让主场氛围、house-money、反击点这些软信号在任何一个方向上污染这道门。

### Lesson 30（正向验证，非新错）: "最硬 house-money 铁桶低块 → favorite 小胜不锚大胜、规避 -2.5 盘"是本届淘汰赛稳定获利结构 ✅
**What happened:** 巴拉圭 0-1 法国。我们把巴拉圭正确判为**教科书 B 类**（刚 4-6-0 拖垮德国 120 分钟 + 点球），据此**明确规避法国 -2.5 让球盘、预测法国小胜不锚大胜**。实际法国全场压制控球，却被 4-6-0 铁桶逼到**运动战 0 射正**，仅靠 69' 一粒 VAR 点球 1-0 惊险过关（38°C "rock fight"）。方向 + "低比分 + 规避大胜" 全中，实际 1-0 比预测 2-0 更极端地证明了"别贪大胜"的正确。
**Lesson（确认，非修订）:** 淘汰赛遇到**已证明防守韧性的 B 类铁桶**（Lesson 27/29 硬证据门槛达标者），favorite 即便质量碾压（法国 vs 巴拉圭 30-40 FIFA 位），也应**锚 1-0/2-1 小胜、坚决规避 favorite 大让球盘（-1.5/-2.5）**，因为铁桶会把比赛压到"一球定胜负 + 加时/点球尾部"。这与 Lesson 21（house-money 韧性低块拖垮强队是本届反复结构）一脉相承，07-05 法国 1-0 是又一个正例。**执行要点：B 类硬证据达标 → favorite 方向照押，但比分锚"最小获胜差"，让球盘一律往小走。**

## 2026-07-07 Session (2/2 命中 on 晋级方向, 100% — 从07-06灾难恢复；首次完整应用6-agent + odds校准)

### Lesson 33: 头号射手缺阵占进攻产出40%+ = 结构性瓦解，不是微弱削弱 — Lesson 20压力不对称应全部降权，预测favorite正常取胜而非险胜/加时 ⚠️ 方向对/幅度灾难性低估（第4次"favorite vs 被高估underdog进攻"同型错误，但这次是反向）

**What happened:** 美国 1-4 比利时。我们预测Belgium 52%微弱边（odds校准后从原55-58%下调）、2-1或拖加时，理由是：(a) 市场To Advance 50-50证实"真coin-flip"，(b) USA主场+co-host压力 vs Belgium客场（Lesson 20压力不对称），(c) USA虽失Balogun但Pulisic是真正talisman。**实际：比利时4-1大胜**（非险胜，非加时），在客场Lumen Field以质量碾压USA。

**Root cause（为何是第4次同型错误，且与前3次对称）:** 这是**07-01墨西哥2-0、07-02美国2-0波黑、07-03瑞士2-0之后连续第4场"favorite vs 被高估的underdog进攻"同型错误，但方向相反**：
- **前3次**：我们给了underdog进球/加时尾部（基于压力不对称/BTTS/lead-lapse叙事），实际favorite零封轻取 → 我们**高估了underdog的进攻**。
- **07-07 Match 2**：我们把Belgium当"会踢得艰难的favorite"（52%接近coin-flip、2-1或拖加时），实际Belgium 4-1大胜 → 我们**高估了削弱版underdog仍能竞争**。

**两者根因相同：未正确执行Lesson 22门槛检查。** USA失Balogun（本届3球头号射手，占USA组赛进攻产出的~50%）后，Pepi替补0球、真实进攻兑现力已跌破1.0 g/g。按Lesson 22门槛，USA已"无牙齿"，此时Lesson 20（压力不对称→favorite踢得艰难）应**全部降权**——USA即使有主场压力，也没有"把压力转化为威胁"的工具（Balogun缺）。但我们被三个软信号误导：① odds市场50-50 To Advance（误以为是真coin-flip），② USA主场Lumen Field氛围（Lesson 20），③ "Pulisic才是真talisman"（过度乐观）。实际Pulisic一人无法替代Balogun的终结力，Belgium以5-8位质量差+USA失40%+进攻产出 → 正常取胜3-1/4-1，而非我们预测的险胜2-1/加时。

**Odds校准的双刃剑（首次应用的教训）:** Odds-analyst成功防止了07-06式的"高置信度押错方向"（我们原本55-58% Belgium被市场50-50拉回52%，避免了过度自信），但**引入了新风险**：
- **市场50-50 To Advance ≠ 90分钟真coin-flip。** 市场可能定价"90分钟Belgium微弱边，但客场+加时/点球不确定性→整体50-50"，不代表比赛过程接近。
- **我们误把"To Advance 50-50"当成"Belgium会踢得艰难"的信号**，叠加Lesson 20压力不对称，预测了险胜/加时。实际Belgium可以90分钟内以质量碾压（因为USA无牙齿）。
- **Odds校准应与Lesson 22门槛检查并行，不能覆盖它**：若underdog已被证明无牙齿（失头号射手占进攻40%+），即使市场给50-50，我们也应坚持"favorite正常取胜"判断，最多承认"过程可能不轻松"但比分不是险胜。

**Lesson（Lesson 22的执行层强化 + odds校准的权重纪律，mandatory）:** 当underdog的**头号射手确认缺阵且该射手占其进攻产出40%+**时（如USA失Balogun 3/总进球~50%），这不是"微弱削弱"而是**结构性瓦解**——终结力断崖式下降，真实进攻兑现力已跌破Lesson 22的1.0 g/g门槛。此时：
- **强制执行Lesson 22门槛检查** → underdog判定"无牙齿"
- **Lesson 20压力不对称全部降权** → 不预测"favorite踢得艰难/险胜/加时"，改预测"favorite正常质量取胜"
- **Odds市场的50-50 To Advance不能覆盖门槛检查** → 市场可能定价客场/主场/加时不确定性，但若underdog无牙齿，favorite可以90分钟内正常取胜（2-0/3-1）而非险胜/加时
- 具体操作：预测favorite正常小胜到中胜（2-0 / 3-1，视质量差），标注"过程可能因客场/压力不轻松，但underdog失终结力→favorite应90分钟内决胜"，置信度中（非低/中低）
- **与前3次同型的对称记忆**：前3次我们高估underdog进攻（给了进球/BTTS），本次我们高估削弱版underdog仍能竞争（给了coin-flip/加时）——两者都是Lesson 22门槛检查执行不力，让软信号（压力/市场/氛围/BTTS）覆盖了硬证据（进攻产出<1.0 g/g）。

**Odds校准的修正纪律（首次应用后的calibration）:** 
- Odds-analyst的价值在于**防止过度自信、识别coin-flip信号**，这在07-07 Match 1（葡萄牙vs西班牙）成功验证 ✅
- 但**市场定价≠比赛过程**：To Advance 50-50可以兼容"90分钟一方微弱边、加时/点球toss-up"
- **当市场共识 vs 我们的Lesson 22/27/29硬证据门槛检查冲突时，优先级：硬证据门槛 > 市场定价 > 软叙事**
- 具体：若underdog已被门槛检查判定"无牙齿"，即使市场给50-50，我们坚持favorite正常取胜，最多因市场信号把置信度从"高"压到"中"，但不翻转到"险胜/加时/coin-flip"

## 2026-07-06 Session ❌❌ **0/2 灾难性全败**（淘汰赛首次两场全败；技能运行以来最惨重失败日；两场都是高置信度预测、方向完全反了）

### Lesson 31: Lesson 22"有牙齿"门槛需要分级 —— 超级巨星单点（Haaland/Mbappé tier）能在关键时刻单人逆转质量差，不能套用普通"underdog能进1球"框架 ❌❌ 方向完全错（预测巴西晋级，实际挪威2-1淘汰五星巴西）

**What happened:** 巴西 1-2 挪威。我们的预测机制：巴西质量+深度压过挪威（FIFA #3-5 vs #25-30，~22位差）+ Raphinha/Paquetá双缺削弱创造力（Rule 4）→ 不锚大胜；挪威有真牙齿（Haaland 5球，Lesson 22 PASS）→ BTTS活跃、加时尾部~27%。**主预测：巴西2-1晋级**（承认挪威进球，但巴西质量仍晋级），置信度中（方向~62%）。**实际：Haaland 80' + 89' 连入两球**（锦标赛第6、7球），最后11分钟摧毁巴西；上半场 Bruno Guimarães 点球被 Ørjan Nyland 扑出；Neymar 90+' 点球挽回颜面但为时已晚。**挪威历史首次晋级8强，五星巴西出局。**

**Root cause（为何"有牙齿"判定不够）:** 我们严重低估了 Haaland 个人的"决定性单点爆发"能力。Lesson 22 的门槛是"underdog ≥1.3 g/g 即 PASS → 能真实 outscore、不套低块框架"——这个门槛判定的是"underdog 有进球威胁"，我们据此正确地没把挪威当铁桶（Lesson 27不适用）、预测BTTS活跃。**但 Haaland 不是"有牙齿"级别，他是世界第一终结者**（锦标赛7球并列金靴、连续5场破门、曼城单赛季72球的历史怪兽）。我们把他当"挪威能进1球的保证"，实际他是**"能在关键11分钟连入2球、单人改写比赛的超级巨星"**。淘汰赛是单场定生死，Haaland 的80'+89'双响**单人逆转了22位质量差** —— 这不是 Lesson 22 框架下"有牙齿 underdog 进1球、favorite 还剩2球获胜"的常规模式，而是**超级巨星在关键时刻单点爆发、把比赛从favourite手里硬抢走**的非常规模式。

此外，我们预测"巴西被削弱（Raphinha/Paquetá缺）但仍晋级方向~62%"时，没预见 Nyland 扑点 + 巴西终结低效（xG 2.35却仅进1球）的叠加崩溃。"质量差压倒一切"的惯性思维在淘汰赛单场遭遇超级巨星爆发时失效。

**Lesson（Lesson 22 分级门槛，mandatory）:** Lesson 22 的"有牙齿"判定需要**二级分类**，不能一刀切：
- **A 档"有牙齿"（1.3-2.5 g/g，普通国脚级主力）：** underdog 能真实进球、不套低块。favorite 晋级方向仍偏向（质量差 >> 进攻牙齿），但 BTTS 活跃、加时尾部显著。（如厄瓜多尔 2-1 德国B队：厄进攻达标但德国A队仍压制）
- **S 档"超级巨星单点"（世界前3终结者：Haaland/Mbappé/Kane/Messi/Ronaldo tier，锦标赛已5+球 + 连续破门）：** **这类球员在淘汰赛单场90分钟内的爆发上限，能单人逆转20-30位质量差。** 当 underdog 拥有 S 档巨星且 favorite 有明显削弱（攻击线缺阵/防线漏洞）时，**不能默认"质量差决定晋级方向"**；应标为**真 coin-flip（45-55%）或至少大幅压低 favorite 晋级概率到55-60%**（非本场的62%）。S 档巨星的决定性，在于他们能在**关键10-15分钟内连入2球**（Haaland 80'+89'、Mbappé对阿根廷决赛帽子戏法），这不是均值xG能捕捉的。
- **判别标准：** 本届已5+球 **且** 连续3+场破门 **且** 俱乐部赛季50+球/世界金球前3 → S档。否则A档。
- **执行修正（07-06 case）：** 巴西（残阵：Raphinha/Paquetá缺）vs 挪威（Haaland S档 7球连场）→ 应判**真 coin-flip 或挪威晋级45-48%**（非预测的38%），主预测改为"1-1/2-2 → 加时/点球 toss-up"而非"巴西2-1晋级~62%"。**淘汰赛单场，S档巨星单点决定性 > 22位质量差。**

### Lesson 32: Lesson 7/8 海拔规则的质量门槛需重校准 —— 顶级球队（FIFA前5-8）可能部分抵消生理劣势，不能无脑套用"捷克0-3"的普通欧洲队案例 ❌❌ 方向完全错（预测墨西哥晋级，实际英格兰3-2高海拔客场+10人逆境晋级）

**What happened:** 墨西哥 2-3 英格兰。我们的预测机制（反市场、高置信度~58%）：⭐ Lesson 7/8 阿兹特克2240m海拔是**本轮最强规则**（Tuchel亲承适应"不可能"，VO2max降10-13%，跑动/高速跑显著下降，60'后有氧断崖）+ 墨西哥4战全零封+主场+海拔 vs 英格兰右后卫双缺（James/Quansah）+ 质量差~8位 << 50位豁免门槛 → **海拔劣势无法被质量抵消** + 06-25 捷克0-3墨西哥（同场馆）已验证。**主预测：墨西哥晋级 1-0/2-1**（90分钟胜或拖加时），置信度中高~58%，**明确标注"反市场、规则驱动"**。**实际：英格兰 3-2 险胜**（Bellingham 梅开二度建功），英格兰下半场有球员被罚下（10人应战），在**2240m高海拔+10人应战+客场**的三重逆境下守住领先晋级。Lesson 7/8 海拔规则**在英格兰这个级别的对手面前首次重大失效。**

**Root cause（为何海拔规则在此失效）:** Lesson 7/8 的核心逻辑是"2000m+ 欧洲队无缓冲面临生理上限 → 质量差50位以内无法抵消"。我们用的是墨西哥#12-15 vs 英格兰#4-5（差~8位）< 50位 → 海拔满效。验证案例是06-25**捷克**（FIFA #30-35）0-3被墨西哥海拔击垮。**但捷克远不如英格兰**（Kane/Bellingham/Saka 个人质量、Tuchel战术纪律、大赛经验）。实际英格兰用个人质量（Bellingham 2球）撕开了墨西哥的"4战零封墙"，且在10人应战的极端逆境下仍守住领先。三点失误叠加：

1. **"质量差50位豁免门槛"在顶级球队（FIFA前5-8）面前可能失效。** 普通欧洲队（捷克#30-35）vs 顶级欧洲队（英格兰#4-5）在海拔适应上可能不是线性对等的——**顶级球队的个人技术+大赛经验+心理韧性，能部分抵消生理劣势**，至少在"10人应战仍守住"的韧性层面。Lesson 7/8 可能需要**二级门槛**：普通欧洲队（FIFA 20+，如捷克）海拔劣势满效；顶级欧洲队（FIFA前8，如英格兰/法国/德国/西班牙）海拔劣势降权（不能一票否决质量差）。

2. **"Tuchel亲承适应不可能"被当作决定性证据，但主帅赛前发言可能是心理战/降期望。** 英格兰实际表现（3-2 + 10人守住）说明他们比Tuchel公开承认的更有准备（beetroot juice/咖啡因/赛前训练）。主帅发言是软信号，不能单独支撑高置信度反市场预测。

3. **墨西哥"4战全零封"的防线在面对Kane/Bellingham个人质量时被撕开。** 我们押的是"海拔+零封墙=英格兰打不穿"，实际英格兰用个人质量撕开了零封。**零封记录对阵的对手质量需要权重**——墨西哥组赛零封的是韩国/南非/捷克，非英格兰级别。对顶级球队的零封能力，不能从对中等球队的零封记录线性外推。

**Lesson（Lesson 7/8 质量门槛重校准，mandatory）:** Lesson 7/8 的"2000m+ 海拔对欧洲队满效、质量差50位豁免门槛"需要**二级修正**：
- **普通欧洲队（FIFA 15-50）：** 海拔规则**满效**（06-25 捷克0-3验证）。质量差<50位无法抵消，预测主场方不败（胜或拖加时）。
- **顶级欧洲队（FIFA前8：英/法/德/西/葡/意/荷/比）：** 海拔规则**降权**——个人技术+大赛经验+韧性能**部分抵消**生理劣势。此时需叠加其他变量综合判断：
  - 若顶级欧洲队**全主力健康** + 质量差≥10位 + 对手零封记录对阵的是**中等球队**（非顶级） → 海拔劣势**不足以翻转方向**，仍可预测顶级队险胜（如本场应判英格兰2-1而非墨西哥1-0）。
  - 若顶级欧洲队**有重大缺阵** + 对手是CONCACAF劲旅全主力+4战零封过真正强队 → 海拔劣势叠加，偏主场方。
  - **置信度纪律：** 即便偏主场方（墨西哥），也不能给"中高~58%"——顶级欧洲队在2240m的韧性下限比捷克高，应标"低-中~52-55%"。
- **验证案例差异承认：** 06-25 捷克0-3 ≠ 英格兰，两者不可直接类比。捷克是FIFA#30+中游欧洲队，英格兰是FIFA前5顶级+Kane/Bellingham个人质量。**别把对中游队的验证案例，无脑套用到顶级队身上。**

### 两场共同的深层问题（方法论反思）

**07-06 两场全败的共同根因：** 我们在淘汰赛"个人巨星决定性"面前，**过度依赖结构性规则（攻击线被削、海拔生理上限）和统计均值（质量差、零封记录），低估了 Haaland/Bellingham 级别巨星在单场90分钟内的爆发上限。** 小组赛可以用均值+规则（样本多、回归均值），淘汰赛单场定生死、巨星一击可逆转所有结构。**两场都是"我们押结构/规则，实际巨星个人质量硬吃结构"的镜像失败：**
- Match 1：押"质量差22位+Rule 4（巴西攻击线被削）"，被 Haaland S档单点80'+89'双响硬吃。
- Match 2：押"Lesson 7/8海拔生理上限+墨西哥零封墙"，被 Bellingham 个人质量（2球）+英格兰10人韧性硬吃。

**修正方向：** 淘汰赛单场，当 underdog/客队拥有**S档超级巨星**（Haaland/Mbappé/Bellingham tier，本届已5+球连场破门）且 favorite 有明显削弱时，**巨星单点决定性 ≥ 结构性规则**。不能默认"结构压倒巨星"，应标 coin-flip 或大幅压低结构性 favorite 的置信度。

## 2026-07-08 Session (强方法论验证日 — Lesson 25/27/28/31 集中兑现，无新失败型错误)

### Lesson 34: S档巨星(L31) × 有牙underdog(L27) 综合律 + 真coin-flip的名义-lean纪律 ✅✅ 两场均正确（阿根廷3-2埃及、瑞士0-0点球哥伦比亚）

**What happened（两场都对，固化为正向规则）:**
- **阿根廷 3-2 埃及**：我们预测阿根廷晋级 2-1/加时3-2、ARG 70%，**关键是明确"不锚阿根廷零封、保留埃及30%尾部"**（理由：阿根廷R32 vs佛得角已失2球、防线脆弱真实；Salah世界级攻击点）。实际阿根廷3-2，埃及进2球紧咬——"3-2"预测命中，"不锚零封"读法完全正确。
- **瑞士 0-0 哥伦比亚（点球4-3）**：我们预测真coin-flip、90分钟0-0/1-1→加时点球、Lesson 28点球toss-up。实际0-0（exact）→点球瑞士4-3。0-0是首选比分、拖点球过程全中，且因标toss-up未被记为"方向错"。

**为何要固化为规则（与07-06的互补性）:**
07-06 巴西惨败教训是"押结构压过S档巨星→被Haaland硬吃"。若矫枉过正，下一个陷阱就是反向的"有S档巨星就默认favorite碾压零封"。07-08 阿根廷3-2埃及证明**正确的综合是两者并存**：
- **Lesson 31（S档巨星）决定的是胜负方向**——Messi/阿根廷质量拿下比赛。
- **Lesson 27（有牙underdog会进球）决定的是比分形态**——埃及有Salah真实攻击点+点球淘汰澳的韧性，是有牙的B类，会进1-2球。
- **两者不互斥**：巨星带走胜利 ≠ favorite零封。当 favorite 自身防线脆弱/近期连续失球（阿根廷vs佛得角失2、vs埃及失2）且 underdog 有真实攻击点时，**预测"巨星带走胜利 + favorite失1-2球、不锚零封"（如阿根廷3-2）。**

**Lesson（综合阶段，mandatory）:**
1. **S档巨星 × 有牙underdog 综合律**：当 (a) favorite 有S档巨星（L31触发）**但** (b) favorite 防线脆弱/淘汰赛近期已失球，**且** (c) underdog 有真实攻击点（过L22门槛 或 有世界级前锋如Salah健康首发，即L27的B类"有牙"侧）→ 主预测 **"favorite凭巨星取胜方向 + 失1-2球、明确不锚零封"**。别落入两极：既不要"结构压巨星"（07-06错），也不要"有巨星就必零封碾压"（潜在反向错）。判别口诀：**巨星定方向，underdog的牙齿定比分形态。**
2. **真coin-flip的名义-lean纪律（Lesson 28的延伸）**：被判为真coin-flip的场次——**尤其"双方R32均零封"的双零封互锁型**——直接标 **50/50**，不写 52/48 之类虚假精度；点球方向按 Lesson 28 标 toss-up。07-08瑞士/哥伦比亚我们写了名义COL 52%，瑞士点球胜后留下"名义方向差4%"的瑕疵记录。**执行：真coin-flip = 50/50 + 点球toss-up，让诚实的coin-flip不产生"方向错"的账。**
3. **双零封互锁 → 0-0 优先于 1-1（Lesson 17在淘汰赛的延伸）**：当两支球队R32均零封、且均以防守见长时，90分钟 **0-0 比 1-1 更可能**（07-08瑞士0-0哥伦比亚验证）。低比分锚定时，双零封对决默认0-0/1-0，而非1-1。

## 2026-07-10 Session (1/4决赛第1场；1/1方向命中，比分shape误锚 — Lesson 34 首次"过度应用")

### Lesson 35: Lesson 34"不锚零封"闸门需双硬门槛 —— favorite防线本届淘汰赛"已实际失球"(真fragile) 且 underdog teeth对"同级强防"证明过且主力健康；任一不成立 → 回退Lesson 25锚favorite零封 ⚠️ 方向对/比分shape错（误给摩洛哥1球，实际法国2-0零封）

**What happened:** 法国 2-0 摩洛哥。我们援引 **Lesson 34（S档巨星×有牙underdog综合律）**，预测法国 2-1、**明确"不锚零封、保留摩洛哥进1球尾部"**（理由：Mbappé S档定方向 + 摩洛哥有"进攻牙齿"3-0加拿大 → 巨星带走胜利+法国失1球）。**实际：法国 2-0 零封**（Mbappé 60' + Dembélé 66'，且Mbappé 28'射失点球）。关键数据：**法国22射9正 vs 摩洛哥仅5射0球**，摩洛哥全场未能真正威胁法国球门，靠门神Bounou扑救9次才"keep the scoreline respectable"（否则法国3-4球大胜）。方向对（法国晋级）、法国进球数(2)对，但"摩洛哥进1球"的核心shape判断彻底落空。

**Root cause（为何 Lesson 34 在此过头 —— 与07-08阿根廷3-2埃及的正例精确对照）:** Lesson 34 是07-08刚从阿根廷3-2埃及固化的正向规则，本场是它**首次被套用到不该套用的语境**。Lesson 34 的触发有**两个隐含硬条件**，07-08阿根廷vs埃及**两个都成立**，而本场法国vs摩洛哥**两个都不成立**：

| 条件 | 07-08 阿根廷3-2埃及（Lesson 34正确触发）| 07-10 法国2-0摩洛哥（Lesson 34错误套用）|
|---|---|---|
| **(b) favorite防线是否fragile？** | ✅ 真fragile：阿根廷vs佛得角失2、vs埃及失2，淘汰赛连续失球 | ❌ **反脆弱**：法国防线elite（Saliba/Upamecano），淘汰赛零封巴拉圭(1-0)+瑞典(3-0)，**本届从未失球** |
| **(c) underdog teeth是否对同级强防证明过+主力健康？** | ✅ Salah世界级单点、健康首发，teeth可迁移到任何防线 | ❌ 摩洛哥teeth仅是"3-0加拿大"，而加拿大是**我们自己判定的Type-A弱防（Lesson 29）**；且头号射手Saibari伤缺、En-Nesyri未入选 → teeth对弱旅证明，**不可迁移到法国elite防线** |

**两个致命的语境不可迁移错误（Lesson 26的underdog侧+favorite侧双重失守）：**
1. **underdog teeth不可迁移**：摩洛哥3-0加拿大的进球，是打**Type-A中档弱防**（加拿大失4、从未零封强队）取得的。我们在07-05已判加拿大为Type-A，却在07-10把"摩洛哥能打进加拿大3球"当成"摩洛哥对法国elite防线也有牙"——这正是Lesson 11/19/26反复强调的"样本语境不可迁移"，只不过这次错在**用underdog打弱旅的进攻数据，去预测它打强防的兑现力**。实际摩洛哥5射0球，中场分散威胁(Ounahi/Rahimi)对法国elite中卫完全失效。
2. **favorite防线记录被无视**：facts.md里我们**自己写了**"法国防线elite（Saliba/Upamecano）→非脆弱"，Phase 3却仍援引Lesson 34"不锚零封"。这是**执行纪律失守**——嘴上承认favorite防线elite，手上还按"会失1球"锚比分。法国本届6战零封5场（仅组赛失个别球），淘汰赛巴拉圭/瑞典/摩洛哥三场全零封，是全世界最该锚clean-sheet的防线之一。

**为何法国仅2-0而非大胜（避免误读为"Lesson 30最小margin正确"）:** 法国22射9正，xG远超2球，**是Bounou神扑9次+摩洛哥全员回收铁桶把比分压到2-0**，不是我们预判的"摩洛哥有牙反击换来自己1球+压制法国"。Lesson 30"proven Type-B铁桶→favorite最小margin"在**防守侧**部分成立（摩洛哥确是拖荷兰点球的Type-B，防守韧性真实、把法国压到2-0而非4-0），但我们错在**同时给了摩洛哥"进攻牙齿"**——摩洛哥是"防守有牙/进攻无牙"的纯Type-B（Lesson 27定义），**防守韧性≠进攻兑现力**。正确读法应是：Type-B防守韧性 → 法国小胜不大胜（1-0/2-0）**且零封**（因摩洛哥进攻无牙+主力缺阵），而非2-1。

**Lesson（Lesson 34 的双硬门槛修正，mandatory）:** 应用 Lesson 34"favorite凭巨星取胜+失1-2球、不锚零封"前，必须**同时**满足两个硬门槛，缺一即回退 Lesson 25 clean-sheet default（锚favorite零封1-0/2-0）：
- **门槛(b) — favorite防线真fragile（硬证据）**：favorite**本届淘汰赛已实际失球**（如阿根廷vs佛得角/埃及连续失球）。若favorite淘汰赛保持零封/防线elite（如法国Saliba/Upamecano三场零封）→ **门槛不达标，锚零封**。不接受"理论上会失球"的软判断——要看它这届淘汰赛**实际有没有失过球**。
- **门槛(c) — underdog teeth是"硬牙"（对同级强防证明过 + 主力健康）**：underdog的进攻威胁必须是 (i) 世界级单点球员健康首发（Salah/Mbappé tier，teeth可迁移到任何防线），**或** (ii) 其进攻兑现力是对**强防/同级对手**证明的（非打弱旅刷的数据）。若underdog的teeth仅对Type-A弱旅证明（摩洛哥3-0加拿大）**或**头号射手缺阵（Saibari伤+En-Nesyri未入选）→ **teeth不可迁移，视为进攻无牙，锚favorite零封**。
- **口诀更新**：Lesson 34 原口诀"星定方向、underdog的牙定比分"**仍成立，但"牙"必须是硬牙**——(i)对强防证明过 或 (ii)世界级单点健康首发。软牙（打弱旅刷的数据/主力缺阵/分散中场威胁）在favorite elite防线前一律视为无牙，回退零封锚。
- **与07-06的三角记忆**：07-06巴西惨败=押"结构压S档巨星"被Haaland硬吃（低估巨星）；07-08阿根廷3-2=Lesson 34正确（巨星定方向+真fragile防线失球）；07-10法国2-0=Lesson 34过度（favorite防线elite+underdog软牙，误拒零封）。**三者共同锁定：巨星决定方向是稳的；比分shape取决于"favorite防线这届实际失球没有"和"underdog的牙是硬是软"两个硬证据，不能凭Lesson 34的名字就默认不锚零封。**

### Lesson 36: Phase 1 必须联网核实真实数据 —— 绝不凭记忆/内部ledger写facts，绝不假设"赛程是虚构的、公网查不到" ⚠️ 流程性错误（07-10 facts三处数据错，逼出整份-updated重跑）

**What happened:** 07-10 法国vs摩洛哥的原始 `facts.md` 开头写了一句前提："**本锦标赛为模拟赛程：赛果以用户赛果板截图+内部ledger为权威，公网无这些虚构比分**"，据此**没有联网**，直接用内部ledger+记忆填写facts。结果**三处关键数据错误**：(1) Mbappé写"本届7球+生涯18球"，真实是生涯**19球**（仅次梅西）；(2) **En-Nesyri当成摩洛哥主力中锋**参与teeth判定，真实是新帅Ouahbi**根本没把他选入大名单**；(3) **完全漏掉Saibari（头号射手）腿筋伤缺**；(4) 场馆写"美国场馆待定"，真实是Foxborough/Boston。事后不得不联网重跑，生成 `facts-updated.md` + `synthesis-updated.md` 纠正。虽然最终预测方向对，但**整个Phase 1建立在错误/缺失数据上**，且En-Nesyri的误判直接喂进了Lesson 34的teeth评估（虽最终被Lesson 35纠偏，但属于侥幸）。

**Root cause:** 把"我们这套锦标赛的赛果是自成体系的模拟数据"这个**错误前提**当成了真理。实际上2026世界杯是真实赛事、公网有ESPN/CBS/FOX/FIFA完整报道。这个错误前提导致：
- **该联网的没联网**：球员实时进球数、伤停、大名单、场馆——这些**只能靠每次联网获取**，记忆会过时、会幻觉（Mbappé球数、En-Nesyri在阵）。
- **内部ledger被越权使用**：`ledger.md`的权威范围**仅限"我们自己过去的预测vs实际结果"**（用于追踪命中率、复盘教训），它**不是**球队当前阵容/状态/伤停/球员实时数据的来源。把ledger当成"事实数据库"去填facts，是范围误用。

**Lesson（Phase 1执行纪律，mandatory）:** 
- **每次运行，写facts.md之前，先联网核实每一条事实**：真实比分、开球时间、**确切场馆**、以及**阵容/伤停/大名单状态**（谁伤、谁停赛、谁根本没入选）。球员的本届实时进球数**必须联网**，不得凭记忆或ledger。
- **绝不在facts.md开头写"这是模拟赛程/公网查不到"然后据此跳过联网**。真实赛事一律默认公网可查；先搜，搜不到才标注。
- **ledger.md的权威边界**：只对"我们自己的历史预测准确度"权威；**对球队当前阵容/form/伤停/球员实时数据无权威**——这些每次都要联网。
- **若联网确实查不到某场次**（罕见）：明确说明，并把该条事实标 `⚠️ UNVERIFIED`，而非把猜测当ground truth。
- 已写入两个技能的 SKILL.md（worldcup + allsvenskan）Phase 1 step 0 + Guardrails "Verify before predict"。



