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
