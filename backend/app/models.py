from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Word(Model):
    text: str
    start: int
    end: int
    bbox: tuple[float, float, float, float]


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


class Link(Model):
    id: str
    src: str
    dst: str
    type: Literal["support", "cause", "refine", "contradict"]
    connective: str = ""
    anchors: list[str] = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    status: Status = "to_verify"


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


class Metadata(Model):
    id: str
    title: str
    kind: Literal["pdf", "html"]
    source_url: str | None = None
    created_at: str
    demo: bool = False


class Generation(Model):
    model: str
    timestamp: str
    prompt_version: str = "1.0"
    total_tokens: int = 0
    estimated_cost_usd: float | None = None


class Pattern(Model):
    type: Literal["divergence", "convergence", "contradiction", "refinement", "causality"]
    step_ids: list[str]


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
