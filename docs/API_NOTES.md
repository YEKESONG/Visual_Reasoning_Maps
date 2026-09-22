# 官方接口核实（2026-09-22）

- DeepSeek 更新日志 https://api-docs.deepseek.com/updates/ ：V4.1 Flash 的 API ID 是 `deepseek-flash`，LiteLLM 前缀 `deepseek/`。
- 严格函数 https://api-docs.deepseek.com/guides/tool_calls/ ：beta URL；工具 `strict: true`；对象全部字段 required、additionalProperties=false；移除不支持的 minLength/maxLength 后仍以 Pydantic 本地校验。
- 思考模式 https://api-docs.deepseek.com/guides/thinking_mode/ ：`thinking.type=enabled/disabled`；OpenAI SDK 用 extra_body。阶段开关显式设置，避免依赖默认。
- LiteLLM https://docs.litellm.ai/docs/providers/deepseek 与 Instructor https://python.useinstructor.com/integrations/litellm/ ：异步结构输出、completion usage；本地安装源码再次核对方法签名。
- FastAPI https://fastapi.tiangolo.com/tutorial/background-tasks/ 、SSE https://github.com/sysid/sse-starlette ：本地单进程任务，事件历史支持重连；重启不恢复执行。
- React Flow https://reactflow.dev/examples/layout/elkjs 、ELK https://github.com/kieler/elkjs ：layout Promise，worker 隔离布局。
- PDF.js https://mozilla.github.io/pdf.js/examples/ ：getDocument、getPage、getViewport、render；不要将 PyMuPDF 的左上坐标再次纵轴翻转。


# 补充核实（2026-09-23）

- DeepSeek create-chat-completion 文档：思考模式下 `tool_choice` 只能用 `auto` 或 `none`，`required` 和指定函数返回 400；`max_tokens` 包含推理 token，思考模式默认 64K、上限 384K（393216）；另有 `reasoning_effort`（none/low/high/max）。
- 实测（极小请求）：thinking=enabled 且指定函数 → 400 "Thinking mode does not support this tool_choice"；thinking=enabled 且 auto → 正常返回工具调用；thinking=disabled 且指定函数 → 正常。
- 思考模式指南：多轮工具调用时需要把 reasoning_content 回传。Instructor 重试时回放的 assistant 消息不带该字段，因此思考阶段的重试只把校验错误作为用户消息重发（`llm/client.py` 的 feedback_only）。
- 价格页（deepseek-flash）：上下文 1M，最大输出 384K；每百万 token 输入（未命中缓存）0.15–0.3 美元、输出 0.6–1.2 美元（分高峰/非高峰）。
- Instructor v2：`client.on("parse:error", handler)` 可以拿到触发重试的校验错误，用于记录失败原因。
