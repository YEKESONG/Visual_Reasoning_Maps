# 给 GPT-6 的开发提示词：Visual Reasoning Maps

使用方法：在本机目录 `/Users/yekesong/project/Visual_Reasoning_Maps` 中启动你的编码助手（需要能执行终端命令、读写文件、使用 git），把下面"提示词正文"整段粘贴给它。发送前可以先修改第 0 节的参数和第 4 节的默认方案。

---

## 提示词正文

### 0. 可调参数（开始工作前先读取）

```yaml
project_dir: /Users/yekesong/project/Visual_Reasoning_Maps
git_remote: git@github.com:YEKESONG/Visual_Reasoning_Maps.git
default_branch: main
push_after_each_stage: true
os: macOS (zsh)
python: ">=3.11"
node: ">=20"
llm_for_testing: DeepSeek V4.1 Flash，通过 LiteLLM 调用，模型 ID 以 DeepSeek 官方文档为准
api_key: 项目根目录 .env 中的 DEEPSEEK_API_KEY，由用户填写；不得打印、记录或提交
ui_language: fr
process_docs_language: zh-CN
readme_languages: [fr, zh-CN]
paper_language: fr
label_language: auto   # 流程图步骤标题默认跟随原文语言，可设为 fr / en / zh
```

### 1. 你的角色与总目标

你是这个项目的全栈工程师兼技术写作者，在上述本地目录中独立完成两件事：

1. 实现可在本机运行的网页原型 Visual Reasoning Maps：用户上传论文 PDF 或提交 arXiv HTML 链接，系统用大模型重建作者的推理过程，生成可交互的推理流程图；点击任一步骤，显示详情面板以及该步骤对应的原文片段（保留原版排版）；原文全文放在另一个子页面。
2. 在仓库中创建 `paper/` 文件夹，写出综述（état de l'art）的初稿，供用户后续修改。

同时完整记录开发过程，让用户在看到成品后能清楚知道：开发分了哪些阶段，每一步做了什么，用了哪些工具和库，为什么这样选，怎样验证。

### 2. 工作方式与硬性规则

1. 自主推进：按第 11 节的阶段计划依次完成，阶段之间不要停下来等待确认。遇到待定的技术选择，采用第 4 节的默认方案，并把理由写进 `docs/DECISIONS.md`。只在真正受阻时询问用户，例如 git push 鉴权失败、需要真实 API key 才能完成的端到端测试、需要用户做出不可回退的决定。
2. 先盘点再动手：开始前运行 `pwd`、`ls -la`、`git status`、`git remote -v`。不要删除或覆盖已有的用户文件；如需改动，在 DEVLOG 中说明。
3. 仓库初始化：若目录还不是 git 仓库，执行 `git init -b main` 并添加远程 `origin`；若远程已有提交（例如 GitHub 创建时生成的 README），先 `git fetch` 并与本地合并，避免历史分叉。
4. 每个阶段结束必须提交一次：
   - 提交前运行该阶段的验证命令（测试、类型检查、构建），全部通过再提交；
   - 同一次提交必须包含对 `docs/DEVLOG.md` 的更新；
   - 提交信息使用 Conventional Commits 并带阶段编号，例如 `feat(backend): parse PDF and arXiv HTML [S4]`；
   - 提交后执行 `git push origin main`；推送失败时报告一次原因，之后继续本地提交，并在最终汇报中提醒用户手动推送。
   - 阶段过大时拆成 S7a、S7b 等子阶段，每个子阶段各自提交。
5. 安全：第一次提交就包含 `.gitignore`（忽略 `.env`、`data/`、`node_modules/`、`.venv/`、构建产物、LaTeX 中间文件等）和 `.env.example`。任何密钥都不得出现在代码、日志、测试夹具或提交记录中。
6. 先查文档再写代码：React Flow（@xyflow/react）、ELK.js、pdfjs-dist、LiteLLM、instructor、FastAPI、sse-starlette 等第三方库以官方文档的当前版本为准，并锁定版本号。DeepSeek 的模型 ID、严格函数调用和思考模式的开启方式必须以 DeepSeek 官方 API 文档为准，不要凭记忆假设。已知线索（请自行核实）：DeepSeek 的 JSON 模式通过 `response_format` 设为 `json_object` 开启，要求提示词中出现 json 字样并给出示例，偶尔可能返回空内容，需要设置足够的 `max_tokens`；严格函数调用会让输出严格遵守函数的 JSON Schema，思考和非思考模式都支持。
7. 不编造：综述中的作者、年份、会议、页码、数字和观点必须能在第 10 节给出的链接中核实；无法核实的写 `% TODO: vérifier`，并汇总到 `paper/README.md` 的待办清单。代码中不得调用不存在的 API。
8. 可替换性：所有待定项都通过接口或配置实现，让用户以后只改配置或少量代码就能切换方案。
9. 代码规范：Python 使用类型标注，用 ruff 做格式化与检查；TypeScript 开启 strict，使用 ESLint 与 Prettier。代码注释用英文，界面文案用法语，过程文档用中文。
10. 如果无法联网，仍然完成全部代码与文档，把需要联网核实的内容标为 TODO。

### 3. 项目背景

课题来自 ENAC，导师 Christophe Hurter：Visual Reasoning Maps，利用 LLM 可视化作者的思想。要求包括：自动抽取概念、论证、例子、对立观点和结论；检测推理模式（发散、汇聚、矛盾、细化、因果）；生成 flow map / storyline 式的可视化，表现观点在文本中的演变；点击任一元素可立即找到原文段落；在哲学、科学、随笔等多种复杂文本上测试。交付物是一个可运行的网页原型：上传文档，AI 重建其推理，生成作者思想的交互式图谱。

产品定位：以"推理流程图"为主视图。首屏只显示 5 到 12 步的主流程，每一步可展开成子流程；从研究问题和前提出发，经过中间论点和证据，汇聚到结论。质量原则是宁缺毋滥，通不过校验的内容不能以"确定"的样子出现。

导师的研究方向包括信息可视化、人机交互和图的边绑定，因此可视化与交互质量是评判重点。

### 4. 方案与默认决策

已确定的方案：

- 输入：用户上传的 PDF，或 arXiv HTML 链接（例如 `https://arxiv.org/html/2607.26712v2`）。arXiv 没有 HTML 版本或转换出错时，自动下载同一篇的 PDF，走 PDF 路线。
- 原文锚定：每句一个带段落前缀的 ID（`p4s2` 表示第 4 段第 2 句）。模型只输出 ID 和一小段引文；后端用模糊匹配核对引文；ID 与引文对不上时，用引文在全文中再搜索一次兜底。
- 粒度与可读性：自顶向下分层（主流程 + 可展开子流程），视图层收敛（聚焦、筛选、折叠），带读。
- 模型：测试期使用 DeepSeek V4.1 Flash，通过 LiteLLM 调用；正式版只改配置即可换成 Claude、GPT 或 Grok。
- 编排：纯 Python asyncio + tenacity 重试；可选接入 Langfuse 记录调用。
- 校验：严格模式，见 7.4 节。
- 修改建议：图结构规则 + LLM 按评审维度点评，每条建议挂到具体步骤和句子上。
- 后端与存储：FastAPI + 后台任务 + SSE 推送进度 + JSON 文件与内容哈希缓存。
- 原文阅读：详情面板中显示原版排版的原文片段；全文放在子页面；PDF 用 PDF.js 按原版渲染，arXiv 显示原 HTML 页面。
- 部署：GitHub 仓库 + 本机运行。用户按 README 配置 API key 和依赖后一条命令启动，在浏览器打开 `http://localhost:8000`。
- 评估：以人工评价为主，系统内不做评估模块。

待定项的默认方案（实现默认方案并保留切换能力，每项在 `docs/DECISIONS.md` 中写一条 ADR）：

| 待定项 | 默认方案 | 需保留的替代方案 |
|---|---|---|
| PDF 解析器 | PyMuPDF（无需额外服务，提供词级坐标） | GROBID 适配器：设置 `GROBID_URL` 后启用，docker compose 中提供 GROBID 服务 |
| 抽取流程 | 自顶向下多阶段 + 批评者核验与修复循环 | 推导说明按需生成（点击时生成并缓存） |
| 结构化输出 | Pydantic 定义 schema，经 instructor + LiteLLM 调用，优先使用 DeepSeek 严格函数调用 | 退回 JSON 模式 + Pydantic 校验 + 自动重试 |
| 前端框架与流程图库 | React + TypeScript + Vite + React Flow（@xyflow/react）+ ELK.js | 布局计算与渲染解耦，便于以后换库 |
| 流程图布局 | 逻辑分层：ELK layered，从左到右依次是依据、论点、结论 | 预留"按原文顺序的泳道布局"开关，可在后续阶段实现 |

### 5. 系统架构

按以下模块划分组织代码，并在 `docs/ARCHITECTURE.md` 中写明每个模块对应的代码路径。

浏览器

- F1 上传页：上传 PDF 或粘贴 arXiv 链接，显示进度条，列出已处理的文档。
- F2 推理流程图（主视图）：主流程 + 可展开子流程、聚焦推理链、按连线类型筛选、带读、小地图。
- F3 详情面板：点击步骤后显示推导说明、原文引文、修改建议，以及该步骤对应的原版排版原文片段；点击连线时并排显示两端步骤的原文片段。
- F4 原文全文子页面：原版排版显示全文，高亮所有锚点句，滚动条旁显示各步骤的位置标记。

本机后端

- B1 获取与解析：把 PDF 和 arXiv HTML 统一成文档对象（章节、段落、正文、公式的 LaTeX、位置信息）。
- B2 切句与锚点编号：生成句子 ID 并记录位置（PDF 为页码和坐标框，HTML 为 DOM 中的句子节点）。
- B3 LLM 抽取：多阶段抽取步骤、连线、层级和原文依据。
- B4 严格校验：逐条核验原文支撑，检查无环、连通和规模；不合格的退回 B3 重抽。
- B5 修改建议：结构规则 + LLM 点评。
- B6 存储与接口：JSON 文件缓存、REST 接口、后台任务、SSE 进度推送。

外部服务

- E1 arXiv 网站：提供论文 HTML。
- E2 LLM API：DeepSeek V4.1 Flash（测试期）。

数据流：F1 → B1（上传文件或链接）；后端 ⇢ F1（SSE 进度）；B1 ⇄ E1（下载 HTML）；B1 → B2 → B3；B3 ⇄ E2；B3 → B4；B4 ⇄ E2（核验）；B4 → B3（不合格退回，最多两轮）；B4 → B5；B5 ⇄ E2；B5 → B6；B6 → 阅读界面；F2 → F3（点击步骤）；F3 → F4（"Voir dans le texte intégral"）；F4 → F2（点击高亮句，跳回对应步骤）。

### 6. 数据模型与约束

后端用 Pydantic 定义，前端类型由后端 OpenAPI 自动生成。

- `Sentence`：`id`（如 `p4s2`）、`text`、`section_id`、`order`（全文顺序号）、位置信息（PDF 为 `page` 和若干 `bbox`，写明坐标系；HTML 为 `dom_id`）。
- `Step`：`id`、`parent`（所属主步骤，主流程步骤为 null）、`type`（`question`、`premise`、`claim`、`evidence`、`objection`、`conclusion`）、`label`（不超过 40 个字符）、`summary`、`anchors`（至少一个句子 ID）、`quote`、`confidence`（0 到 1）、`status`（`verified`、`partial`、`to_verify`）、`first_position`（最早锚点的全文顺序号）。
- `Link`：`id`、`src`、`dst`、`type`（`support`、`cause`、`refine`、`contradict`）、`connective`（原文中的连接词，可为空）、`anchors`、`confidence`、`status`。
- `TermCard`：概念和定义不作为步骤，而作为术语卡片挂在相关步骤上（`term`、`definition`、`anchors`、`step_ids`）。
- `Suggestion`：`target_type`（`step` 或 `link`）、`target_id`、`category`、`severity`、`message`、`suggested_rewrite`（可为空）、`anchors`、`source`（`rule` 或 `llm`）。
- `Flow`：文档元数据、主流程步骤、子步骤、连线、术语卡片、检测到的推理模式、生成信息（模型、时间、提示词版本、token 用量）。

结构约束：

- 主流程 5 到 12 步，超出时要求 B3 合并相近步骤。
- `support`、`cause`、`refine` 必须构成有向无环图；`contradict` 不参与分层和无环检查。
- 连线方向一律从依据指向结论。
- 每个子步骤只属于一个主步骤。
- 每个结论必须能沿支持关系追溯到至少一条证据或前提。

五种推理模式的获取方式与可视化编码：

| 模式 | 获取方式 | 流程图中的表达 |
|---|---|---|
| 发散 | 图算法：一个步骤的出边通向多个不同分支 | 分叉 |
| 汇聚 | 图算法：多条路径合流到同一步骤 | 合流 |
| 矛盾 | LLM 标注 `contradict` | 红色虚线，无方向，两端都能点开原文 |
| 细化 | 层级关系或 `refine` | 可展开的子流程，步骤上显示子步骤数量 |
| 因果 | LLM 标注 `cause` | 带箭头连线，线旁显示原文连接词 |

颜色之外必须同时用线型、图标或文字区分，保证色觉障碍用户也能读懂。

### 7. 后端规格

#### 7.1 目录建议

```
backend/
  app/
    main.py            # FastAPI 入口，同时托管前端构建产物
    config.py          # 读取 .env
    api/               # 路由
    ingest/            # B1：pdf_pymupdf.py、pdf_grobid.py、arxiv_html.py
    anchoring/         # B2
    llm/               # LiteLLM + instructor 封装、缓存、用量统计、可选 Langfuse
    extraction/        # B3 各阶段
    prompts/           # 全部提示词模板（.md，带版本号，便于用户修改）
    validation/        # B4
    suggestions/       # B5
    storage/           # B6 文件存储与哈希缓存
    tasks/             # 后台任务与 SSE
  tests/
```

#### 7.2 接口

- `POST /api/tasks`：multipart 上传 PDF，或 JSON `{"arxiv_url": "..."}`。立即返回 `task_id`，处理放到后台；若内容哈希已有结果，直接返回 `doc_id`。
- `GET /api/tasks/{task_id}/events`：SSE，推送 `{"step": ..., "status": ..., "progress": ...}`；完成时推送 `doc_id`；失败时推送可读的错误说明。
- `GET /api/docs`：已处理文档列表。
- `GET /api/docs/{doc_id}`、`/flow`、`/suggestions`、`/sentences`（含位置信息）、`/source`（原 PDF，或缓存的 HTML 及其资源）。
- `POST /api/docs/{doc_id}/steps/{step_id}/explanation`：按需生成推导说明并缓存。
- `GET /api/health`。

#### 7.3 抽取流水线（B3）

提示词全部放在 `backend/app/prompts/`，用英文编写（输出语言由 `LABEL_LANGUAGE` 控制），每个文件开头写明用途、输入、输出 schema 和版本号。

1. 骨架阶段：输入带句子 ID 的全文（过长时输入标题、摘要、各节开头与结尾）；输出文体（科学论文、哲学文本、随笔）、主论题、5 到 12 步主流程及其连线和锚点。开启思考模式。
2. 逐节阶段：各节并行处理；输入该节带 ID 的原文和骨架；输出子步骤（`parent` 指向主步骤）、节内连线、术语卡片。
3. 跨节连线阶段：输入全部步骤的精简列表（ID、标题、摘要）；输出跨节连线，每条都给出支撑它的句子 ID。开启思考模式。
4. 推导说明（按需）：用户点击步骤时，输入该步骤、它的上游步骤和锚点原文，输出分步推导说明，以句子 ID 作为引用，结果缓存。

调用要求：温度调低；每次调用按"模型 + 提示词版本 + 输入"的哈希缓存；token 用量和耗时写入 `data/{doc_id}/llm_log.jsonl`；配置了 Langfuse 时同时上报。

#### 7.4 严格校验（B4）

按从便宜到昂贵的顺序执行：

1. 格式：Pydantic 校验。
2. 锚点：句子 ID 必须存在；引文必须能在这些句子中模糊匹配到（rapidfuzz，阈值可配置）；否则用引文在全文中搜索兜底，仍失败则判为不合格。
3. 语义支撑：再调用一次模型作为批评者，逐条判断"这些原文是否足以支持该步骤或连线"，输出 `supported`、`partial` 或 `unsupported` 以及简短理由。
4. 结构：检查无环（成环时退回重抽，仍成环则删去置信度最低的一条并记录）；主流程从起点连通到结论；没有孤立步骤（确属背景的标为背景）；子步骤归属唯一；结论可追溯到证据或前提；矛盾连线两端都有锚点。
5. 规模：主流程或某一步的子步骤过多时，要求合并。
6. 去重与模式：用多语言句向量模型（sentence-transformers）合并重复步骤，模型下载失败时退回字符串相似度；用 NetworkX 计算发散与汇聚。
7. 处理结果：不合格项连同失败原因退回 B3 重抽，最多两轮；仍不合格的标为 `to_verify`，前端用虚线框显示。

校验报告写入 `data/{doc_id}/validation_report.json`。

#### 7.5 修改建议（B5）

- 结构规则：没有任何支持的论点、没有支撑任何论点的证据或实验、结论强于证据链、未回应的矛盾等。
- LLM 点评：按维度（论断是否有支撑、逻辑是否跳跃、实验与结论是否匹配、表述是否清晰、与已有工作的关联）逐步骤给出建议。
- 每条建议必须挂到步骤或连线上，并附句子 ID。

#### 7.6 存储

```
data/{doc_hash}/
  source.pdf 或 source.html（及 assets/）
  parsed.json              # B1、B2 输出
  flow.json                # B3、B4 输出
  validation_report.json
  suggestions.json         # B5 输出
  explanations/            # 按需生成的推导说明
  llm_log.jsonl
  cache/
```

### 8. 前端规格

#### 8.1 技术与结构

React + TypeScript + Vite；React Flow（@xyflow/react）渲染流程图，ELK.js 计算分层布局（放在 Web Worker 中运行）；pdfjs-dist 渲染 PDF；Zustand 管理状态；DOMPurify 清洗 HTML；公式使用浏览器原生 MathML 或 KaTeX。开发时经 Vite 代理访问后端，发布时构建产物由 FastAPI 托管。

路由：

- `/`：F1 上传页和历史列表。
- `/doc/:id`：主页面，左侧 F2 推理流程图，右侧 F3 详情面板（未选中步骤时显示简短的使用说明）。
- `/doc/:id/texte`：F4 原文全文子页面，支持 `?s=p4s2` 定位到指定句子。

#### 8.2 F2 推理流程图的交互

- 首屏只显示主流程；点击步骤上的展开控件显示子流程（ELK 分组节点），再次点击折叠。
- 聚焦推理链：选中结论时高亮其全部上游，选中前提时高亮其全部下游，其余变淡。
- 按连线类型筛选（支持、因果、细化、矛盾）。
- 带读：按推理顺序（拓扑序）或原文顺序逐步高亮，视图自动平移，详情面板同步显示当前步骤。
- 小地图、缩放、平移、适应窗口。
- `to_verify` 步骤用虚线框，有修改建议的步骤显示徽标。
- 键盘可操作：Tab 在步骤间移动，Enter 打开详情，Esc 关闭。

#### 8.3 F3 详情面板与原版排版片段

- 内容：步骤类型与标题、推导说明（按需加载）、原文引文列表、修改建议、原版排版片段、按钮"Voir dans le texte intégral"。
- PDF 片段：用 PDF.js 渲染锚点所在页，按锚点句坐标框的并集外扩一定边距裁剪，叠加半透明高亮；跨页时按顺序堆叠多个片段。注意 PyMuPDF 与 PDF.js 之间坐标系和缩放的换算，并为此写单元测试。
- arXiv 片段：取锚点所在段落，在隔离环境（同源 iframe 的 srcdoc 或 Shadow DOM）中用 arXiv 原有样式渲染，高亮对应句子。
- 点击连线：并排显示两端步骤的片段，并显示连接词和关系类型。

#### 8.4 F4 原文全文子页面

- PDF：逐页渲染全文，所有锚点句高亮，当前步骤的锚点用更醒目的样式。
- arXiv：显示后端缓存的原 HTML 页面并注入高亮。
- 位置标记栏：在滚动条旁，每个步骤在其首次出现的位置显示一个标记，悬停显示步骤标题，点击滚动到对应位置。它同时承担"观点沿原文演变"的展示。
- 点击高亮句：返回 `/doc/:id` 并聚焦对应步骤。

#### 8.5 设计要求

- 动手写界面前，先在 `docs/DESIGN.md` 写一份简短的设计方案：4 到 6 个具名色值、字体及用途、页面布局草图（ASCII）、设计原则。然后对照本项目的主题（学术阅读、推理结构）自查，删去任何放在别的项目上也同样成立的模板化选择，再开始编码。
- 让流程图成为页面上最有辨识度的元素，其余界面保持克制。
- 避免模板化外观：全大写的小标签、每个区块都加的淡入动画、千篇一律的圆角卡片加阴影、纯装饰性的渐变。
- 文案用法语，句首大写，主动语态；按钮文字说明点击后会发生什么；错误提示说明发生了什么以及如何处理；空状态引导用户开始上传。
- 质量底线：可见的键盘焦点、尊重"减少动态效果"系统设置、足够的对比度、宽度 1024px 以上完整可用。
- 环境允许时，用 Playwright 截图保存到 `docs/screenshots/`，并据此自查界面。

### 9. 运行与部署

目标：用户克隆仓库、按 README 配置后，一条命令启动，在浏览器打开 `http://localhost:8000` 使用。

- `scripts/setup.sh`：创建 `.venv`，安装 Python 依赖，安装前端依赖并构建。
- `run.py`：启动 FastAPI 并托管前端构建产物；尚未构建时给出清晰提示。
- `scripts/dev.sh`：开发模式，同时启动后端（热重载）和 Vite 开发服务器。
- 可选 `docker-compose.yml`：后端 + GROBID。
- `.env.example`：`DEEPSEEK_API_KEY`、`LLM_MODEL`、`LLM_API_BASE`（如需要）、`LLM_THINKING_STAGES`、`LABEL_LANGUAGE`、`GROBID_URL`（可选）、`LANGFUSE_*`（可选）。
- 演示模式：`examples/` 中放预先生成的结果，没有 API key 时也能打开界面浏览。示例文档只能使用明确为 CC BY 或 CC0 许可的 arXiv 论文或公有领域文本，提交前核对许可证；无法确认许可证时只保存链接和生成结果，不保存原文件。
- README：`README.md`（法语）和 `README.zh-CN.md`（中文），包含功能简介、截图、环境要求、安装、配置、运行、常见问题、项目结构、许可证。
- GitHub Actions：每次推送运行后端测试以及前端类型检查和构建，不需要 API key。

### 10. `paper/` 综述初稿

#### 10.1 目录结构

```
paper/
  README.md                 # 中文：结构说明、编译方法、修改指南、TODO 汇总
  etat_de_lart/
    main.tex                # 法语，UTF-8，babel french
    sections/               # 每节一个 .tex 文件，便于后续修改
    references.bib
    Makefile                # latexmk -pdf；构建产物不提交
  fiches/                   # 每篇文献一张阅读卡片（.md）
  figures/
```

#### 10.2 章节安排（法语撰写）

1. Introduction et problématique：理解复杂文本不只是摘要，还要重建推理路径，由此引出本项目。
2. Visualisation de textes assistée par LLM：文献 1 到 4。
3. Fouille d'arguments et extraction de structures par LLM：文献 5 到 8，并以文献 13、14 作为"概念图谱抽取"的对照。
4. Visualisation de structures argumentatives et mise en page de graphes：文献 9 到 12。
5. Aides à la lecture scientifique, ancrage et relecture automatique：文献 15 到 21。
6. Outils d'analyse de documents：文献 22、23。
7. Synthèse et positionnement：用一张对比表（系统、输入类型、抽取的结构、可视化形式、原文溯源方式、评估方式）总结已有工作，说明本项目要填补的空白：带类型的推理关系、流程图呈现、原版排版的原文溯源、严格校验。

要求：初稿写到便于修改的程度即可，但每个关于文献的陈述都要能在对应链接中核实，无法核实的写 `% TODO: vérifier`。`fiches/` 中每篇文献一张卡片，包含：完整引用、链接、研究问题、方法、主要结论、与本项目的关系、可引用的要点、待核实事项。

#### 10.3 文献清单

只使用以下文献；如需补充，必须附可访问的链接，并在 `paper/README.md` 中标注为"新增"。

1. Yeh, C., Menon, T., Arya, R. S., He, H., Weigel, M., Viégas, F., Wattenberg, M. (2025/2026). *Story Ribbons: Reimagining Storyline Visualizations with Large Language Models*. IEEE VIS 2025 / IEEE TVCG. https://arxiv.org/abs/2508.06772 ，https://doi.org/10.1109/TVCG.2025.3634265 ，代码 https://github.com/catherinesyeh/story-viz 。要点：题目指定的参考文献；LLM 流水线从小说和剧本中抽取叙事信息，生成多个叙事层级的故事线可视化；在 36 部作品上做了流水线评估和用户研究。
2. Jiang, P., Rayan, J., Dow, S. P., Xia, H. (2023). *Graphologue: Exploring Large Language Model Responses with Interactive Diagrams*. UIST '23. https://arxiv.org/abs/2305.11473 ，https://doi.org/10.1145/3586183.3606737 。要点：把 LLM 的文字回答实时转换为节点连线图，用户可调整图的呈现并针对局部追问。
3. Suh, S., Min, B., Palani, S., Xia, H. (2023). *Sensecape: Enabling Multilevel Exploration and Sensemaking with Large Language Models*. UIST '23. https://arxiv.org/abs/2305.11483 ，https://doi.org/10.1145/3586183.3606756 。要点：多层级抽象帮助管理复杂信息，外显抽象层级有助于有层次地组织知识。
4. Brossier, M., Isenberg, T., Schönborn, K., Unger, J., Romero, M., Björklund, J., Ynnerman, A., Besançon, L. (2026). *State of the Art of LLM-Enabled Interaction with Visualization*. EuroVis 2026 STAR, Computer Graphics Forum 45(3). https://arxiv.org/abs/2601.14943 。要点：按 PRISMA 方法综述 48 篇论文，从应用领域、可视化任务、表示形式、交互方式、LLM 集成、系统评估六个维度分类。
5. Lawrence, J., Reed, C. (2019). *Argument Mining: A Survey*. Computational Linguistics 45(4). https://aclanthology.org/J19-4006/ 。要点：论证挖掘领域的经典综述。
6. Li, H., Schlegel, V., Sun, Y., Batista-Navarro, R., Nenadic, G. (2025). *Large Language Models in Argument Mining: A Survey*. https://arxiv.org/abs/2506.16383 。要点：LLM 时代论证挖掘的数据集、子任务分类、提示与思维链等技术，以及长上下文推理、可解释性、标注瓶颈等挑战。
7. Stab, C., Gurevych, I. (2017). *Parsing Argumentation Structures in Persuasive Essays*. Computational Linguistics 43(3). https://aclanthology.org/J17-3005/ 。要点：序列标注识别论证成分，整数线性规划联合优化成分类型与关系；发布 402 篇议论文标注语料。
8. Lauscher, A., Glavaš, G., Ponzetto, S. P. (2018). *An Argument-Annotated Corpus of Scientific Publications*. 5th Workshop on Argument Mining. https://aclanthology.org/W18-5206/ 。要点：在 Dr. Inventor 语料上为科学论文增加论证成分和关系标注（SciArg）。
9. Khartabil, D., Collins, C., Wells, S., Bach, B., Kennedy, J. (2021). *Design and Evaluation of Visualization Techniques to Facilitate Argument Exploration*. Computer Graphics Forum 40(6). https://doi.org/10.1111/cgf.14389 。要点：同时看清论证层级与阅读原文会带来概览、细节与导航的矛盾；比较三种设计，21 人对照实验。
10. Sugiyama, K., Tagawa, S., Toda, M. (1981). *Methods for Visual Understanding of Hierarchical System Structures*. IEEE Trans. Systems, Man, and Cybernetics 11(2). https://doi.org/10.1109/TSMC.1981.4308636 。要点：分层有向图布局的经典方法，流程图自动布局的理论基础。
11. Liu, S., Wu, Y., Wei, E., Liu, M., Liu, Y. (2013). *StoryFlow: Tracking the Evolution of Stories*. IEEE TVCG 19(12). https://doi.org/10.1109/TVCG.2013.196 ；Tang, T., Rubab, S., Lai, J., Cui, W., Yu, L., Wu, Y. (2019). *iStoryline: Effective Convergence to Hand-drawn Storylines*. IEEE TVCG 25(1)，开源库 https://github.com/remaerd/iStoryline.js 。要点：故事线布局的优化方法与工具。
12. Hurter, C., Ersoy, O., Telea, A. (2012). *Graph Bundling by Kernel Density Estimation*. EuroVis 2012, Computer Graphics Forum 31(3). https://hal.archives-ouvertes.fr/hal-01022472 ，DOI 10.1111/j.1467-8659.2012.03079.x 。要点：导师本人的代表作，基于核密度估计的边绑定。另可引用 Lhuillier, A., Hurter, C., Telea, A. (2017). *State of the Art in Edge and Trail Bundling Techniques*. Computer Graphics Forum 36（链接待检索，标 TODO）。
13. Edge, D., Trinh, H., Cheng, N., Bradley, J., Chao, A., Mody, A., Truitt, S., Metropolitansky, D., Ness, R. O., Larson, J. (2024). *From Local to Global: A Graph RAG Approach to Query-Focused Summarization*. https://arxiv.org/abs/2404.16130 。要点：LLM 抽取实体、关系和断言组成图，用 Leiden 社区发现分层聚类并生成社区摘要；抽的是概念关系而非论证关系。
14. Guo, Z., Xia, L., Yu, Y., Ao, T., Huang, C. (2024). *LightRAG: Simple and Fast Retrieval-Augmented Generation*. https://arxiv.org/abs/2410.05779 。要点：GraphRAG 的轻量替代。
15. Lo, K., Chang, J. C., Head, A., Bragg, J., Zhang, A. X., et al. (2024). *The Semantic Reader Project: Augmenting Scholarly Documents through AI-Powered Interactive Reading Interfaces*. Communications of the ACM 67(10). https://doi.org/10.1145/3659096 ，https://arxiv.org/abs/2303.14334 ，开放平台 https://openreader.semanticscholar.org/ 。要点：在传统 PDF 之上构建智能阅读界面；提供 PaperMage 与 PaperCraft；子项目包括 Scim、ScholarPhi、CiteSee。
16. Wang, X., Huey, S. L., Sheng, R., Mehta, S., Wang, F. (2024). *SciDaSynth: Interactive Structured Knowledge Extraction and Synthesis from Scientific Literature with Large Language Model*. https://arxiv.org/abs/2404.13765 。要点：LLM + 交互界面从论文中抽取结构化知识。
17. Gao, T., Yen, H., Yu, J., Chen, D. (2023). *Enabling Large Language Models to Generate Text with Citations*. EMNLP 2023. https://aclanthology.org/2023.emnlp-main.398 。要点：ALCE 基准，从流畅性、正确性、引用质量评估；在 ELI5 上最好的模型也有一半情况缺乏完整引用支撑。
18. Liang, W., Zhang, Y., Cao, H., et al., Zou, J. (2024). *Can Large Language Models Provide Useful Feedback on Research Papers? A Large-Scale Empirical Analysis*. NEJM AI 1(8). https://doi.org/10.1056/AIoa2400196 ，https://arxiv.org/abs/2310.01783 。要点：GPT-4 自动生成论文评论；用户研究中 57.4% 认为有帮助。
19. D'Arcy, M., Hope, T., Birnbaum, L., Downey, D. (2024). *MARG: Multi-Agent Review Generation for Scientific Papers*. https://arxiv.org/abs/2401.04259 ，代码 https://github.com/allenai/marg-reviewer 。要点：多智能体分工阅读与内部讨论，显著减少泛泛而谈的评论。
20. *Large Language Models for Automated Scholarly Paper Review: A Survey* (2025). https://arxiv.org/abs/2501.10326 。要点：自动审稿方向综述（作者信息待核实）。
21. Stanford Agentic Reviewer 技术说明. https://paperreview.ai/tech-overview 。要点：工程实现参考。
22. GROBID. https://github.com/kermitt2/grobid 。要点：把学术 PDF 解析为结构化 XML/TEI，Apache 2.0 许可。
23. Auer, C., et al. (2024). *Docling Technical Report*. IBM Research. https://arxiv.org/abs/2408.09869 。要点：MIT 许可的 PDF 转换工具，支持版面分析、阅读顺序与表格结构恢复。

### 11. 阶段计划

每个阶段结束都要：运行验证、更新 DEVLOG、提交、推送。

| 阶段 | 内容 | 验收标准 |
|---|---|---|
| S0 | 盘点目录、初始化仓库、`.gitignore`、`.env.example`、目录骨架、`docs/` 下各文档模板；把本提示词原文保存为 `docs/AGENT_PROMPT.md` | 工作区干净，远程推送成功 |
| S1 | `paper/` 结构、`references.bib`、全部阅读卡片 | BibTeX 可解析，每张卡片都有链接 |
| S2 | 综述各节初稿与对比表 | `latexmk` 可编译（未安装 LaTeX 时在 DEVLOG 说明并跳过） |
| S3 | 后端骨架：配置、健康检查、存储、任务管理、SSE | pytest 通过，curl 可收到 SSE 事件 |
| S4 | B1：PyMuPDF 解析、GROBID 适配器、arXiv HTML 下载与解析、HTML 不可用时回退 PDF | 测试夹具验证章节、段落、公式、坐标 |
| S5 | B2：切句（支持法语和英语）、句子 ID、PDF 坐标与 HTML 节点映射 | 单元测试覆盖 ID 规则与坐标 |
| S6 | LLM 层：LiteLLM + instructor、DeepSeek 配置、思考模式开关、缓存、用量日志、可选 Langfuse | 假模型测试通过；有 key 时做一次真实冒烟调用 |
| S7 | B3：schema、提示词文件、骨架 / 逐节 / 跨节三阶段 | 用录制的模型输出做测试 |
| S8 | B4：严格校验与修复循环 | 每条规则都有测试，包括成环、断头、锚点不符 |
| S9 | B5：修改建议 | 规则部分有测试 |
| S10 | 完整流水线编排、全部接口、哈希缓存、推导说明按需生成 | 后端端到端测试（假模型）；有 key 时用一篇论文真实跑通 |
| S11 | 前端骨架：先写 `docs/DESIGN.md`；路由、API 客户端（OpenAPI 生成类型）、F1 上传与 SSE 进度 | tsc、ESLint、构建通过 |
| S12 | F2 推理流程图：ELK 布局、步骤与连线组件、可视化编码、展开折叠、聚焦、筛选、小地图、带读、键盘操作 | 示例数据下可用；布局工具函数有 vitest 测试 |
| S13 | F3 详情面板与原版排版片段（PDF 与 arXiv）、连线详情 | 坐标换算测试；截图自查 |
| S14 | F4 全文子页面、位置标记栏、F3 → F4 与 F4 → F2 跳转 | 手动走通完整路径并截图 |
| S15 | 打包与一键启动：`run.py`、`setup.sh`、`dev.sh`、docker compose、双语 README、GitHub Actions | 在全新克隆中按 README 从零跑通 |
| S16 | 示例与演示模式 | 无 API key 时可浏览示例 |
| S17 | 收尾：全部测试与检查、真实端到端运行（有 key 时）、修复问题、完成 ARCHITECTURE、TECH_STACK、DEVELOPMENT_PROCESS，打标签 `v0.1.0` | 所有检查通过，文档完整 |

### 12. 过程文档

- `docs/DEVLOG.md`：中文，每个阶段一节，模板如下。
- `docs/DECISIONS.md`：ADR 格式，每条包含背景、可选方案、决定、理由、影响、如何切换。
- `docs/TECH_STACK.md`：表格列出名称、版本、所在层、用途、选择理由、替代方案。
- `docs/ARCHITECTURE.md`：Mermaid 架构图，每个框（F1 到 F4、B1 到 B6、E1、E2）和每个箭头的说明，以及与代码路径的对照。
- `docs/DESIGN.md`：设计方案与自查记录。
- `docs/DEVELOPMENT_PROCESS.md`：在 S17 完成，按时间顺序讲清开发流程，附 `git log --oneline` 输出、每个阶段的关键命令、如何从零复现、已知局限和下一步建议。
- `docs/AGENT_PROMPT.md`：本提示词原文。

DEVLOG 每节模板：

```markdown
## S4 获取与解析（B1）
- 目标：
- 完成内容：
- 主要文件：
- 用到的工具与库（版本）及用途：
- 关键决策（链接到 DECISIONS.md）：
- 遇到的问题与解决方式：
- 验证方式（命令与结果）：
- 遗留问题：
```

### 13. 测试与质量门槛

- 后端：pytest 覆盖解析、切句、锚点核对、结构校验、修复循环和接口。测试中的 LLM 调用一律使用假模型或录制的输出，测试不依赖网络和 API key；提供 `scripts/record_fixtures.py`，在有 key 时录制真实输出。
- 前端：tsc 无错误，ESLint 无错误，vitest 覆盖布局转换和图算法工具函数（上游、下游、拓扑序）。
- 每个阶段提交前运行对应检查，失败时先修复再提交。
- 真实 API 调用只在用户配置了 key 时进行，并在 DEVLOG 中记录 token 用量和花费估算。

### 14. 最终汇报

全部完成后，在对话中给出：

1. 成品概述与截图路径；
2. 运行方法（不超过三条命令）；
3. 阶段列表与对应提交（`git log --oneline`）；
4. 技术栈摘要（指向 `docs/TECH_STACK.md`）；
5. 各待定项采用的默认方案及切换方法；
6. 已知局限、未完成事项、需要用户处理的事（例如手动推送、填写 API key、核实 TODO）；
7. 综述初稿的位置和待核实清单。
