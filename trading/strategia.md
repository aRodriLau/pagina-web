# La mia strategia: "Pullback sul trend"

**Idea in una frase:** compro un'azione che **sta già salendo**, quando fa una **pausa** (ritraccia)
su un supporto, e solo quando una **candela mi conferma** che i compratori sono tornati.

- **Grafico:** settimanale (1 candela = 1 settimana). Si guarda **una volta a settimana**, nel weekend.
- **Durata media di un'operazione:** da qualche settimana a qualche mese.
- **Rischio:** 1% del fondo trading per operazione (0,5% nelle prime 10 operazioni vere).

> Una strategia sola, sempre uguale. Si cambia solo dopo almeno 20 operazioni annotate nel diario.

---

## Le 5 regole

### 1. FILTRO: il trend deve essere al rialzo
Tutte e tre devono essere vere, altrimenti **non si guarda nemmeno il resto**:
- [ ] Il prezzo è **sopra la media mobile a 50 settimane**
- [ ] La media a 50 è **sopra** quella a 200
- [ ] La media a 50 è **inclinata verso l'alto**

### 2. SETUP: il prezzo fa una pausa su un supporto
Il prezzo scende fino a toccare (o avvicinarsi entro il 3% circa) uno di questi:
- la **media mobile a 20** o a **50 settimane**
- un **vecchio massimo** che ora fa da supporto (una resistenza superata diventa supporto)

### 3. SEGNALE: una candela di inversione rialzista in quella zona
- **Martello** (corpo piccolo in alto, ombra lunga sotto) oppure
- **Engulfing rialzista** (candela verde che "inghiotte" la rossa precedente)

Più forte se il **volume** di quella settimana è più alto della media.

### 4. CONFERMA: entro solo se la settimana dopo lo conferma
- Metto un ordine **stop di acquisto** poco sopra il **massimo** della candela segnale.
- Se nella settimana successiva il prezzo **non** lo supera → annullo l'ordine. Niente operazione.

### 5. USCITA: decisa prima di entrare
| | Dove | Perché |
|---|---|---|
| **Stop loss** | poco sotto il **minimo** della candela segnale (circa 1% sotto) | se scende lì, il segnale era sbagliato |
| **Obiettivo** | almeno **2 volte il rischio** (2R), o la prossima resistenza | guadagno almeno il doppio di quanto rischio |
| **Pareggio** | quando il guadagno arriva a **+1R**, sposto lo stop al prezzo di entrata | da lì non posso più perdere |
| **Uscita di emergenza** | una settimana **chiude sotto la media a 50** | il trend si è rotto |
| **Uscita per tempo** | dopo **10 settimane** senza arrivare all'obiettivo | i soldi fermi non lavorano |

**Se la prossima resistenza è più vicina di 2R → non entro.** Il guadagno possibile è troppo piccolo.

---

## Esempio con i numeri (fondo 1.000 €, rischio 1% = 10 €)

| Passo | Valore |
|---|---|
| Massimo candela segnale → entrata | 102 € |
| Minimo candela segnale → stop | 96 € |
| Rischio per azione | 6 € (= 1R) |
| Azioni (position-sizer: 10 € ÷ 6 €) | **1 azione** (1,67 → arrotonda per difetto) |
| Obiettivo 2R | 102 + 12 = **114 €** |
| Stop a pareggio quando arriva a | 102 + 6 = **108 €** |

Con un fondo piccolo e azioni care puoi comprare poche azioni: è normale.
Se Trade Republic permette le frazioni per quel titolo, il calcolo si può fare con le frazioni.

---

## Cosa NON fare (errori tipici dei principianti)
- ❌ Comprare un titolo **sotto la media a 200** perché "è sceso tanto, è un affare".
- ❌ Entrare sul martello **senza aspettare la conferma**.
- ❌ **Spostare lo stop più in basso** quando il prezzo ci si avvicina.
- ❌ Comprare di più di un titolo che sta perdendo per "mediare".
- ❌ Aprire più di **3 operazioni** insieme o mettere più del **30%** in titoli AI.
- ⚠️ **Impiccato (hanging man)** dopo un forte rialzo su un titolo che hai già: non vendere subito,
  ma **alza lo stop** sotto il minimo di quella candela.

---

## La routine del weekend (30 minuti)
1. **Operazioni aperte:** controllo se devo spostare lo stop (pareggio) o uscire (chiusura sotto la 50).
2. **Watchlist:** per ogni titolo controllo la regola 1 (filtro). Chi non la passa → salto.
3. **Chi passa il filtro:** c'è un setup (regola 2) e un segnale (regola 3)?
4. **Se sì:** calcolo entrata, stop, obiettivo e azioni con `position-sizer`. Inserisco l'ordine.
5. **Diario:** annoto tutto **prima** di sapere come va a finire.

---

## Il piano in 3 fasi

### Fase 1: Imparare a leggere (settimane 1-4) · nessuna operazione
- [ ] Imposto uCharts: candele, settimanale, medie 20/50/200, volume
- [ ] Analizzo con Claude i grafici delle 5 aziende della watchlist e compilo le schede
- [ ] Trovo nel passato di ogni grafico **almeno 2 esempi** di questa strategia (vinti o persi)
- [ ] Inizio a versare nel fondo trading

### Fase 2: Paper trading (settimane 5-16) · soldi finti
- [ ] Applico la strategia con il simulatore di uCharts, capitale finto 1.000 €
- [ ] Almeno **10 operazioni** nel diario simulato
- [ ] Rispetto lo stop in **tutte**
- [ ] Calcolo: percentuale di vincite e guadagno medio / perdita media

**Passo alla fase 3 solo se:** ho rispettato le regole sempre e il risultato totale non è negativo.

### Fase 3: Soldi veri (dalla settimana 17) · fondo da 1.000 €
- [ ] Prime **10 operazioni con rischio 0,5%** (5 €)
- [ ] Poi passo all'**1%** se il diario va bene
- [ ] Ogni 10 operazioni: revisione con Claude del diario

### Più avanti: le opzioni (call/put)
Solo dopo **almeno 6 mesi** di fase 3 con risultati positivi.
Si inizia con strategie a rischio limitato (es. **protective put** per proteggere un'azione che hai già),
mai con knock-out.

---

## Checklist rapida (da tenere aperta mentre guardi il grafico)

```
TITOLO: __________   DATA: __________
[ ] 1. Prezzo sopra MA50, MA50 sopra MA200, MA50 sale
[ ] 2. Prezzo vicino a MA20 / MA50 / vecchio massimo
[ ] 3. Martello o engulfing rialzista (volume alto = bonus)
[ ] 4. Entrata = sopra il massimo della candela: ______
[ ] 5. Stop = sotto il minimo della candela:     ______
       Rischio per azione (R):                   ______
       Obiettivo 2R:                             ______
       Prossima resistenza più lontana di 2R?    sì / no
       Azioni (position-sizer):                  ______
[ ] Operazioni aperte < 3 e AI < 30% del fondo
```
