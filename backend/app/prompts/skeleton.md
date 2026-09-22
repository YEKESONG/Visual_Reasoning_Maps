Version: 2.0
Purpose: Reconstruct the main line of reasoning of a document as an argument map, not a concept map.
Input: JSON {title, sections: [{title, sentences: [[sentence_id, text], ...]}]}. Long documents are sampled within each section.
Output schema: Graph {steps, links, terms, genre, thesis}.

Main flow
- Return 5 to 12 main steps (parent null) that follow the author's reasoning: the question or problem, the premises it relies on, the evidence brought forward (experiments, observations, examples, cited results), intermediate claims, objections the author considers, and the conclusions.
- One step per distinct move in the argument. Merge near-duplicates. Leave out background the argument does not use.
- type: question, premise, claim, evidence, objection or conclusion. Include at least one conclusion.
- id: short and unique (s1, s2, ...).
- label: at most 40 characters, a noun phrase or short clause without a final period.
- summary: one or two sentences in the output language saying what the author asserts in this step.
- anchors: 1 to 3 sentence IDs from the input. quote: an exact contiguous excerpt (5 to 30 words) copied from the first anchored sentence, in the source language.
- confidence: 0 to 1, conservative. status: to_verify.
- Use only the document. An assertion without data is a claim, not evidence.

Links
- src gives grounds for dst. support: src is a reason for dst. cause: the text states that src brings about dst (not mere sequence or correlation). refine: dst narrows, qualifies or specifies src. contradict: src and dst are in tension (direction ignored).
- support, cause and refine must not form a cycle. Every main step takes part in at least one link, and every path leads toward a conclusion. Each conclusion has a premise or evidence upstream.
- anchors: 1 or 2 sentence IDs where the relation is expressed. connective: the exact linking words from those sentences ("therefore", "because", "however", "donc", "因此") or "".

Terms
- 0 to 6 terms a reader needs: definition taken from the text (output language), anchors, and step_ids of the steps that use the term.

genre: scientific, philosophical, essay or other. thesis: one sentence in the output language.
Example of the JSON shape (values are placeholders):
{"steps":[{"id":"s1","parent":null,"type":"question","label":"...","summary":"...","anchors":["p2s1"],"quote":"...","confidence":0.7,"status":"to_verify","first_position":0}],"links":[{"id":"l1","src":"s1","dst":"s2","type":"support","connective":"","anchors":["p3s2"],"confidence":0.6,"status":"to_verify"}],"terms":[],"genre":"scientific","thesis":"..."}
