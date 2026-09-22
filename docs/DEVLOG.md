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
