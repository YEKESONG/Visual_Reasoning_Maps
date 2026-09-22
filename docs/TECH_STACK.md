# 技术栈与精确版本

核对日期：2026-09-22。Python 依赖完整列表为 `requirements.lock`，前端完整依赖图为 `frontend/pnpm-lock.yaml`。升级后必须同步锁文件并重跑验收。

| 名称 | 版本 | 所在层 | 用途 | 选择理由 | 替代方案 |
|---|---|---|---|---|---|
| FastAPI | 0.141.1 | B6 | REST、OpenAPI | 原生 Pydantic 契约 | Flask / Django |
| Pydantic | 2.13.5 | 契约 | 严格类型与本地验证 | 后端和生成类型共用 | JSON Schema 手工维护 |
| pydantic-settings | 2.15.0 | 配置 | .env 与 SecretStr | 集中可替换配置 | 环境变量手动读取 |
| Uvicorn | 0.53.0 | 运行 | ASGI 服务 | 单进程 asyncio | Hypercorn |
| sse-starlette | 3.4.11 | B6 | SSE 事件流 | 标准重连协议 | WebSocket |
| PyMuPDF | 1.28.2 | B1 | 文本与词框 | 无需额外服务 | GROBID / Docling |
| Beautiful Soup | 4.15.0 | B1/B2 | HTML 结构与锚点 | 保留行内节点 | lxml |
| httpx | 0.28.1 | B1 | 异步受限下载 | 流式大小/重定向检查 | aiohttp |
| LiteLLM | 1.102.0 | 模型 | 供应商适配 | 统一模型接口 | 供应商 SDK |
| Instructor | 1.17.0 | 模型 | 结构输出与校验重试 | Pydantic 集成 | 直接工具调用 |
| tenacity | 9.1.4 | 模型 | 限次退避 | 明确重试策略 | 手写循环 |
| NetworkX | 3.6.1 | B4 | DAG/连通/上游 | 成熟图算法；3.6.1 支持 Python3.11 | igraph |
| RapidFuzz | 3.14.6 | B4 | 引文/摘要相似度 | 轻量保守匹配 | 可选向量模型 |
| Langfuse | 4.15.4 | 可选 | 调用指标 | 可关闭遥测 | 本地 jsonl |
| pytest | 9.1.1 | 验证 | 离线后端测试 | asyncio/夹具 | unittest |
| Ruff | 0.16.8 | 验证 | 检查与格式化 | 统一 Python 规范 | Black + Flake8 |
| ReportLab | 5.0.1 | 示例 | 公有领域文本重排 | 确定性 PDF | LaTeX |
| react | 19.3.0 | UI | 组件 | 成熟生态 | Vue |
| typescript | 5.9.3 | UI | strict 类型 | 静态契约检查 | JavaScript |
| vite | 8.3.0 | 构建 | 开发与打包 | worker 支持 | Webpack |
| @xyflow/react | 12.11.6 | F2 | 图渲染与视口 | 键盘、小地图、分组 | Cytoscape |
| elkjs | 0.12.0 | F2 | 分层布局 | 与渲染解耦 | Dagre |
| pdfjs-dist | 6.3.289 | F3/F4 | 原页渲染 | 保留 PDF 排版 | 浏览器 PDF 插件 |
| zustand | 5.0.15 | UI | 选择与展开状态 | 小型集中状态 | Redux |
| dompurify | 3.4.15 | F3/F4 | HTML 清洗 | 隔离前再过滤 | 纯文本 |
| react-router-dom | 7.18.4 | 路由 | URL 定位 | 稳定深链接 | 手写 History |
| openapi-typescript | 7.13.0 | 契约 | 生成 API 类型 | 避免重复声明 | 手工 types |
| eslint | 9.39.4 | 验证 | TS/React lint | 生态规则 | Biome |
| prettier | 3.9.8 | 验证 | 前端格式 | 一致性 | Biome |
| vitest | 5.0.1 | 验证 | 图与坐标测试 | Vite 集成 | Jest |
| @playwright/test | 1.63.0 | 验证 | 真实 Chromium 阅读路径 | 图/iframe/canvas 检查 | 人工操作 |

## 运行环境与可选项

实际验证 macOS、Python 3.12.14、Node 24.19.0、pnpm 11.19.0、Chromium（Playwright 管理）、latexmk 4.88 / TeX Live 2026。包声明最低 Python 3.11，PDF.js 要求 Node 22.13；最低版本组合未单独实跑。

GROBID compose 镜像为 0.8.2；服务和 Docker 本次未实跑。sentence-transformers 默认未安装，设置 EMBEDDING_MODEL 前需另行安装并记录锁定版本。公式优先保留 HTML 原生 MathML，无需另加 KaTeX。依赖 API 核对入口见 [API_NOTES](API_NOTES.md)，许可证见 [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md)。
