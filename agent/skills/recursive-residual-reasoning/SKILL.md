---
description: "Use this skill when a task involves hard reasoning, unclear causes, unexplained observations, failed hypotheses, ambiguous diagnoses, complex systems, emergent behavior, investigation planning, or any situation where the current explanation space is incomplete. This skill applies Recursive Residual Reasoning: preserve what cannot yet be explained as an explicit residual, expand that residual into the next reasoning space, and produce a traceable path from observation to conclusion, action, or bounded stop reason."
---
# Recursive Residual Reasoning

Use Recursive Residual Reasoning, R3, when ordinary reasoning reaches an unexplained remainder. R3 treats that remainder as a first-class residual, not as a failure, vague unknown, or discard pile.

## Core Idea

Reasoning does not stop at the unknown. The residual becomes the object and generator of the next reasoning space.

R3 is a reasoning paradigm for transforming confusion into a traceable path:

```text
observation
→ current reasoning space
→ explained part + residual
→ residual expansion
→ next reasoning space
→ conclusion, action, or bounded stop reason
```

For the full domain-neutral method, use `docs/r3.md`. For the project data file format, use `docs/r3-data-file.md` and `templates/r3.system.yaml`.

## Minimal Formal Model

R3 can be modeled as:

```text
R3 = (U, Ω, X, τ, T)
```

Where:

| Symbol | Meaning |
| --- | --- |
| `U` | Universe of reasoning objects: observations, hypotheses, evidence, nodes, conclusions, actions, stop reasons, and traces. |
| `Ω` | Closed operations over `U`, such as classify, explain, decompose, combine, test, expand, close, and trace. |
| `X` | Residual elements: explicit parts not explained by the current reasoning space. |
| `τ` | Residual expansion operator: maps a residual into a new reasoning space. |
| `T` | Terminal set: conclusions, actions, formal closures, or bounded stop reasons. |

The important move is:

```text
unknown → residual → next reasoning space
```

## R3 Principles

1. Keep the reasoning space explicit.
   State what concepts, hypotheses, rules, evidence, or models are currently allowed to explain the observation.

2. Separate explained parts from residuals.
   Do not compress the unexplained part into phrases like "unclear", "miscellaneous", "edge case", or "probably noise". Name it as a residual.

3. Expand residuals recursively.
   A residual should become the entry point to a new reasoning space with its own candidate explanations, evidence needs, tests, and stop criteria.

4. Treat interactions as first-class.
   If components or hypotheses are individually plausible but jointly produce a new phenomenon, place the issue in an interaction space rather than blaming either part alone.

5. Preserve the trace.
   The output should show the path from observation to reasoning space, residual, expansion, and terminal state. The trace is part of the result.

6. Stop explicitly.
   If the residual cannot be expanded now, close with a bounded stop reason such as insufficient evidence, insufficient model, insufficient sample, excessive cost, or out-of-scope boundary.

7. Record evidence availability.
   Distinguish evidence available before or during the relevant decision from evidence known only after the decision or produced later by modeling, inference, simulation, or reconstruction.

8. Separate single-node claims from multi-node changes.
   If an action changes or depends on multiple nodes, route the trace through a combination space unless the effects are explicitly separated.

## Project R3 Data File

When applying R3 inside a project, require the project to maintain an R3 data file. Prefer this path:

```text
r3.system.yaml
```

The data file records the project's R3 algebra system. It should contain:

- `system`: boundary, target classes, observation capacity, maximum recursion depth, and reasoning cost limit
- `nodes`: atomic nodes, residual nodes, combination nodes, and terminal nodes
- `combination_spaces`: temporal, priority, interaction, state, context, feedback, or other relation spaces
- `relations`: parent-child, refinement, expansion, decomposition, conflict, adjacency, and closure relations
- `stop_reasons`: bounded reasons for ending unresolved recursion
- `trace_requirements`: fields every R3 analysis must record
- `open_residuals`: residuals that are known but not yet expanded
- `known_traces`: accepted or frozen reasoning paths
- `priority_expansions`: residuals or nodes that should be expanded next
- `coverage`: target-class coverage and relative completeness records
- `deprecated_nodes`: stable-node replacement history

If the project has no R3 data file and the task needs persistent reasoning structure, create one from `templates/r3.system.yaml` before treating the analysis as complete. If the project already has an R3 data file, read it first, use its node IDs and relations, and update it when new nodes, residuals, or expansion relations are introduced.

Do not let the data file become a prose-only document. Keep stable IDs and explicit relations so agents can use it as the project's reasoning map.

## Rebuild R3 Data

An agent may rebuild the project R3 data file when the user asks to rebuild it, when the file is missing, when it is structurally invalid, or when it is clearly stale relative to project documents and accepted traces.

Rebuild means reconstructing the R3 data file from project evidence, not inventing a new theory from scratch. Use sources such as project instructions, architecture notes, investigation records, accepted traces, decision logs, issue taxonomies, or existing R3/RCAS-style documents.

When rebuilding:

1. Inventory source material.
   Record which files, records, or conversations were used.

2. Extract the system boundary, target classes, observation capacity, maximum depth, and reasoning cost policy.

3. Extract or infer nodes, residuals, combination spaces, stop reasons, relations, known traces, priority expansions, coverage records, and deprecated nodes.

4. Preserve stable IDs when a prior data file or accepted trace references them.

5. If an old ID cannot be preserved, add a `deprecated_nodes` entry with `old_id`, `replaced_by`, and `reason`.

6. Mark uncertain reconstructions as residuals or `needs_review`; do not silently convert weak evidence into confirmed nodes.

7. Add a `rebuild_history` entry with sources, summary, preserved IDs, renamed IDs, unresolved gaps, and timestamp or version.

8. After rebuilding, run an R3 consistency pass: every non-residual node has observable, rule, and action; every residual has an expansion or bounded stop reason; every combination space decomposes; every target class has coverage or a residual.

## Workflow

Follow this workflow when applying R3.

1. State the observation.
   Write the phenomenon or problem in neutral terms before assigning cause.

2. Load or define the current reasoning space.
   If the project has an R3 data file, read it and use its nodes and relations. If not, define the initial space and create a data file when the reasoning structure should persist.

3. Rebuild the R3 data file if needed.
   If the data file is missing, invalid, stale, or the user asks for reconstruction, rebuild it from project evidence before using it as authoritative.

4. Define the current reasoning space.
   List the candidate explanations, components, hypotheses, rules, or models currently allowed.

5. Map the explained part.
   Identify which parts of the observation are explained by the current space, and cite the evidence or rule used.

6. Name the residual.
   State what remains unexplained. Give the residual a concise name.

7. Choose the residual route.
   Route the residual to one of these spaces:
   - missing evidence
   - missing concept or model
   - interaction between known parts
   - temporal or ordering issue
   - boundary or scope issue
   - insufficient sample
   - excessive reasoning cost

8. Expand the residual.
   Define a new reasoning space for the residual: candidate explanations, needed evidence, tests, and possible terminal states.

9. Check evidence availability.
   Label key evidence as `before_decision`, `during_decision`, `after_decision`, or `synthetic_or_inferred`. Do not treat post-hoc evidence as operational evidence unless availability is proven.

10. Check handled and not-handled nodes.
   Record the handled node, neighboring nodes not handled, and all changed nodes. If multiple nodes are changed and effects are not separated, route through a combination space.

11. Update the R3 data file.
   Add any new node, residual, combination space, relation, stop reason, or trace requirement created by this reasoning pass.

12. Close or recurse.
   End at a conclusion, action, formal closure, or bounded stop reason. If still unresolved and worth pursuing, repeat the workflow at the next layer.

## Output Template

When the user asks for an R3 analysis, use this structure unless a different format is more useful:

```markdown
## Observation
<neutral statement of the phenomenon>

## R3 Data File
<path used, missing, created, or updated>

## Current Reasoning Space
<candidate explanations, concepts, rules, or models currently considered>

## Handled Scope
<handled node, not-handled neighboring nodes, changed nodes, and whether this is a single-node or combination-space trace>

## Explained Part
<what the current space explains, with evidence>

## Evidence Boundary
<key evidence and availability: before_decision, during_decision, after_decision, or synthetic_or_inferred>

## Residual
<what remains unexplained, named explicitly>

## Residual Expansion
<next reasoning space generated from the residual>

## Trace
<observation → current space → explained part/residual → expansion → terminal state>

## Closure
<conclusion, action, formal closure, or bounded stop reason>
```

## Handling Emergent Behavior

When two parts are individually normal but jointly produce a new phenomenon, do not force the explanation into either part alone.

Use this form:

```text
P(A) = not observed
P(B) = not observed
P(A, B) = observed
```

Then route the residual to an interaction space:

```text
emergent phenomenon
→ interaction residual
→ timing, ordering, coupling, feedback, shared state, threshold, or context dependency
→ testable next reasoning space
```

## What To Avoid

- Do not treat "unknown" as a terminal answer when the task needs reasoning.
- Do not hide residuals inside generic buckets like "other" or "misc".
- Do not blame a single component when the evidence only supports an interaction.
- Do not expand forever. Use explicit stop reasons when evidence, model, sample, scope, or cost prevents useful recursion.
- Do not use domain-specific assumptions unless the user provides them. R3 is domain-neutral.
- Do not introduce new reasoning nodes only in the final prose when the project needs a persistent R3 system. Add them to the R3 data file.
- Do not change stable node IDs after traces have referenced them. Add new nodes or relations instead.
- Do not claim a single-node explanation when the action changed multiple nodes and the effects were not separated.
- Do not use post-hoc evidence as if it were available at the decision point.
- Do not present a durable conclusion without the full trace record.
- Do not rebuild R3 data by guessing. Every rebuilt node or relation should either cite a source, preserve an accepted trace, or be marked as residual or `needs_review`.

## Compact Response Mode

For quick conversations, use a shorter form:

```markdown
Observation: ...
R3 data file: ...
Current space: ...
Handled scope: ...
Evidence boundary: ...
Residual: ...
Next expansion: ...
Trace: ...
Closure: ...
```

## Name

Recursive Residual Reasoning is abbreviated as R3. Prefer the full name on first use because it is clearer for agents and avoids overloaded abbreviations.
