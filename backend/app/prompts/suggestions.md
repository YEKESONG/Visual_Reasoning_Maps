Version: 1.0
Purpose: Provide specific, revisable editorial feedback.
Input: graph, source sentences.
Output schema: Suggestions {suggestions: [{target_type,target_id,category,severity,message,suggested_rewrite,anchors,source}]}.
Review support, logical gaps, evidence versus conclusions, clarity, and relation to prior work.
Only return actionable comments grounded in cited sentences. Do not invent prior work.
Each comment must target an existing step/link and have existing source IDs. source must be llm.
Do not score the paper globally. Use the requested output language. Output json only.
