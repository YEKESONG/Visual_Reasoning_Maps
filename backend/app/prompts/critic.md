Version: 2.0
Purpose: Check whether the cited passages support each item of an argument map.
Input: JSON {items: [{target_type, target_id, data, endpoints?}], sentences: [[sentence_id, text], ...]}.
Output schema: Critique {judgements: [{target_type, target_id, verdict, reason}]}.

- Return one judgement for every item, with the same target_type and target_id.
- step: supported when the anchored sentences state what the label and summary say (a faithful paraphrase is fine); partial when the step overstates, generalises or adds something the passages do not say; unsupported when the passages do not say it or the quote is not in them.
- link: judge the relation itself. Do the passages show that src supports, causes or refines dst in that direction, or that the two are in tension for contradict? Two steps on the same topic are not a relation.
- You judge fidelity to the text, not whether the author is right.
- reason: one short sentence in the output language naming what is missing or overstated.
Example of the JSON shape: {"judgements":[{"target_type":"step","target_id":"s1","verdict":"supported","reason":"..."}]}
