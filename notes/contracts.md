# Contracts

Frozen in D1. Builders do not edit `package.json` or any `types.ts`.

| Symbol | File | Task |
|---|---|---|
| `Order`, `Pack`, `Rules`, input entities | `src/pack/types.ts` | D1 |
| `loadPack(dir: string): Pack` | `src/pack/load.ts` | I1 |
| `decide(order, ctx): RulesDecision` | `src/complaints/decide.ts` | B1 |
| `gate(rules, tracking): FinalDecision` | `src/complaints/gate.ts` | I1 |
| `readTracking(html): TrackingReading` | `src/tracking/read.ts` | B2 |
| `measure(pages): Report` | `src/measurement/measure.ts` | B3 |
| `renderReport(report, provenance): string` | `src/measurement/render.ts` | B3 |

`Decide` and `Gate` in `src/complaints/types.ts` are the signatures. Domain modules export the functions.

Evaluation order inside `decide`:

1. `DATA_INCOMPLETE`, then `NOT_WATCHED_STATE`, then `WINDOW_NOT_REACHED`. First hit wins. `kind: 'not_candidate'`.
2. Otherwise collect every `BlockCode`, in this order: `EXCLUDED_SHIPPING_METHOD`, `COMPLAINT_EXISTS`, `RETURN_EXISTS`, `NO_REPORTER`. Any hit → `kind: 'blocked'` with the full tuple.
3. Otherwise `kind: 'eligible'` with `complaintReason` from that definition and the resolved reporter.

`detail` is one Czech sentence with the concrete values. Eligible decisions have no `detail`.

`gate` follows the table in `notes/pack-spec.md` (copied from plan A.2). For `kind: 'blocked'`, `FinalDecision.code` is the first block and `rules.blocks` keeps the full list. For `kind: 'not_candidate'`, `code` is the not-candidate code. Tracking is read only for `kind: 'eligible'`.

`other_miss` is a definite status predicted as a different definite status that is neither dangerous nor suppressing. Dangerous: predicted `v přepravě` while the label is `doručeno` or `vrací se`. Suppressing: predicted `doručeno` or `vrací se` while the label is `v přepravě`. Abstention: predicted `nevím` while the label is known. Overconfident: a definite prediction while the label is `nevím`.

Confusion axes are label (truth) then prediction. Status order: `doručeno`, `v přepravě`, `vrací se`, `nevím`.
