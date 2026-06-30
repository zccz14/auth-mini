---
name: reliable-model
description: >-
  Use this skill when creating, modifying, explaining, diagnosing, or
  validating a model, rule, scoring system, prediction, parameter choice,
  mechanism hypothesis, or research conclusion. It evaluates reliability by
  requiring both prior rationale and empirical validation, and by separating
  reliable conclusions from black-box correlations, empty stories, post-hoc
  leads, and unreliable claims.
---

# Reliable Model

Use this skill to judge whether a model claim comes from a reliable process.
Here, reliability means epistemic reliability: the conclusion is more likely to
hold beyond the observations that produced it.

Core rule:

```text
Reliable model = prior rationale + empirical validation
```

Short version:

```text
Explanation prevents black boxes.
Validation prevents empty stories.
```

## When To Use

Use this skill for tasks involving:

- Creating or changing a model, rule, scoring function, filter, ranking system,
  policy, threshold, weighting scheme, parameter structure, or prediction rule.
- Explaining a phenomenon, experiment result, metric change, segment behavior,
  feature effect, failure case, or unexplained residual.
- Deciding whether a model, rule, parameter choice, mechanism explanation, or
  research conclusion is reliable.
- Turning a post-hoc observation into a candidate model or testable hypothesis.
- Reviewing whether an apparently successful result may be black-box
  correlation, selective reporting, sample-specific luck, leakage, or a story
  invented after seeing the result.

## Workflow

Work in this order:

```text
Observation or goal
-> Prior rationale
-> Model or explanation design
-> Empirical validation
-> Two-leg reliability judgment
-> Conclusion level and residual risk
```

Do not inspect outcomes, metrics, or local improvements first and then invent a
natural-sounding explanation. If the result has already been seen, label the
explanation as post-hoc and lower the conclusion level until it receives either
strong independent rationale or independent validation.

## Leg 1: Prior Rationale

Prior rationale answers:

```text
Why should this model make sense before seeing the result?
```

When creating, changing, or explaining a model, state:

- Why the variables or inputs are meaningful.
- Why the rule or structure fits the system that generates the outcome.
- Why the parameters, thresholds, dates, windows, weights, sample boundaries, or
  segment definitions are not arbitrary result-driven choices.
- What domain mechanism, causal theory, behavioral pattern, operational
  constraint, engineering property, or external fact supports the design.
- Whether the same explanation would have been plausible before seeing the full
  result.

If the only reason is "the result improved," the idea is not yet a reliable
model. Treat it as a post-hoc lead.

## Leg 2: Empirical Validation

Empirical validation answers:

```text
Does the model actually work under tests that could have disproved it?
```

Do not rely on one favorable result. Check, as relevant:

- Out-of-sample data, holdout groups, or periods not used for selection.
- Stability across time windows, segments, cohorts, contexts, or operating
  regimes.
- Baseline comparisons and ablations that show what the model adds.
- Sensitivity to parameter changes, sample boundaries, and preprocessing
  choices.
- Failure cases, tail risks, boundary conditions, and counterexamples.
- Uncertainty, noise, cost, feasibility, and operational constraints.
- Selection bias, selective reporting, leakage, or explanations created after
  seeing the result.

Strong validation must be falsifiable: state what evidence would weaken or
reject the model, what failures must be disclosed, and when the model should be
downgraded or re-estimated.

## Reliability Matrix

Judge both legs separately.

| State | Prior rationale | Empirical validation | Judgment |
| --- | --- | --- | --- |
| Black-box model | Weak | Strong | The result may be useful, but the mechanism is unclear. Do not call it reliable yet. |
| Empty-story model | Strong | Weak | The explanation is plausible, but evidence is insufficient. Treat it as a hypothesis. |
| Low-reliability model | Weak | Weak | Neither mechanism nor evidence is strong. Do not advance the claim. |
| Reliable model | Strong | Strong | The model makes sense in advance and holds up empirically. |

Never use empirical success as a substitute for prior rationale. Never use a
plausible story as a substitute for validation.

## Output Pattern: Create Or Modify A Model

Use this structure when the user asks to create or change a model:

```text
1. Goal or phenomenon
2. Prior rationale
   - Mechanism hypothesis
   - Input, structure, rule, and parameter sources
   - Information available at decision time
3. Model design
   - Rule or model behavior
   - Scope and boundaries
   - Expected improvements and possible regressions
4. Empirical validation plan
   - Out-of-sample or independent validation
   - Segment, time-window, or context stability checks
   - Metrics, baselines, ablations, and failure-case review
5. Reliability gate
   - Is the prior leg strong enough?
   - Is the validation leg strong enough?
   - Are leakage or selection bias risks controlled or disclosed?
6. Conclusion level
```

If the task requires code changes, still identify the prior rationale and
validation plan before implementing. Do not encode post-hoc choices as if they
were fixed design principles.

## Output Pattern: Explain A Phenomenon

Separate explanations into three types:

```text
Known mechanism: supported before seeing this result.
Post-hoc candidate: proposed after seeing this result; useful but unproven.
Residual: not explained by the current explanation space.
```

Then report:

```text
1. Observed phenomenon
2. Available prior mechanisms
3. Candidate explanations and falsifiable predictions
4. Supporting and contrary evidence
5. Unexplained residuals
6. Next validation steps
```

Do not present every explanation as a settled cause. Label post-hoc reasoning
explicitly.

## Reliability Checklist

Prior leg:

- Why should this variable, rule, structure, or parameter make sense before
  seeing the result?
- Where did the threshold, date, weight, window, sample boundary, or segment
  definition come from?
- Is the rationale grounded in mechanism, theory, operational constraints,
  pre-defined assumptions, or external facts?
- If the choice came from looking at results, is it labeled as post-hoc?
- Does the explanation create falsifiable predictions?

Validation leg:

- Was the model tested on data, periods, groups, or contexts not used to choose
  it?
- Is performance stable across important slices rather than only in a selected
  slice?
- Do baselines, ablations, and sensitivity checks support the claimed effect?
- Are uncertainty, noise, cost, feasibility, and operational constraints
  considered?
- Are failure cases, tail risks, and counterexamples disclosed?

Research process:

- Is there leakage from the target, future information, unavailable data, or
  evaluation labels into the model design?
- Is there selection bias from choosing features, parameters, windows, samples,
  or explanations after seeing results?
- Does the conclusion confuse "can be executed" with "was selected by a reliable
  process"?
- Are unresolved residuals and downgrade conditions stated?

## Conclusion Levels

Use explicit conclusion levels:

| Level | Condition | Allowed wording |
| --- | --- | --- |
| Reliable model | Strong prior rationale, strong validation, no uncontrolled leakage | Mechanistically plausible and empirically confirmed within stated bounds. |
| Candidate model | One leg is strong and the other is incomplete but testable | Promising, but needs more rationale or independent validation. |
| Post-hoc lead | Mainly discovered after seeing results | Useful diagnostic signal; not reliable by itself. |
| Hypothesis | Strong explanation but insufficient data | Plausible mechanism awaiting empirical confirmation. |
| Unreliable model | Both legs are weak, or leakage invalidates the evidence | Do not advance the claim without redesign. |

## Recommended Wording

Acceptable:

```text
This rule has a clear prior mechanism and empirical validation provides
confirming evidence. Remaining risks are selection bias, boundary conditions,
and failure cases outside the tested scope.
```

Acceptable:

```text
This is a positive post-hoc lead. It suggests a possible mechanism, but it is
not a reliable model until supported by stronger prior rationale or independent
validation.
```

Avoid:

```text
The metric improved, so the model is reliable.
```

Avoid:

```text
The explanation sounds plausible, so no validation is needed.
```

Avoid:

```text
The model can be executed at decision time, so the research process is unbiased.
```

The goal is not to make explanations prettier or metrics better. The goal is to
make model conclusions explainable, testable, reproducible, and honest about
their failure boundaries.
