# Sicurezza e privacy

## Cosa è già implementato
- **Password** con hash argon2id, usando i parametri raccomandati da OWASP. Il login ha un tempo di risposta costante, così non rivela quali email sono registrate.
- **Sessioni**: access token JWT da 15 minuti e refresh token da 30 giorni, salvati solo come hash SHA-256. I token **ruotano** a ogni rinnovo e, se un token già usato viene ripresentato, tutta la sessione viene revocata.
- Sul telefono i token stanno nel **Keychain / Keystore** (expo-secure-store).
- **Rate limit** globale e limiti più stretti su login, registrazione, upload, commenti e segnalazioni.
- **Helmet** (header di sicurezza) e **CORS** limitato ai domini configurati.
- **Validazione** di ogni input con zod: lunghezze massime, enum e coordinate.
- **Upload**: URL firmati validi 10 minuti, con tipo e dimensione fissati (massimo 15 MB). Un post può usare solo foto caricate dal suo autore e mai riutilizzate.
- **Blocchi**: un utente bloccato non vede i tuoi contenuti, non commenta e non ti scrive.
- **Segnalazioni**: con 3 segnalazioni il contenuto si nasconde in automatico, mentre **1 sola segnalazione "sicurezza minori"** lo nasconde subito. I moderatori poi decidono se rimuoverlo o ripristinarlo.
- **GDPR**: esportazione dei dati (`GET /v1/me/export`) e cancellazione completa (`DELETE /v1/me`).

## Tutela dei minori
- L'app è riservata ai **maggiorenni**: è richiesta una dichiarazione esplicita in fase di registrazione.
- Dei bambini si salvano **solo le età**, mai nomi o date di nascita.
- Prima di pubblicare l'app invita a fotografare **il posto, non le persone**.
- Prevista: sfocatura automatica dei volti nelle foto (Fase 1).
- La posizione è usata solo per cercare i luoghi e **non viene mai salvata** né mostrata sul profilo.

## Da fare prima del lancio
- [ ] DPIA (valutazione d'impatto), consigliata data la presenza di categorie vulnerabili
- [ ] Informativa privacy, termini di servizio e registro dei trattamenti
- [ ] Contratti DPA con i fornitori (hosting, storage, email); preferire server in UE
- [ ] Rimozione dei dati EXIF dalle foto lato server (l'app li esclude già in fase di scelta)
- [ ] Backup giornalieri cifrati del database e test di ripristino
- [ ] Penetration test di base prima della beta pubblica
- [ ] Procedura per le segnalazioni alle autorità (CSAM: obbligo di segnalazione)
