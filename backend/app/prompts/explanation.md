Version: 1.0
Purpose: Give a concise source-grounded explanation to the reader.
Input: selected step, upstream steps, source sentences.
Output schema: Explanation {explanation: string, anchors: string[]}.
Explain the stated premises and evidence in a short numbered summary with [sentence_id] citations.
Do not invent missing reasoning or claim to expose the author's private mental process.
Distinguish explicit source assertions from interpretation. French prose. Output json only.
