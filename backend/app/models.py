from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


def short_label(value: object) -> object:
    # Model labels sometimes exceed the node width; trim instead of failing the whole stage.
    if isinstance(value, str) and len(value.strip()) > 40:
        return value.strip()[:39].rstrip() + "…"
    return value


def unit_interval(value: object) -> object:
    return min(1.0, max(0.0, value)) if isinstance(value, (int, float)) else value


class Word(Model):
    text: str
    start: int
    end: int
    bbox: tuple[float, float, float, float]
    # Set when a paragraph continues on the next page; otherwise the paragraph page applies.
    page: int | None = None


class Paragraph(Model):
    id: str
    text: str
    section_id: str
    page: int | None = None
    words: list[Word] = Field(default_factory=list)
    dom_id: str | None = None
    latex: list[str] = Field(default_factory=list)


class Section(Model):
    id: str
    title: str


class Sentence(Model):
    id: str
    text: str
    section_id: str
    order: int
    page: int | None = None
    bbox: list[tuple[float, float, float, float]] = Field(default_factory=list)
    dom_id: str | None = None
    paragraph_id: str


class Document(Model):
    id: str
    title: str
    kind: Literal["pdf", "html"]
    source_url: str | None = None
    sections: list[Section] = Field(default_factory=list)
    paragraphs: list[Paragraph] = Field(default_factory=list)
    sentences: list[Sentence] = Field(default_factory=list)
    pages: list[tuple[float, float]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


Status = Literal["verified", "partial", "to_verify"]


class Step(Model):
    id: str
    parent: str | None = None
    type: Literal["question", "premise", "claim", "evidence", "objection", "conclusion"]
    label: str = Field(max_length=40)
    summary: str
    anchors: list[str] = Field(min_length=1)
    quote: str = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    status: Status = "to_verify"
    first_position: int = 0

    _label = field_validator("label", mode="before")(short_label)
    _confidence = field_validator("confidence", mode="before")(unit_interval)


class Link(Model):
    id: str
    src: str
    dst: str
    type: Literal["support", "cause", "refine", "contradict"]
    connective: str = ""
    anchors: list[str] = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    status: Status = "to_verify"

    _confidence = field_validator("confidence", mode="before")(unit_interval)


class TermCard(Model):
    term: str
    definition: str
    anchors: list[str] = Field(min_length=1)
    step_ids: list[str] = Field(min_length=1)


class Suggestion(Model):
    target_type: Literal["step", "link"]
    target_id: str
    category: str
    severity: Literal["info", "warning", "critical"]
    message: str
    suggested_rewrite: str | None = None
    anchors: list[str] = Field(min_length=1)
    source: Literal["rule", "llm"]


class Graph(Model):
    steps: list[Step]
    links: list[Link]
    terms: list[TermCard] = Field(default_factory=list)
    genre: str = "scientific"
    thesis: str = ""

    @model_validator(mode="before")
    @classmethod
    def drop_ungrounded(cls, data: object) -> object:
        """Drop model items without a source instead of rejecting the whole answer.

        A relation without its own sentences falls back to those of its endpoints.
        """
        if not isinstance(data, dict):
            return data
        data = dict(data)
        steps = [
            s
            for s in data.get("steps") or []
            if not isinstance(s, dict) or (s.get("anchors") and str(s.get("quote") or "").strip())
        ]
        anchors = {s.get("id"): s.get("anchors") for s in steps if isinstance(s, dict)}
        links = []
        for link in data.get("links") or []:
            if isinstance(link, dict) and not link.get("anchors"):
                fallback = anchors.get(link.get("dst")) or anchors.get(link.get("src"))
                if not fallback:
                    continue
                link = {**link, "anchors": fallback}
            links.append(link)
        data["steps"], data["links"] = steps, links
        if "terms" in data:
            data["terms"] = [
                t
                for t in data.get("terms") or []
                if not isinstance(t, dict) or (t.get("anchors") and t.get("step_ids"))
            ]
        return data


class Metadata(Model):
    id: str
    title: str
    kind: Literal["pdf", "html"]
    source_url: str | None = None
    created_at: str
    demo: bool = False
    # Analysis language requested for a generated map (auto, zh, en or fr).
    language: str | None = None


class Generation(Model):
    language: str = "auto"
    model: str
    timestamp: str
    prompt_version: str = "2.1"
    total_tokens: int = 0
    estimated_cost_usd: float | None = None


class Pattern(Model):
    type: Literal["divergence", "convergence", "contradiction", "refinement", "causality"]
    step_ids: list[str]


class RepairPatch(Graph):
    """Replacement or new steps and links, plus IDs to delete; untouched items are kept."""

    remove_step_ids: list[str] = Field(default_factory=list)
    remove_link_ids: list[str] = Field(default_factory=list)


class Flow(Graph):
    metadata: Metadata
    patterns: list[Pattern] = Field(default_factory=list)
    generation: Generation


class Explanation(Model):
    explanation: str
    anchors: list[str]


class Judgement(Model):
    target_type: Literal["step", "link"]
    target_id: str
    verdict: Literal["supported", "partial", "unsupported"]
    reason: str


class Critique(Model):
    judgements: list[Judgement]


class Suggestions(Model):
    suggestions: list[Suggestion]


class TaskAccepted(Model):
    task_id: str | None = None
    doc_id: str | None = None
