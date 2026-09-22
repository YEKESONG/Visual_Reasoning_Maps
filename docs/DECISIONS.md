# 技术决策记录

状态：v0.1.0 已采用。每条均说明实际实现与切换成本；不把预留能力写成已验证的集成。

## ADR-001 PDF 解析：PyMuPDF，GROBID 可选

- 背景：片段阅读需要词级位置，用户希望本机一条命令运行。
- 备选：PyMuPDF、GROBID、Docling。
- 决定：默认 PyMuPDF；配置 `GROBID_URL` 后调用 GROBID TEI 补充标题/章节，位置仍来自 PyMuPDF。
- 理由：无需常驻 Java 服务，保留 PDF 原页坐标。GROBID 对科学文献的语义结构有价值，但不能直接替代渲染坐标。
- 影响：多栏顺序、标题识别和断句仍是启发式；扫描 PDF 需要外部 OCR；不声称从 PDF 恢复可靠 LaTeX。PyMuPDF 有 AGPL/商业许可证约束，见第三方声明。
- 切换：`.env` 设置 `GROBID_URL=http://localhost:8070`；compose 提供 `grobid` profile。换 Docling 应实现返回 `Document` 的适配器，并保留相同坐标约定。GROBID 服务本次未实跑。

## ADR-002 抽取：多阶段、逐条核验、最多两轮修复

- 背景：整篇一次调用难以保证层级、来源与可读性。
- 备选：单次抽取、全量多智能体、骨架→分节→跨节。
- 决定：第三种；每个步骤和关系交给批评者核验，局部结构检查与批评意见共同驱动最多两轮重抽。点击时才生成推导说明并缓存。
- 理由：分节保留局部细节，先有主线再补充细节；解释按需节省调用。
- 影响：需要多次调用。批评者仍是同一模型，不能保证错误独立；两轮后结构不达标不伪装成功，标记 `to_verify`。无效 ID/父级/端点和循环被整理，操作写入报告。
- 切换：实现 `ModelClient.generate` 或调整 `extraction/pipeline.py`；提示词独立于代码。并发与输出上限由 `LLM_CONCURRENCY`、`LLM_MAX_TOKENS` 控制。

## ADR-003 结构输出：严格工具调用，JSON 回退

- 背景：需要 Pydantic 类型约束和可替换供应商。DeepSeek beta 支持严格工具 Schema。
- 备选：提示词 JSON、JSON mode、strict tool calling。
- 决定：LiteLLM + Instructor `Mode.TOOLS`，显式设置工具 `strict=true`，整理 strict schema；不使用已废弃的 `TOOLS_STRICT` 别名。400 BadRequest 时解包 Instructor 异常后回退 JSON，结果始终由 Pydantic 验证。
- 理由：实际适配层测试证明别名不会自动添加 strict；显式设置避免依赖隐式行为。
- 影响：provider 不支持的长度约束移到本地验证；严格模式不是语义正确性保证。缓存包含模型、base URL、提示词、payload、schema、语言、思考开关和输出模式。
- 切换：`LLM_OUTPUT_MODE=json`；更换供应商时改 `LLM_MODEL`、`LLM_API_BASE` 及 LiteLLM 对应的环境变量。默认 `deepseek/deepseek-flash`，beta base，思考阶段 `skeleton,cross`。其他真实账户本次未验证。

## ADR-004 前端：React Flow，布局与渲染分离

- 背景：需要分层节点、键盘交互、缩放和平移。
- 备选：React Flow、Cytoscape、自写 SVG。
- 决定：React + TypeScript + Vite、React Flow；`graph.ts` 负责图算法/布局输入，`layout.worker.ts` 负责 ELK，页面只消费位置。
- 理由：优先实现可检查的学术阅读流程，使用现成视口与可访问性能力。
- 影响：ELK 与 PDF.js worker 体积较大；页面路由与 PDF 引擎按需加载。布局错误显示法语可操作提示。
- 切换：替换 worker 返回相同节点 ID/位置即可换布局器；替换渲染器需要保持 `Step`/`Link` 契约与 Zustand 选择状态。

## ADR-005 布局：逻辑从左到右

- 背景：原文先后不等于逻辑依赖。
- 备选：逻辑分层、原文泳道、力导布局。
- 决定：ELK layered/RIGHT，矛盾不进入 DAG，子流程使用分组节点；带读另有逻辑/原文顺序切换。
- 理由：概览明确从依据到结论，原文位置通过全文侧栏与带读表达。
- 影响：原文泳道布局尚未实现；“原文顺序带读”不冒充泳道。未来布局模式的扩展入口是 worker 消息及 `layoutInput`；当前没有可用的泳道配置开关。
- 切换：增加 `layoutMode` 到 worker 输入，由 `layoutInput` 分派到另一布局实现，不必改后端 schema。

## ADR-006 单机文件存储与 SSE

- 背景：目标为本机研究原型，无多用户协作需求。
- 备选：文件、SQLite、服务队列。
- 决定：内容 SHA-256 目录、原子 JSON 写入、asyncio 单进程任务、可重放 SSE 事件。`flow.json` 最后写入，表示任务完成。
- 理由：文档、锚点、推理与校验报告能直接检查，便于复现。
- 影响：任务不跨重启恢复；不可多 worker 部署；任务历史驻留内存。文档级缓存与单次调用缓存分开，改变模型配置不会自动重做已完成文档。
- 切换：`DATA_DIR` 改存储位置；重做分析先把相应目录移出 data。规模化时替换 Store 和 TaskManager，接口保持不变。

## ADR-007 相似度与人工不确定性

- 背景：单纯语义相似可能合并实际上不同的论断。
- 备选：默认下载向量模型、字符串匹配、禁止合并。
- 决定：默认 RapidFuzz，只有同类型/同父级/共享句子且摘要近乎相同（0.97）才合并；`EMBEDDING_MODEL` 可选。
- 理由：轻量离线安装；保守处理来源差异。
- 影响：这是对提示词默认向量方案的有意轻量化；可能漏掉改写的重复项。嵌入模型不可用自动回退并记录；不会强行下载失败后阻断任务。
- 切换：在虚拟环境安装 sentence-transformers，设置模型名；首次会下载权重。该可选路径本次未实跑。

## ADR-008 原文隔离与示例来源

- 背景：HTML 是外部不可信内容；原文样式又是阅读任务的核心。
- 决定：只允许 arXiv 及有限静态资源域，逐跳校验重定向；缓存图片和 CSS（展开分层导入），去除脚本/事件/外部字体；前端 DOMPurify + 禁脚本 iframe + CSP。
- 影响：远端字体和部分背景资源被省略，不宣称逐像素网页复刻。PDF 由 PDF.js 渲染原页，透明标记仅提供导航。公有领域 Descartes 文本使用新排版，示例图明确标记人工编辑。
- 切换：扩充域白名单或资源适配器时仍保持隔离；增加示例必须有可核实许可。

## ADR-009 运行时与验证范围

- 背景：提示词给出 Python≥3.11、Node≥20，但当前 PDF.js 6 要求 Node≥22.13。
- 决定：NetworkX 固定 3.6.1 恢复 Python 3.11 兼容；Node 最低提升至 22.13，安装脚本明确检查。实际验收 Python 3.12.14、Node 24.19.0、pnpm 11.19.0。
- 影响：没有声称在 Python 3.11/Node22 或 Docker 上实跑；最低版本仅依据包元数据。所有依赖锁定，升级必须重跑完整检查。
- 切换：更新 lock 与 engines 检查；如必须 Node20，需要降级 PDF.js 并重验 worker/坐标行为。
