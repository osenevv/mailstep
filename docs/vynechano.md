# Co je vynechané

Zadání je řez, ne celý reklamační proces. V kódu není:

- ladění oken 2 a 14 dní (další řez: až oddělení řekne, že okno je špatně, a jen jako změna `rules.yaml`)
- posouzení oprávněnosti, hlášení dopravci, lhůty a e-mail klientovi (další řez: až po založení, pořád u člověka)
- živý retrack a zápis do Mailshipu (další řez: stejná brána, jiné adaptéry místo souborů)
- persistence a plánovač (další řez: ranní job bez vlastní databáze rozhodnutí)
- zapnutý jazykový model na hot path (spec a ceník jsou v `src/tracking/llm.ts` + README; volá se až po překročení prahu `unrecognized_template`)
- deník lidských rozhodnutí pro ostrý stín ( `npm run reconcile` dnes srovnává jen s `complaints.json` )

Balíček je syntetický a stránky i čtečka znají stejné čtyři šablony. Holdout (29 z 64) proto neměří cizí dopravce. Až přijdou skutečné podklady, spustí se `npm run decide -- --data <adresář>` a `npm run measure -- --data <adresář>`. Názvy polí, která loader nezná, se upraví v `src/pack/load.ts`.

Neznámé znění události se hlásí jako `unrecognized_template`, protože výčet příčin `nevím` jinou přihrádku nemá. Až půjde výčet rozšířit, dostane vlastní příčinu a brána se nezmění: pořád to bude `nevím`, a u ztráty pořád člověk.

Známá mez měření: čtyři stránky šablony v2 jsou zdrženlivé, nebezpečných čtení je 0. To je záměr, ne doladění na holdout.
