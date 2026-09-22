Version: 2.0
Purpose: Find relations between steps that were extracted from different parts of the document.
Input: JSON {steps: [{id, parent, type, label, summary, anchors}], existing_links: [[src, dst, type]], sentences: [[sentence_id, text], ...]} where sentences are the anchored sentences and their neighbours.
Output schema: Graph with empty steps and terms; only links are used.

- Add relations the text supports and that are not already in existing_links. Typical cases: a result in the experiments that supports a claim made in the introduction, a limitation that contradicts a claim, a design choice motivated by a premise.
- src gives grounds for dst (support, cause, refine). contradict marks a tension between two steps.
- support, cause and refine must not create a cycle together with existing_links.
- id: x1, x2, ... anchors: 1 or 2 sentence IDs that express the relation. connective: exact words from those sentences or "". confidence: 0 to 1.
- Prefer a few well-grounded links (usually 3 to 15). Sharing a topic is not a relation. Do not infer causation from order or correlation.
Example of the JSON shape: {"steps":[],"links":[{"id":"x1","src":"s4","dst":"s2","type":"support","connective":"","anchors":["p30s2"],"confidence":0.6,"status":"to_verify"}],"terms":[],"genre":"","thesis":""}
