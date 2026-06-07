import re
from anthropic import AsyncAnthropic
from backend.core.config import get_settings

_client: AsyncAnthropic | None = None


def get_llm_client() -> "_AnthropicCompat":
    return _AnthropicCompat()


def extract_json_text(raw: str) -> str:
    """Strip <think> blocks and markdown fences, return clean JSON string."""
    if "<think>" in raw and "</think>" not in raw:
        return ""
    text = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        return fence.group(1).strip()
    for i, ch in enumerate(text):
        if ch in ("{", "["):
            return text[i:]
    return text


# ── Anthropic SDK wrapped to look like OpenAI client ──────────────────────────

class _FakeUsage:
    def __init__(self, input_tokens: int, output_tokens: int):
        self.prompt_tokens = input_tokens
        self.completion_tokens = output_tokens


class _FakeMessage:
    def __init__(self, content: str):
        self.content = content


class _FakeChoice:
    def __init__(self, content: str):
        self.message = _FakeMessage(content)


class _FakeResponse:
    def __init__(self, content: str, input_tokens: int, output_tokens: int):
        self.choices = [_FakeChoice(content)]
        self.usage = _FakeUsage(input_tokens, output_tokens)


class _Completions:
    async def create(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.5,
        max_tokens: int = 1024,
        **kwargs,
    ) -> _FakeResponse:
        settings = get_settings()
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)

        # Anthropic separates system prompt from user messages
        system = ""
        anthro_msgs = []
        for m in messages:
            if m["role"] == "system":
                system = m["content"]
            else:
                anthro_msgs.append({"role": m["role"], "content": m["content"]})

        create_kwargs: dict = dict(
            model=model,
            messages=anthro_msgs,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if system:
            create_kwargs["system"] = system

        resp = await client.messages.create(**create_kwargs)
        content = resp.content[0].text if resp.content else ""
        return _FakeResponse(
            content=content,
            input_tokens=resp.usage.input_tokens,
            output_tokens=resp.usage.output_tokens,
        )


class _Chat:
    def __init__(self):
        self.completions = _Completions()


class _AnthropicCompat:
    def __init__(self):
        self.chat = _Chat()
