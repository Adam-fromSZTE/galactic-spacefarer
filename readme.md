# Galactic Spacefarer Adventure

Helyi SAP CAP / TypeScript alkalmazás, SQLite adatbázissal és Fiori List Report / Object Page felülettel.

Node.js 22+ szükséges. Indítás:

```sh
npm ci
npm start
```

Felület: http://localhost:4004/index.html

- `pilot-x` / `pilot-x`: az X bolygó adatai.
- `pilot-y` / `pilot-y`: az Y bolygó adatai.
- `visitor` / `visitor`: nincs hozzáférés az adatokhoz.

A felület kerete belépés nélkül is betölthető; az API és az adatok eléréséhez bejelentkezés és megfelelő szerepkör szükséges.

A listán szűrhetsz és a táblázat beállításaiban rendezhetsz. Új űrutazót a Létrehozás gombbal vehetsz fel, meglévőt a részletező oldal Szerkesztés gombjával módosíthatsz. A változások piszkozatba kerülnek, majd mentéskor véglegesednek.

Az API címe `/odata/v4/spacefarer/`; támogatja a CRUD műveleteket és az OData lapozást. Új végleges rekord közvetlen API-s létrehozásakor add meg az `IsActiveEntity: true` értéket.

A SQLite memóriában fut: újraindításkor a módosítások elvesznek, a CSV mintaadatok töltődnek vissza. A UI5 betöltéséhez internetkapcsolat kell.

Alapból az üdvözlő e-mail csak konzolos előnézet. Valódi küldéshez másold a `.env.example` fájlt `.env` néven, állítsd a `MAIL_MODE` értékét `smtp`-re, töltsd ki a saját SMTP-beállításaidat, majd indítsd újra a szervert.

Fordítási ellenőrzés: `npm run typecheck`. Az automatikus tesztek később készülnek. GitHub-pushhoz még be kell állítani a repository remote címét.
