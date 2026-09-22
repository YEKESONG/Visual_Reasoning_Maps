# 开发过程与复现

## 时间线

2026-09-22 开始按原提示词顺序工作。先盘点用户指定目录与远程，发现空仓库后初始化 main；没有覆盖已有用户源码。工作分为 S0–S17，每阶段写 DEVLOG、提交并推送；S17 拆分为功能收尾与最终验收记录。

1. **S0–S2，需求与文献**：先保存原提示词、忽略规则和配置样例；逐项读取给定论文摘要/元数据、官方项目说明，整理 24 张阅读卡片；写七节法语初稿和对比表。访问受限及未全文核验的内容明确 TODO。BibTeX 解析与 LaTeX 编译分别验证。
2. **S3–S5，来源链**：先实现存储和 SSE，再做 PDF/HTML 统一文档；最后建立句子 ID 到 PDF 行框或 HTML span 的映射。坐标测试专门覆盖旋转与缩放，避免把“能提取文本”误当成“能正确定位”。
3. **S6–S10，抽取和核验**：统一模型协议后依次实现骨架、分节、跨节、局部规则、批评者、两轮修复、建议与 REST。测试先用明确标注的人工假模型，未把夹具声称为真实录制输出。提供有 key 时录制的脚本。
4. **S11–S14，阅读交互**：先写 DESIGN，再开发法语文档库、图和详情，最后做全文与返回路径。浏览器检查发现 ELK bundled worker 构造问题，换官方 API + 显式 worker URL；修正 iframe 多余空白。
5. **S15–S16，可分发原型**：补安装/启动/开发脚本、CI、Docker 可选配置、双语 README；构建公有领域 Descartes 示例。Playwright 发现 Enter 只选节点未开详情、节点测量未回填、缩窗未适应等真实问题，修复后加入回归断言。
6. **S17，端到端核对**：直接模拟 LiteLLM transport 验证 Instructor 的 strict 字段、JSON 回退、缓存和日志；修复包装异常导致回退不触发的问题。真实 arXiv 下载发现图片相对路径和 CSS layer import 处理不足，修复后静态资源从 7 个恢复至 64 个，仅剩一个外部字体未缓存。整理无效图结构，确认报告保留删除记录。补全过程文档和远程全新克隆验证。

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

- 本地离线后端39项、前端7项通过；Chromium 两条完整阅读路径通过。后端测试覆盖解析、锚点、图约束、修复、严格输出、JSON 回退、缓存及敏感错误隔离。
- 真实 HTTP：curl multipart 上传人工夹具，通过实际 Uvicorn SSE 收到从 0 到 100 的七条事件，最终 done；模型替身明确不属于真实模型结果。
- 真实网络：下载 Story Ribbons（arXiv 2508.06772），HTML 30节/138段/487句/64缓存资源/1条外部字体警告。文件仅在忽略的 work 中，不作为可再分发示例。
- 未配置 API key，因此没有真实 DeepSeek 生成、真实 token/费用或人工语义准确率结论。已提供 `scripts/record_fixtures.py`，用户配置后可继续模型验收。
- GitHub Actions 工作流已经提供；若不能读取远端运行结果，不能用本地通过代替“GitHub CI 已通过”。Docker/GROBID/Langfuse/可选向量模型均未做外部服务集成实测。

## 已知局限与下一步

- 多栏 PDF、公式、表格和断句仍需更丰富语料；扫描件外部 OCR。原文句子跨 PDF 段落/页边界不会自动合并。
- 主流程规模与连通性经过校验和最多两次修复，仍可能不合格；虚线标记和报告供人工复核。自报 confidence 不是校准概率。
- 长文骨架/跨节按章节首尾抽样，分节阶段保留全文；批评或修复/建议 payload 在超长文档上仍可能达到供应商上下文上限。原型不保证任意400页文档可完整分析。
- 同源 iframe 清洗后禁脚本；保留主样式和图片，省略远程字体/部分 CSS 背景。不是任意网站抓取器。
- 默认字符串相似度，嵌入可选；原文泳道布局未实现，仅有原文顺序带读与位置条；扩展入口记录在 ADR-005。
- 单进程、无鉴权、无持久队列；仅本机使用。重启丢失运行中任务状态，内容缓存和已完成文档保留。
- 本阶段完成的是可运行研究原型和可修改综述初稿；后续最有价值的工作是配置真实 key，对科学、哲学、随笔各取样人工评价，再据错误类型调整提示词和分块策略。
- 综述尚需全文页码、完整实验方法、个别最终发表信息核实；清单详见 [paper/README](../paper/README.md)。不对未核实条目补造结论。

## 提交记录

阶段提交记录将在最终验收后更新。最终文档提交本身可通过 `git log --oneline` 查看；下方快照不自引用自身哈希。
