# Měření čtení tracking stránek

## Původ

Balíček je syntetický. Skutečné podklady k zadání nebyly dodány.
Stránky i čtečka vznikly podle jedné šablony na dopravce. Split je ve tracking/split.md (dev 35, holdout 29), stratifikovaný po štítku. Pravidla se na holdout nedolaďovala; není to zkouška na cizích stránkách dopravců.
Šablona v2 je v obou půlkách schválně neznámá: čtečka řekne nevím a reklamace se nezaloží.
Příkaz: npm start

## Dev a holdout

| Split | Stránek | Shoda | Nebezpečné | Potlačující | Zdrženlivé | Přehnané | Ostatní omyl |
|---|---:|---:|---:|---:|---:|---:|---:|
| dev | 35 | 94.3 % | 0 | 0 | 2 | 0 | 0 |
| holdout | 29 | 93.1 % | 0 | 0 | 2 | 0 | 0 |

## Dopravci

| Dopravce | Stránek | Shoda | Nebezpečné | Potlačující | Zdrženlivé | Přehnané | Ostatní omyl |
|---|---:|---:|---:|---:|---:|---:|---:|
| NordParcel | 16 | 100.0 % | 0 | 0 | 0 | 0 | 0 |
| PaketNet | 16 | 100.0 % | 0 | 0 | 0 | 0 | 0 |
| Rychlopost | 16 | 75.0 % | 0 | 0 | 4 | 0 | 0 |
| VeloCorriere | 16 | 100.0 % | 0 | 0 | 0 | 0 | 0 |

## Matice záměn

Řádek je štítek, sloupec je predikce. Pořadí: doručeno, v přepravě, vrací se, nevím.

| štítek \ predikce | doručeno | v přepravě | vrací se | nevím |
|---|---:|---:|---:|---:|
| doručeno | 13 | 0 | 0 | 2 |
| v přepravě | 0 | 20 | 0 | 1 |
| vrací se | 0 | 0 | 12 | 1 |
| nevím | 0 | 0 | 0 | 15 |

## Co který koš znamená

- **Nebezpečné.** Predikce `v přepravě`, štítek je `doručeno` nebo `vrací se`. Brána by mohla založit falešnou reklamaci.
- **Potlačující.** Predikce `doručeno` nebo `vrací se`, štítek je `v přepravě`. Skutečná ztráta by se nedostala do fronty.
- **Zdrženlivé.** Predikce `nevím`, štítek je známý. Práce pro člověka, žádné založení.
- **Přehnané.** Určitá predikce, štítek je `nevím`. Čtečka tvrdí víc, než stránka unese.
- **Ostatní omyl.** Dva určité stavy, které nejsou ani nebezpečné, ani potlačující. Například `doručeno` a `vrací se` prohozené.

## Omyly

| Koš | Soubor | Dopravce | Split | Štítek | Predikce | Pravidlo | Evidence |
|---|---|---|---|---|---|---|---|
| zdrženlivé | XRP02.html | Rychlopost | dev | doručeno | nevím | rychlopost.unrecognized-template |  |
| zdrženlivé | XRP03.html | Rychlopost | holdout | doručeno | nevím | rychlopost.unrecognized-template |  |
| zdrženlivé | XRP04.html | Rychlopost | holdout | vrací se | nevím | rychlopost.unrecognized-template |  |
| zdrženlivé | XRP05.html | Rychlopost | dev | v přepravě | nevím | rychlopost.unrecognized-template |  |

Celkem stránek: 64.
