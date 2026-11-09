# Roadmap

## Fase 0: Fondamenta ✅ (questo commit)
- Monorepo, database con PostGIS, API completa e testata, app con le schermate principali
- Autenticazione, luoghi, caratteristiche verificate, filtri, post, feed, chat, moderazione, GDPR

## Fase 1: MVP privato (4–6 settimane)
- [ ] Verifica dell'email e reset della password (Resend)
- [ ] Login con Apple e Google
- [ ] Mappa nella schermata Esplora (MapLibre)
- [ ] Creazione di un luogo dall'app con ricerca Google Places / OSM e de-duplicazione
- [ ] Ridimensionamento delle foto e thumbnail (Cloudflare Images o un worker con sharp), blurhash
- [ ] Moderazione automatica delle immagini e sfocatura dei volti dei minori
- [ ] Notifiche push (Expo Push)
- [ ] Termini di servizio e informativa privacy, consenso ai cookie sul web
- [ ] Deploy di staging (Fly.io + Neon + R2) e build interne con EAS (TestFlight e Play Internal Testing)
- [ ] **Test con 20–30 utenti reali**: 10 famiglie, 10 over 65, 10 persone con un cane

## Fase 2: Beta pubblica in una città (6–8 settimane)
- [ ] Precaricare 500–1000 luoghi della città scelta (es. Roma) con dati OSM
- [ ] "Modalità facile" con testo ancora più grande e meno opzioni, pensata per gli anziani
- [ ] Lingue: italiano, inglese, spagnolo (il catalogo ha già le traduzioni)
- [ ] Richieste di messaggio: chi non segui deve chiedere prima di scriverti
- [ ] Badge "Contributore affidabile" per chi verifica molti luoghi
- [ ] Pannello web per i moderatori
- [ ] Analytics (PostHog UE) e monitoraggio degli errori (Sentry)

## Fase 3: Crescita
- [ ] Itinerari: "Una giornata a Firenze con un bambino di 3 anni e un nonno con il bastone"
- [ ] Ricerca semantica e suggerimenti con AI, ad esempio "un posto tranquillo dove mangiare con il cane vicino al Duomo"
- [ ] Profili verificati per i gestori dei locali, che possono rispondere e aggiornare le informazioni
- [ ] Modello di business **etico**: abbonamento "Plus" per i viaggiatori e schede premium per i locali, **mai** pubblicità che si spaccia per recensione
- [ ] Partnership con associazioni (famiglie, terza età, accessibilità, animali)
