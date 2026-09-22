# 开发日志

## S0 盘点与初始化
- 目标：建立可追溯、安全的工作区。
- 完成内容：检查目标目录为空；初始化 main；fetch 远程，远程无分支；保存原始需求；加入忽略规则与配置示例。
- 主要文件：`.gitignore`、`.env.example`、`docs/AGENT_PROMPT.md`。
- 工具：Git；本机系统 Python 3.9 不满足要求，改用 Codex 已安装 Python 3.12.14 与 Node 24.19.0。
- 决策：沿用指定目录与远程；没有覆盖用户文件。
- 验证：git status、git remote -v、git fetch origin 成功；配置不包含密钥。
- 遗留：后续阶段补齐正文与代码；当前没有 .env，真实 API 验收有条件执行。

## S1 文献与阅读卡片
- 目标：覆盖给定清单，并记录核实边界。
- 完成：24 项 BibTeX、24 张卡片、引用索引和待办；第 11 项拆成两篇。
- 工具：httpx、BeautifulSoup 读取官方摘要/元数据，bibtexparser 解析。
- 决策：引用实读的预印本版本；纠正 SciDaSynth 题名；核实自动审稿综述作者；不把待核实出版状态写成事实。
- 验证：BibTeX 解析 24 条；24 张卡片含链接；不存论文全文。
- 遗留：IEEE 的 Sugiyama 页面受限；全文页码与部分正式卷期留 TODO，详见 paper/README.md。

## S2 综述初稿
- 完成：七节法语正文、对比表、24 篇引用、编译入口；明确定位为初稿，不伪造项目实验结果。
- 验证：bibtexparser 新版使用 parse_string，24 条均解析成功，无 failed_blocks。S1 验证脚本误用旧版 loads，已在本阶段纠正并实测，S1 日志中的通过结论以本次为准。
- 验证：静态检查全部 cite 键存在，7 个章节存在；本机未发现 latexmk，按需求跳过 LaTeX 编译。
- 遗留：全文阅读、页码与少数出版状态详见 paper/README.md。

## S3 后端基础
- 完成：配置（密钥使用 SecretStr）、原子 JSON 存储、内容哈希、后台任务、SSE 历史与重连、健康接口。
- 主要文件：backend/app/config.py、storage/files.py、tasks/manager.py、main.py。
- 工具：FastAPI 0.141.1、SSE-Starlette 3.4.11、Pydantic 2.13.5；全量环境锁定 requirements.lock。
- 验证：pytest 3 项通过；ruff 检查/格式化通过；覆盖事件结束和重连。
- 遗留：任务执行状态暂在内存，重启需重新提交；curl 网络验证安排 S10 完整接口阶段。
- 更正 S2：进一步检查发现 /Library/TeX/texbin/latexmk，之前 PATH 检查被前序失败中止；正在补做实际编译。

## S4 文档获取与解析
- 完成：PyMuPDF 词级坐标、旋转页归一化、章节启发式；GROBID TEI 结构增强；arXiv HTML 保留内联元素/MathML、缓存样式和图片，下载失败回退 PDF。
- 主要文件：ingest/、models.py；工具 PyMuPDF 1.28.2、httpx、BeautifulSoup、lxml。
- 决策：只接受 arxiv.org HTTPS 文档，逐跳检查重定向并限制大小；HTML 去除活动内容。
- 验证：pytest 9 项通过；ruff 格式化后检查通过。
- 遗留：PDF 公式无法可靠恢复 LaTeX；扫描件明确提示 OCR；GROBID 未进行真实服务验收。
- 综述补验：latexmk 完整通过，输出 5 页，无未定义引用，存在窄表列 underfull 提示。

## S5 句子锚定
- 完成：法英缩写与小数处理、pNsM 编号、词坐标按行合并；HTML 跨 em 等内联元素逐段包裹，保留 MathML；每句首节点有稳定 DOM ID。
- 主要文件：anchoring/sentences.py；坐标：旋转后的页面左上角，单位 PDF point，页码从 1 起。
- 验证：pytest 12 项通过，含 90° 旋转、HTML 原文不变、缩写与小数；ruff 通过。
- 遗留：规则切句不能完整覆盖所有学术缩写及多栏阅读顺序。

## S6 模型适配与缓存
- 完成：Instructor + LiteLLM 异步客户端、严格 schema 转换、JSON 回退、tenacity 限流重试、并发限制、提示词/模型/schema/模式哈希缓存、token/耗时/成本日志；可选 Langfuse 仅记录指标。
- 主要文件：llm/client.py、prompts/skeleton.md；LiteLLM 1.102.0、Instructor 1.17.0、Langfuse 4.15.4。
- 决策：按官方文档使用 deepseek/deepseek-flash、beta URL、显式 thinking；参考 docs/API_NOTES.md。
- 验证：pytest 14 项通过；schema 子集和无 key 错误已测；已核对本地 API 方法签名。
- 遗留：项目无 .env，不进行真实付费调用；S10 用假模型验证整个编排。

## S7 分层抽取
- 完成：Pydantic 全量模型、5 份英文版本化提示词、骨架/分节并发/跨节流水线；长文骨架按章节首尾抽样，细节阶段分块保留全文。
- 决策：模型返回 ID 不可信，节内 ID 命名空间化；层级与句子引用后续严格检查。
- 验证：pytest 15 项通过，固定合成输出确认三阶段顺序；ruff 通过。
- 遗留：测试夹具为人工构造，不冒称真实录制模型响应；真实输出录制脚本将在打包阶段提供。

## S8 严格校验与修复
- 完成：引文模糊匹配与全局兜底、ID/层级/规模/连通/死端/结论证据链检查、批评者逐项判定、最多两轮修复、最终破环并记录删边、保守去重与五类模式。
- 工具：RapidFuzz、NetworkX；可选 sentence-transformers，不可用时字符串回退。
- 决策：相似度只有在同类型、同层级且共享锚点时才可合并；缺失批评者判定绝不自动 verified；格式标签不等同事实真值。
- 验证：pytest 28 项通过（实际总数见执行输出），包含循环、断链、错误引文、缺失锚点、两轮修复上限；ruff 通过。
- 遗留：语义正确性仍需人工评价；无向矛盾不进入 DAG；向量模型为可选安装，默认字符串回退以支持轻量离线运行。

## S9 修改建议
- 完成：缺失支持、游离证据、结论范围、矛盾检查规则；按五维提示词调用 LLM，过滤无效目标与句子 ID。
- 主要文件：suggestions/review.py、prompts/suggestions.md。
- 验证：pytest 全部通过，规则测试检查目标和锚点；ruff 通过。
- 决策：建议是可复核提示，不给论文整体打分；矛盾仅提示检查是否已回应，不断言作者犯错。

## S10 完整后端流水线与接口
- 完成：上传/链接任务、内容哈希复用、解析→锚定→抽取→核验→建议→持久化；文档/原文/资源/流程/建议接口；按需解释缓存；文件类型、大小、路径、HTML 活动内容限制。
- 决策：单进程 asyncio 后台任务；按文档加锁；flow.json 最后写入作为完成标志；模型错误不返回原始请求或凭证。
- 验证：pytest 30 项通过（固定假模型端到端 + REST + SSE）；ruff 通过。
- 遗留：尚无真实 key；真实 arXiv/GROBID 外部服务、模型效果不在离线测试结论内；S8 当时实际 27 项，S9 为 28 项。

## S11 前端骨架与上传
- 完成：先写 DESIGN；React 法语上传/历史页、SSE 进度、错误/空状态、OpenAPI 自动生成 TypeScript 类型、Vite 代理。
- 工具：React 19.3.0、Vite 8.3.0；pnpm-lock.yaml 精确锁定。
- 问题：TypeScript 7.0.2 不再提供生成工具所需 factory API；改用已验证 5.9.3，ESLint 9.39.4 与生态兼容。首次写入命令目录前缀有误，未覆盖任何文件，已改正。
- 验证：pnpm types、lint、build 全通过；Prettier 已格式化。
- 决策：使用本地字体、纸色阅读工作台，不采用通用营销卡片。

## S12 交互式推理图
- 完成：React Flow + ELK worker 分层与分组布局、展开折叠、上下游聚焦、四种关系筛选、图标/线型冗余编码、小地图、缩放、逻辑/原文顺序带读、Tab/Enter/Esc。
- 主要文件：MapPage.tsx、graph.ts、layout.worker.ts、state.ts；Zustand 管理交互状态。
- 验证：Vitest 4 项图算法/布局输入测试、ESLint、tsc/Vite 构建通过。
- 遗留：浏览器中的实际布局与键盘操作在 S13/S14 示例数据下截图验证。

## S13 详情与原版片段
- 完成：步骤状态/引文/术语/建议/按需解释；连线双端并排；PDF.js 原页裁剪及高亮；HTML 保留样式并在无脚本 iframe 中展示。
- 问题修复：ELK bundled 包在 Worker 内构造失败，改用官方 elk-api + 显式 worker URL；临时浏览器脚本加入 lint 忽略目录。
- 验证：前端 7 项测试（左上坐标、旋转页缩放、裁剪边界）；ESLint/tsc/build 通过；Playwright 在 1440px 下打开节点与 HTML 片段，无 pageerror；截图 docs/screenshots/qa-details.png。
- 自查：修正 iframe 初始视口高度造成多余空白；PDF 完整交互在 S16 示例补验。

## S14 全文阅读与位置导航
- 完成：全文 PDF 懒渲染/HTML 排版、高亮锚点、当前句、步骤位置条；详情跳全文、原文跳回步骤；URL 携带稳定句子 ID。
- 主要文件：FullText.tsx、main.tsx；截图 docs/screenshots/qa-fulltext.png。
- 验证：Playwright 走通 节点→详情→全文→高亮→原节点；返回 /doc/qa-fixture?step=a；5 节点均渲染、无 JS 异常；Enter/Esc 路径执行。
- 遗留：位置条按句序估计分布，点击使用实际锚点；S16 更完整示例补验。

## S15 打包、一键启动与 CI
- 完成：setup.sh/dev.sh/run.py、FastAPI 托管 SPA、双语 README、Dockerfile/compose、GitHub Actions、OpenAPI 导出与真实调用录制脚本、许可证及第三方声明。
- 验证：从本地全新 clone 复制当前待提交源码快照，创建独立 .venv，完整执行 setup.sh；30 项后端测试通过；PORT=8011 python3 run.py 启动；curl /api/health 返回 ok/configured=false，首页返回构建 HTML。
- 验证：bash -n、ruff、前端 lint/test/build 通过；不依赖系统全局 Python 包。
- 决策：当前锁定依赖需要 Python 3.12（NetworkX 3.7），使用已安装 Python 3.12 与 Node 24。S17 将检查是否可以恢复 3.11 支持。
- 遗留：Docker/GROBID 未实跑；S17 再从已推送提交进行最终 clone 验证，不混淆快照验收与远程克隆验收。

## S16 示例与演示模式
- 完成：公有领域 Descartes / John Veitch 文本的 PDF、HTML 两种示例；启动自动导入；无密钥详情、术语、建议与按需说明；确定性构建脚本与来源说明。
- 许可核对：Project Gutenberg eBook 59 标明美国公有领域，作者与译者分别卒于 1650、1894；仅取正文，重新排版，未复制站点商标或附录。示例不是模型实测输出。
- 问题修复：React Flow 测量事件未回填导致小地图空白；Enter 未联动详情；缩窗后未重新适应窗口。现已修复并断言 1024px 下主节点均在视口内。
- 验证：后端 33 项通过（包含待在 S17 提交的适配层新增测试），前端 7 项通过；Playwright 2 条完整阅读路径通过，无 pageerror；PDF 两页渲染检查；七张截图保存于 docs/screenshots/。
- 验证命令：pytest -q、ruff check backend scripts；pnpm lint/test/build/test:e2e。
- 遗留：图布局缩放后小字号可用放大查看；长文语义准确度和真实 API 调用仍待密钥实测。

## S17a 适配层、真实文档与最终文档
- 完成：修复 strict 标志与 Instructor 包装异常的 JSON 回退；每次传输记录用量，未知价格记 null；屏蔽 provider 原始诊断；异常结构最终去重、清理无效父级/端点与循环并记录。
- 实际网络发现并修复：arXiv 图片相对 URL 不应强加末尾斜线；新版主 CSS 用 @import layer，需递归展开。Story Ribbons 现解析 30 节、138 段、487 句、64 资源，1 个外部字体警告，未调用模型。
- 完成：DECISIONS、ARCHITECTURE、TECH_STACK、DEVELOPMENT_PROCESS；综述 plainurl 可点击参考文献与表格排版，6 页已检查；NetworkX 固定 3.6.1 恢复 Python3.11 元数据兼容，Node 最低22.13与 PDF.js 对齐。
- 验证：39 项后端测试；7 项前端单测；curl 真 HTTP 上传 + 假模型流水线，SSE 七条事件最终 done。route/PDF 按需加载减小首页包；新增导入遗漏 RenderTask 类型导致一次构建失败，已修复后重验。
- 遗留：真实模型 key 未配置，无付费调用或真实模型效果结论。后续 S17b 从已推送远程提交重新克隆验证并记录最终结果。
- S17a 最终检查：ruff check/format、pytest 39、前端 lint/tsc/Vitest 7/Playwright 2 全通过；OpenAPI 生成无漂移；pip check 无冲突；所有已安装 Python 包元数据兼容3.11。按需加载后首页 JS 266KB，PDF/图页面分别独立加载，构建不再报大块警告。S16 对应远端 Actions run 35753367757 已确认 success。
