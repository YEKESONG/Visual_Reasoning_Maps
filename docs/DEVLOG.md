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
