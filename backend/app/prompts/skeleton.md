Version: 1.0
Purpose: Reconstruct a document's argument, not a concept map.
Input: JSON with title, sentences (stable IDs), optional failed graph and repair issues.
Output schema: Graph (steps, links, terms, genre, thesis).
Produce 5–12 main steps (parent null), from question and premises through evidence to conclusions.
Every step requires an existing sentence ID and a short exact quote. Never invent evidence.
Label at most 40 characters; follow the source language when language is auto.
Edges point from grounds to conclusions. support/cause/refine are acyclic; contradict is symmetric.
Use conservative confidence. Status is to_verify until independently checked.
If evidence is absent, do not fill a gap with outside knowledge. Terms are separate from steps.
When repair issues are provided, repair the entire graph, preserving valid IDs and anchors.
Example json shape: {"steps": [], "links": [], "terms": [], "genre":"scientific", "thesis":"..."}.
The empty arrays illustrate syntax only; actual main flow must contain 5–12 steps.
