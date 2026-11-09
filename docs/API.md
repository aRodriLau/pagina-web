# API v1

Base URL: `/v1`. Le rotte con 🔒 richiedono `Authorization: Bearer <accessToken>`. Gli errori hanno
sempre questa forma: `{ "error": { "code", "message", "details?" } }`.

| Metodo | Percorso | Descrizione |
|---|---|---|
| GET | `/health`, `/catalog` | Stato del server; catalogo di categorie, caratteristiche e fasce di prezzo |
| POST | `/auth/register` | Registrazione (`acceptTerms`, `isAdult` obbligatori) |
| POST | `/auth/login` · `/auth/refresh` · `/auth/logout` | Sessione |
| GET/PATCH/DELETE | `/me` 🔒 | Profilo personale e cancellazione dell'account |
| GET | `/me/export` 🔒 | Esportazione dei dati (GDPR) |
| GET | `/users/:username`, `/users/:username/posts` | Profilo pubblico |
| PUT/DELETE | `/users/:id/follow` 🔒, `/users/:id/block` 🔒 | Segui e blocca |
| GET | `/places?q&category&features&verifiedOnly&maxPriceLevel&maxCostPerPerson&lat&lng&radiusKm&city&limit&cursor` | Ricerca con filtri |
| POST | `/places` 🔒 | Nuovo luogo |
| GET | `/places/:id`, `/places/:id/posts` | Dettaglio del luogo ed esperienze |
| POST | `/places/:id/features` 🔒 | Conferma o smentisci una caratteristica `{ feature, present }` |
| POST | `/uploads` 🔒 | Restituisce un URL firmato per caricare una foto |
| POST | `/posts` 🔒 | Pubblica un post |
| GET/DELETE | `/posts/:id` | Dettaglio ed eliminazione |
| GET | `/feed?mode=for-me\|nearby\|following` 🔒 | Feed |
| PUT/DELETE | `/posts/:id/helpful` 🔒 | "Utile" |
| GET/POST | `/posts/:id/comments` | Commenti |
| DELETE | `/comments/:id` 🔒 | Elimina un commento (autore del commento o del post, oppure moderatore) |
| GET/POST | `/me/lists` 🔒 | Liste salvate |
| GET/DELETE | `/lists/:id` | Lista |
| PUT/DELETE | `/lists/:id/places/:placeId` 🔒 | Aggiungi o rimuovi un luogo |
| GET/POST | `/conversations` 🔒 | Conversazioni (le chat 1-a-1 non vengono duplicate) |
| GET/POST | `/conversations/:id/messages` 🔒 | Messaggi |
| POST | `/reports` 🔒 | Segnala un contenuto |
| GET | `/moderation/reports` 🔒 (moderatori) | Coda delle segnalazioni |
| POST | `/moderation/reports/:id/resolve` 🔒 (moderatori) | `remove` \| `restore` \| `dismiss` |

**Tempo reale:** Socket.IO sul percorso `/realtime`, con autenticazione `{ auth: { token } }`.
Eventi: `message:new`, `typing`.
