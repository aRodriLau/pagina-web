# Cosa serve per andare in produzione

Il codice gira già in locale senza nessun account esterno. Per pubblicare l'app servono i servizi
qui sotto, in **ordine di priorità**. I costi sono indicativi per la fase di lancio, fino a qualche
migliaio di utenti.

## 1. Indispensabili per il lancio

| Servizio | A cosa serve | Scelta consigliata | Alternativa | Costo iniziale |
|---|---|---|---|---|
| **Database PostgreSQL + PostGIS** | Utenti, luoghi, post, chat | **Neon** o **Supabase** (PostGIS incluso) | AWS RDS | 0–25 €/mese |
| **Hosting API** | Esegue il backend (Docker) | **Fly.io** o **Railway** | Render, AWS ECS | 5–20 €/mese |
| **Storage foto** | Le immagini dei post | **Cloudflare R2**, che non fa pagare il traffico in uscita | AWS S3 | ~0,015 €/GB al mese |
| **Redis** | Chat su più server | **Upstash** | Redis Cloud | 0–10 €/mese |
| **Email transazionali** | Verifica dell'email e reset della password | **Resend** o **Postmark** | AWS SES | 0–15 €/mese |
| **Apple Developer Program** | Pubblicare su App Store | — | — | 99 $/anno |
| **Google Play Console** | Pubblicare su Play Store | — | — | 25 $ una tantum |
| **Expo / EAS** | Compilare e pubblicare le app, aggiornamenti OTA | EAS piano gratuito → Production | Build locali con Xcode e Android Studio | 0–99 $/mese |
| **Dominio** | `tappa.app` o simile, più l'email di supporto | Cloudflare Registrar | — | ~15 €/anno |

## 2. Importanti nei primi mesi

| Servizio | A cosa serve | Scelta consigliata |
|---|---|---|
| **Dati dei luoghi** | Precompilare i luoghi così l'app non parte vuota, ed evitare i duplicati (`externalId`) | **Google Places API** (circa 17 $ ogni 1000 richieste, con 200 $ al mese di credito) oppure **OpenStreetMap / Overpass**, gratuito |
| **Mappe** | Mostrare la mappa dei luoghi | **Mapbox** o **MapLibre** con tile OSM (economico); Google Maps SDK |
| **Notifiche push** | Nuovi messaggi, risposte, "un luogo che hai salvato è stato verificato" | **Expo Push** (gratuito) che usa APNs e FCM |
| **Moderazione automatica delle immagini** | Bloccare nudità e violenza, sfocare i volti dei bambini | **AWS Rekognition** o **Google Cloud Vision**; **Hive** |
| **Monitoraggio errori** | Accorgersi dei crash | **Sentry**, con piano gratuito |
| **Analytics nel rispetto della privacy** | Capire come si usa l'app | **PostHog**, ospitato in UE |
| **Login social** | Accesso con Google e Apple. **Sign in with Apple è obbligatorio** se offri il login Google su iOS | Google Identity, Apple |

## 3. Account e chiavi da creare (checklist)

- [ ] Account GitHub con questo repository, già fatto
- [ ] Apple Developer, con l'**organizzazione** (serve partita IVA / D-U-N-S) oppure come persona fisica
- [ ] Google Play Console
- [ ] Account Expo, poi `npx eas-cli login`
- [ ] Cloudflare: dominio, bucket R2, chiavi API R2
- [ ] Neon o Supabase: `DATABASE_URL`
- [ ] Fly.io o Railway: deploy del `Dockerfile` in `apps/api`
- [ ] Upstash: `REDIS_URL`
- [ ] Resend: chiave API e verifica del dominio
- [ ] Google Cloud: chiave Places API, con restrizioni per app e IP
- [ ] Sentry: DSN per l'API e per l'app

> **Importante:** le chiavi segrete non vanno **mai** nel codice né su GitHub. Vanno nelle variabili
> d'ambiente dell'hosting (Fly secrets, Railway variables) e nei secrets di EAS.

## 4. Connettori per lo sviluppo con Claude

Durante lo sviluppo possono essere utili, ma nessuno è obbligatorio:

- **GitHub**: già collegato.
- **Figma o Canva**: per disegnare logo, icone e schermate prima di implementarle.
- **Database (Postgres MCP)**: per interrogare il database di staging durante il debug.
- **Sentry**: per analizzare i crash direttamente dalla sessione.

## 5. Figure professionali consigliate

- **Consulente privacy / avvocato**: termini di servizio, informativa GDPR, DPIA (necessaria per la presenza di dati sui minori) e nomina dei responsabili del trattamento (fornitori cloud).
- **Designer UX** con esperienza di accessibilità: test con utenti reali anziani e famiglie.
- **Moderatori**: all'inizio bastano i fondatori, ma serve una procedura scritta.
