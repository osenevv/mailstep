# Stavy objednávky v Mailshipu

Mailship drží stav objednávky a u zásilky ještě normalizovaný stav dopravce. Tohle jsou stavy, se kterými pracuje ranní výběr kandidátů. Okna 2 a 14 dní se počítají od okamžiku, kdy objednávka do stavu vstoupila, ne od vytvoření objednávky.

## čeká na dopravce

Objednávka je vychystaná a štítek existuje, dopravce si zásilku ještě nepřevzal. Do stavu se přechází při předání k vyzvednutí. Ven se přechází skenem převzetí, zrušením, nebo tím, že se zásilka vrátí na sklad dřív, než odjede.

Kandidát na nevyzvednutí (definice A) vzniká, když objednávka v tomhle stavu zůstane aspoň 2 dny.

## převzato dopravcem

Dopravce zásilku převzal a Mailship ještě nemá konečný stav doručení. Do stavu se přechází skenem převzetí. Ven se přechází doručením, vrácením odesílateli, nebo ztrátou potvrzenou člověkem.

Kandidát na ztrátu (definice B) vzniká, když objednávka v tomhle stavu zůstane aspoň 14 dní.

## doručeno

Příjemce zásilku dostal. Není to sledovaný stav pro reklamaci uvíznutí.

## expedováno

Zásilka opustila sklad, ale ještě není ve stavu převzetí dopravcem. Není to sledovaný stav. Samo o sobě kandidáta nedělá.

## Normalizovaný stav dopravce

Vedle stavu objednávky drží Mailship poslední známý stav od dopravce a umí si vyžádat nový tracking. Ten uložený stav je důvod, proč se řádek objeví v reportu. Není to důkaz, že zásilka doručená není. Před založením reklamace se čte čerstvá stránka dopravce.
