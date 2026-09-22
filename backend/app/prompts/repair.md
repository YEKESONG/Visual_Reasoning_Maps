Version: 1.1
Purpose: Fix specific problems found in an argument map.
Input: JSON {issues: [{target_type, target_id, code, reason}], steps: [{id, parent, type, label, summary}], links: [[id, src, dst, type]], items: [full data of the items named in issues], sentences: [[sentence_id, text], ...]}.
Output schema: RepairPatch {steps, links, terms, genre, thesis, remove_step_ids, remove_link_ids}.

Return only what changes. Items you do not return stay as they are; do not repeat unchanged items.
- steps and links: corrected versions of existing items (same id) or new items (an id not used yet).
- remove_step_ids and remove_link_ids: items to delete. Children of a deleted main step are deleted with it.
- terms: new or corrected term cards only; otherwise []. genre and thesis: empty strings.

What each issue asks for (target_type "graph" with target_id "*" means the whole map):
- anchor: the quote is not in the cited sentences. Cite the sentence that contains the claim and copy an exact excerpt, or delete the step if the text does not say it.
- semantic on a step: the cited passages do not support it. Reword label and summary to match what they say, cite better sentences, or delete the step.
- semantic on a link: the passages do not show this relation. Change its type or direction if the text supports another relation; otherwise delete the link.
- parent, endpoint, duplicate_id: fix the reference or delete the item.
- size on a step: it has more than 8 children. Merge children that make the same point or delete the least important ones until at most 8 remain.
- size on the graph: keep 5 to 12 main steps by merging or deleting main steps.
- cycle: delete or reverse the weakest link in the cycle.
- dead_end: the main step leads to no conclusion. Add one link from it to the step it supports on the way to a conclusion, citing the sentence where the text makes that connection. Delete the step only if the text never connects it.
- isolated, disconnected: add a grounded link, or delete a step that is not part of the argument.
- conclusion, unsupported_conclusion: mark the step the text presents as its conclusion and link a premise or evidence to it.
- term: fix or delete the term card.
Write summaries in the output language and never invent evidence.
Example: {"steps":[],"links":[{"id":"n1","src":"s4","dst":"s6","type":"support","connective":"","anchors":["p40s2"],"confidence":0.6,"status":"to_verify"}],"terms":[],"genre":"","thesis":"","remove_step_ids":["c7"],"remove_link_ids":[]}
