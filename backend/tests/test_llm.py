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
