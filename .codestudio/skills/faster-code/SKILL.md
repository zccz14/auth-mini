---
name: faster-code
description: Use this skill whenever code is slow, times out, gets killed, burns substantial CPU, runs long batch jobs, performs parameter scans, trains models, processes large datasets, runs simulations, or has unknown target-scale runtime. It guides progressive runtime probing, online N-T progress instrumentation when feasible, fixed-timeout sampling, N-T scaling estimation, and full-run go/no-go decisions before attempting target scale. If optimization happens, it requires preserving slow-version canonical output, proving byte-for-byte semantic equivalence, and prioritizing removal of wasted work before spending more CPU through parallelism. This skill does not wrap profiler tools and does not provide generic optimization recipes; it decides whether to run full scale, stop, or move into profiling and principled optimization.
---

# faster-code

Use this skill to improve how compute-heavy code is run: first decide whether the target scale can finish within the runtime budget, then decide whether to run full scale, stop, or optimize. Do not start by throwing a slow program at a long timeout. A long timeout only proves the waste already happened; short bounded probes produce decision information early.

## Core Goal

Turn “can this finish at full scale?” into a pre-run gate:

1. Define the target scale `N_full` and acceptable runtime budget `T_budget`.
2. Prefer online `N-T` progress instrumentation when the program has a natural work counter and source edits are cheap.
3. Build 3-5 valid `N-T` samples using short timeouts, progress logs, or sliced inputs.
4. Estimate target-scale runtime with multiple simple models.
5. If the estimate is unacceptable, do not run full scale; move to profiling, diagnosis, or optimization.

If code is optimized, add a semantic gate: preserve canonical output from the slow version as the ground truth, then require the faster version to produce byte-for-byte identical canonical output on the same input slice. If floating-point differences are natural, normalize values before writing canonical output using a predeclared rounding or formatting rule. It is acceptable to lose limited precision for auditability, but the final comparison must still be byte-for-byte.

Optimization has a priority order: avoid wasted computation before spending more computation. Reducing unnecessary work is usually better than hiding waste behind more cores. Parallelism can be useful, but treat it as a late option when algorithmic or workload reductions are unavailable, too risky, or insufficient for the runtime budget.

## Online N-T First

Before choosing sliced batch runs, inspect the program for a natural progress counter. Many slow programs already have a loop over rows, files, tasks, parameter combinations, batches, epochs, windows, or requests. If that counter exists and editing the code is low risk, add online `N-T` progress logging first, then run one bounded probe.

Treat missing progress logs as a fixable instrumentation gap, not as proof that the program is batch-only.

Add online sampling when all of these are true:

- there is a monotonic processed-work counter or one can be computed cheaply;
- the counter maps to the chosen `N` or a defensible combined `N`;
- logs can be emitted every 5-10 seconds or every coarse work interval without material overhead;
- source edits are acceptable for this task and do not change computation semantics;
- the program can flush logs before a timeout kills it.

Do not add online sampling when any of these are true:

- the only available counter would require expensive synchronization, global scans, or large memory changes;
- logging would materially perturb the workload being measured;
- the code cannot be safely edited in the current task;
- the work is genuinely all-or-nothing and exposes no meaningful partial progress.

Instrumentation should be minimal and parseable. Prefer one stable line shape:

```text
PERF_PROGRESS processed=120000 total=1000000 elapsed_sec=31.2 rate=3846.1 unit=rows
```

For nested work, log the combined `N` explicitly instead of hiding a second scale variable:

```text
PERF_PROGRESS processed=240000 total=2000000 elapsed_sec=31.2 unit=row_param_pairs rows=120000 params=2
```

If online instrumentation is feasible, implement it before running repeated sliced probes. If it is not feasible, state the reason in the report under `instrumentation_decision`.

## Classify the Program

### A. Progress-Observable Programs

If the program can print progress while running, or can be cheaply changed to do so, prefer one short timeout probe instead of many sliced runs.

Useful progress logs are stable, low-frequency, and parseable:

```text
PERF_PROGRESS processed=120000 total=1000000 elapsed_sec=31.2 rate=3846.1
```

Procedure:

1. Run with a short timeout, usually 30 seconds.
2. Extract multiple `elapsed_sec -> processed_N` points from logs.
3. Treat a timeout-killed run as useful if progress logs were captured.
4. If throughput declines over time, extrapolate conservatively; do not extrapolate from the fastest early rate.

If progress logging is absent but the online N-T criteria are met, add it before doing repeated sliced runs. Log every 5-10 seconds, not for every item.

### B. Batch-Only Programs

Use sliced data and repeated bounded runs only when online N-T instrumentation is unavailable, unsafe, or would distort the measurement.

Procedure:

1. Identify the control for input scale, such as `--limit`, date range, file count, sample ratio, batch count, or parameter count.
2. Start from a small `N` and expand exponentially, for example 1k, 2k, 4k, 8k.
3. When a run times out, binary-search between the previous completed `N` and the failed `N`.
4. Use binary search to construct reliable `N-T` samples, not to find the exact largest possible `N`.
5. Do not waste runs trying to hit an exact second value; the goal is a scaling trend, not a precise benchmark.

## Define N

Before extrapolating, define the main scale variable `N`. Do not assume `N` is always row count.

Common definitions include:

- input rows;
- files or objects processed;
- events or tasks generated;
- parameter combinations;
- workers, shards, or independent units;
- training windows or batches;
- a combined variable such as `rows x parameter_combinations x files`.

If the program has multiple dominant scale variables, use the combined variable that best explains the work. If `N` cannot represent the full-scale computation, mark the result `INCONCLUSIVE`.

## Sampling Requirements

Default rules:

- Require at least 3 completed sample points before extrapolating to full scale.
- Prefer 3-5 completed sample points.
- More than 5 points is usually unnecessary unless the samples are unstable.
- Start with a 30 second timeout for probes.
- Avoid probe nodes longer than about 180 seconds unless the user explicitly accepts the cost.

Useful time bands:

- 30 second node: completed samples in 20-40 seconds are acceptable.
- 60 second node: completed samples in 45-75 seconds are acceptable.
- 120 second node: completed samples in 90-150 seconds are acceptable.
- 180 second node: completed samples in 140-220 seconds are acceptable.

Timeout samples mean `T(N) > timeout`. Do not fit them as if `T(N) = timeout`.

Record at least:

```text
N:
runtime_sec:
status: completed | timeout | failed
timeout_sec:
command:
slice_method:
notes:
```

Also record peak memory, CPU utilization, output size, and cache state when available.

## Extrapolation Methods

Do not use a single estimate. Compare at least these three views and make a conservative decision.

### 1. Linear Extrapolation

```text
T_full = T_last * N_full / N_last
```

This is a lower-bound check. If even the linear estimate exceeds the budget, usually stop.

### 2. Power-Law Fit

```text
T = a * N^p
log(T) = log(a) + p * log(N)
```

Use it to estimate the scaling exponent `p`.

Default interpretation:

- `p <= 1.2`: approximately linear.
- `1.2 < p <= 1.6`: cautious; require the target estimate to be comfortably below budget.
- `1.6 < p <= 2.2`: high risk; usually optimize or reduce scope first.
- `p > 2.2`: do not blindly run full scale unless `N_full` is very small.

### 3. Local-Slope Extrapolation

Use only the largest two or three completed `N` samples to estimate late-stage growth. This catches cases where small samples are fast but larger samples degrade.

If linear, power-law, and local-slope estimates disagree strongly, mark the result `INCONCLUSIVE` or `FAIL`. Do not approve full scale using the most optimistic estimate.

## Go/No-Go Decision

Return exactly one of:

```text
PASS: Target scale may be run.
FAIL: Do not run target scale; diagnose or optimize first.
INCONCLUSIVE: Evidence is insufficient or unstable; do not run target scale yet.
```

Default failure conditions:

- Fewer than 3 completed sample points.
- `N` does not represent the dominant computation.
- Linear extrapolation already exceeds `T_budget`.
- Conservative estimate exceeds `T_budget` by more than 1.5x.
- Scaling exponent is clearly worse than linear and `N_full` is far beyond the sampled range.
- Samples are non-monotonic or unstable without explanation.
- Probes suggest memory, output size, or I/O may become the bottleneck.

Default pass conditions:

- Samples are stable.
- `N` is credible.
- Multiple estimates are below `T_budget`.
- The largest sample is not too far from `N_full`, or the scaling is close to linear.

## Semantic Gate After Optimization

When the task moves from “can it finish?” to “make it faster,” protect the slow version’s semantics first. The slow version may be slow, but it is often clearer and more trustworthy. A faster version without a semantic check may simply produce different results faster.

Procedure:

1. Before changing code, choose a small or medium sample that completes and covers key paths.
2. Generate canonical output with the slow version and save it where the faster version cannot overwrite it.
3. Define canonical fields, sort order, floating-point format, timestamp format, null representation, and randomness controls.
4. If floats are present, define fixed rounding or formatting before writing canonical output, including decimal places, scientific notation, NaN/Inf representation, and negative zero handling.
5. Generate candidate canonical output with the faster version using the same input, same parameters, and same environment assumptions.
6. The final comparison must be byte-for-byte identical.
7. Do not replace canonical normalization with runtime tolerance comparisons. Tolerance belongs only in the pre-write rounding or formatting rule.
8. Until the semantic check passes, the faster version must not replace the slow version or support full-scale conclusions.

Canonical output should be small and stable. Include only what proves semantic equivalence, such as:

- final metrics and key intermediate metrics;
- per-item, per-task, or per-result core outputs;
- sorted IDs, timestamps, scores, states, labels, or decisions;
- required aggregate checksums or summary rows.

Do not use huge temporary files as canonical output. Canonical output is for auditing semantics, not copying every artifact.

Additional pass conditions after optimization:

- Slow-version canonical output exists and is preserved.
- Faster-version candidate canonical output exists.
- Byte-for-byte comparison passes.
- Runtime sampling shows the faster version improves target-scale feasibility without new unexplained instability.

Additional failure conditions after optimization:

- No slow-version canonical output exists.
- Faster-version canonical output is not byte-for-byte identical.
- Floats were not normalized before writing canonical output.
- Rounding or formatting rules were changed after seeing differences.
- Only aggregate metrics are similar while important per-item outputs drift.

## Optimization Priority

This skill does not prescribe fixed optimization recipes because workloads vary. It does prescribe an optimization order of operations: save compute first, then save wall-clock time.

When optimization is needed, prefer changes that reduce total work:

- remove repeated, redundant, or unused computation;
- avoid unnecessary scans, joins, sorts, conversions, serialization, network calls, or disk I/O;
- cache or precompute only when it reduces net work and does not create stale or memory-heavy behavior;
- change data structures or algorithms when sampling, profiling, or code inspection shows avoidable growth;
- narrow the workload using correct filters, early exits, deduplication, batching, pruning, or incremental processing.

Use parallelism only after checking for wasted work. More workers can reduce elapsed time while increasing total CPU, memory pressure, I/O contention, and operational cost. It is appropriate when:

- the remaining work is necessary and independent;
- algorithmic/workload reductions have been exhausted or are too risky for the task;
- the bottleneck is not already memory, disk, network, lock contention, or rate limits;
- semantic equivalence and bounded `N-T` sampling still pass under the parallel version.

Do not present multiprocessing, multithreading, GPU use, larger machines, or more shards as the first fix unless evidence shows the work is already necessary, well-partitioned, and not waste-dominated.

## Profiler Guidance

This skill does not wrap or prescribe profiler tools. However, when the gate returns `FAIL` or `INCONCLUSIVE`, especially for high complexity, declining throughput, suspected memory bottlenecks, or unstable samples, tell the user to use the existing profiler or hotspot audit tool appropriate for the project and language.

Profiler use is a next-stage input, not a replacement for this gate. Keep profiling short, controlled, and reproducible:

- Profile a small or medium sample that reliably hits the slow path.
- Set an explicit timeout so profiling does not become another blind full-scale run.
- Capture hot functions, hot lines, call counts, cumulative time, allocation pressure, or I/O waits.
- Do not rewrite semantic-sensitive code from profiler results unless canonical output exists.
- After optimization, return to this skill: pass the canonical byte-for-byte gate, then repeat `N-T` sampling and the full-scale go/no-go decision.

## Report Format

Use this structure:

```text
Performance Gate Result: PASS | FAIL | INCONCLUSIVE

Target:
- N_full:
- T_budget:
- command:
- N_definition:

Program Type:
- progress_observable | batch_only
- sampling_method:
- instrumentation_decision:

Samples:
| N | runtime_sec | status | timeout_sec | notes |

Scaling:
- linear_estimate:
- power_law_p:
- power_law_estimate:
- local_slope_estimate:
- conservative_estimate:

Canonical Check, if optimized code was created:
- slow_canonical:
- fast_candidate_canonical:
- compare_rule:
- compare_result:
- semantic_gate:

Decision:
- conclusion:
- reason:
- optimization_priority, if optimized:
- next_step:
```

## Non-Goals

This skill does not:

- wrap profiler tools;
- provide generic optimization recipes;
- automatically rewrite algorithms;
- prefer parallelism before checking for wasted work;
- prove estimates are exact;
- encourage full-scale runs when evidence is insufficient.

If the gate fails, recommend profiling, diagnosis, algorithm changes, progress logging, a better slicing strategy, or redefining `N`. Do not start a long target-scale run.

## Operating Rule

When the user asks to run full scale, check whether something will time out, or make slow code faster, use this skill before long execution. Treat timeouts as sampling signals, not final answers. The goal is to get decision information early and avoid wasting compute on runs that were predictable failures.
