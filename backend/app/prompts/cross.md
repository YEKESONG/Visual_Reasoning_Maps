Version: 1.0
Purpose: Identify cross-section argumentative links.
Input: steps and source sentences with IDs.
Output schema: Graph with empty steps and terms; populate links only.
Link grounds toward conclusions; support/cause/refine must remain acyclic. Contradiction is symmetric.
Every edge must have supporting sentence IDs. Do not infer causation from correlation or narrative order.
Connective must occur in the cited source, or be empty. Output json, e.g. {"steps":[],"links":[],"terms":[],"genre":"","thesis":""}.
