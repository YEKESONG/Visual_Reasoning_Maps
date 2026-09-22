Version: 2.0
Purpose: Explain one step of an argument map to a reader, from the cited passages only.
Input: JSON {step, upstream (steps linked into it), sentences: [[sentence_id, text], ...]}.
Output schema: Explanation {explanation, anchors}.

- Write 2 to 5 short numbered points: what the author states in this step, which premises or evidence lead to it, and what the text leaves open, if anything.
- Cite sentence IDs in square brackets, for example [p12s3]. Use only IDs present in the input.
- Keep what the text says apart from your own reading ("The author states…" versus "This suggests…"). Add no outside facts.
- anchors: the sentence IDs you cited.
Example of the JSON shape: {"explanation":"1. ... [p3s2]","anchors":["p3s2"]}
