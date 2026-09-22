# 开发过程与复现

## 时间线

2026-09-22 开始按原提示词顺序工作。先盘点用户指定目录与远程，发现空仓库后初始化 main；没有覆盖已有用户源码。工作分为 S0–S17，每阶段写 DEVLOG、提交并推送；S17 拆分为功能收尾与最终验收记录。

1. **S0–S2，需求与文献**：先保存原提示词、忽略规则和配置样例；逐项读取给定论文摘要/元数据、官方项目说明，整理 24 张阅读卡片；写七节法语初稿和对比表。访问受限及未全文核验的内容明确 TODO。BibTeX 解析与 LaTeX 编译分别验证。
2. **S3–S5，来源链**：先实现存储和 SSE，再做 PDF/HTML 统一文档；最后建立句子 ID 到 PDF 行框或 HTML span 的映射。坐标测试专门覆盖旋转与缩放，避免把“能提取文本”误当成“能正确定位”。
3. **S6–S10，抽取和核验**：统一模型协议后依次实现骨架、分节、跨节、局部规则、批评者、两轮修复、建议与 REST。测试先用明确标注的人工假模型，未把夹具声称为真实录制输出。提供有 key 时录制的脚本。
4. **S11–S14，阅读交互**：先写 DESIGN，再开发法语文档库、图和详情，最后做全文与返回路径。浏览器检查发现 ELK bundled worker 构造问题，换官方 API + 显式 worker URL；修正 iframe 多余空白。
5. **S15–S16，可分发原型**：补安装/启动/开发脚本、CI、Docker 可选配置、双语 README；构建公有领域 Descartes 示例。Playwright 发现 Enter 只选节点未开详情、节点测量未回填、缩窗未适应等真实问题，修复后加入回归断言。
6. **S17，端到端核对**：直接模拟 LiteLLM transport 验证 Instructor 的 strict 字段、JSON 回退、缓存和日志；修复包装异常导致回退不触发的问题。真实 arXiv 下载发现图片相对路径和 CSS layer import 处理不足，修复后静态资源从 7 个恢复至 64 个，仅剩一个外部字体未缓存。整理无效图结构，确认报告保留删除记录。补全过程文档和远程全新克隆验证。

7. **S18，三语界面**：集中词库、语言偏好、分析语言与缓存隔离，按语言运行浏览器测试。
8. **S19，真实文档验收（2026-09-23）**：第一次用真实论文和真实 API 完整运行，暴露出只用假模型测不出的问题：PDF 版面解析失效、思考模式的 tool_choice 限制、推理 token 占满输出上限、修复轮丢子步骤、全部条目被标成待核实、步骤与关系 ID 撞名。按"先定位原因、再写测试、再修复、再用真实调用复测"的顺序分成 S19a–S19e 五个提交。
9. **S20，界面与文案**：逐页截图检查，先提交功能性修复（矛盾连线、节点高度、位置标记、任务续跟），再整体重做界面与三语文案，最后重建示例。每个提交前运行与 CI 相同的检查和 Playwright 用例。
10. **S21，网页端完整验收与文档**：通过网页上传真实论文，分别生成中文（命中缓存）和英文（全新调用）图谱，据此修复模型输出变体导致的重试、录制脚本和节点标题截断（S21a–c）；README 两种语言重写，补充决策记录、架构说明和接口核实笔记（S21d），综述轻度修订（S21e）。

## 每阶段的关键验证命令

| 阶段 | 关键命令/操作 |
|---|---|
| S0 | `pwd`、`ls -la`、`git status`、`git remote -v`、`git fetch` |
| S1 | Python 解析 `references.bib`；检查 24 张卡片链接 |
| S2 | `cd paper/etat_de_lart && make`；Poppler 页面检查在 S17 完成 |
| S3 | `pytest backend/tests/test_foundation.py`；HTTP curl SSE 在 S17 补验 |
| S4 | `pytest backend/tests/test_ingest.py` |
| S5 | `pytest backend/tests/test_anchors.py` |
| S6 | `pytest backend/tests/test_llm.py` |
| S7 | `pytest backend/tests/test_extraction.py` |
| S8 | `pytest backend/tests/test_validation.py` |
| S9 | `pytest backend/tests/test_suggestions.py` |
| S10 | `pytest backend/tests/test_e2e.py` |
| S11 | `python -m scripts.export_openapi`；`pnpm types/lint/build` |
| S12 | `pnpm test`，图算法和布局输入 |
| S13 | `pnpm test`，坐标；Playwright 图与详情截图 |
| S14 | Playwright 节点→原文→返回；键盘路径 |
| S15 | 独立新虚拟环境 `bash scripts/setup.sh`；`PORT=8011 python3 run.py` |
| S16 | `python -m scripts.build_examples`；`pnpm test:e2e`；PDF 两页检查 |
| S17 | 全量检查、真实 arXiv 解析、真实 HTTP 假模型 SSE、远程克隆验收、PDF 逐页检查 |
| S18 | `pnpm test`（词库占位符与示例文案覆盖）；三语 Playwright |
| S19a | `pytest backend/tests/test_ingest.py backend/tests/test_anchors.py`（合成双栏论文）；真实论文解析统计 |
| S19b | `pytest backend/tests/test_llm.py`；对 DeepSeek 做极小的 tool_choice 探测请求 |
| S19c | `pytest backend/tests/test_extraction.py`；真实运行对比调用次数与 token |
| S19d | `pytest backend/tests/test_validation.py`；只重跑核验之后阶段的真实运行 |
| S19e | `pytest backend/tests/test_e2e.py`；OpenAPI 与前端类型重新生成 |
| S20a–f | `pnpm lint && pnpm test && pnpm build`；`BASE_URL=http://127.0.0.1:8010 pnpm exec playwright test`；逐页截图 |
| S21 | 文档链接与命令逐条核对；`cd paper/etat_de_lart && make` |

表中 Python/pytest 应在 `.venv` 中运行，pnpm 在 frontend 目录运行；完整可复制命令见下。每次提交的实际结果和遇到的问题见 [DEVLOG](DEVLOG.md)，失败没有算作通过。S1 首次 BibTeX parser API 用错、S2 的 LaTeX 安装判断错误均已更正记录。

## 从零复现

安装 Python≥3.11、Node≥22.13、pnpm11.19.0、Git 后，按 README 三条命令克隆、setup、run。`setup.sh` 不覆盖已有 `.env`。无 key 时仍导入演示；新文档需配置 DeepSeek key 并重启。run.py 自动使用项目虚拟环境。

```sh
.venv/bin/pytest -q
.venv/bin/ruff check backend scripts run.py
.venv/bin/ruff format --check backend scripts run.py
.venv/bin/python -m scripts.export_openapi
(cd frontend && pnpm types && pnpm exec prettier --write src/api-schema.d.ts && git diff --exit-code -- src/api-schema.d.ts)
(cd frontend && pnpm lint && pnpm test && pnpm build)
```

浏览器测试：先启动 `python3 run.py`，另一个终端执行：

```sh
cd frontend
pnpm exec playwright install chromium
pnpm test:e2e
```

这会更新 `docs/screenshots/`；测试运行目录已忽略。截图基于 Chromium、1440px 和 1024px。PDF.js 在桌面浏览器渲染，最低浏览器版本没有建立兼容矩阵。

论文编译：安装 MacTeX/TeX Live（含 babel-french 与 plainurl），`cd paper/etat_de_lart && make`。正文7节、24条引用，最终6页，URL/DOI 可点击。`pdftoppm -png main.pdf page` 用于逐页核对；源码和参考文献入库，PDF 不入 git。交付目录另提供编译 PDF。

## 验收边界

S17 时的结论（仅离线测试、未配置 key）已被 S19–S20 取代。当前状态（2026-09-23）：

- 离线测试：后端 pytest 65 项、前端 Vitest 11 项、Playwright 10 条全部通过；GitHub Actions 对 S19a 以后的每个提交都运行并通过（Actions 页面可查）。
- 真实 API：用 arXiv 2607.26712v2（14 页双栏）和 deepseek-flash 做了完整运行。首次完整运行 208 秒、31.1 万 token、LiteLLM 估算约 0.06 美元；之后改动核验与修复阶段时，其余阶段命中缓存，每次重跑 30–40 秒。也通过网页上传同一 PDF 分别生成了中文和英文图谱（见 DEVLOG S21）。
- 仍未验证：Docker、GROBID、Langfuse、可选向量模型、DeepSeek 以外的服务商；多学科文本（哲学、随笔）上的人工语义评价。

## 全新远程克隆验收

2026-09-22 从 `git@github.com:YEKESONG/Visual_Reasoning_Maps.git` 新克隆提交 `6401b73` 到空目录。没有复制本机虚拟环境、node_modules、构建产物或数据。设置本机 Python/Node/pnpm 路径后执行 README 的 setup.sh，创建独立 .venv、安装锁定依赖、生成前端构建；39项后端测试、Ruff、前端lint和7项单测通过。`PORT=8013 python3 run.py` 启动后，curl health 返回 ok/configured=false；首页、两份演示的 flow/source 全部HTTP200；新克隆工作树干净。S17b 只更新验收文档，运行代码与这次验证相同。

S16 的 GitHub Actions 已确认成功：[run 35753367757](https://github.com/YEKESONG/Visual_Reasoning_Maps/actions/runs/35753367757)。最终提交的 CI 状态见仓库 Actions，最终交付报告另记录发布时观察到的结果。

## 已知局限与下一步

- PDF 版面靠启发式规则：一栏/两栏、按字号和粗细识别标题、带横线的表格可以处理；三栏、无横线表格、复杂浮动体仍需更多样本。扫描件需外部 OCR。跨页句子已能接续，但只在起始页高亮。
- 非思考模式下，修复轮对结构缺口（例如某条分支没有通向结论）的修复效果有限，残留问题写入 validation_report.json；可以把 repair 加入 LLM_THINKING_STAGES 换取更强的修复。
- 核对使用与抽取相同的模型，不能保证错误独立；自报 confidence 不是校准概率。
- 长文骨架按章节首尾抽样；超长文档（数百页）的核对和修改建议输入仍可能接近服务商上下文上限。
- 同源 iframe 清洗后禁脚本；保留主样式和图片，省略远程字体和部分 CSS 背景。
- 默认字符串相似度去重，嵌入可选；原文泳道布局未实现，扩展入口见 ADR-005。
- 单进程、无鉴权、无持久队列，仅供本机使用。重启会中断运行中的任务，已完成阶段的缓存保留。
- 下一步最有价值的工作：在科学论文、哲学文本和随笔上各取样本做人工评价，按错误类型调整提示词和分块策略。
- 综述尚需核实全文页码、实验方法细节和个别最终发表信息，清单见 [paper/README](../paper/README.md)。

## 提交记录

以下为实际提交记录（`git log --oneline --reverse`）。最新的文档提交可通过 `git log` 查看；快照不自引用自身哈希。

```text
cdf804a chore: initialize repository and development record [S0]
191e0f1 docs(paper): verify references and create reading cards [S1]
1714f49 docs(paper): write French literature review and comparison [S2]
d59f24b feat(backend): add config storage task events and health [S3]
8e11342 feat(ingest): parse positioned PDF and cached arXiv HTML [S4]
4fb16de feat(anchors): map sentences to PDF geometry and HTML spans [S5]
961439f feat(llm): add structured calls caching and usage accounting [S6]
c0578f6 feat(extraction): add typed multi-stage grounded flow pipeline [S7]
edfe629 feat(validation): enforce evidence and graph constraints with repair [S8]
5419051 feat(review): attach grounded rule and model suggestions [S9]
0f31041 feat(api): connect full processing pipeline and document endpoints [S10]
13ced63 feat(ui): build French library upload and typed API client [S11]
c907973 feat(graph): add hierarchical layout focus filters and guided reading [S12]
158e7f2 feat(reader): show grounded details and original-layout excerpts [S13]
6a1cf0c feat(reader): add full-text page and bidirectional anchor navigation [S14]
82e71a9 build: package local startup bilingual guides and offline CI [S15]
2fb1667 feat(demo): ship public-domain examples and verified reading journeys [S16]
6401b73 fix: harden provider transport arXiv assets and graph validation [S17a]
75da6c5 docs: record clean-clone acceptance and release readiness [S17b]
664ce1d feat(i18n): add Chinese English and French language switching [S18]
04fadca fix(ingest): rebuild PDF layout parsing for two-column papers [S19a]
edda022 fix(llm): make DeepSeek thinking stages work with tool calls [S19b]
e1291f2 feat(extraction): compact model inputs, pack sections, prompts v2 [S19c]
decdfb3 fix(validation): repair with targeted patches, mark support per item [S19d]
e7ef291 feat(api): stage progress, readable failures, task status endpoint [S19e]
8b8b529 fix(map): symmetric contradiction edges and label-sized nodes [S20a]
114dd2a fix(reader): keep position markers from covering each other [S20b]
3680be9 feat(ui): resume a running analysis and name the failed stage [S20c]
f8ff1b9 feat(ui): redesign the pages and rewrite the copy in three languages [S20d]
42b41f8 feat(examples): rebuild the Descartes example with accurate titles [S20e]
5d14105 fix(map): keep relation labels to a few linking words [S20f]
a03779c fix(models): accept common variants in model output [S21a]
8d1c7e5 fix(scripts): send the current skeleton input when recording [S21b]
4c8bd9a fix(labels): cut long labels at a word and ask for six words [S21c]
```

