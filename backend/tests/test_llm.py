from pydantic import BaseModel

from backend.app.config import Settings
from backend.app.llm.client import LLMClient, strict_schema
from backend.app.storage.files import Store


class Answer(BaseModel):
    text: str


def test_strict_schema_subset():
    result = strict_schema(
        {"type": "object", "properties": {"x": {"type": "string", "maxLength": 40, "default": ""}}}
    )
    assert result["required"] == ["x"]
    assert result["additionalProperties"] is False
    assert "maxLength" not in result["properties"]["x"]


async def test_missing_key_message(tmp_path):
    import pytest

    config = Settings(_env_file=None, deepseek_api_key="")
    client = LLMClient(config, Store(tmp_path), "test")
    with pytest.raises(ValueError, match="DEEPSEEK_API_KEY"):
        await client.generate("skeleton", {}, Answer)


async def test_instructor_transport_cache_and_thinking(tmp_path, monkeypatch):
    import json

    import litellm

    calls = []

    async def fake_completion(**kwargs):
        calls.append(kwargs)
        return litellm.ModelResponse(
            model="deepseek/deepseek-flash",
            choices=[
                {
                    "index": 0,
                    "finish_reason": "tool_calls",
                    "message": {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call_1",
                                "type": "function",
                                "function": {"name": "Answer", "arguments": '{"text":"Validated"}'},
                            }
                        ],
                    },
                }
            ],
            usage={"prompt_tokens": 5, "completion_tokens": 4, "total_tokens": 9},
        )

    monkeypatch.setattr(litellm, "acompletion", fake_completion)

    def unavailable_cost(**kwargs):
        raise ValueError("unknown model price")

    monkeypatch.setattr(litellm, "completion_cost", unavailable_cost)
    config = Settings(_env_file=None, deepseek_api_key="test-placeholder", langfuse_public_key="")
    client = LLMClient(config, Store(tmp_path), "test")
    assert (await client.generate("skeleton", {"text": "example"}, Answer)).text == "Validated"
    assert (await client.generate("skeleton", {"text": "example"}, Answer)).text == "Validated"
    assert len(calls) == 1
    assert client.cost_usd is None
    assert calls[0]["extra_body"]["thinking"]["type"] == "enabled"
    assert calls[0]["tools"][0]["function"]["strict"] is True
    log = (tmp_path / "test/llm_log.jsonl").read_text()
    assert "test-placeholder" not in log
    assert json.loads(log)["usage"]["total_tokens"] == 9


async def test_strict_to_json_fallback(tmp_path, monkeypatch):
    import litellm

    modes = []

    async def fake_completion(**kwargs):
        modes.append("strict" if "tools" in kwargs else "json")
        if "tools" in kwargs:
            raise litellm.BadRequestError(
                message="unsupported schema", model="deepseek-flash", llm_provider="deepseek"
            )
        return litellm.ModelResponse(
            model="deepseek/deepseek-flash",
            choices=[
                {
                    "index": 0,
                    "finish_reason": "stop",
                    "message": {"role": "assistant", "content": '{"text":"Fallback"}'},
                }
            ],
            usage={"prompt_tokens": 5, "completion_tokens": 4, "total_tokens": 9},
        )

    monkeypatch.setattr(litellm, "acompletion", fake_completion)
    client = LLMClient(
        Settings(_env_file=None, deepseek_api_key="test-placeholder", langfuse_public_key=""),
        Store(tmp_path),
        "test",
    )
    assert (await client.generate("skeleton", {}, Answer)).text == "Fallback"
    assert modes[-1] == "json"


def tool_response(arguments: str):
    import litellm

    return litellm.ModelResponse(
        model="deepseek/deepseek-flash",
        choices=[
            {
                "index": 0,
                "finish_reason": "tool_calls",
                "message": {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": "call_1",
                            "type": "function",
                            "function": {"name": "Answer", "arguments": arguments},
                        }
                    ],
                },
            }
        ],
        usage={"prompt_tokens": 5, "completion_tokens": 4, "total_tokens": 9},
    )


async def test_thinking_stages_let_the_model_choose_the_tool(tmp_path, monkeypatch):
    import litellm

    calls = []

    async def fake_completion(**kwargs):
        calls.append(kwargs)
        return tool_response('{"text":"ok"}')

    monkeypatch.setattr(litellm, "acompletion", fake_completion)
    config = Settings(_env_file=None, deepseek_api_key="test-placeholder", langfuse_public_key="")
    client = LLMClient(config, Store(tmp_path), "test")
    await client.generate("skeleton", {"text": "a"}, Answer)
    await client.generate("section", {"text": "b"}, Answer)
    thinking, plain = calls
    # DeepSeek answers 400 to a named tool_choice in thinking mode.
    assert thinking["tool_choice"] == "auto"
    assert thinking["max_tokens"] == config.llm_thinking_max_tokens
    assert plain["tool_choice"]["function"]["name"] == "Answer"
    assert plain["max_tokens"] == config.llm_max_tokens


def test_retry_feedback_drops_assistant_turns():
    from backend.app.llm.client import feedback_only

    messages = [
        {"role": "system", "content": "prompt"},
        {"role": "user", "content": "payload"},
        {"role": "assistant", "content": "", "tool_calls": [{"id": "call_1"}]},
        {"role": "tool", "tool_call_id": "call_1", "content": "Validation Error: steps"},
    ]
    assert feedback_only(messages) == [
        messages[0],
        messages[1],
        {"role": "user", "content": "Validation Error: steps"},
    ]


async def test_failed_stage_is_logged_without_document_text(tmp_path, monkeypatch):
    import json

    import litellm
    import pytest

    from backend.app.llm.client import StageError

    async def fake_completion(**kwargs):
        return tool_response('{"wrong":"field"}')

    monkeypatch.setattr(litellm, "acompletion", fake_completion)
    config = Settings(_env_file=None, deepseek_api_key="test-placeholder", langfuse_public_key="")
    client = LLMClient(config, Store(tmp_path), "test")
    with pytest.raises(StageError) as failure:
        await client.generate("section", {"text": "confidential sentence"}, Answer)
    assert failure.value.stage == "section"
    log = (tmp_path / "test/llm_log.jsonl").read_text()
    records = [json.loads(line) for line in log.splitlines()]
    assert any(r.get("retry") for r in records)
    assert records[-1]["failed"] and "ValidationError" in records[-1]["error"]
    assert "confidential sentence" not in log and "test-placeholder" not in log
