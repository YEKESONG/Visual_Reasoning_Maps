# 官方接口核实（2026-09-22）

- DeepSeek 更新日志 https://api-docs.deepseek.com/updates/ ：V4.1 Flash 的 API ID 是 `deepseek-flash`，LiteLLM 前缀 `deepseek/`。
- 严格函数 https://api-docs.deepseek.com/guides/tool_calls/ ：beta URL；工具 `strict: true`；对象全部字段 required、additionalProperties=false；移除不支持的 minLength/maxLength 后仍以 Pydantic 本地校验。
- 思考模式 https://api-docs.deepseek.com/guides/thinking_mode/ ：`thinking.type=enabled/disabled`；OpenAI SDK 用 extra_body。阶段开关显式设置，避免依赖默认。
- LiteLLM https://docs.litellm.ai/docs/providers/deepseek 与 Instructor https://python.useinstructor.com/integrations/litellm/ ：异步结构输出、completion usage；本地安装源码再次核对方法签名。
- FastAPI https://fastapi.tiangolo.com/tutorial/background-tasks/ 、SSE https://github.com/sysid/sse-starlette ：本地单进程任务，事件历史支持重连；重启不恢复执行。
- React Flow https://reactflow.dev/examples/layout/elkjs 、ELK https://github.com/kieler/elkjs ：layout Promise，worker 隔离布局。
- PDF.js https://mozilla.github.io/pdf.js/examples/ ：getDocument、getPage、getViewport、render；不要将 PyMuPDF 的左上坐标再次纵轴翻转。
