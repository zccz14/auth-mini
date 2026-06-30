---
description: "Use this skill whenever the user asks to write, rewrite, shorten, clarify, review, polish, restructure, or adapt documentation or any human-facing explanatory text. It turns information into purpose-driven communication for a specific audience and decision context. It prioritizes the reader's native language and habitual language style, preserves only decision-relevant information, and avoids bloated background, excessive completeness, and domain-specific assumptions unless the current context explicitly defines them."
---
# Clean Doc

Clean Doc helps transform text into efficient communication for a specific reader, situation, and intended effect. The goal is not to preserve all available information. The goal is to help the reader understand what matters, decide what to do, and act with the right level of confidence.

## First Principles

High-signal writing is relative to the reader and the job the document must do. Before writing or editing, identify:

```text
Who is the reader?
What situation are they in?
What decision, action, or understanding should the document enable?
What do they already know, and what do they need clarified?
Which information would change their judgment or behavior?
```

If the answer cannot be inferred from the prompt or surrounding context, ask one concise clarification question. If the context is clear enough, proceed with the most likely reader and purpose, and make that choice visible in the output.

## Language And Voice

Use the user's native language and habitual language style by default. This matters because purpose-driven writing is not only about information selection; it is also about making the message easy for the reader to receive, trust, and act on.

Follow these rules:

- Write in the language the user uses, unless they request another language.
- Match the user's level of formality, directness, and terminology.
- Preserve important names, code symbols, product names, file paths, and quoted terms exactly when needed.
- Explain unfamiliar terms only when they affect understanding or action.
- Avoid promotional, emotional, evasive, or over-certain wording unless the user explicitly asks for that style.
- Let the current context define domain conventions, tone, compliance needs, and audience expectations.

## Domain Independence

Do not assume a specific industry, workflow, research process, metric system, or organizational culture. This skill can support engineering docs, product specs, internal memos, public announcements, policies, onboarding material, postmortems, strategy notes, tutorials, proposals, reports, emails, and other human-facing text.

When the surrounding context defines a domain-specific writing scheme, adopt it. Context may define:

- Required sections or templates.
- Terminology and definitions.
- Evidence standards.
- Tone and brand voice.
- Compliance or legal constraints.
- Audience expertise level.
- Accepted formatting conventions.

Context should specialize the writing plan; it should not override the core principle that the document exists to serve a reader's decision, action, or understanding.

## Workflow

1. Define the receiver.
   Identify the reader, their situation, and what they need to do after reading.

2. Define the communication task.
   Decide whether the document should help the reader decide, execute, learn, audit, align, troubleshoot, remember, approve, or communicate onward.

3. Select by consequence.
   Keep information that changes reader judgment, action, risk awareness, or understanding boundaries. Compress or remove information that only makes the document feel complete.

4. Build the main path first.
   Put the most useful conclusion, instruction, recommendation, or framing early. Then add evidence, constraints, exceptions, and next steps.

5. Separate certainty levels.
   Distinguish facts, interpretations, assumptions, risks, unknowns, and recommendations. Do not present unresolved or weakly supported material as settled.

6. Adapt the shape.
   Choose the structure that best fits the task instead of mechanically applying a template.

7. Tighten the surface.
   Remove repetition, soften unnecessary jargon, shorten long explanations, and make action boundaries explicit.

## Information Selection

Use this table as a starting point, not as a fixed template.

| Document purpose | Prioritize | Compress or remove |
| --- | --- | --- |
| Decision memo | Recommendation, options, tradeoffs, risks, decision criteria | Full history, low-impact context, rhetorical framing |
| Execution guide | Steps, prerequisites, checks, stop conditions, examples | Long background, abstract motivation, duplicate warnings |
| Design document | Problem, goals, constraints, approach, interfaces, tradeoffs, validation | Premature implementation detail, unrelated alternatives |
| Review or critique | Main blockers, evidence, impact, concrete fixes | Generic praise, exhaustive restatement, vague opinions |
| Onboarding material | Mental model, key concepts, first actions, common pitfalls | Rare edge cases, internal debates, excessive policy detail |
| Incident or postmortem | Impact, timeline, causes, contributing factors, fixes, owners | Blame language, speculation without labels, irrelevant logs |
| Public update | What changed, why it matters, who is affected, action required | Internal process detail, unsupported claims, needless caveats |
| Proposal | Desired outcome, rationale, scope, cost, risks, ask | Overlong background, hidden assumptions, decorative language |

The same fact can be signal in one document and noise in another. Judge every section by whether it helps this reader in this situation.

## Structure Patterns

For decision-oriented writing, prefer:

```text
Recommendation
Why It Matters
Options Considered
Tradeoffs
Risks And Unknowns
Decision Needed
Next Steps
```

For execution-oriented writing, prefer:

```text
Goal
Scope
Prerequisites
Steps
Checks
Stop Conditions
Troubleshooting
Next Steps
```

For explanatory writing, prefer:

```text
Core Idea
Why It Matters
Key Concepts
Example
Common Mistakes
How To Apply It
```

For review-oriented writing, prefer:

```text
Main Findings
Impact
Evidence
Recommended Changes
Open Questions
```

Do not force these structures when the user asks for a specific format or when the document's purpose suggests a better shape.

## Compression Rules

When shortening or cleaning a document, apply these steps in order:

1. Preserve the main path: what the reader needs to know or do.
2. Merge repeated points.
3. Remove information that does not change action, judgment, or understanding.
4. Convert long explanations into criteria, rules, examples, or boundaries.
5. Keep evidence only at the level needed for trust and action.
6. Remove anecdotes unless they are the shortest path to understanding.
7. Keep definitions only when the reader needs them.
8. Prefer concrete verbs and direct sentence order.

After compression, verify that the reader can still answer:

```text
What is the point?
Why should I care?
What should I do next?
What evidence or constraints matter?
Where are the limits or uncertainties?
```

## Review Mode

When reviewing an existing document, lead with the issues that most reduce communication effectiveness. Focus on:

- Unclear audience or purpose.
- Missing or buried main point.
- Background that overwhelms the decision-relevant message.
- Mixed facts, assumptions, opinions, and recommendations.
- Structure that reflects the writer's process instead of the reader's task.
- Tone or language that does not fit the reader.
- Excessive completeness that hides what matters.

Then provide concrete edits or a rewritten version when useful. Do not stop at abstract advice if the user asked for a rewrite or file change.

## Quality Check

Before delivering, check:

```text
Is the target reader clear?
Is the intended decision, action, or understanding clear?
Does the main point appear early enough?
Did I remove information that does not serve this purpose?
Are facts, assumptions, risks, and recommendations separated?
Is the language natural for the user and audience?
Does the document respect domain context without assuming a domain?
Can someone outside the conversation understand the result well enough to act?
```

If the answer is no, fix structure before polishing wording.

## Output Behavior

If the user asks for direct edits, make the edits and briefly summarize what changed.

If the user asks for a review, list the most important communication problems first, then actionable fixes.

If the user asks for compression, state the compression target and preservation standard, then provide a shorter version.

If the user asks for a new document, infer or ask for audience, purpose, and desired outcome before writing.
