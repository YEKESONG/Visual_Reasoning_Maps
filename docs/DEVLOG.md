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


## S17b 全新克隆验收与发布
- 完成：从 GitHub 远程全新克隆 6401b73，不复制任何环境/构建/数据；独立 setup.sh 成功。39项后端测试、Ruff、7项前端单测、lint/build通过；新端口8013一键启动，health及两份示例flow/source均HTTP200。
- 完成：过程文档补齐完整提交快照、复现命令、模块箭头和代码对照、默认方案与切换、已知局限；综述6页PDF已逐页核对，24张阅读卡片及参考链接齐备。
- 验证：最终实现已通过 OpenAPI 类型漂移检查、后端检查、前端lint/strict构建、两条Chromium阅读路径；无API key，无真实生成token/费用可以报告。S16远端GitHub Actions已确认success；发布提交CI另在交付报告记录。
- 发布：准备并推送 v0.1.0；交付目录另存源码归档、综述PDF、截图与中文报告。API key需要用户在.env填写；综述待核实清单见paper/README.md。
- 范围：Docker/GROBID/Langfuse/向量可选集成未实跑；原文泳道布局留作扩展；多类文本的人工评价尚未开展，不以功能验收冒充语义效果评价。


## S18 中、英、法三语切换
- 用户要求：网页所有功能支持中文、英文、法文并可切换。
- 完成：集中三语词库、全局语言选择与偏好保存；上传页、图谱控件、节点/关系类型、详情、术语、建议、全文与位置条、错误/SSE进度、加载/空状态以及React Flow无障碍标签。
- 完成：演示论点/说明/术语/建议三语同步，原文引文保持原样；分析语言可独立选择，任务级配置与语言缓存隔离；解释跟随当前界面语言并分语言缓存。已有生成内容保留原生成语言并明确提示。
- 问题修复：分析语言选择框的隐式label包含option文字，补充明确aria-label；多语言回归同时检查切换不丢失展开/选中状态；词库测试核对占位符与全部演示说明覆盖。
- 验证：后端42项通过；前端10项通过；三语浏览器测试和1024px截图验收结果见后续记录。原文语言不变，未调用真实模型；语言参数和缓存隔离使用可检查的假模型验证。
- 最终验收：后端42项、前端10项、Playwright 8条全部通过；ESLint、TypeScript strict/Vite、Ruff检查/格式、OpenAPI生成与git diff检查通过。新增三语图谱和1024px文档库截图已人工检查。用户只需刷新页面，右上角即可切换；既有原文和用户结果未被覆盖。


## S19 真实文档验收与修复（总述）
- 起因：用户要求检查各项功能是否完善。此前所有测试都用假模型和合成数据，没有用真实 API 跑过完整流程。用户提供了 arXiv 2607.26712v2（ActSWM，14 页双栏 AAAI 格式）作为测试文档，.env 已配置 DeepSeek key。
- 发现：data/ 中已有一次真实运行记录，只有 parsed.json 和 llm_log.jsonl，没有 flow.json，即流程失败。逐项排查后找到四类问题，分别在 S19a–S19e 修复：
  1. PDF 解析把图表刻度和公式碎片当作章节（57 个），双栏顺序错乱，行尾连字符未处理（S19a）。
  2. DeepSeek 思考模式不接受指定函数的 tool_choice（400），思考阶段每次先失败再退回 JSON 模式；跨节阶段 16000 token 全部耗在推理上没有输出，任务因此失败（S19b）。
  3. 送给模型的句子带完整坐标数组；修复轮把全文连同坐标、整张图重新发送并要求整图重生成，子步骤会丢失（S19c、S19d）。
  4. 失败时只显示笼统的"处理失败"，看不出是哪一步（S19e）。
- 以下每个子阶段单独提交，提交前运行与 CI 相同的检查。

## S19a PDF 版面解析重写
- 目标：让论文 PDF 的章节、阅读顺序和句子可用于抽取与原文定位。
- 问题（旧解析器在测试论文上）：标题判断规则是"不足 100 字且以数字开头"，结果把 0.972、1.00、"2 . (4)" 等图表刻度和公式碎片识别为 57 个章节，真正的 Introduction、Related Work 并入正文；双栏页按 y 坐标排序，左右栏段落交错；"con- trol" 这类行尾连字符原样保留；682 句中有大量公式碎片。分节阶段因此对数字碎片发起 43 次空调用。
- 完成内容：
  - 从同一个 TextPage 读取 dict 与 words，每行保留字号、粗体、字体名和词坐标。
  - 过滤：与页面主方向不同的文字（arXiv 侧边竖排编号）；以数学字体（CMMI/CMSY/CMEX 等）或小字号为主的行（公式、上下标、图表刻度）；只有公式编号的行；含运算符且词数少于 3 的公式残行；算法伪代码行；页面上下 5% 内的短行及在 3 页以上重复出现的页边文字；位于图片、矢量图簇、以及"同一水平范围内两条以上横线"之间的文字（booktabs 表格、ruled 算法框）。
  - 标题：字号不小于正文 1.08 倍，或整行粗体且不是段首粗体小标题（下一行以粗体开头又接正文）；首字符须为大写、数字或非 ASCII 文字，排除伪代码里的 else/end if；被拆开或换行的标题（附录 "A" + 标题）合并。
  - 第一页中摘要或引言标题之前的大字号行视为题名和作者，不进入正文；PDF 元数据没有标题时，用其中字号最大的行作题名。
  - 阅读顺序：以跨栏块把页面分成横带，每条带内先左栏、后右栏。
  - 分段：按块和首行缩进切段；上一段未以句末标点结束且下一段小写开头时视为续写（跨栏、跨页、行间公式之后），续到下一页的词记录 page。
  - 连字符：行尾连字符后接小写字母时合并；如果全文出现过带连字符的写法而没出现过合写，就保留连字符（long-horizon）。
  - 跳过参考文献和致谢，遇到附录标题恢复；图注移到所在章节末尾，避免打断跨页句子。
  - 切句：间隔省略号 ". . ." 和小写开头的后文不再断开；补充 Sec./Eq./Tab./cf. 等缩写；去掉句首列表符号；跨页句子的页码取句首所在页，只用该页的坐标框。
- 效果（同一篇论文）：章节 57 → 22（Abstract、Introduction、Game Agents、Method……附录 A–G），段落 318 → 93，句子 682 → 298，全部是正文；8 处跨页段落正确接续。
- 主要文件：backend/app/ingest/pdf_pymupdf.py、backend/app/anchoring/sentences.py、backend/app/models.py（Word.page）。
- 工具与库：PyMuPDF 1.28.2 的 get_textpage、get_text("dict"/"words")、get_drawings、cluster_drawings、get_image_info。
- 验证：新增合成双栏论文测试（章节、顺序、连字符、噪声过滤、图注位置、跨页句子）和切句测试；`.venv/bin/pytest -q` 45 项通过；ruff check/format 通过；重新导出 OpenAPI 并生成前端类型；`pnpm lint && pnpm test && pnpm build` 通过。
- 遗留：扫描件仍需先做 OCR；无横线的表格、复杂浮动体和三栏以上版式没有专门处理；跨页句子只在起始页高亮。

## S19b DeepSeek 思考模式与失败诊断
- 目标：让开启思考的阶段（skeleton、cross）稳定返回结构化结果，失败时能看出原因。
- 问题：失败那次运行的 llm_log.jsonl 显示，skeleton 和 cross 在 tools 模式下都先报 BadRequestError，再退回 JSON 模式；cross 的 JSON 调用用满 16000 个输出 token，其中 16000 个是推理 token，正文为空，Instructor 解析失败，整个任务中止。日志只有异常类名，看不出原因。
- 排查：用极小请求直接调用接口（费用可忽略）。`tool_choice` 指定函数或设为 required 时，思考模式返回 400 "Thinking mode does not support this tool_choice"；设为 auto 时模型正常调用工具；非思考模式指定函数正常。DeepSeek 文档（create-chat-completion）写明：思考模式不支持 required 和指定函数的 tool_choice；max_tokens 包含推理 token，思考模式默认 64K、上限 384K。Instructor 重试时回放的 assistant 消息不带 reasoning_content，而思考模式要求回传。
- 完成内容：
  - 思考阶段把 Instructor 生成的 tool_choice 改为 auto，输出上限用新的 `LLM_THINKING_MAX_TOKENS`（默认 64000）；超时思考阶段 600 秒、其他 240 秒。
  - 思考阶段重试时不回放 assistant 轮，只把校验错误作为用户消息重发（feedback_only）。
  - 连接错误和 5xx 也按瞬时错误重试。
  - 通过 Instructor 的 parse:error 钩子记录触发重试的校验错误；阶段最终失败时写入 `failed` 记录并抛出只带阶段名的 StageError。记录内容只有异常类名和字段路径，不含模型输出、原文或密钥。
  - 系统提示中的输出语言写成完整语言名（Simplified Chinese / English / French / the language of the source document），不再只写 zh/en/fr。
- 主要文件：backend/app/llm/client.py、backend/app/config.py。
- 验证：新增测试——思考阶段 tool_choice=auto 且使用 64K 上限、非思考阶段仍指定函数、重试消息不含 assistant 轮、失败时记录原因且日志中没有文档内容和密钥；pytest 48 项通过；ruff 通过；OpenAPI 无变化。
- 遗留：成本估算依赖 LiteLLM 价格表，未收录的模型记为 null。

## S19c 模型输入瘦身、分节打包与提示词 v2
- 目标：减少无效 token 和调用次数，让各阶段的输入格式清楚、输出更容易通过校验。
- 问题：各阶段把句子对象整体发送，包括坐标框数组、页码、DOM ID；跨节阶段把全部步骤的完整字段和全文句子一起发送（约 4.6 万输入 token）；骨架阶段只看到 sec3 这类章节编号，看不到章节标题；分节阶段每个章节单独调用一次；模型输出中只要有一个步骤缺锚点或标题超过 40 字，整批结果校验失败并重试。
- 完成内容：
  - 所有模型输入里的句子改为 `[句子ID, 文本]`，不再带坐标和 DOM 信息。
  - 骨架阶段按 `{title, sentences}` 分章节发送；文本超过 `max_input_chars` 时，每节交替保留开头和结尾的句子。
  - 分节阶段把相邻短章节打包、把超长章节按句拆开，每块不超过 `SECTION_CHUNK_CHARS`（默认 12000 字符）；只附主流程的精简字段（id、parent、type、label、summary、anchors）。测试论文从 60 次分节调用降到 4 次。
  - 跨节阶段只发送步骤精简字段、已有关系三元组，以及被引用句子和前后各一句；与已有关系重复、端点不存在的关系直接丢弃。
  - 提示词升级到 2.0：写明输入格式、步骤类型和关系方向、每类关系的判定标准、何时返回空结果，并给出 JSON 形状示例。
  - 模型输出容错：标题超过 40 字截断并加省略号，置信度夹到 0–1；没有锚点或引文的步骤、没有锚点的术语卡直接丢弃；没有锚点的关系借用终点（或起点）步骤的句子。
  - 修改建议阶段只发送步骤、关系和句子文本；目标存在但部分锚点无效时保留有效锚点。
  - 按需解释只发送所需字段；解释里引用了输入之外的句子 ID 时删掉该引用，不再返回 502。
  - extract() 增加进度回调参数（在 S19e 接入任务进度）。
- 主要文件：backend/app/extraction/pipeline.py、backend/app/prompts/{skeleton,section,cross,suggestions,explanation}.md、backend/app/models.py、backend/app/suggestions/review.py、backend/app/main.py、backend/app/config.py。
- 验证：新增测试——按章节组织且不含坐标、长文每节保留首尾、分节打包与拆分、子步骤加前缀并丢弃父节点无效的条目、跨节去重、模型输出容错、解释中越界引用被删除；pytest 53 项通过；OpenAPI 与前端类型重新生成（prompt_version 默认 2.0）；前端 lint/test/build 通过。

## S19d 定向修复与按条目标记核验状态
- 目标：修复轮只改有问题的条目，不丢已抽取的子步骤；虚线框只表示"原文支持未确认"。
- 问题：
  - 旧修复轮用 skeleton 提示词把全文（含坐标）、整张图和问题清单一起发出，要求整图重生成；该提示词只产出 5–12 个主步骤，子步骤会整体丢失。
  - 最终状态计算时，只要出现一个全图级问题（例如 disconnected），所有步骤和关系都被标成 to_verify。第一次真实跑通时 39 个步骤、54 条关系全部显示虚线框，而核验阶段其实判定了 81 项 supported、13 项 partial、4 项 unsupported。
  - 分节阶段的步骤 ID 和关系 ID 使用同一前缀，模型给步骤和关系起了相同的局部 ID（如 l4），生成的 section3_l4 同时是步骤和关系。问题清单只记录 ID，针对关系的问题被当成步骤去修，模型把这些步骤重新输出为无父节点的主步骤，三轮问题数 6 → 8 → 14。
- 完成内容：
  - 新增 repair 阶段和 RepairPatch：输入问题清单（带条目类型）、全部步骤的精简字段、关系三元组、问题条目的完整数据和原文句子；输出只包含替换或新增的条目以及要删除的 ID。合并时按 ID 替换、追加新条目，删除主步骤时连带删除其子步骤和相关关系；原样返回的条目不算修改，不重新核验。
  - 修复时保留被改写子步骤的原父节点，除非补丁明确移到别处。
  - 问题记录增加 target_type（step / link / graph）；关系 ID 与步骤 ID 冲突时统一重命名；分节关系使用 `section{i}_rel_` 前缀。
  - 不调用模型的确定性修正：原文中找不到的连接词清空；无效的关系锚点改用两端步骤的句子；术语卡中失效的锚点和步骤引用清理，清理后为空则删除。
  - 核验只对新增或修改过的条目重新判定；一批中被漏判的条目再问一次，仍漏判的记为 unchecked 且不送去修复。
  - 最终只有原文支持类问题（anchor、semantic、connective、contradiction_anchor、endpoint、parent）会把对应条目标为 to_verify；结构问题（dead_end、disconnected、size 等）保留在 validation_report.json 中。
  - critic 提示词 2.0 与新的输入格式一致；repair 提示词 1.1 逐条写明每类问题的处理方法（例如 dead_end 要补一条有原文依据的关系，size 要合并或删减子步骤）。
- 真实运行（测试论文，骨架/分节/跨节命中缓存，只重跑核验以后的阶段）：修复前全部 to_verify；修复后第一版 36 个步骤 verified、4 个 partial，50/54 条关系 verified；修复提示词 1.1 后 s7 子步骤过多的问题被修好，最终 33 个步骤中 31 个 verified、2 个 partial，46 条关系中 45 条 verified，只剩 s4 未连到结论这一处结构缺口记录在报告中。
- 主要文件：backend/app/validation/checks.py、backend/app/models.py（RepairPatch）、backend/app/prompts/repair.md、backend/app/prompts/critic.md、backend/app/extraction/pipeline.py。
- 验证：新增测试——结构缺口不影响已核对条目、漏判条目会被再问一次、问题带条目类型、补丁保留父节点且只报告真实改动、删除主步骤连带删除子步骤和关系、确定性修正；原有的两轮修复上限和"修复失败仍能渲染"测试保持通过；pytest 58 项通过。
- 遗留：非思考模式下的修复对结构问题（缺少通向结论的关系）效果有限；如需更强的修复，可把 repair 加入 LLM_THINKING_STAGES，代价是每轮多约 30 秒。

## S19e 分阶段进度、可读的失败提示与任务状态接口
- 目标：用户能看到分析进行到哪一步；失败时知道是哪一步、该怎么处理；刷新页面后还能找回正在进行的任务。
- 问题：抽取阶段只有一条"Reconstruction du raisonnement"进度，实际要跑 3–4 分钟；任何异常都显示同一句"处理失败，请检查格式、配置和连接"；前端只能通过 SSE 跟踪任务，刷新后 task_id 丢失。
- 完成内容：
  - 进度细分：切句 15%、主要推理 25%、逐节细节 38%、跨节关系 52%、核对引文 62%、修正有问题的步骤 70%/78%、修改建议 88%。
  - failure_message() 把异常映射成固定的、可翻译的提示：模型阶段失败时说明是哪个阶段，并提示重试会复用已完成阶段的缓存；服务商返回 401/402/429 时分别提示密钥被拒、余额不足、请求过于频繁；解析类错误沿用原有白名单。服务商原始报错仍不会返回给前端。SSE 错误事件增加 params 字段，供前端插入阶段名。
  - 新增 GET /api/tasks/{id}，返回任务最新一条事件；/api/health 增加当前模型名（不含密钥）；未配置 DeepSeek 以外的模型时，configured 不再依赖 DEEPSEEK_API_KEY。
  - Metadata 增加 language，文档库可以区分同一文件的不同语言分析。
  - GROBID 请求失败时写入警告并继续使用 PyMuPDF 结构，不再让整个任务失败。
- 真实运行：测试论文首次完整跑通用时 208 秒，31.1 万 token，LiteLLM 估算费用约 0.06 美元（含分节阶段的校验重试）；之后改动核验和修复阶段时，骨架、分节、跨节命中缓存，每次重跑约 30–40 秒、0.01–0.02 美元。
- 主要文件：backend/app/tasks/pipeline.py、backend/app/main.py、backend/app/models.py。
- 验证：新增测试——失败提示包含阶段名且不含服务商原文、401 映射为密钥提示、阶段失败经任务状态接口可读、未知任务 404、health 返回模型名；pytest 61 项通过；OpenAPI 与前端类型重新生成；前端 lint/test/build 通过。

## S20a 图谱：对称的矛盾连线与按标题定高的节点
- 目标：修正图谱页的三个显示问题。
- 问题：
  - 矛盾关系和其他关系一样用 smoothstep 连线，从源节点右侧出发、进入目标节点左侧；当目标在源的左边时，线会在节点外绕一个大回环（示例中"方法带来进步"与"判断可能出错"之间）。矛盾本应是无方向的。
  - 节点高度固定（主步骤 118、子步骤 108），中文长标题会溢出；英文短标题又留出大片空白。
  - 图谱区高度写死为 `calc(100vh - 263px)`，与实际页头高度不符，页面出现滚动条，图例被推到首屏以外。
- 完成内容：
  - 新增 TensionEdge：取两节点中心连线与各自边框的交点，画一条直虚线，不带箭头。
  - graph.ts 新增 nodeHeight()：按显示的标题估算行数（中日韩字符按 1 个字宽、拉丁字母按 0.52 个字宽，最多 4 行），布局和节点样式使用同一高度；翻译后的标题由主线程传给布局 Worker。
  - 地图页改为纵向 flex，图谱区占满剩余高度；节点内边距收紧以适配新高度。
- 主要文件：frontend/src/MapPage.tsx、graph.ts、layout.worker.ts、graph.test.ts、style.css。
- 验证：新增 Vitest 用例（同样 20 个字符时中文两行、英文一行，最多 4 行，布局输入使用翻译后的标题）；`pnpm lint && pnpm test && pnpm build` 通过（11 项）；在 8010 端口的测试服务上截图检查示例图谱（展开前后）。

## S20b 全文页：位置标记不再互相遮挡
- 问题：右侧位置条按"第一次出现的位置"放置主步骤标记。示例中第 5、6 步引用同一段落，两个标记完全重叠，只能看到一个；编号按模型返回步骤的顺序，与位置条自上而下的顺序不一致。
- 完成内容：标记按在原文中首次出现的位置排序编号；相邻两个标记的纵向距离小于 3.5% 时依次向左错开（最多三列）；当前查看的句子所属步骤的标记高亮。
- 主要文件：frontend/src/FullText.tsx、style.css。
- 验证：`pnpm lint && pnpm test && pnpm build` 通过；截图确认示例全文页 6 个标记全部可见、当前步骤高亮。

## S20c 首页接入任务状态与失败提示
- 目标：前端用上 S19e 的接口：刷新后能继续看到正在进行的分析，失败时显示具体阶段，未配置密钥时在首页说明。
- 完成内容：
  - 提交任务后把 task_id 存进 sessionStorage；首页加载时先查 GET /api/tasks/{id}，仍在运行就重新连接 SSE（服务端会从头回放事件），已结束或服务已重启则清除记录。
  - 进度区显示当前阶段、百分比，并说明"一篇论文需要几分钟，可以离开页面，完成后在文档库里查看"。
  - 错误事件的 params 先翻译再插入提示，例如"模型在'连接各节关系'阶段没有返回可用结果"。
  - /api/health 返回 configured=false 时显示如何配置 DEEPSEEK_API_KEY。
  - 为 S19 新增的进度、阶段名、服务商错误、GROBID 警告补中英文翻译；SSE 中断的提示改写得更具体。
  - playwright.config.ts 支持 BASE_URL 环境变量（默认仍是 8000），便于在另一个端口上的测试服务运行端到端测试。
- 主要文件：frontend/src/pages.tsx、api.ts、translations.ts、style.css、playwright.config.ts、e2e/progress.spec.ts。
- 验证：新增 2 条 Playwright 用例（用路由模拟任务状态与 SSE：刷新后接回任务并显示带阶段名的中文错误、任务记录被清除；未配置密钥时显示英文提示）；`BASE_URL=http://127.0.0.1:8010 pnpm exec playwright test` 10 条全部通过；`pnpm lint && pnpm test && pnpm build` 通过。

## S20d 界面重做与三语文案重写
- 目标：去掉界面上模板化、口号式的设计和文字，让页面像一个阅读工具；文案在中、英、法三种语言里都说人话。
- 问题（逐页检查截图后记录）：
  - 首页是营销式首屏：⌘ 图标（Mac 命令键符号，与主题无关）、"阅读思想，追溯证据"之类的对仗标语、"阅读工作台 · ENAC"标签、64px 大标题"从问题出发 / 走向结论。"、一个错位的装饰流程图（"证据 ↗"悬空）；文档库用 01、02 大号编号，内部链接一律带 ↗。
  - 图谱页节点里的类型、原文数只有 9–10px；状态用 ? ◐ ✓ 符号表示且没有图例；每条支持关系都挂着"支持"标签；右侧空白时显示"沿着一个观点 / 追溯它的来源。"和一排含义不明的符号（⑂ ⑃ ⊞）。
  - 详情面板把内部 ID（experience、p5s1）直接展示给读者；示例数据也显示"模型自报置信度 75 %"。
  - 译文生硬或不准确：Argument 译作论点但英文为 Claim；"Démonstration éditoriale"译作"人工编排示例"；按钮带装饰箭头"生成图谱 →"。
- 完成内容：
  - 顶栏只保留名称、文档库链接和界面语言；首页改为"新建图谱"（一句说明、上传 PDF、arXiv 链接、图谱语言、数据去向和当前模型名）加文档库列表（标题、格式、图谱语言、日期）。
  - 图谱页：标题下显示主旨；工具栏的关系复选框带线型样例，兼作图例；节点字号加大，状态写成文字（部分支持、待核实）；只有非"支持"的关系显示文字标签；右侧未选中时显示"怎么读这张图"：步骤类型色条、关系线型、虚线框含义、"+ 3"含义、键盘操作，以及识别出的发散、汇聚、矛盾等结构和定义。
  - 详情面板：类型（子步骤注明所属主步骤）、标题、摘要、核验状态的完整说明、引文、原版排版片段、"在全文中查看：第 3 页"、解释、术语、修改建议（区分结构规则与模型意见，显示改写示例）；按需解释中的 [p12s3] 引用渲染为页码链接；示例不显示模型置信度。
  - 关系详情：按类型写一句话说明关系（支持 / 导致 / 细化 / 冲突），两端原文并排，面板加宽；点端点标题可跳到该步骤。
  - 新设计的颜色、字号和布局约定写入 docs/DESIGN.md。
  - translations.ts 按页面分组整体重写，删除不再使用的键；后端的规则建议、PDF 警告、示例解释文字同步改写。静态检查脚本确认界面用到的 189 条文案都有中英文。
  - 修正：展开的步骤变成分组后，父步骤内容固定在分组顶部，"收起"按钮不再被子步骤遮住；React Flow 缩放按钮不受全局按钮样式影响；窄屏下缩小缩略图；输入框占位文字调浅。
- 主要文件：frontend/src/{pages,main,MapPage,Details,SourceView,FullText}.tsx、api.ts、style.css、translations.ts、i18n.test.ts、e2e/*.spec.ts；backend/app/suggestions/review.py、ingest/pdf_pymupdf.py、main.py；docs/DESIGN.md。
- 验证：`pnpm lint && pnpm test && pnpm build` 通过；Playwright 10 条用例全部通过（用例按新文案更新）；pytest 61 项通过；在 8010 端口逐页截图检查中文首页、图谱页（未选中、选中步骤、选中关系）、法语 1024px HTML 示例、英文全文页。
