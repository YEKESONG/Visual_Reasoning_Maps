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
