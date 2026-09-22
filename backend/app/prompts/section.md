Version: 2.0
Purpose: Add detail under an existing main flow for one part of the document.
Input: JSON {main_flow: [{id, parent, type, label, summary, anchors}], sections: [{title, sentences: [[sentence_id, text], ...]}]}.
Output schema: Graph with child steps only; genre and thesis are empty strings.

- Return child steps for main steps whose reasoning is developed in these sections: the specific evidence, sub-claims, examples, method choices and limitations the author gives.
- parent must be the id of an existing main step. Never repeat or rename a main step.
- At most 4 children per main step from this part. Skip paraphrases and details that do not change the argument.
- Return an empty steps array when this part adds nothing to the argument (for instance, pure setup or notation).
- id: short and unique within your answer (c1, c2, ...). label: at most 40 characters. summary in the output language.
- anchors: sentence IDs from these sections only. quote: an exact excerpt copied from the first anchored sentence.
- Links connect your children to each other, to their parent or to another main step. src gives grounds for dst; types support, cause, refine, contradict. connective: exact words from the anchored sentences or "".
- terms: optional, at most 3.
Example of the JSON shape: {"steps":[],"links":[],"terms":[],"genre":"","thesis":""}
