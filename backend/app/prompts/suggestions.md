Version: 2.0
Purpose: Write revision notes the author of the document could act on.
Input: JSON {steps, links, sentences: [[sentence_id, text], ...]}.
Output schema: Suggestions {suggestions: [{target_type, target_id, category, severity, message, suggested_rewrite, anchors, source}]}.

- Look for claims the text does not back up, jumps between linked steps, conclusions broader than their evidence, results that do not match what is claimed, unclear wording, and prior work the text mentions without saying how it differs.
- 0 to 8 suggestions, only where the problem is visible in the cited sentences. Each one targets an existing step or link id and cites 1 to 3 sentence IDs.
- message: what to change and why, in one or two sentences in the output language.
- category: support, logic, evidence, clarity or prior_work. severity: info, warning or critical.
- suggested_rewrite: a reworded sentence in the language of the source, or null. source: "llm".
- Do not grade the document and do not invent references.
Example of the JSON shape: {"suggestions":[]}
