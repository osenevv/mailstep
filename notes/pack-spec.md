# Pack spec

Contract between G1 (structured files) and G2 (tracking pages). Both follow `src/pack/types.ts` and `notes/interpretations.md`.

`exportedAt`: `2026-11-03T06:00:00+01:00`.

## Files

| File | Shape |
|---|---|
| `data/orders.json` | `OrdersExport` |
| `data/complaints.json` | `Complaint[]` |
| `data/returns.json` | `WmsReturn[]` |
| `data/reporters.csv` | header `clientId,carrier,reporter` |
| `data/rules.yaml` | `Rules`, plus a comment block in Czech naming the two definitions |
| `data/order-states.md` | Czech, as Mailship docs: each state and what moves an order into it |
| `data/tracking/labels.csv` | header `file,carrier,label` |
| `data/tracking/<trackingNumber>.html` | one page per labelled file |

`label` is one of `doručeno`, `v přepravě`, `vrací se`, `nevím`.

Volume: 45 orders, 25 complaints, 10 returns, 8 reporter rows, 64 tracking pages (the linked 14 plus 50 standalone).

## Carriers and methods

| Carrier | Language | Page shape the human can see |
|---|---|---|
| Rychlopost | Czech | table of events, newest row first |
| PaketNet | Czech | timeline of divs, oldest first |
| VeloCorriere | Italian | event list, newest first |
| NordParcel | English | one status badge plus a history list, newest first |

Normal methods, one per carrier: `Rychlopost Standard`, `PaketNet Standard`, `VeloCorriere Standard`, `NordParcel Standard`.

Excluded:

- `interní přeprava` on both A and B
- `Rychlopost Ekonom bez sledování` and `PaketNet Obyčejný balík` on B only

`rules.yaml` must use those strings exactly.

## Clients

Six fictional Czech clients. Three are large because they appear in `reporters.csv`:

| clientId | name | large | matrix |
|---|---|---|---|
| CL-LUMEN | Lumen obchod | yes | Rychlopost → `Eva Králová`; `*` → `Eva Králová` |
| CL-NIVA | Niva studio | yes | PaketNet → `Martin Holub`; no star row |
| CL-ORTA | Orta home | yes | NordParcel → `Sara Bianchi`; no star row |
| CL-BOR | Bor a syn | no | |
| CL-MISA | Míša papír | no | |
| CL-KLIN | Klin keramika | no | |

Eight reporter rows means the three large clients above (4 rows) plus four extra rows that still belong to those same three clients (a second carrier each, or a repeated `*` is not allowed). Use:

- CL-LUMEN, VeloCorriere, `Eva Králová`
- CL-NIVA, Rychlopost, `Martin Holub`
- CL-ORTA, PaketNet, `Sara Bianchi`
- CL-LUMEN, NordParcel, `Eva Králová`

That is 8 rows. Small clients have zero rows.

## Clock anchors

`asOf` = `2026-11-03T06:00:00+01:00`.

| Case | stateEnteredAt | Elapsed |
|---|---|---|
| A, 2 d − 1 min | `2026-11-01T06:01:00+01:00` | 47 h 59 min |
| A, exactly 2 d | `2026-11-01T06:00:00+01:00` | 48 h |
| A, 2 d + 1 h | `2026-11-01T05:00:00+01:00` | 49 h |
| A, no offset, exactly 2 d | `2026-11-01T06:00:00` | 48 h, read as Prague CET |
| B, 14 d − 1 min | `2026-10-20T06:01:00+02:00` | 335 h 59 min |
| B, exactly 14 d | `2026-10-20T07:00:00+02:00` | 336 h, and the interval crosses 2026-10-25 |
| B, 14 d + 1 day | `2026-10-19T07:00:00+02:00` | 360 h |

`2026-10-20T06:00:00+02:00` is 14 d + 1 h before `asOf`, not exactly 14 d. Do not use it for the exact boundary. The exact boundary is `2026-10-20T07:00:00+02:00` because `asOf` is CET (+01) and 20 October is still CEST (+02).

## Linked tracking numbers

G1 puts each number on exactly one order. G2 writes the html file, except the two marked `NO PAGE`. Those two orders are eligible on the rules and then `NEEDS_HUMAN` / `TRACKING_UNAVAILABLE`.

| trackingNumber | carrier | label | cause (not written to the repo) | definition | rules outcome before the page | final action | final code |
|---|---|---|---|---|---|---|---|
| RP1001 | Rychlopost | v přepravě | | B | eligible | FILE | TRACKING_CONFIRMS_STUCK |
| RP1002 | Rychlopost | doručeno | | B | eligible | DO_NOT_FILE | TRACKING_DELIVERED |
| RP1003 | Rychlopost | vrací se | | B | eligible | DO_NOT_FILE | TRACKING_RETURNING |
| RP1004 | Rychlopost | nevím | no_carrier_events | A | eligible | FILE | TRACKING_CONFIRMS_NOT_PICKED_UP |
| RP1005 | Rychlopost | v přepravě | | A | eligible | DO_NOT_FILE | TRACKING_CARRIER_HAS_IT |
| PN2001 | PaketNet | nevím | unrecognized_template | B | eligible | NEEDS_HUMAN | TRACKING_UNKNOWN |
| PN2002 | PaketNet | nevím | empty | A | eligible | NEEDS_HUMAN | TRACKING_UNKNOWN |
| VC3001 | VeloCorriere | doručeno | | A | eligible | DO_NOT_FILE | TRACKING_DELIVERED |
| VC3002 | VeloCorriere | vrací se | | A | eligible | DO_NOT_FILE | TRACKING_RETURNING |
| VC3003 | VeloCorriere | v přepravě | | B | eligible | FILE | TRACKING_CONFIRMS_STUCK |
| NP4001 | NordParcel | nevím | conflicting_events | B | eligible | NEEDS_HUMAN | TRACKING_UNKNOWN |
| NP4002 | NordParcel | nevím | error_page | A | eligible | NEEDS_HUMAN | TRACKING_UNKNOWN |
| NP4003 | NordParcel | nevím | no_carrier_events | B | eligible | NEEDS_HUMAN | TRACKING_UNKNOWN |
| RP1006 | Rychlopost | v přepravě | | B | eligible | FILE | TRACKING_CONFIRMS_STUCK |
| RP1007 | Rychlopost | | NO PAGE | B | eligible | NEEDS_HUMAN | TRACKING_UNAVAILABLE |
| PN2003 | PaketNet | | NO PAGE | A | eligible | NEEDS_HUMAN | TRACKING_UNAVAILABLE |

Eligible linked orders use a normal shipping method for that carrier, a client that resolves a reporter, no complaint on that order, and no return. Their `stateEnteredAt` is safely inside the window (A: `2026-10-30T06:00:00+01:00`, B: `2026-10-10T06:00:00+02:00`) so the page is the only thing that changes the outcome.

`NP4003` is the case the gate must not treat as a pickup signal: `no_carrier_events` files only definition A.

## Edge cases G1 must plant

One order per row. Linked orders use ids `MS-2026-000101` through `MS-2026-000116` in table order. Do not stack a second block onto a row whose point is a single code.

| orderId | case | action | codes |
|---|---|---|---|
| MS-2026-000201 | A, 2 d − 1 min, otherwise clean, tracking null | DO_NOT_FILE | WINDOW_NOT_REACHED |
| MS-2026-000202 | A, exactly 2 d, otherwise clean, tracking RP1005 is a different order. This order uses tracking `RPWIN2`. G2 label `v přepravě`, Rychlopost. | DO_NOT_FILE | TRACKING_CARRIER_HAS_IT |
| MS-2026-000203 | A, 2 d + 1 h, otherwise clean, tracking `RPWIN3`, G2 label `doručeno` | DO_NOT_FILE | TRACKING_DELIVERED |
| MS-2026-000204 | A, timestamp without offset exactly 2 d, tracking `RPWIN4`, G2 label `nevím` and the page must be a real Rychlopost frame with zero scans (`no_carrier_events`) | FILE | TRACKING_CONFIRMS_NOT_PICKED_UP |
| MS-2026-000211 | B, 14 d − 1 min | DO_NOT_FILE | WINDOW_NOT_REACHED |
| MS-2026-000212 | B, exactly 14 d across the DST change, tracking `NPWIN14`, NordParcel, G2 label `v přepravě` | FILE | TRACKING_CONFIRMS_STUCK |
| MS-2026-000213 | B, 14 d + 1 day, tracking `VCWIN15`, VeloCorriere, G2 label `v přepravě` | FILE | TRACKING_CONFIRMS_STUCK |
| MS-2026-000221 | A, no-tracking service `Rychlopost Ekonom bez sledování`, inside window | FILE if page confirms not picked up. Use tracking `RPA221`, G2 label `nevím`, Rychlopost frame, zero scans. | TRACKING_CONFIRMS_NOT_PICKED_UP |
| MS-2026-000222 | B, same no-tracking service, inside window | DO_NOT_FILE | EXCLUDED_SHIPPING_METHOD |
| MS-2026-000223 | A, `interní přeprava` | DO_NOT_FILE | EXCLUDED_SHIPPING_METHOD |
| MS-2026-000224 | B, `interní přeprava` | DO_NOT_FILE | EXCLUDED_SHIPPING_METHOD |
| MS-2026-000231 | complaint `koncept` on this order | DO_NOT_FILE | COMPLAINT_EXISTS |
| MS-2026-000232 | complaint `uzavřená` on this order | DO_NOT_FILE | COMPLAINT_EXISTS |
| MS-2026-000233 | complaint only on a different order of the same client; this order eligible B with tracking `PN233`, G2 label `v přepravě` | FILE | TRACKING_CONFIRMS_STUCK |
| MS-2026-000241 | return `Připraveno` | DO_NOT_FILE | RETURN_EXISTS |
| MS-2026-000242 | return `přijato na sklad` | DO_NOT_FILE | RETURN_EXISTS |
| MS-2026-000251 | CL-LUMEN + Rychlopost, matrix hit, eligible B, tracking `RP251`, G2 `v přepravě` | FILE | TRACKING_CONFIRMS_STUCK |
| MS-2026-000252 | CL-NIVA + VeloCorriere (no matrix row and no star), inside window B | DO_NOT_FILE | NO_REPORTER |
| MS-2026-000253 | CL-BOR, two history complaints, later reporter wins, eligible B, tracking `VC253`, G2 `v přepravě` | FILE | TRACKING_CONFIRMS_STUCK |
| MS-2026-000254 | CL-MISA, no history, inside window | DO_NOT_FILE | NO_REPORTER |
| MS-2026-000261 | `stateEnteredAt: null` | DO_NOT_FILE | DATA_INCOMPLETE |
| MS-2026-000262 | `clientId: ""` | DO_NOT_FILE | DATA_INCOMPLETE |
| MS-2026-000271 | state `doručeno` | DO_NOT_FILE | NOT_WATCHED_STATE |
| MS-2026-000272 | state `expedováno` | DO_NOT_FILE | NOT_WATCHED_STATE |
| MS-2026-000281 | B inside window, `interní přeprava`, and a return, and no reporter (small client, no history) | DO_NOT_FILE | EXCLUDED_SHIPPING_METHOD,RETURN_EXISTS,NO_REPORTER |

The remaining orders fill the count to 45. They are ordinary watched orders with a resolved reporter and a linked or standalone outcome that does not contradict this table. Do not add a second complaint or return onto an order whose expected code is a single window or tracking code.

`notes/expected.md` columns: `orderId`, `action`, `codes`, `interpretations`. One row per order in `orders.json`, not only the edge cases. `codes` is comma-separated, block codes in union order.

## Gate table

| Rules | Fresh page | Action | Code |
|---|---|---|---|
| eligible B | `v přepravě` | `FILE` | `TRACKING_CONFIRMS_STUCK` |
| eligible A | `nevím`, cause `no_carrier_events` | `FILE` | `TRACKING_CONFIRMS_NOT_PICKED_UP` |
| eligible A | `v přepravě` | `DO_NOT_FILE` | `TRACKING_CARRIER_HAS_IT` |
| eligible A/B | `doručeno` | `DO_NOT_FILE` | `TRACKING_DELIVERED` |
| eligible A/B | `vrací se` | `DO_NOT_FILE` | `TRACKING_RETURNING` |
| eligible B | `nevím`, any cause | `NEEDS_HUMAN` | `TRACKING_UNKNOWN` |
| eligible A | `nevím`, any other cause | `NEEDS_HUMAN` | `TRACKING_UNKNOWN` |
| eligible A/B | no page | `NEEDS_HUMAN` | `TRACKING_UNAVAILABLE` |
| not candidate / blocked | n/a | `DO_NOT_FILE` | the rules' codes |

## Pages G2 must add beyond the linked set

Standalone filenames are the tracking number plus `.html`. Extra tracking numbers use the prefix `X` plus the carrier code and a zero-padded index (`XRP01` …). 50 standalone pages.

Per carrier at least 12 pages in the whole set (linked + standalone). Each label at least 10 pages overall. `nevím` pages cover, across the set: `no_carrier_events`, an error or maintenance page, an empty body, an unrecognised template, and conflicting events. Causes are not written into the repo. They go in the final report only.

Traps, spread across dev and holdout: full HTML with nav, footer, cookie banner, and scripts; an old event that says delivered-to-depot while the newest says otherwise; the substrings `nedoručeno`, `Doručení se nezdařilo`, `non consegnato`, `not delivered`; return wording `vrací se odesílateli`, `in restituzione al mittente`, `returning to sender`; a PaketNet delivered page whose newest event is last in the document; date formats that differ per carrier; about four pages of a v2 template for one carrier, split across dev and holdout; two pages where a careful reader would still say `nevím`.

`notes/split.md`: per carrier, sort filenames, stratify by label, about half of each label in `dev` and half in `holdout`. v2 pages go to both splits.
