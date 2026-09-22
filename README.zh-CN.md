# Visual Reasoning Maps

为 ENAC 项目做的论文阅读原型。输入一篇论文（PDF，或 arXiv 上的 HTML 页面），大模型把其中的论证整理成一张图：研究问题、前提、证据、异议、结论，以及它们之间的关系；图上的每一步都连回原文中作为依据的那句话。界面有中文、英文、法文三种语言。仓库里还有一份法文综述初稿（`paper/`）。

[Version française](README.md)

![Descartes 示例的推理图与引文](docs/screenshots/map-pdf.png)

## 安装与启动

需要 Python 3.11 以上（已测 3.12）、Node.js 22.13 以上（已测 24，PDF.js 6 的要求）、pnpm 11.19.0（`npm install -g pnpm@11.19.0`）和 Git。

```sh
git clone git@github.com:YEKESONG/Visual_Reasoning_Maps.git && cd Visual_Reasoning_Maps
bash scripts/setup.sh
python3 run.py
```

浏览器打开 http://localhost:8000 。两个示例（笛卡尔《谈谈方法》节选，PDF 和 HTML 各一份）不需要 API 密钥就能查看。要分析自己的文档，在 `.env`（由 `setup.sh` 创建，不会提交到 Git）中填写 `DEEPSEEK_API_KEY`，然后重新运行 `python3 run.py`。更新代码之后也要重启服务。可以用 `PYTHON_BIN=/路径/python3.12 bash scripts/setup.sh` 指定 Python；已有的 `.env` 不会被覆盖。

## 一次分析做了什么

1. **读取文档。** PDF：识别双栏顺序、按字号和粗细识别章节标题，去掉页眉页脚、页码、公式、表格和参考文献，把被分栏或分页截断的句子接起来。arXiv 链接优先用 HTML 版，没有 HTML 时下载 PDF。全文切成带编号的句子（`p12s3` 表示第 12 段第 3 句）。
2. **重建推理。** 模型先给出 5–12 个主步骤，再逐节补充子步骤，最后找出跨章节的关系。
3. **核对。** 每条引文都必须能在所标的句子里找到；模型再逐项判断这些句子是否真的支持对应的步骤和关系。发现的问题最多退回模型修改两轮，每次只改有问题的条目。仍然存疑的步骤用虚线框显示；结构上的缺口（例如某条分支没有通向结论）记在 `validation_report.json` 里。
4. **修改建议。** 包括结构规则（没有依据的论断、没有支持任何论断的证据等）和模型意见，每条都挂在具体的步骤和句子上。

测试论文（14 页双栏）完整分析一次约 3 分 30 秒，使用 `deepseek-flash` 的费用约 0.06 美元（LiteLLM 估算）。每次模型调用都有缓存：中断后重新分析，只会重做没完成的阶段。分析过程中可以关闭或刷新页面，完成后图谱会出现在文档库里。

## 怎么看图

- 默认只显示主步骤；“+ n”表示有 n 个子步骤，点击展开。
- 工具栏的复选框可以隐藏某类关系（支持、因果、细化、矛盾）；“只显示所选步骤的推理链”会把其余部分调淡。
- “逐步阅读”按推理顺序或原文顺序依次走过每一步。
- 点击步骤：引文、原始排版的原文片段、页码链接、按需生成的解释、术语和修改建议。点击连线：两端的原文并排对照。
- “阅读全文”：被引用的句子高亮显示，点击即可回到对应步骤；右侧竖条标出各主步骤在原文中的位置。
- 键盘：Tab 在步骤之间切换，Enter 打开，Esc 关闭。

“已核对”只表示自动核对认为引文支持这一步，不代表论文的结论在科学上成立。

## 语言

右上角可切换中文 / English / Français，整个界面随之切换，偏好保存在浏览器中。图谱语言在上传前选择：与界面相同、与原文相同，或指定一种语言；引文始终保留原文语言。同一份文档用两种语言分析，会得到两张独立的图谱。按需解释使用当前界面语言。

## 配置（`.env`）

| 变量 | 作用 |
|---|---|
| `DEEPSEEK_API_KEY` | 默认服务商的密钥。 |
| `LLM_MODEL` | 默认 `deepseek/deepseek-flash`（LiteLLM 前缀格式）。 |
| `LLM_API_BASE` | DeepSeek beta 地址，严格模式需要；换其他服务商时清空。 |
| `LLM_OUTPUT_MODE` | `strict`（带严格 schema 的工具调用）或 `json`（JSON 输出，由 Pydantic 校验）。 |
| `LLM_THINKING_STAGES` | 开启思考的阶段，默认 `skeleton,cross`。 |
| `LLM_THINKING_MAX_TOKENS` | 这些阶段的输出上限（包含推理 token），默认 64000。 |
| `SECTION_CHUNK_CHARS` | 逐节阶段每批发送的字符数，默认 12000。 |
| `LABEL_LANGUAGE` | 图谱默认语言：`auto`、`fr`、`en`、`zh`。 |
| `GROBID_URL` | 留空时只用 PyMuPDF；否则填写 GROBID 服务地址，如 `http://localhost:8070`。 |
| `LANGFUSE_*` | 可选，只上报调用指标，不含内容。 |
| `EMBEDDING_MODEL` | 可选，sentence-transformers 模型，用于识别重复步骤。 |
| `DATA_DIR` | 文档和结果的存放目录，默认 `data/`。 |

换用 Claude、GPT、Grok 等：修改 `LLM_MODEL`，清空 `LLM_API_BASE`，设置 LiteLLM 要求的对应密钥变量。DeepSeek 专用的思考参数不会发给其他服务商。代码已预留这种切换，但没有用真实账号测试过。

文档文字会发送给所配置的服务商，其余内容都留在本机：`data/<哈希>/` 下有原文件、`parsed.json`、`flow.json`、`validation_report.json`、`suggestions.json`、调用缓存和 `llm_log.jsonl`（记录 token 数、耗时、估算费用和失败原因，不记录正文和密钥）。

## 开发

- `bash scripts/dev.sh` 同时启动 FastAPI 和 Vite（http://localhost:5173）。
- 与 CI 相同的检查：
  ```sh
  .venv/bin/ruff check backend scripts run.py && .venv/bin/ruff format --check backend scripts run.py
  .venv/bin/pytest -q
  pnpm --dir frontend lint && pnpm --dir frontend test && pnpm --dir frontend build
  ```
- 端到端测试（Playwright，需要先启动服务）：`pnpm --dir frontend test:e2e`；服务不在 8000 端口时加 `BASE_URL=http://127.0.0.1:8001`。
- 接口类型：先 `.venv/bin/python -m scripts.export_openapi`，再 `pnpm --dir frontend types`。
- 重建示例：`.venv/bin/python -m scripts.build_examples`。`python -m scripts.record_fixtures 文件.pdf` 会真实调用模型并产生费用。
- 测试不联网，也不需要 API 密钥。

开发过程中的每个阶段都是一个单独的提交；[docs/DEVLOG.md](docs/DEVLOG.md) 记录了每个阶段遇到的问题、做法和验证方式。另见[技术决策](docs/DECISIONS.md)、[架构](docs/ARCHITECTURE.md)、[依赖版本](docs/TECH_STACK.md)、[界面设计](docs/DESIGN.md)和[复现步骤](docs/DEVELOPMENT_PROCESS.md)。

## 目录

- `backend/app/`：文档读取（`ingest/`）、切句（`anchoring/`）、模型调用（`llm/`）、抽取、核对、修改建议、存储和接口。
- `frontend/src/`：文档库、推理图、详情面板、全文阅读。
- `examples/`：笛卡尔示例及来源说明。
- `paper/`：法文综述（七节正文、24 张阅读卡片）。`cd paper/etat_de_lart && make` 编译 PDF（需要带法语支持的 TeX Live 或 MacTeX）；待核实事项见 [paper/README.md](paper/README.md)。

## 已知限制

- 扫描版 PDF 需要先做 OCR。
- 版面靠启发式规则还原：双栏、标题、带横线的表格可以处理；没有横线的表格、三栏版式和部分浮动体可能出错。PDF 中的公式不会转成 LaTeX；HTML 中的 MathML 会保留。
- 自动修正不一定能补上结构缺口（比如某条分支没有通向结论），这类问题会留在报告里。
- 核对用的是与抽取相同的模型，仍需要人工评价。
- 单进程运行：重启会中断正在进行的分析（已完成的阶段保留在缓存中）。不要用 `uvicorn --workers` 启动。
- 想用不同设置重新分析同一份文档，先把它的目录移出 `data/`。
- Docker（`docker compose up --build`，加 `--profile grobid` 启用 GROBID）、GROBID、Langfuse 和向量模型都已提供，但没有在本环境实测。
- 8000 端口被占用时：`PORT=8001 python3 run.py`。

## 许可证

代码采用 MIT 许可证，第三方材料保留各自的许可证。PyMuPDF 为 AGPL 或商业双许可，分发衍生版本前请确认兼容性。详见 [LICENSE](LICENSE)、[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 [examples/README.md](examples/README.md)。
