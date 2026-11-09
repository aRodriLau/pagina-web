# Tappa

**Il social dei luoghi per chi viaggia, a ogni età.**

Quasi tutte le app di viaggio sono pensate per chi ha fra 20 e 45 anni. Tappa è pensata anche per
chi di solito viene lasciato fuori: **famiglie con bambini piccoli, anziani, persone con mobilità
ridotta e chi viaggia con animali**.

Al centro ci sono i **luoghi**, non le persone. Non ci sono follower da collezionare e non ci sono
"like": c'è il pulsante **"Utile"**, che premia l'informazione e non la popolarità.

## Cosa la rende diversa

| Problema oggi | Come lo risolve Tappa |
|---|---|
| "Family friendly" non vuol dire niente | Caratteristiche **concrete e verificabili**: fasciatoio, seggiolone, ingresso senza gradini, ascensore, panchine, ciotola per il cane… |
| Le recensioni possono essere false | Ogni caratteristica viene **confermata o smentita** da chi ci è stato. Con 3 o più conferme diventa ✓✓ *verificata* |
| "€€" non dice quanto spenderai | Il filtro budget usa la **spesa reale per persona** che gli utenti dichiarano nei post |
| Feed superficiale e basato sulla popolarità | Feed **"Adatto a me"**, costruito su come viaggi (con bambini, over 65, con il cane…) |
| Testi piccoli, bottoni minuscoli | Interfaccia **leggibile da tutti**: testo grande, alto contrasto, bottoni grandi almeno 48px |
| Foto di bambini esposte online | Linee guida, segnalazione "sicurezza minori" con oscuramento immediato, app solo per maggiorenni |

## Funzionalità già pronte (v0.1)

- **Registrazione e login** sicuri: password protette con argon2id, token di sessione che si rinnovano a rotazione e rilevamento dei token rubati.
- **Profilo da viaggiatore**: con bambini, over 65, con animali, mobilità ridotta, da solo, in coppia, in gruppo.
- **Luoghi** con 22 caratteristiche divise in 4 gruppi: bambini, anziani, accessibilità, animali.
- **Ricerca e filtri**: testo (tollera gli errori di battitura), categoria, caratteristiche, budget a persona, raggio dalla tua posizione, solo luoghi verificati.
- **Post con foto**: si carica dal telefono direttamente allo storage con URL firmati. Ogni post contiene voto, spesa a persona, con chi eri, età dei bambini e caratteristiche confermate.
- **Feed** in 3 modalità: *Adatti a me*, *Vicino a me*, *Chi seguo*.
- **"Utile"** e commenti.
- **Chat** privata e di gruppo **in tempo reale**, con la possibilità di condividere un luogo ("andiamo qui?").
- **Liste** di luoghi salvati, ad esempio "Roma con i nonni".
- **Sicurezza**: blocco utenti, segnalazioni, area moderatori e oscuramento automatico dei contenuti segnalati.
- **Privacy (GDPR)**: esportazione dei dati e cancellazione dell'account.

## Architettura

```
┌───────────────────────┐   HTTPS / WebSocket   ┌──────────────────────────┐
│ App (Expo / React     │ ────────────────────▶ │ API (Node 22 + Fastify)  │
│ Native) iOS · Android │                       │ REST /v1 + Socket.IO     │
│ · Web                 │                       └────────┬─────────┬───────┘
└──────────┬────────────┘                                │         │
           │ upload diretto (URL firmato)                ▼         ▼
           ▼                                    PostgreSQL 16   Redis
   Storage S3 / Cloudflare R2  ◀── CDN ──     + PostGIS       (chat su più
   (foto)                                     (geo, ricerca)   istanze)
```

```
apps/
  api/        Backend: Fastify, Prisma, PostGIS, Socket.IO, test di integrazione
  mobile/     App: Expo SDK 58, expo-router, TanStack Query
packages/
  shared/     Catalogo (categorie, caratteristiche, fasce di prezzo) e validazione zod, condivisi da API e app
docs/         Servizi e account necessari, roadmap, sicurezza e privacy
legacy/       Il vecchio prototipo HTML
```

## Avvio in locale

Requisiti: Node 22 e Docker.

```bash
npm install
```

```bash
docker compose up -d
```

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
npm run db:migrate && npm run db:seed
```

```bash
npm run dev:api
```

In un secondo terminale avvia l'app:

```bash
npm run dev:mobile
```

Poi premi `w` per aprirla nel browser, oppure inquadra il QR code con **Expo Go** dal telefono. In
questo caso imposta `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` con l'indirizzo IP del tuo PC.

Account demo: `demo@tappa.app` / `demo-password-123`

### Test

```bash
npm test
```

I test usano un database PostgreSQL reale (`tappa_test`) e girano anche in CI su GitHub Actions.

## Documentazione

- [docs/SERVIZI-E-CONNETTORI.md](docs/SERVIZI-E-CONNETTORI.md): **cosa serve da te**, cioè account, servizi e costi
- [docs/ROADMAP.md](docs/ROADMAP.md): le fasi del progetto fino al lancio
- [docs/SICUREZZA-E-PRIVACY.md](docs/SICUREZZA-E-PRIVACY.md): GDPR, tutela dei minori, moderazione
- [docs/API.md](docs/API.md): l'elenco degli endpoint
