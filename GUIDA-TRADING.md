# Guida pratica: le 3 skill di trading

Le skill sono in `.claude/skills/` e vengono da
[tradermonty/claude-trading-skills](https://github.com/tradermonty/claude-trading-skills) (licenza MIT).
Non comprano e non vendono nulla: **calcolano e analizzano**, la decisione è sempre tua.

> ⚠️ Studio, non consulenza finanziaria. Prima di usare soldi veri, prova con cifre piccole.

---

## Il metodo in 4 passi (usalo sempre in quest'ordine)

| Passo | Domanda | Skill |
|---|---|---|
| 1. **Analizza** | Il titolo sta salendo o scendendo? Dove sono supporti e resistenze? | `technical-analyst` |
| 2. **Pianifica** | Dove entro? Dove metto lo stop loss? Dove prendo profitto? | `technical-analyst` + tu |
| 3. **Dimensiona** | Quante azioni compro per non rischiare troppo? | `position-sizer` |
| 4. **Registra** | Perché sono entrato? Com'è andata? | diario (vedi in fondo) |

Le call/put (`options-strategy-advisor`) arrivano **dopo**, quando i passi 1-3 ti vengono naturali.

---

## 1. `technical-analyst`: leggere il grafico

**Cosa fare:** fai uno screenshot del grafico **settimanale** (1 candela = 1 settimana)
da Trade Republic o TradingView, con le medie mobili 20/50/200 se riesci, e mandalo a Claude.

**Cosa chiedere (esempi):**
- "Analizza questo grafico settimanale di Apple con la skill technical-analyst."
- "Vedi martelli o engulfing in questo grafico? Sono su un supporto?"
- "Quali sono gli scenari rialzista e ribassista e quale livello li invalida?"

**Cosa ricevi:** tendenza, supporti e resistenze, medie mobili, volume, pattern di candele,
e 2-4 scenari con probabilità, obiettivo e **livello di invalidazione** (= dove avevi torto → stop loss).

**Candele che riconosce:** martello (hammer), shooting star, engulfing rialzista e ribassista.
L'**impiccato (hanging man)** non è nella lista: chiedilo esplicitamente
("c'è un hanging man dopo il rialzo?").

**Limiti:** solo timeframe settimanale (medio periodo, non day trading).

---

## 2. `position-sizer`: quante azioni comprare ⭐

È la più importante. Ti dice quante azioni comprare in modo che, se va male e scatta lo stop,
perdi **solo l'1%** del capitale.

**Cosa chiedere:**
> "Con la skill position-sizer: ho 5000 € di capitale, voglio comprare a 50 €,
> stop loss a 47 €, rischio 1%, massimo 25% del capitale in un titolo."

**Esempio reale (l'ho eseguito):**

| Dato | Valore |
|---|---|
| Capitale | 5.000 € |
| Entrata | 50 € |
| Stop loss | 47 € → rischi 3 € per azione |
| Rischio massimo (1%) | 50 € |
| **Azioni da comprare** | **16** (50 € ÷ 3 € = 16,6 → arrotonda **per difetto**) |
| Investimento | 800 € |
| Perdita se scatta lo stop | 48 € (0,96%) |

**Le regole che ti ricorda:**
1. **1% per operazione**, mai più del 2%.
2. **Rischio totale aperto** (somma di tutte le posizioni) non oltre il 6-8% del capitale.
3. Perdere il 50% richiede un **+100%** per tornare in pari: proteggere il capitale viene prima di tutto.
4. Lo stop loss si decide **prima** di entrare, non dopo.

**Note per Trade Republic:**
- Il report scrive `$`, ma funziona uguale con gli euro.
- Di default calcola azioni intere. Se per quel titolo Trade Republic ti permette di comprare
  frazioni di azione, puoi chiedere "usa le frazioni" (opzione `--fractional`).
  Con gli ordini limite e gli stop di solito servono azioni intere.
- Aggiungi mentalmente la commissione di 1 € per ordine.

**Metodo ATR** (avanzato): se non sai dove mettere lo stop, chiedi
"usa l'ATR: il titolo si muove in media di 2 € a settimana". Lo stop finisce a 2 × ATR sotto l'entrata.

---

## 3. `options-strategy-advisor`: call e put (più avanti)

È un **calcolatore**: dato prezzo, strike, scadenza e volatilità, ti dice quanto vale
un'opzione e come cambia.

**Cosa chiedere:**
> "Con options-strategy-advisor: azione a 180, call strike 185, scadenza 30 giorni,
> volatilità 25%. Quanto vale e quanto perdo ogni giorno che passa?"

**Esempio reale (l'ho eseguito):**

| | Call 185 | Put 185 |
|---|---|---|
| Prezzo teorico | 3,32 | 7,66 |
| Valore intrinseco | 0 (è "fuori dal denaro") | 5 (è "nel denaro") |
| Delta | 0,38 → guadagna circa 0,38 se l'azione sale di 1 | -0,62 → guadagna circa 0,62 se l'azione scende di 1 |
| Theta | -0,09 al giorno | -0,07 al giorno |

**Le "greche" in parole semplici:**
- **Delta**: quanto si muove l'opzione quando l'azione si muove di 1.
- **Theta**: quanto **perdi ogni giorno** solo perché passa il tempo. È il nemico di chi compra opzioni.
- **Vega**: quanto guadagna o perde l'opzione se la volatilità sale o scende.
- **Gamma**: quanto cambia il delta.

**Attenzione, Trade Republic:** lì non ci sono opzioni classiche ma **warrant** e **knock-out**.
I warrant sono simili (il calcolatore dà un'idea). I knock-out **no**: hanno una barriera e,
se il prezzo la tocca, **perdi tutto all'istante**. Per i knock-out non usare questo calcolatore.

---

## Parole chiave (glossario veloce)

| Termine | Significato |
|---|---|
| **Call** | Scommetti che sale. Diritto di comprare a un prezzo fisso. |
| **Put** | Scommetti che scende (o ti proteggi). Diritto di vendere a un prezzo fisso. |
| **Strike** | Il prezzo fissato dell'opzione. |
| **Martello (hammer)** | Corpo piccolo in alto, ombra lunga sotto, **dopo un ribasso** → possibile rialzo. |
| **Impiccato (hanging man)** | Stessa forma, ma **dopo un rialzo** → possibile ribasso. |
| **Engulfing** | Una candela grande che "inghiotte" quella prima → possibile inversione. |
| **Supporto** | Livello dove il prezzo tende a smettere di scendere. |
| **Resistenza** | Livello dove il prezzo tende a smettere di salire. |
| **Stop loss** | Prezzo dove esci se hai sbagliato. |
| **Take profit** | Prezzo dove incassi il guadagno. |
| **ATR** | Di quanto si muove in media il prezzo in un periodo. |
| **Leva** | Moltiplica guadagni **e perdite**. |

Regola d'oro sulle candele: **mai entrare su una candela sola**. Aspetta la conferma
della candela successiva e guarda se si trova su un supporto o una resistenza.

---

## Diario di trading (copialo per ogni operazione)

```
Data:            Titolo:            Compra / Vendi:
Perché entro (segnale + conferma):
Entrata:         Stop loss:         Take profit:
Azioni (da position-sizer):         Rischio €:
Risultato:       € / %
Cosa ho imparato:
```
