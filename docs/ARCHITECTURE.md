# 架构与数据契约

## 模块与流向

```mermaid
flowchart LR
  subgraph browser[浏览器]
    F1["F1 上传与文档库"]
    F2["F2 推理图"]
    F3["F3 详情和原版片段"]
    F4["F4 全文阅读"]
  end
  subgraph local[本机 FastAPI]
    B1["B1 获取与解析"]
    B2["B2 句子锚定"]
    B3["B3 分阶段抽取"]
    B4["B4 校验与修复"]
    B5["B5 修改建议"]
    B6["B6 文件、接口和任务"]
  end
  E1["E1 arXiv"]
  E2["E2 模型 API"]
  F1 -->|PDF 或 URL，经 B6| B1
  B1 <-->|HTML / PDF / 静态资源| E1
  B1 -->|Document 段落与位置| B2
  B2 -->|Sentence ID 与正文| B3
  B3 <-->|骨架、分节、跨节| E2
  B3 -->|Graph| B4
  B4 <-->|逐项批评| E2
  B4 <-->|问题清单 → 修复补丁，最多两轮| E2
  B4 -->|已核验图与状态| B5
  B5 <-->|定向点评| E2
  B5 -->|Flow、Suggestion、校验报告| B6
  B6 -.->|SSE 进度| F1
  B6 -->|JSON 与原文资源| F2
  B6 -->|来源与按需解释| F3
  B6 -->|全文与锚点| F4
  F2 -->|选中步骤或连线| F3
  F3 -->|句子 ID 深链接| F4
  F4 -->|点击高亮返回步骤| F2
  F3 -->|按需解释请求| B6
  B6 <-->|解释生成与缓存| E2
```

箭头按调用/数据边界标注；HTTP 入口都由 B6 承接，图中的 F1→B1 表示业务流。E1 只参与在线文档获取；示例阅读不会访问 E2。B4 重抽仍通过统一 LLMClient，次数固定不超过两轮。

| 模块 | 路径 | 职责 |
|---|---|---|
| F1 | `frontend/src/pages.tsx`, `api.ts` | 上传、链接、SSE、历史文档、法语错误 |
| F2 | `MapPage.tsx`, `graph.ts`, `layout.ts`, `state.ts` | React Flow、ELK 布局（ELK 自带的 worker）、层级、聚焦、带读、键盘 |
| F3 | `Details.tsx`, `SourceView.tsx`, `geometry.ts` | 原文引文、解释、术语、建议、PDF/HTML 片段与关系双端 |
| F4 | `FullText.tsx`, `SourceView.tsx` | 懒渲染全文、位置条、双向定位 |
| B1 | `backend/app/ingest/` | PyMuPDF 版面分析（双栏顺序、按字号/粗细识别标题、过滤公式/图表/表格/页眉页脚/参考文献、跨栏跨页续句、去连字符）、GROBID TEI、arXiv HTML/PDF 与资源缓存 |
| B2 | `backend/app/anchoring/sentences.py` | FR/EN 切句、句子 ID、行框或 DOM span |
| B3 | `backend/app/extraction/pipeline.py`, `prompts/` | 骨架（按章节标题分组的句子）、分节（相邻章节打包成块并发）、跨节（只含被引句及前后句）；步骤与关系各自的 ID 命名空间 |
| B4 | `backend/app/validation/checks.py`, `prompts/{critic,repair}.md` | 确定性修正、引文匹配、图约束、逐项批评（只重判改动项）、两轮定向修复补丁、清理与报告 |
| B5 | `backend/app/suggestions/review.py` | 规则建议、LLM 建议和目标/来源过滤 |
| B6 | `main.py`, `storage/files.py`, `tasks/`, `llm/client.py` | REST、任务、SSE、哈希缓存、结构输出、调用指标 |
| E1 | `https://arxiv.org` | 外部论文资源；第三方字体不缓存 |
| E2 | `.env` 的 `LLM_MODEL`/`LLM_API_BASE` | 默认 DeepSeek；统一 LiteLLM 接口 |

## 契约、坐标与存储

`models.py` 是唯一后端类型来源。`scripts/export_openapi.py` 导出 `frontend/openapi.json`；openapi-typescript 生成 `src/api-schema.d.ts`。前端禁止自行复制业务类型。CI 检查生成文件漂移。

Sentence 使用稳定段落前缀 `p4s2`，`order` 表示文档内句序。PDF 页码从 1 起，框为旋转后显示页的左上原点、PDF point；PDF.js viewport 按显示页尺寸缩放，**不再次翻转 Y 轴**。每个句子可有多个行框。HTML 在原段落中插入 `data-sentence`，保留行内元素和 MathML。段落级 PDF 跨页句子尚不自动拼接。

Step 的 `parent=null` 表示主流程，子级只允许一层。关系从理由指向所支撑的步骤，contradict 不进入有向图。5–12 主步骤、最多 8 子步骤是校验目标，不是两轮修复后必然满足的保证。最终问题保留在报告及 `to_verify` 状态；`verified` 只表示系统认为引文支持该表述，不等于事实核验。`confidence` 是模型自报值，未校准。

```
data/{sha256}/
  source.pdf 或 source.html
  assets/
  parsed.json
  flow.json                 # 最后写入，完成标记
  validation_report.json
  suggestions.json
  explanations/{step_hash}.json
  cache/{request_hash}.json
  llm_log.jsonl
```

原始文件按内容哈希复用；单次模型请求另按完整输入和配置哈希。指标日志包含阶段、模型、耗时、token、可获得的成本估计，未记录原文/密钥。prompt、输出及原文本身存在本机缓存中；启用 Langfuse 仅上传调用指标。本机以外处理新文档会向所选模型供应商发送正文。

## HTTP 与任务状态

| 方法与路径 | 内容 |
|---|---|
| `GET /api/health` | 运行状态、是否已配置密钥（不回传值）、当前模型名 |
| `POST /api/tasks` | multipart `file` 或 JSON `arxiv_url`；返回 task_id，缓存命中则 doc_id |
| `GET /api/tasks/{id}` | 任务最新一条事件，供刷新后的页面继续跟踪 |
| `GET /api/tasks/{id}/events` | SSE；支持 Last-Event-ID 重放；done/error 结束；error 事件带 params（如失败阶段名） |
| `GET /api/docs` | 只列有 flow.json 的已完成文档 |
| `GET /api/docs/{id}` | 解析结果、段落、句子和位置 |
| `GET /api/docs/{id}/flow` | 图、模式、生成元数据 |
| `GET /api/docs/{id}/sentences` | 句子集合 |
| `GET /api/docs/{id}/suggestions` | 修改建议 |
| `GET /api/docs/{id}/source` | 原始 PDF 或清洗、锚定后的 HTML |
| `GET /api/docs/{id}/assets/{name}` | 受限文件名的缓存资源 |
| `POST /api/docs/{id}/steps/{step}/explanation` | 单步解释，按需生成并缓存 |

进度为阶段刻度，不是剩余时间预测。后台任务由 asyncio 管理；按文档加锁避免同一结果并发写入。服务重启中断未完任务，但保留已生成文件和调用缓存。默认仅绑定 127.0.0.1，不提供认证、协作或持久任务队列。


## 三语界面（S18）

`frontend/src/translations.ts` 集中保存法语消息键及中/英翻译；`i18n.ts` 使用已有 Zustand 维护 locale 和分析语言，以 localStorage 持久化；无需新增依赖。数目与占位符通过统一插值处理。组件保存原始消息键，在渲染时翻译，因此显示中的错误/进度可以即时切换。原文与引文始终不经过翻译；演示解读使用手工核对的词库。

`POST /api/tasks` 在 JSON 或 multipart 中接受可选 `language=auto|zh|en|fr`。设置复制到该任务独立配置，避免并发修改全局语言；显式语言加入文档哈希。同一原文的三种分析不会混用缓存。未传 language 的旧接口保持原缓存键。

解释请求可传 `X-UI-Language`，语言参与解释缓存键，模型对解释使用该语言。`Generation.language` 记录新结果的分析语言。后台模板已取消固定法语要求；规则建议以固定消息键存储，在界面翻译。原文标题、任意已有模型内容不做静默机器翻译，已有图谱的分析语言在标题区标识。


## 模型输入、修复与状态（S19）

各阶段发给模型的句子一律是 `[句子ID, 文本]`，不带坐标和 DOM 信息。骨架阶段按章节标题分组；分节阶段把相邻短章节打包、长章节按句拆开（`SECTION_CHUNK_CHARS`）；跨节阶段只给步骤精简字段、已有关系三元组和被引用句子及其前后句。开启思考的阶段（默认 skeleton、cross）使用 `tool_choice=auto` 和 `LLM_THINKING_MAX_TOKENS`，重试时只把校验错误作为用户消息重发。

核验与修复（B4）的顺序：确定性修正（重名关系改名、清除原文中没有或过长的连接词、无效关系锚点改用端点句子、清理失效术语卡）→ 本地规则检查（问题带 target_type）→ 批评者只判定新增或改动的条目，漏判的再问一次 → 有问题时调用 repair 阶段，模型返回 RepairPatch（替换/新增的条目和要删除的 ID），按 ID 合并。最多两轮。最后整理无效父级、端点、循环。

状态含义：只有原文支持类问题（anchor、semantic、connective、contradiction_anchor、endpoint、parent）会把条目标为 `to_verify`（虚线框）；dead_end、disconnected、size 等结构问题只写入 validation_report.json。

任务失败时 main.failure_message() 给出固定、可翻译的提示：失败的模型阶段、服务商 401/402/429，或解析类错误；服务商原始报错不会返回前端。启动时 sync_examples() 用 examples/ 中的示例替换 data/ 里过时的副本。
