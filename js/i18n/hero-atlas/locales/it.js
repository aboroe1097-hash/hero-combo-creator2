const skills = {
  'Immortal:2': {
    type: 'Attacco aggiuntivo',
    target: '1 nemico casuale',
    desc: 'Dopo un attacco normale, ha il 40% di probabilità di attaccare 1 squadra nemica casuale entro il raggio valido per 2 volte, infliggendo il 348% di danni ogni volta.',
  },
  'Immortal:5': {
    type: 'Attacco aggiuntivo',
    target: '1 nemico casuale',
    desc: 'Dopo un attacco normale, ha il 34% di probabilità di infliggere il 465% di danni a 1 squadra nemica casuale entro il raggio e di applicarle Silenzio, impedendole di usare abilità di combattimento per 1 turno.',
  },
  'Immortal:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: "Aumenta dell'80% i danni della legione in cui si trova l'eroe.",
  },
  'Wind-Walker:2': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Quando la squadra subisce attacchi base, entra nello stato Primo soccorso e recupera truppe a ogni turno (tasso di recupero: 20%) per 2 turni. Primo soccorso può accumularsi fino a 8 volte.',
  },
  'Wind-Walker:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 60% di probabilità di infliggere il 331% di danni a 2 squadre nemiche entro il raggio e il 331% di danni alla propria squadra.',
  },
  'Wind-Walker:8': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 50% di probabilità di provocare 2 squadre nemiche casuali entro il raggio per 2 turni. La propria squadra entra in stato di Contrattacco, restituisce il 150% dei danni quando subisce un attacco base e aumenta la Resistenza del 100% per 2 turni.',
  },
  'Hunk:2': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Quando la squadra subisce danni, ha il 25% di probabilità di schivarli, diventando immune a quei danni, e il 50% di probabilità a ogni turno di aumentare del 50% i danni della squadra.',
  },
  'Hunk:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 30% di probabilità di applicare a 2 squadre nemiche casuali Confusione, che indirizza abilità e attacchi base verso bersagli casuali, e Infiammabile, che aumenta del 50% i danni da bruciatura subiti, per 2 turni.',
  },
  'Hunk:8': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Per i primi 6 turni, tutte le squadre alleate ottengono 37 di Velocità di combattimento. Il 50% dei danni subiti viene conteggiato al turno 7; nella fase pre-battaglia infligge il 469% di danni a 2 nemici casuali.',
  },
  'Sakura:2': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Per i primi 2 turni, 2 nemici casuali agiscono per primi; al secondo turno, infligge il 687% di danni a 2 squadre nemiche casuali scelte tra 2 bersagli.',
  },
  'Sakura:5': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'Per i primi 3 turni, 2 squadre nemiche casuali subiscono il 50% di danni aggiuntivi.',
  },
  'Sakura:8': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Per i primi 3 turni, 2 squadre alleate casuali di arcieri infliggono il 50% di danni aggiuntivi.',
  },
  'ELK:2': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Per i primi 3 turni, la squadra di arcieri in prima fila ha il 70% di probabilità di entrare in stato di Contrattacco, restituendo alla fonte il 250% dei danni quando subisce un attacco base.',
  },
  'ELK:5': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Nei turni 1/3/5, ha il 100% di probabilità di infliggere il 220% di danni a 3 squadre nemiche casuali entro il raggio valido e di applicare Vulnerabile, aumentando del 15% i danni subiti dal bersaglio rispetto al turno precedente per 1 turno.',
  },
  'ELK:8': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Per i primi tre turni, 2 squadre alleate casuali hanno il 70% di probabilità di diventare Lucide, risultando immuni a Silenzio, Disarmo, Soppressione e Confusione, e ottengono il 55% di Potenza aggiuntiva.',
  },
  'Mary Tudor:2': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 60% di probabilità di infliggere il 325% di danni a 1 squadra nemica casuale entro il raggio valido. Se la potenza delle truppe del bersaglio è inferiore al 50%, infligge il 195% di danni aggiuntivi.',
  },
  'Mary Tudor:5': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Ogni volta che Maria I usa un’abilità di combattimento, la sua squadra infligge il +25% di danni da abilità; l’effetto può accumularsi fino a 6 volte e dura fino alla fine della battaglia.',
  },
  'Mary Tudor:8': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 50% di probabilità di infliggere il 368% di danni a 2 squadre nemiche casuali entro il raggio valido e di applicare Sanguinamento, che infligge loro il 155% di danni prima che agiscano all’inizio di ogni turno, per 2 turni.',
  },
  'Cicero:2': {
    type: 'Attacco aggiuntivo',
    target: '2 nemici casuali',
    desc: 'Dopo un attacco base, ha il 30% di probabilità di infliggere il 310% di danni a 2 squadre nemiche casuali entro il raggio e di aumentare del 20% i danni che subiscono per 2 turni.',
  },
  'Cicero:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 60% di probabilità di applicare a 2 squadre nemiche casuali lo stato Rottura armatura, riducendone la Difesa del -200% per 2 turni.',
  },
  'Cicero:8': {
    type: 'Abilità di combattimento',
    target: '1 alleato casuale',
    desc: 'Ha il 50% di probabilità di conferire alla prima fila il 100% di probabilità di schivare le prossime 3 istanze di danno subite, per 2 turni.',
  },
  'Beowulf:2': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Dopo ogni attacco normale, i danni degli attacchi normali dell’eroe aumentano del 20%, fino a 5 accumuli. Raggiunto il limite, l’eroe entra in stato di Attacco di massa e infligge alle due squadre nemiche diverse dal bersaglio dell’attacco normale danni pari al 260% + il numero di accumuli di Febbre *50%. L’effetto può infliggere danni critici e ha il 100% di probabilità di ignorare Schivata quando infligge danni.',
  },
  'Beowulf:5': {
    type: 'Abilità pre-battaglia',
    target: '1 nemico casuale',
    desc: 'Ogni 2 attacchi normali effettuati, recupera potenza delle truppe per la squadra dell’eroe e 1 squadra alleata casuale (tasso di recupero: 75%), quindi infligge il 350% di danni fisici a 1 squadra nemica casuale, potendo attivare Colpo fatale, e le applica Disarmo per 1 turno.',
  },
  'Beowulf:8': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Ottiene il 20% di probabilità di Colpo fatale. Dopo ogni effetto di cura ricevuto, ottiene Febbre e un ulteriore 10% di probabilità di Colpo fatale; Febbre può accumularsi fino a 8 volte e dura fino alla fine della battaglia. Inoltre, ha il 90% di probabilità di rimuovere tutti gli stati negativi dall’eroe e applicargli Lucidità, rendendolo immune agli effetti di controllo fino alla mossa successiva.',
  },
  'Theodora:2': {
    type: 'Abilità di combattimento',
    target: '1 alleato casuale',
    desc: 'Ha il 60% di probabilità di infliggere il 20% di danni da abilità a 1 squadra alleata casuale, esclusa quella dell’eroe, facendo sì che il bersaglio infligga il 50% di danni aggiuntivi per 2 turni.',
  },
  'Theodora:5': {
    type: 'Abilità pre-battaglia',
    target: '3 nemici casuali',
    desc: 'Quando l’eroe subisce danni, ha il 40% di probabilità di infliggere il 160% di danni da abilità a tutte le squadre nemiche e il 40% di probabilità di applicare per 2 turni 1 stato casuale tra Soppressione, Silenzio, Disarmo e Confusione.',
  },
  'Theodora:8': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Quando la squadra della prima fila infligge danni, recupera potenza delle truppe pari al 60% dei danni inflitti per 6 turni; l’effetto può attivarsi fino a 2 volte per turno. Quando la squadra della prima fila viene sconfitta, l’eroe combatte per 1 turno aggiuntivo; l’effetto non si applica contro i Guardiani del territorio.',
  },
  'Caesar:2': {
    type: 'Abilità di combattimento',
    target: '3 alleati casuali',
    desc: 'Dal turno 3, Caesar ha il 40% di probabilità a ogni turno di usare un’abilità che aumenta del 200% Potenza e Resistenza di tutte le tue squadre di cavalleria e del 60% i loro danni. Inoltre, la probabilità di Caesar di lanciare attacchi aggiuntivi aumenta del 20% fino alla fine della battaglia; l’abilità può essere usata una sola volta. A ogni turno, la probabilità di usarla aumenta del 20%.',
  },
  'Caesar:5': {
    type: 'Attacco aggiuntivo',
    target: '2 nemici casuali',
    desc: 'Dopo un attacco normale, ha il 60% di probabilità di infliggere danni fisici (tasso di danno: 480%) a 2 squadre nemiche casuali. Il 50% dei danni viene usato per recuperare potenza delle truppe di 2 squadre alleate casuali. L’abilità entra in ricarica per 1 turno dopo l’uso. La prima volta che schivi danni in ogni turno, ha il 100% di probabilità di attivarsi senza entrare in ricarica.',
  },
  'Caesar:8': {
    type: 'Attacco aggiuntivo',
    target: '3 nemici casuali',
    desc: 'Dopo un attacco normale, ha il 50% di probabilità di infliggere danni fisici a 2-3 squadre (tasso di danno: 310%). Ogni utilizzo aumenta di 1 volta il tasso di danno di Sovrano assoluto; l’effetto è cumulabile e dura fino alla fine della battaglia. L’abilità può attivarsi solo una volta per turno.',
  },
  'Octavius:2': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'A ogni turno, Octavius ha l’80% di probabilità di ottenere Provocazione. Quando un’abilità attiva o un attacco aggiuntivo nemico deve scegliere una squadra casuale, Octavius viene scelto per primo. La probabilità di attivare questa abilità diminuisce del 5% a ogni turno.',
  },
  'Octavius:5': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Octavius subisce il -25% di danni. All’inizio della battaglia applica Schivata alle squadre alleate in fila centrale e posteriore, rendendole immuni alle prossime 3 istanze di danno per 2 turni. Ogni volta che subisce danni, ha il 100% di probabilità di aumentare del 30% la Potenza di 1 squadra alleata casuale di cavalleria, fino a un massimo del 300%; l’effetto può accumularsi fino a 10 volte per squadra.',
  },
  'Octavius:8': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'La prima volta che i PS scendono sotto l’85%, tutte le tue squadre subiscono il -50% di danni da abilità per 3 turni. La prima volta che i PS scendono sotto il 50%, tutte le squadre nemiche subiscono immediatamente danni fisici (tasso di danno: 350%). Lo stesso accade la prima volta che i PS scendono sotto il 25% (tasso di danno: 350%). Ogni attivazione aumenta del 150% la Resistenza dell’eroe.',
  },
  'Boudica:2': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Boudica carica in avanti. Ha il 70% di probabilità di infliggere il 200% di danni a 1 squadra nemica della fila centrale o posteriore entro il raggio valido per 3 volte consecutive; il 40% dei danni viene usato per recuperare la potenza di 2 squadre alleate casuali.',
  },
  'Boudica:5': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Boudica possiede permanentemente Protezione naturale. Quando infligge danni da abilità, ha il 30% di probabilità di causare un Colpo distruttivo al bersaglio. Se agisce prima di tutte le squadre nemiche, aumenta del 20% la probabilità di usare abilità e Colpo distruttivo, ma non può effettuare attacchi normali.',
  },
  'Boudica:8': {
    type: 'Abilità pre-battaglia',
    target: '1 nemico casuale',
    desc: 'Prima della battaglia, contrassegna 2 squadre nemiche casuali entro il raggio valido con 5 Marchi della lancia. Ogni accumulo aumenta del 10% i danni da abilità subiti dal bersaglio e fa ignorare l’effetto di ritardo applicato a tutti i danni che subisce; i marchi diminuiscono di 1 accumulo a ogni turno. In battaglia, a ogni turno ha il 60% di probabilità di infliggere il 500% di danni ingenti alla squadra nemica con la potenza delle truppe più bassa.',
  },
  "Jeanne d'Arc:2": {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 50% di probabilità di infliggere il 477% di danni a 2 squadre nemiche casuali entro il raggio valido e di aumentare del 30% i danni da abilità che subiscono.',
  },
  "Jeanne d'Arc:5": {
    type: 'Abilità di combattimento',
    target: '2 alleati casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 65% di probabilità di applicare Resurrezione a 2 squadre alleate casuali; quando subiscono danni, hanno il 50% di probabilità di recuperare potenza delle truppe (tasso di recupero: 101%) per 2 turni.',
  },
  "Jeanne d'Arc:8": {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'In battaglia, le tue squadre di cavalleria hanno il 60% di probabilità di saltare 1 turno di preparazione quando usano abilità di preparazione; l’effetto può attivarsi fino a 1 volta per squadra in ogni turno. Inoltre, ha l’80% di probabilità di aumentare dell’86% i danni da abilità inflitti dalla squadra dell’eroe per 1 turno. Ogni effetto viene determinato separatamente.',
  },
  'Alfred:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 35% di probabilità di infliggere il 335% di danni a 2 squadre nemiche entro il raggio valido e di ridurre del -40% il loro recupero di potenza delle truppe. Se il bersaglio è già soggetto a uno stato che impedisce o limita tale recupero, subisce il 30% di danni da abilità aggiuntivi per 2 turni.',
  },
  'Alfred:5': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Ha il 30% di probabilità di infliggere il 492% di danni ingenti a tutte le squadre nemiche, facendo però subire il 95% di danni a tutte le tue squadre.',
  },
  'Alfred:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Alfred interviene nell’emergenza. La prima volta che la potenza delle truppe della sua squadra scende sotto il 90%/70%/50%/30%, Alfred ottiene il 50% di probabilità aggiuntiva di usare abilità di combattimento; la sua squadra infligge il 40% di danni da abilità aggiuntivi e subisce il -35% di danni per 1 turno.',
  },
  'Ramses II:2': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Per i primi 2 turni, tutte le squadre, alleate e nemiche, subiscono il -45% di danni fisici. Nei turni 3-6, tutte le tue squadre hanno l’80% di probabilità di effettuare 2 attacchi normali per turno.',
  },
  'Ramses II:5': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'In battaglia, tutte le tue squadre di arcieri ottengono il 40% di probabilità di Colpo fatale. L’abilità può aumentarla fino al 60%; la parte che supera il limite di Colpo fatale viene moltiplicata per 3 e convertita nel tasso di danno di Colpo fatale.',
  },
  'Ramses II:8': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Ogni volta che una tua squadra attiva Colpo fatale, recupera potenza delle truppe (tasso di recupero: 238%) e aumenta dell’80% il proprio tasso di danno di Colpo fatale, fino a un massimo del 560%. L’effetto può accumularsi fino a 7 volte e dura fino alla fine della battaglia.',
  },
  'Cleopatra VII:2': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Per i primi 4 turni, la squadra alleata con la potenza delle truppe più bassa ha il 40% di probabilità di schivare i danni in arrivo quando viene attaccata. Dal turno 4, la tua squadra con la potenza delle truppe più bassa recupera potenza delle truppe (tasso di recupero: 150%).',
  },
  'Cleopatra VII:5': {
    type: 'Abilità pre-battaglia',
    target: '3 nemici casuali',
    desc: 'Cleopatra ipnotizza il nemico: ogni 2 attacchi normali effettuati da una squadra nemica, quella squadra ha il 50% di probabilità di entrare in Confusione e scegliere un bersaglio casuale per l’abilità o l’attacco normale, per 1 turno.',
  },
  'Cleopatra VII:8': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Quando l’eroe agisce, ha il 100% di probabilità di applicare Vulnerabile alla squadra nemica confusa: ogni volta che subisce danni, la successiva istanza aumenta del 15%, per 2 turni. Inoltre, ha il 50% di probabilità di subire immediatamente il 225% di danni.',
  },
  'King Arthur:2': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'All’inizio della battaglia, l’eroe subisce il -80% di danni. Ogni volta che subisce danni, la riduzione diminuisce dell’8%, mentre la Resistenza aumenta del 20% e i danni inflitti del 10%. L’effetto può accumularsi fino a 16 volte e dura fino alla fine della battaglia.',
  },
  'King Arthur:5': {
    type: 'Attacco aggiuntivo',
    target: '1 nemico casuale',
    desc: 'Arthur brandisce la sua spada sacra. Dopo un attacco normale, ha il 50% di probabilità di infliggere il 700% di danni fisici a 1 squadra nemica casuale entro il raggio valido. Il 40% di questi danni recupera potenza delle truppe di 2 squadre alleate casuali. Dopo aver usato Spada nella roccia, ha il 50% di probabilità di applicarla un’altra volta alla fila centrale o posteriore nemica.',
  },
  'King Arthur:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Arthur riceve permanentemente il 15% di cure aggiuntive. Ogni 6 istanze di danno inflitte dalle tue squadre, la probabilità di usare Spada nella roccia aumenta del 4%, fino a 5 accumuli, e dura fino alla fine della battaglia. Al limite, ottiene il 100% di probabilità di ignorare Schivata quando infligge danni per 2 turni.',
  },
  'Leonidas:2': {
    type: 'Attacco aggiuntivo',
    target: '2 nemici casuali',
    desc: 'Dopo un attacco normale, ha il 40% di probabilità di ridurre la Potenza del -50% e la Resistenza del -50% di 2 squadre nemiche casuali entro il raggio valido e di applicare loro Silenzio per 1 turno.',
  },
  'Leonidas:5': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Ha il 50% di probabilità di infliggere il 220% di danni a 2-3 squadre nemiche casuali entro il raggio valido.',
  },
  'Leonidas:8': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Nei primi 2 turni, tutte le tue squadre di arcieri recuperano PS a ogni turno (tasso di recupero: 55%). Dal turno 3, subiscono il -30% di danni e ottengono il 5% di assorbimento vita fino alla fine della battaglia.',
  },
  'Isabella I:2': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'A ogni turno ha il 70% di probabilità di soffiare fuoco di drago su 1 squadra nemica casuale per 6 volte, infliggendo l’83% di danni da bruciatura. Se tutte le squadre nemiche vengono colpite nel turno, 1 squadra alleata casuale ottiene Chiarezza, che rende immuni a Soppressione, Silenzio, Disarmo e Confusione, per 1 turno.',
  },
  'Isabella I:5': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'Dal turno 3, al prezzo di restare permanentemente in fiamme, la squadra dell’eroe ha il 70% di probabilità a ogni turno di infliggere il 236% di danni da bruciatura a 2 squadre nemiche casuali, riducendone poi del -20% i danni da abilità di combattimento.',
  },
  'Isabella I:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Conferisce uno scudo alle tue squadre rimaste Lucide grazie all’abilità 2, riducendo del -50% le successive 2 istanze di danno che subiscono. La prima volta che l’eroe prende fuoco, recupera una grande quantità di potenza delle truppe per la squadra in prima fila (tasso di recupero: 304) e applica Soppressione a 1-2 squadre nemiche casuali entro il raggio valido per il successivo 1 turno.',
  },
  'Desert Storm:2': {
    type: 'Abilità pre-battaglia',
    target: '3 nemici casuali',
    desc: 'Nei turni 1, 3 e 5, applica a tutte le squadre nemiche Maledizione, Bruciatura e Avvelenamento, infliggendo rispettivamente il 24%, il 29% e il 34% di danni nei turni corrispondenti; gli stati durano fino alla fine della battaglia.',
  },
  'Desert Storm:5': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'All’inizio del turno 5, 2 squadre alleate casuali recuperano unità a ogni turno (tasso di recupero: 60%).',
  },
  'Desert Storm:8': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 100% di probabilità di infliggere il 243% di danni a una squadra nemica entro il raggio e di interrompere le abilità canalizzate.',
  },
  'Soaring Hawk:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 40% di probabilità di infliggere il 179% di danni a 2 squadre nemiche casuali entro il raggio e di ridurne la Potenza del -38% per 2 turni.',
  },
  'Soaring Hawk:5': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Quando subisce un attacco base, la squadra dell’eroe ha il 100% di probabilità di contrattaccare, infliggendo il 120% di danni alla fonte dell’attacco.',
  },
  'Soaring Hawk:8': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Per i primi 2 turni, tutte le squadre alleate subiscono il -30% di danni. Dopo il turno 3, la squadra dell’eroe recupera il 30% delle unità quando infligge danni.',
  },
  'The Brave:2': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'Per i primi 3 turni della battaglia, ha l’80% di probabilità a ogni turno di applicare Disarmo a 2 squadre nemiche entro il raggio.',
  },
  'The Brave:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 30% di probabilità di applicare Silenzio a 2 squadre nemiche casuali entro il raggio per 2 turni.',
  },
  'The Brave:8': {
    type: 'Abilità pre-battaglia',
    target: '3 nemici casuali',
    desc: 'In battaglia, tutte le squadre nemiche perdono il -60% di Potenza e Resistenza e -100 di Velocità di combattimento. Dal turno 5, i danni che subiscono aumentano del 5% e quelli che infliggono diminuiscono del -5%; tutte le tue squadre di cavalleria infliggono il 40% di danni aggiuntivi.',
  },
  'Jade Eagle:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 40% di probabilità di lanciare 2 attacchi, ciascuno dei quali infligge il 142% di danni a 2 squadre nemiche casuali entro il raggio valido, con il 25% di probabilità di applicare Silenzio ai bersagli per 1 turno.',
  },
  'Jade Eagle:4': {
    type: 'Abilità di comando',
    target: 'Squadra dell’eroe',
    desc: 'Gli arcieri nella squadra dell’eroe ottengono il 60% di Potenza aggiuntiva, infliggono il 20% di danni aggiuntivi e subiscono il 20% di danni aggiuntivi.',
  },
  'Jade Eagle:5': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 50% di probabilità di infliggere il 310% di danni a tutte le squadre nemiche. Per 1 turno, la fanteria nemica non può recuperare unità, la cavalleria nemica infligge il -50% di danni da abilità di combattimento e gli arcieri nemici subiscono Disarmo.',
  },
  'Jade Eagle:8': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Nei turni 2 e 4, ha il 100% di probabilità di infliggere l’863% di danni ingenti a 3 squadre nemiche casuali entro il raggio. Se il bersaglio è Disarmato o Soppresso, subisce il 40% di danni aggiuntivi per 2 turni.',
  },
  'Immortal Guardian:2': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'La squadra dell’eroe subisce il -30% di danni.',
  },
  'Immortal Guardian:5': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'In battaglia, quando 2 squadre nemiche casuali entro il raggio usano abilità di combattimento o attacchi base, i loro danni diminuiscono del -5%. L’effetto può accumularsi fino a un massimo di 8 volte.',
  },
  'Immortal Guardian:8': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Per i primi 3 turni, tutte le unità alleate subiscono il -20% di danni e hanno il 50% di probabilità di recuperare unità quando subiscono danni (tasso di recupero: 45%).',
  },
  'Divine Arrow:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 25% di probabilità di infliggere il 211% di danni a 2 nemici casuali e di applicare loro Disarmo per 1 turno.',
  },
  'Divine Arrow:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 30% di probabilità di applicare Catena, collegando 2 nemici casuali: quando una squadra subisce danni, anche l’altra subisce il 25% di danni, per 2 turni.',
  },
  'Divine Arrow:8': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'In battaglia, tutti gli arcieri alleati ottengono Dispersione: gli attacchi base infliggono anche il 40% di danni a 2 squadre nemiche nella fila posteriore.',
  },
  'Che Liu:2': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Aumenta del 50% i danni della squadra. Quando le truppe attuali si dimezzano, ottiene un ulteriore 100% di Potenza e Resistenza.',
  },
  'Che Liu:5': {
    type: 'Attacco aggiuntivo',
    target: '1 nemico casuale',
    desc: 'Dopo un attacco base, ha il 100% di probabilità di infliggere il 247% di danni a una squadra nemica entro il raggio.',
  },
  'Che Liu:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Ha il 100% di probabilità di effettuare due attacchi normali quando la potenza attuale delle truppe scende sotto il 50% del valore iniziale. Quando la squadra dell’eroe viene sconfitta o perde il morale, l’eroe continua a combattere per un turno aggiuntivo; negli attacchi ai territori, non può continuare se la Lealtà della legione è inferiore allo Zelo dei ribelli.',
  },
  'War Lord:2': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Durante la battaglia, tutte le squadre alleate di cavalleria infliggono il -20% di danni con gli attacchi base e il 45% di danni aggiuntivi con le abilità di combattimento.',
  },
  'War Lord:5': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Nei primi 2 turni, ogni volta che la squadra dell’eroe subisce danni ha il 70% di probabilità di schivarli ed evitarli.',
  },
  'War Lord:8': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Nei turni 1, 3, 5 e 7, ha il 100% di probabilità di portare al 100% la probabilità finale di usare un’abilità di combattimento per 1 squadra alleata casuale. Se l’abilità richiede preparazione, ha il 60% di probabilità di saltare 1 turno di preparazione.',
  },
  'Jane:2': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 35% di probabilità di infliggere il 334,5% di danni a tutte le squadre nemiche entro il raggio.',
  },
  'Jane:5': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Ha il 30% di probabilità di infliggere il 255% di danni a tutte le squadre nemiche entro il raggio e di impedire loro di recuperare unità per 2 turni.',
  },
  'Jane:8': {
    type: 'Abilità di combattimento',
    target: '1 alleato casuale',
    desc: 'Durante la battaglia, la squadra dell’eroe non può effettuare attacchi base; in cambio, i danni delle abilità di combattimento aumentano del 35% e infligge il 301% di danni da abilità a una squadra nemica casuale entro il raggio.',
  },
  'Sky Breaker:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 40% di probabilità di infliggere il 325% di danni a 2 nemici casuali e di ridurre del -20% i danni delle loro abilità per 2 turni.',
  },
  'Sky Breaker:5': {
    type: 'Abilità pre-battaglia',
    target: '3 nemici casuali',
    desc: 'Per i primi 2 turni, applica Disarmo a 2 squadre nemiche casuali, impedendo loro di effettuare attacchi base. Al turno 2, infligge il 267,5% di danni a tutte le squadre nemiche.',
  },
  'Sky Breaker:8': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 50% di probabilità di infliggere il 260% di danni a 2 nemici casuali e di curare la propria squadra e una squadra alleata casuale (tasso di recupero: 142%).',
  },
  'Rokuboshuten:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 40% di probabilità di infliggere il 255% di danni a 2 nemici casuali e di ridurne Potenza e Resistenza del -55% per 2 turni.',
  },
  'Rokuboshuten:5': {
    type: 'Abilità di stato',
    target: '2 alleati casuali',
    desc: 'Durante la battaglia, quando usa un’abilità che richiede preparazione, la squadra dell’eroe ha il 100% di probabilità di ottenere Chiarezza, diventando immune a Silenzio, Disarmo, Soppressione e Confusione per 2 turni. Dopo aver usato un’abilità di combattimento, ha il 100% di probabilità di aumentare del 100% Potenza e Resistenza di due squadre alleate casuali per 2 turni.',
  },
  'Rokuboshuten:8': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 40% di probabilità di infliggere il 196,5% di danni a tutti i nemici e di applicare Silenzio, impedendo loro di usare abilità di combattimento per 1 turno.',
  },
  'Bleeding Steed:2': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Per i primi 3 turni, 2 squadre alleate ottengono il 60% di danni aggiuntivi.',
  },
  'Bleeding Steed:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 50% di probabilità di applicare Confusione a 2 nemici casuali, rendendo casuali i bersagli delle loro abilità e dei loro attacchi base per 2 turni.',
  },
  'Bleeding Steed:8': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Durante la battaglia, quando una squadra alleata subisce danni, ha il 50% di probabilità di recuperare unità (tasso di recupero: 33%).',
  },
  'Rozen Blade:2': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Ha il 30% di probabilità di rimuovere gli stati negativi dalla cavalleria e dagli arcieri alleati, esclusi quelli delle abilità pre-battaglia, e conferisce ai loro attacchi base il 25% di probabilità di applicare Soppressione per 1 turno; l’effetto dura 1 turno.',
  },
  'Rozen Blade:5': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Durante i primi 3 turni, tutte le squadre alleate ottengono 100 di Velocità di combattimento e il 70% di probabilità di effettuare 2 attacchi base in ogni turno; gli effetti dello stesso tipo non sono cumulabili.',
  },
  'Rozen Blade:8': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'Durante la battaglia, ogni volta che 2 squadre nemiche casuali subiscono danni, ne subiscono il 12% in più, fino a un massimo di 5 accumuli.',
  },
  'Jade:2': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Richiede 1 turno di preparazione. Ha il 40% di probabilità di attaccare 6 volte; ogni attacco sceglie casualmente una squadra nemica entro il raggio e infligge il 162% di danni.',
  },
  'Jade:5': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'La squadra dell’eroe aumenta i propri danni del 10%. L’effetto si accumula una volta a ogni turno.',
  },
  'Jade:8': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 40% di probabilità di infliggere il 160% di danni a 2 squadre casuali entro il raggio effettivo e di applicare Maledizione a una squadra nemica, che subisce l’80% di danni ogni volta che usa un’abilità di combattimento, per 2 turni.',
  },
  'Witch Hunter:2': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Ha il 30% di probabilità di infliggere il 237% di danni a tutte le squadre nemiche entro il raggio valido e di applicare Infiammabile, aumentando del 35% i danni da bruciatura che subiscono per 2 turni.',
  },
  'Witch Hunter:5': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'Per i primi tre turni, 2 squadre nemiche casuali infliggono il -75% di danni con le abilità di combattimento e hanno il 90% di probabilità di subire Silenzio, che impedisce loro di usare abilità di combattimento per 1 turno.',
  },
  'Witch Hunter:8': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Ha il 40% di probabilità di attaccare tutte le squadre entro il raggio, infliggendo il 135% di danni, e di applicare Bruciatura, che infligge il 142% di danni per 2 turni.',
  },
  'Peace Bringer:2': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'A ogni turno, la squadra dell’eroe ha il 50% di probabilità di ricevere un potenziamento che le fa subire il -50% di danni in quel turno. Quando subisce un attacco base, ha inoltre il 35% di probabilità di contrattaccare e infliggere il 190% di danni alla fonte.',
  },
  'Peace Bringer:5': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Per i primi tre turni, tutte le squadre infliggono il -45% di danni e tutte le nostre squadre subiscono il -20% di danni. Dal quarto turno, i danni delle nostre abilità di combattimento aumentano del 20% fino alla fine della battaglia.',
  },
  'Peace Bringer:8': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Ha il 30% di probabilità di infliggere il 203% di danni a tutte le squadre nemiche entro il raggio e di applicare Vulnerabile: ogni volta che un nemico viene attaccato, subisce il 20% di danni aggiuntivi per 1 turno.',
  },
  'Inquisitor:2': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 35% di probabilità di attaccare tutte le squadre entro il raggio, infliggendo il 246% di danni, e di applicare Disarmo alle squadre nemiche, impedendo loro di effettuare attacchi normali per 2 turni.',
  },
  'Inquisitor:5': {
    type: 'Abilità pre-battaglia',
    target: '3 nemici casuali',
    desc: 'Aumenta del 50% i danni da arcieri subiti da tutte le squadre nemiche.',
  },
  'Inquisitor:8': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 35% di probabilità di infliggere il 342% di danni a 2 squadre casuali entro il raggio. Se il bersaglio è Infiammabile, ha il 50% di probabilità di applicargli Soppressione, impedendogli di agire.',
  },
  'BeastQueen:2': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Nel primo turno, i danni degli attacchi normali e delle abilità di inseguimento di tutte le nostre squadre aumentano dell’80%; l’effetto diminuisce di 1/4 a ogni turno.',
  },
  'BeastQueen:5': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Per i primi 3 turni, 2 squadre alleate casuali hanno il 70% di probabilità di ottenere Dispersione: i loro attacchi normali infliggono il 160% di danni a 2 squadre nemiche dietro il bersaglio.',
  },
  'BeastQueen:8': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Per i primi 3 turni della battaglia, la squadra di cavalleria in prima fila ha il 70% di probabilità di ottenere Contrattacco, restituendo alla fonte il 250% dei danni quando subisce un attacco base.',
  },
  'Cao Cao:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha l’80% di probabilità di infliggere il 157% di danni a 2 squadre nemiche casuali entro il raggio valido.',
  },
  'Cao Cao:5': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Ogni volta che Cao Cao usa un’abilità di combattimento, i danni della sua squadra aumentano del 18%. L’effetto può accumularsi fino a 10 volte e dura fino alla fine della battaglia.',
  },
  'Cao Cao:7': {
    type: 'Abilità attiva',
    target: 'Legione dell’eroe',
    desc: 'Dopo l’uso, la formazione dell’eroe ottiene il 100% di Velocità di marcia aggiuntiva e il 70% di Potenza della fanteria aggiuntiva per 20 min; ricarica: 15 h. Quando non è attiva, durante il combattimento si applica il 50% dell’effetto.',
  },
  'Cao Cao:8': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 50% di probabilità di infliggere il 396% di danni a 1 nemico casuale e di applicare Cedimento, facendo subire al bersaglio il 302% di danni aggiuntivi ogni volta che viene danneggiato. L’effetto può attivarsi fino a 3 volte per ogni uso dell’abilità e dura 1 turno.',
  },
  'Charles the Great:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 40% di probabilità di infliggere il 255% di danni a 2 squadre nemiche casuali entro il raggio valido e di ridurne la Resistenza del -170% per 2 turni.',
  },
  'Charles the Great:5': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Per i primi 4 turni, aumenta del 20% i danni inflitti da 2 squadre alleate casuali. L’effetto può accumularsi fino a 4 volte e dura fino alla fine della battaglia.',
  },
  'Charles the Great:8': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 50% di probabilità di infliggere il 510% di danni a 1 squadra nemica casuale entro il raggio valido e conferisce alla tua squadra nella fila posteriore il 100% di probabilità di ottenere Schivata per le prossime 2 istanze di danno subite.',
  },
  'Black Prince:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 35% di probabilità di applicare 1 stato tra Soppressione, Silenzio e Disarmo a 2 squadre nemiche casuali entro il raggio valido, per 2 turni.',
  },
  'Black Prince:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Al livello massimo, ha il 60% di probabilità di sottrarre il 200% di Resistenza a 2 squadre nemiche casuali entro il raggio valido per 2 turni; l’effetto può accumularsi fino a 2 volte.',
  },
  'Black Prince:8': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 50% di probabilità di infliggere il 490% di danni a 2 squadre nemiche casuali entro il raggio valido e di ridurne la Potenza del -150% per 2 turni.',
  },
  'Lionheart:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 40% di probabilità di infliggere il 250% di danni a 2 squadre nemiche casuali entro il raggio valido e di aumentare del 40% i danni da abilità di Lionheart per 1 turno.',
  },
  'Lionheart:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 50% di probabilità di infliggere il 288% di danni a 2 squadre nemiche casuali entro il raggio valido e un ulteriore 288% di danni alla squadra nemica con la Resistenza più bassa.',
  },
  'Lionheart:7': {
    type: 'Abilità attiva',
    target: 'Legione dell’eroe',
    desc: 'Dopo l’uso, la formazione dell’eroe ottiene il 100% di Velocità di marcia aggiuntiva e il 70% di Potenza della cavalleria aggiuntiva per 20 min; ricarica: 15 h. Quando non è attiva, durante il combattimento si applica il 50% dell’effetto.',
  },
  'Lionheart:8': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 60% di probabilità di infliggere il 343% di danni ingenti a tutte le squadre nemiche entro il raggio valido; durante la preparazione, Lionheart ottiene Primo ad attaccare per 1 turno.',
  },
  'Al Fatih:2': {
    type: 'Abilità di combattimento',
    target: '1 alleato casuale',
    desc: 'Ha l’80% di probabilità di aumentare del 60% i danni inflitti dagli attacchi normali di Al Fatih per 1 turno.',
  },
  'Al Fatih:5': {
    type: 'Abilità di combattimento',
    target: '1 alleato casuale',
    desc: 'Con gli attacchi normali, Al Fatih prende di mira 1 squadra nemica casuale e ha il 50% di probabilità di usare Colpo fatale.',
  },
  'Al Fatih:7': {
    type: 'Abilità attiva',
    target: 'Legione dell’eroe',
    desc: 'Dopo l’uso, la formazione dell’eroe ottiene il 100% di Velocità di marcia aggiuntiva e il 70% di Potenza degli arcieri aggiuntiva per 20 min; ricarica: 15 h. Quando non è attiva, durante il combattimento si applica il 50% dell’effetto.',
  },
  'Al Fatih:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Il tasso di danno di Colpo fatale usato da Al Fatih aumenta del 60%; l’effetto si accumula 1 volta per turno, fino a 4 volte, e dura fino alla fine della battaglia.',
  },
  'Edward the Confessor:2': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Tutte le tue squadre hanno il 100% di probabilità di ottenere Schivata la prima volta che vengono attaccate. Per i primi 4 turni, hanno il 70% di probabilità a ogni turno di ridurre del -40% i danni da abilità di tutte le squadre nemiche.',
  },
  'Edward the Confessor:5': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 35% di probabilità di infliggere il 480% di danni a 1 squadra nemica casuale entro il raggio valido e di applicare Soppressione al bersaglio per 1 turno.',
  },
  'Edward the Confessor:8': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Dal turno 3, i danni fisici di 2 squadre alleate casuali aumentano del 30% a ogni turno. L’effetto può accumularsi fino a 4 volte e dura fino alla fine della battaglia.',
  },
  'Constantine the Great:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 45% di probabilità di infliggere il 330% di danni a 2 squadre nemiche casuali entro il raggio valido.',
  },
  'Constantine the Great:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 40% di probabilità di infliggere il 203% di danni a 2 squadre nemiche entro il raggio valido e di aumentare del 50% i danni da abilità della tua squadra in fila posteriore per 1 turno.',
  },
  'Constantine the Great:8': {
    type: 'Abilità pre-battaglia',
    target: '1 nemico casuale',
    desc: 'Quando tutte le tue squadre preparano abilità di preparazione, Constantine ha l’80% di probabilità di infliggere il 304% di danni a 1 squadra nemica casuale entro il raggio valido.',
  },
  'Genghis Khan:2': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 50% di probabilità di applicare Sanguinamento a tutte le squadre nemiche, infliggendo loro il 213% di danni a ogni turno per 2 turni.',
  },
  'Genghis Khan:5': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Ha il 50% di probabilità di infliggere il 202% di danni a 2 squadre nemiche casuali entro il raggio valido e il 50% di probabilità di infliggere un ulteriore 202% di danni a tutte le squadre nemiche.',
  },
  'Genghis Khan:8': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Ogni 4 abilità di combattimento usate da una qualsiasi delle tue squadre durante lo scontro, Genghis Khan recupera Potenza per 2 squadre alleate casuali (tasso di recupero: 152%).',
  },
  'Jiguang Qi:2': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Ha il 40% di probabilità di infliggere il 192% di danni a tutte le squadre nemiche entro il raggio valido.',
  },
  'Jiguang Qi:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 40% di probabilità di infliggere il 220% di danni a 2 squadre nemiche entro il raggio valido e di ridurre del -40% i danni fisici che infliggono per 1 turno.',
  },
  'Jiguang Qi:8': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Ogni 2 abilità di combattimento usate da una qualsiasi delle tue squadre, la Resistenza di Jiguang Qi aumenta dell’80%. L’effetto può accumularsi fino a 10 volte e dura fino alla fine della battaglia.',
  },
  'Valkyrie:2': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 100% di probabilità di impedire alla propria squadra di effettuare attacchi normali e ne aumenta i danni del 30% per 2 turni; inoltre infligge il 218% di danni a 1 squadra nemica casuale entro il raggio.',
  },
  'Valkyrie:5': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 45% di probabilità di infliggere il 310% di danni a 3 squadre nemiche entro il raggio.',
  },
  'Valkyrie:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Il vantaggio della propria squadra contro fanteria e cavalleria aumenta del 30%; a ogni turno ha il 70% di probabilità di ignorare il 50% della Resistenza base della squadra nemica.',
  },
  'Lawman:2': {
    type: 'Abilità di stato',
    target: '1 nemico casuale',
    desc: 'Quando la propria squadra subisce danni, ha il 50% di probabilità di infliggere il 63% di danni a 2 squadre casuali entro un raggio di 2.',
  },
  'Lawman:5': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'La propria squadra e 1 squadra alleata casuale recuperano truppe a ogni turno (tasso di recupero: 96,5%).',
  },
  'Lawman:8': {
    type: 'Abilità di combattimento',
    target: '2 alleati casuali',
    desc: 'Ha il 40% di probabilità di ridurre del -30% i danni subiti dalla propria squadra e di farle assorbire il 30% dei danni nemici destinati alle altre 2 squadre alleate, per 2 turni.',
  },
  'Spectral Reaper:2': {
    type: 'Attacco aggiuntivo',
    target: '1 nemico casuale',
    desc: 'Dopo un attacco base, ha il 35% di probabilità di attaccare di nuovo lo stesso bersaglio, infliggendo il 742% di danni e impedendogli di recuperare truppe per 1 turno.',
  },
  'Spectral Reaper:5': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 40% di probabilità di infliggere il 455% di danni a 1 squadra nemica casuale entro il raggio valido e il 90% di probabilità di aumentare di 1 per turno il numero di attacchi normali della squadra dell’eroe, per 1 turno.',
  },
  'Spectral Reaper:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'La squadra dell’eroe infligge il 100% di danni aggiuntivi con gli attacchi normali. Dopo ogni abilità di combattimento usata, ottiene il +40% di probabilità di lanciare un attacco aggiuntivo per 1 turno. Quando un’abilità nemica calcola il proprio raggio effettivo, la squadra dell’eroe viene considerata a distanza +1 dal nemico.',
  },
  'Defender:2': {
    type: 'Attacco aggiuntivo',
    target: '1 alleato casuale',
    desc: 'Dopo un attacco base, ha l’80% di probabilità di ridurre del -20% i danni subiti dalla squadra dell’eroe per 2 turni. Lo stato è cumulabile.',
  },
  'Defender:5': {
    type: 'Attacco aggiuntivo',
    target: '1 nemico casuale',
    desc: 'Dopo un attacco base, ha il 50% di probabilità di infliggere il 310% di danni a 1 squadra nemica casuale entro il raggio e di recuperare truppe per la propria squadra (tasso di recupero: 67%).',
  },
  'Defender:8': {
    type: 'Abilità di combattimento',
    target: '2 alleati casuali',
    desc: 'Ha il 35% di probabilità di far attaccare due volte 2 squadre alleate casuali, aumentando i loro danni del 30% per 2 turni.',
  },
  'Army Breaker:2': {
    type: 'Abilità di combattimento',
    target: '2 alleati casuali',
    desc: 'Ha il 55% di probabilità di recuperare truppe per 2 squadre alleate casuali entro il raggio (tasso di recupero: 84%) e di rimuovere gli stati negativi, esclusi quelli pre-battaglia.',
  },
  'Army Breaker:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 40% di probabilità di applicare Silenzio a 2 squadre nemiche casuali entro il raggio e di ridurre del -20% i danni che infliggono per 2 turni.',
  },
  'Army Breaker:8': {
    type: 'Abilità di combattimento',
    target: '3 alleati casuali',
    desc: 'Ha il 30% di probabilità di conferire a tutte le squadre alleate il 60% di probabilità di ottenere Schivata contro le prossime 3 istanze di danno e di aumentare del 47% Potenza e Resistenza per 2 turni.',
  },
  'The Avalanche:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 60% di probabilità di infliggere il 226% di danni a più bersagli nemici.',
  },
  'The Avalanche:5': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Richiede 1 turno di preparazione. Ha il 40% di probabilità di infliggere il 595% di danni a 1 squadra nemica casuale entro il raggio e il 60% di probabilità di infliggere il 310% di danni alla fila posteriore nemica, applicandole Soppressione e impedendole di agire per 1 turno.',
  },
  'The Avalanche:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'In combattimento, la propria squadra ottiene Chiarezza, diventando immune a Silenzio, Disarmo, Soppressione e Confusione; inoltre ottiene il 60% di Potenza e infligge il 30% di danni aggiuntivi.',
  },
  'Dach Tengri:2': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 100% di probabilità di far subire a 1 squadra nemica casuale entro il raggio il 6% di danni aggiuntivi, riducendone del 6% i danni inflitti e di -38 la Velocità di combattimento. Inoltre, 2 squadre alleate casuali subiscono il -6% di danni, infliggono il -6% di danni aggiuntivi e ottengono 38 di Velocità di combattimento per 1 turno.',
  },
  'Dach Tengri:5': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'Dal turno 4, a ogni turno ha il 70% di probabilità di impedire a 2 squadre nemiche casuali entro il raggio di recuperare truppe e di ridurre del -25% i danni subiti da 2 squadre alleate casuali.',
  },
  'Dach Tengri:8': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Per i primi 3 turni, a ogni turno aumenta del 7% i danni di 2 squadre alleate casuali; l’effetto è cumulabile e dura fino alla fine della battaglia. Dal turno 4, conferisce Dispersione: gli attacchi base infliggono il 40% di danni a 2 squadre nemiche nella fila posteriore fino alla fine della battaglia.',
  },
  'Tarantula:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 30% di probabilità di infliggere il 641% di danni a 2 squadre nemiche casuali entro il raggio, aumentando del 40% i danni inflitti dalla squadra dell’eroe e dalla fila posteriore per i successivi 2 attacchi. Se la squadra dell’eroe si trova nella fila posteriore, ottiene un potenziamento doppio. Dura 2 turni.',
  },
  'Tarantula:5': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 35% di probabilità di infliggere il 402% di danni a 1 squadra nemica casuale entro il raggio e, prima della prossima azione della fila posteriore, infligge il 403% di danni a 1 squadra nemica casuale entro un raggio di 4 dalla fila posteriore.',
  },
  'Tarantula:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'In battaglia, la squadra dell’eroe ottiene casualmente uno dei seguenti potenziamenti a ogni turno: 1: recupera potenza delle truppe (tasso di recupero: 100%); 2: Potenza, Resistenza, Potenza tattica e Resistenza tattica aumentano del 60%; 3: subisce il -40% di danni.',
  },
  'Alexander:2': {
    type: 'Abilità pre-battaglia',
    target: '1 nemico casuale',
    desc: 'Nei turni 1 e 3, folgora 1 squadra nemica casuale, facendole subire il 325% di danni aggiuntivi ogni volta che viene danneggiata, fino alla fine della battaglia.',
  },
  'Alexander:5': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'L’eroe subisce il -60% di danni e riceve il 20% di cure aggiuntive, ma i danni da bruciatura che subisce aumentano del 300%.',
  },
  'Alexander:8': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Ha il 100% di probabilità di applicare Sanguinamento a tutte le squadre nemiche, infliggendo loro il 260% di danni prima che agiscano a ogni turno, fino alla fine della battaglia. Se la squadra dell’eroe perde il 25% della potenza totale delle truppe in un turno, alla fine di quel turno recupera potenza delle truppe (tasso di recupero: 350%).',
  },
  'Lancelot:2': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 50% di probabilità di infliggere il 356% di danni a tutte le squadre nemiche. Se un bersaglio subisce una riduzione delle cure o non può recuperare potenza delle truppe, infligge un ulteriore 356% di danni a tutte le squadre nemiche, con il 90% di probabilità per ciascuna di subire Soppressione per 1 turno.',
  },
  'Lancelot:5': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'L’eroe non può effettuare attacchi normali e l’effetto non può essere rimosso. A ogni turno, ha il 100% di probabilità di infliggere il 356% di danni a 1 squadra nemica casuale e ottiene un sigillo tra Coraggio, Giustizia e Misericordia: Coraggio aumenta i danni del 20%; Giustizia aumenta del 10% il tasso di Schivata; Misericordia fa recuperare potenza delle truppe a ogni turno quando il portatore agisce (tasso di recupero: 67%). I sigilli durano fino alla fine della battaglia e possono accumularsi fino a 2 volte; ottenuti tutti e tre, l’abilità colpisce tutte le squadre nemiche.',
  },
  'Lancelot:8': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'All’inizio della battaglia, applica a tutte le squadre alleate un effetto che, quando usano un’abilità di preparazione, ha l’80% di probabilità di saltare 1 turno di preparazione, fino a 3 attivazioni. Quando l’effetto viene ottenuto e quando ne vengono esauriti i tentativi, applica 1 sigillo al portatore.',
  },
  'Ragnar:2': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 50% di probabilità di infliggere il 420% di danni a una squadra nemica casuale entro il raggio valido.',
  },
  'Ragnar:5': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Infligge rispettivamente a tutte le squadre nemiche il 160% di danni al turno 1, il 320% al turno 3, il 480% al turno 5 e il 640% al turno 7.',
  },
  'Ragnar:8': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Dopo aver inflitto danni, ha il 50% di probabilità di conferire alla squadra dell’eroe e alla fila posteriore l’8% di probabilità di attivare Colpo fatale e Colpo distruttivo. L’effetto dura fino alla fine della battaglia e può accumularsi fino a 5 volte. La riga finale della schermata richiede conferma.',
  },
  'Bjorn:2': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 40% di probabilità di attaccare 1 squadra nemica casuale entro il raggio per 2 volte, infliggendo ogni volta il 348% di danni. Ogni attacco sceglie casualmente un nemico.',
  },
  'Bjorn:5': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Tutte le squadre alleate infliggono il +70% di danni alle squadre nemiche Silenziate, Disarmate, Soppresse o Confuse. Le squadre nemiche hanno il 30% di probabilità di prolungare di 1 turno la durata di questi effetti di controllo.',
  },
  'Bjorn:8': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'Nei primi 3 turni, 2 squadre nemiche casuali entro il raggio infliggono il -30% di danni. Al turno 4, queste squadre entrano in Confusione e indirizzano attacchi e abilità verso bersagli casuali per 2 turni.',
  },
  'Skanda:2': {
    type: 'Abilità di combattimento',
    target: '2 alleati casuali',
    desc: 'Ha il 50% di probabilità di curare la propria squadra e quella in prima fila (tasso di recupero: 247%). Se si trova già in prima fila, raddoppia la cura.',
  },
  'Skanda:5': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 70% di probabilità di infliggere il 260% di danni alla squadra nemica più lontana entro il raggio e di applicarle Soppressione per 1 turno.',
  },
  'Skanda:8': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'Al turno 5, rimuove gli stati negativi dalla prima fila alleata. Quando il bersaglio subisce danni, ha il 100% di probabilità di schivarli e diventarne immune per 2 turni.',
  },
  'Liberator:2': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Quando subisce attacchi normali, ha il 50% di probabilità di contrattaccare infliggendo il 150% di danni. Inoltre, a ogni turno la propria squadra ha il 50% di probabilità di subire il -60% di danni da abilità per 1 turno.',
  },
  'Liberator:5': {
    type: 'Attacco aggiuntivo',
    target: '1 alleato casuale',
    desc: 'Gli attacchi normali hanno l’80% di probabilità di applicare Blocco del recupero truppe per 1 turno. Hanno inoltre il 70% di probabilità di conferire Chiarezza alla fila posteriore, rendendola immune a Silenzio, Disarmo, Soppressione e Confusione per 1 turno.',
  },
  'Liberator:8': {
    type: 'Abilità pre-battaglia',
    target: '3 alleati casuali',
    desc: 'Quando la squadra dell’eroe è in prima fila, tutte le squadre alleate subiscono il -20% di danni per i primi 3 turni. Dal turno 4, il 40% dei danni inflitti dalla fila posteriore viene convertito in recupero truppe per la prima fila al termine dell’effetto.',
  },
  'Ashen Verdict:2': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali',
    desc: 'Ashen Verdict ottiene 1 Marchio dell’inseguimento per ogni attacco normale effettuato dalle tue squadre. Quando i marchi raggiungono 7 accumuli, tutte le squadre nemiche subiscono il 400% di danni aggiuntivi e tutti i marchi vengono rimossi.',
  },
  'Ashen Verdict:5': {
    type: 'Abilità di combattimento',
    target: '1 alleato casuale',
    desc: 'Ha il 35% di probabilità di conferire alla squadra dell’eroe 1 attacco normale aggiuntivo a ogni turno per 2 turni. Per la durata dell’effetto, la squadra è immune a Disarmo.',
  },
  'Ashen Verdict:8': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Dopo ogni 2 attacchi normali, la squadra dell’eroe ha il 35% di probabilità di applicare a una squadra nemica casuale uno stato tra Disarmo, Silenzio, Confusione, Interruzione e Blocco del recupero truppe. La probabilità viene calcolata separatamente per ogni effetto e tutti durano 1 turno.',
  },
  'Warden:2': {
    type: 'Abilità pre-battaglia',
    target: '2 alleati casuali',
    desc: 'Nei primi 4 turni, la probabilità di attivare l’abilità 5 degli altri due eroi aumenta del 10%, limitatamente alle abilità di combattimento e passive. Al turno 5, la probabilità aumenta del 30%, ma solo per l’abilità 5 di uno degli altri due eroi.',
  },
  'Warden:5': {
    type: 'Abilità pre-battaglia',
    target: '3 nemici casuali, alleato casuale',
    desc: 'Quando subisce uno stato di controllo tra Silenzio, Disarmo, Soppressione e Confusione, la tua squadra subisce il -70% di danni. L’effetto può attivarsi fino a 3 volte per squadra durante la battaglia. Nei turni 1 e 5, infligge il 510% di danni a una squadra nemica casuale.',
  },
  'Warden:8': {
    type: 'Abilità pre-battaglia',
    target: '3 nemici casuali',
    desc: 'Durante la battaglia, la squadra dell’eroe non può effettuare attacchi normali, ma la fila posteriore ottiene +1 attacco normale per turno. Ogni attacco normale aumenta del 12% i danni della sua abilità successiva, fino a 5 accumuli.',
  },
  'Warhammer:2': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale, alleato casuale',
    desc: 'Ottiene +1 accumulo di Carica dell’armatura riflettente ogni volta che una squadra alleata subisce danni. Quando l’armatura raggiunge 9 accumuli, conferisce uno Scudo riflettente a una squadra alleata casuale, con il 30% di probabilità di aggiungere un altro accumulo. Lo scudo può annullare il 100% della successiva istanza di danno in arrivo e rifletterla sull’attaccante, proteggendo il portatore; dopo il conferimento, tutti gli accumuli dell’armatura si azzerano.',
  },
  'Warhammer:5': {
    type: 'Abilità di combattimento',
    target: '3 nemici casuali, alleato casuale',
    desc: 'Ha il 100% di probabilità di infliggere il 108% di danni a tutte le squadre nemiche, ma tutte le squadre alleate ricevono il 20% dei danni inflitti ai nemici. Questi danni forniscono cariche per l’Armatura riflettente.',
  },
  'Warhammer:8': {
    type: 'Abilità pre-battaglia',
    target: '3 nemici casuali, alleato casuale',
    desc: 'Riduce del -25% il recupero truppe delle squadre nemiche e alleate. Dal turno 4, riduce del -15% a ogni turno l’effetto di recupero truppe di tutte le squadre nemiche. L’effetto si accumula e dura fino alla fine del combattimento.',
  },
  'Eidolon:2': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'La squadra dell’eroe ha un tasso di Schivata base del 10% e ottiene un ulteriore 25% ogni volta che subisce danni, fino al 100%. Dopo aver schivato con successo un attacco, il bonus al tasso di Schivata viene azzerato.',
  },
  'Eidolon:5': {
    type: 'Abilità di combattimento',
    target: '2 alleati casuali',
    desc: 'Ha il 40% di probabilità di attivarsi: 2 altre squadre alleate sottraggono il 60% di Potenza e Resistenza a 1 squadra nemica casuale. Inoltre, ogni attacco base ha il 100% di probabilità di infliggere il 250% di danni aggiuntivi per 1 turno.',
  },
  'Eidolon:8': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'Dopo una Schivata riuscita, la squadra dell’eroe ha il 33% di probabilità di recuperare l’80% delle truppe, il 33% di probabilità di subire il -35% di danni e il 33% di probabilità di far subire il 15% di danni aggiuntivi a 2 squadre nemiche casuali. Le probabilità vengono calcolate separatamente e non si accumulano; ogni effetto dura 2 turni.',
  },
  'Scarlet Reaver:2': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ha il 100% di probabilità di infliggere il 100% di danni alla prima fila nemica e il 40% di probabilità di infliggere un ulteriore 500% di danni alla squadra nemica con meno truppe.',
  },
  'Scarlet Reaver:5': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Richiede 1 turno di preparazione. Ha il 40% di probabilità di attaccare 5 volte; ogni attacco sceglie una squadra nemica casuale e infligge il 150% di danni. Ogni attacco ha inoltre il 65% di probabilità di applicare per 1 turno Disarmo agli arcieri oppure Silenzio alla fanteria e alla cavalleria. Disarmo e Silenzio possono accumularsi fino a 2 volte.',
  },
  'Scarlet Reaver:8': {
    type: 'Abilità pre-battaglia',
    target: '2 nemici casuali',
    desc: 'Nei turni 1, 4 e 7, applica Bruciatura a 2 squadre nemiche casuali per 2 turni, infliggendo il 150% di danni a ogni turno. La squadra dell’eroe ottiene il 35% di vantaggio contro la cavalleria e tutte le squadre alleate infliggono il +50% di danni da abilità ai bersagli in fiamme.',
  },
  'Rainforest Ranger:2': {
    type: 'Abilità pre-battaglia',
    target: '1 alleato casuale',
    desc: 'I danni inflitti dalla squadra dell’eroe ignorano il 25% della Resistenza base nemica. Per i primi 3 turni, i suoi attacchi normali agganciano la squadra nemica nella stessa posizione e ignorano il doppio della Resistenza base.',
  },
  'Rainforest Ranger:5': {
    type: 'Attacco aggiuntivo',
    target: '1 nemico casuale',
    desc: 'Dopo un attacco normale, ha il 50% di probabilità di infliggere il 350% di danni aggiuntivi al bersaglio. Quando questi danni si attivano, ha il 50% di probabilità di applicare Soppressione a 1 nemico casuale per 1 turno.',
  },
  'Rainforest Ranger:8': {
    type: 'Attacco aggiuntivo',
    target: '1 alleato casuale',
    desc: 'Dopo un attacco normale, ha il 35% di probabilità di infliggere il 600% di danni aggiuntivi al bersaglio. I danni aumentano all’810% se la potenza delle truppe del bersaglio è inferiore del 50% rispetto all’inizio della battaglia.',
  },
  'Fortuneteller:2': {
    type: 'Abilità pre-battaglia',
    target: '1 nemico casuale',
    desc: 'Contrassegna 1 squadra nemica casuale e ne riduce il recupero truppe del -70%, quindi applica un effetto in base al tipo di truppa. Fanteria: tutte le squadre nemiche subiscono il +20% di danni in meno dagli attacchi normali. Arcieri: tutte le squadre nemiche infliggono il -40% di danni in meno con gli attacchi normali. Cavalleria: tutte le squadre nemiche infliggono il -30% di danni da abilità.',
  },
  'Fortuneteller:5': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Ha il 50% di probabilità di collegare 1 squadra nemica casuale alla squadra contrassegnata per 2 turni. Quando una delle due subisce danni, l’altra subisce il 50% di quei danni.',
  },
  'Fortuneteller:8': {
    type: 'Abilità di combattimento',
    target: '1 nemico casuale',
    desc: 'Ottiene +1 Carica ogni volta che una squadra alleata usa un’abilità di combattimento. Raggiunte 6 Cariche, infligge il 750% di danni alla squadra contrassegnata e le applica Soppressione per 1 turno.',
  },
  'Cyrus:2': {
    type: 'Abilità di combattimento',
    target: '2 nemici casuali',
    desc: 'Richiede 1 turno di preparazione. Ha il 65% di probabilità di infliggere il 325% di danni a 2 squadre nemiche casuali e di impedire loro di recuperare potenza delle truppe per 1 turno. L’abilità ha l’80% di probabilità di saltare la preparazione e attivarsi direttamente.',
  },
  'Cyrus:5': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'Tutte le squadre alleate di cavalleria ottengono Cavalleria della tempesta: quando usano un’abilità attiva, infliggono il 40% di danni aggiuntivi; quando usano un’abilità di inseguimento, i danni subiti diminuiscono del 40% per 2 turni. Quando una tua squadra attiva l’effetto, Cyrus ne ottiene il 50%; l’effetto può accumularsi fino a 5 volte e dura fino alla fine della battaglia.',
  },
  'Cyrus:8': {
    type: 'Abilità di stato',
    target: '1 alleato casuale',
    desc: 'La squadra di Cyrus ha il 10% di probabilità di Schivata. Dopo ogni Schivata riuscita, Cyrus ottiene casualmente uno tra vari effetti, compresi Primo ad attaccare e Lucidità. Se la Schivata fallisce, tutte le tue squadre diventano immediatamente Lucide per 1 turno e ottengono un effetto che riduce del 50% i danni del successivo attacco in arrivo, una volta per turno.',
  },
};

const strings = {
  '1 random friendly squad within effective range':
    '1 squadra alleata casuale entro il raggio effettivo',
  '3 random friendly squads within effective range':
    '3 squadre alleate casuali entro il raggio effettivo',
  'A castable battle skill. Some have prep time, chance to trigger, range, and target rules.':
    'Un’abilità utilizzabile in battaglia. Alcune prevedono preparazione, probabilità di attivazione, raggio e regole di selezione del bersaglio.',
  'A cleansing or control-resistance state that helps remove or avoid negative effects.':
    'Uno stato di purificazione o resistenza al controllo che aiuta a rimuovere o evitare gli effetti negativi.',
  'A commander-style passive effect that usually applies as long as the hero is in the legion.':
    'Un effetto passivo di comando che in genere rimane attivo finché l’eroe fa parte della legione.',
  'A control-immunity or cleansing state; usually protects from disabling effects for its duration.':
    'Uno stato di immunità al controllo o purificazione che, per la sua durata, protegge solitamente dagli effetti debilitanti.',
  'A damage-over-time status that keeps hurting the affected squad while active.':
    'Uno stato di danno nel tempo che continua a danneggiare la squadra colpita finché resta attivo.',
  'A damage-over-time style status that keeps hurting the affected squad while active.':
    'Uno stato simile al danno nel tempo che continua a danneggiare la squadra colpita finché resta attivo.',
  'A disabling status such as Silence, Disarm, Suppress, or Confuse.':
    'Uno stato debilitante come Silenzio, Disarmo, Soppressione o Confusione.',
  'A normal attack state that hits additional enemy squads beyond the main target.':
    'Uno stato dell’attacco normale che colpisce squadre nemiche aggiuntive oltre al bersaglio principale.',
  'A passive/status-driven skill that changes states, immunities, damage rules, or ongoing battle behavior.':
    'Un’abilità passiva o basata sugli stati che modifica stati, immunità, regole dei danni o comportamento durante la battaglia.',
  'A skill that can trigger during battle when its conditions and chance roll are met.':
    'Un’abilità che può attivarsi durante la battaglia quando si verificano le condizioni richieste e supera la prova di probabilità.',
  'A special damage effect that can bypass or punish defenses depending on the skill.':
    'Un effetto di danno speciale che, a seconda dell’abilità, può aggirare o punire le difese.',
  'A special strike effect with its own chance and damage rate, often scaling with buffs.':
    'Un effetto di colpo speciale con probabilità e tasso di danno propri, spesso potenziato dai bonus.',
  'A stackable buff used by some heroes to increase follow-up effects, damage, or trigger chances.':
    'Un potenziamento cumulabile usato da alcuni eroi per aumentare effetti successivi, danni o probabilità di attivazione.',
  'A status that makes the target vulnerable to fire-related effects.':
    'Uno stato che rende il bersaglio vulnerabile agli effetti legati al fuoco.',
  'A weakening status that reduces effectiveness while active.':
    'Uno stato di indebolimento che riduce l’efficacia finché rimane attivo.',
  'Active Skill': 'Abilità attiva',
  'Acts before enemy squads, which can unlock extra skill effects for some heroes.':
    'Agisce prima delle squadre nemiche, permettendo ad alcuni eroi di sbloccare effetti aggiuntivi delle abilità.',
  'Additional Attack': 'Attacco aggiuntivo',
  'Adds or modifies normal attacks, often creating extra hits or effects after attacks.':
    'Aggiunge o modifica gli attacchi normali, spesso generando colpi o effetti aggiuntivi dopo l’attacco.',
  Advanced: 'Avanzato',
  'Advanced Biography Seal': 'Sigillo biografico avanzato',
  'Affected squad may attack or cast skills on random targets.':
    'La squadra colpita può attaccare o usare abilità contro bersagli casuali.',
  'Affected squad takes more damage or loses protection while active.':
    'Finché lo stato è attivo, la squadra colpita subisce più danni o perde parte della protezione.',
  'All Biography Attributes activated': 'Tutti gli attributi biografici attivati',
  'Applies before or at battle start, often setting buffs, debuffs, opening conditions, or early-round rules.':
    'Si applica prima o all’inizio della battaglia, spesso impostando potenziamenti, penalità, condizioni iniziali o regole dei primi turni.',
  'Armor break': 'Rottura armatura',
  'Army Defense': 'Difesa dell’esercito',
  'Army HP': 'PS dell’esercito',
  'Army Might': 'Potenza dell’esercito',
  'Arthur Pendragon the Once and Future King': 'Arthur Pendragon, il re che fu e che sarà',
  'Avoids an incoming damage instance or attack while active.':
    'Finché è attivo, evita un’istanza di danno o un attacco in arrivo.',
  Basic: 'Base',
  Biography: 'Biografia',
  'Biography attributes': 'Attributi biografici',
  'Biography Attributes': 'Attributi biografici',
  'Biography Seal': 'Sigillo biografico',
  'Biography skin details pending': 'Dettagli della skin biografica in attesa',
  'Biography: Hidden Power': 'Biografia: Potere nascosto',
  Bleeding: 'Sanguinamento',
  "Buy directly during that hero's launch event — yours to keep once purchased.":
    'Acquistala direttamente durante l’evento di lancio dell’eroe: una volta comprata, resterà tua.',
  'Captured screenshot shows Eternity at Lv.10 and max level reached.':
    'La schermata acquisita mostra Eternità al Liv.10 e il livello massimo raggiunto.',
  Chain: 'Catena',
  Clarity: 'Chiarezza',
  'Combat Skill': 'Abilità di combattimento',
  'Combat Skill Damage': 'Danni da abilità di combattimento',
  Confuse: 'Confusione',
  Confused: 'Confuso',
  'Control Debuff': 'Penalità di controllo',
  'Counter-attack': 'Contrattacco',
  Counterattack: 'Contrattacco',
  Cursed: 'Maledetto',
  'Damage dealt by a skill rather than a normal attack.':
    'Danni inflitti da un’abilità anziché da un attacco normale.',
  'Damage dealt specifically by combat skills, not normal attacks.':
    'Danni inflitti specificamente dalle abilità di combattimento, non dagli attacchi normali.',
  'Damage or effects can jump from one squad to another.':
    'I danni o gli effetti possono propagarsi da una squadra all’altra.',
  'Damage spills onto nearby or additional squads.':
    'I danni si propagano alle squadre vicine o aggiuntive.',
  'Damage taken': 'Danni subiti',
  'Damage taken by the hero is reduced by 80% at the start of battle. Each time the hero takes damage, the mitigation is reduced by 8% (reduced by 4% each time for the first 3 rounds), while Resistance increases by 20% and Damage dealt increases by 10%, stackable up to 20 layers, until battle ends.':
    'All’inizio della battaglia, i danni subiti dall’eroe diminuiscono dell’80%. Ogni volta che l’eroe subisce danni, la riduzione cala dell’8% (del 4% per ciascuna istanza nei primi 3 turni), mentre la Resistenza aumenta del 20% e i danni inflitti del 10%. L’effetto può accumularsi fino a 20 volte e dura fino alla fine della battaglia.',
  'Damage type usually tied to normal or physical strikes.':
    'Tipo di danno solitamente associato agli attacchi normali o fisici.',
  'Deals damage back after being attacked or after a matching trigger.':
    'Restituisce danni dopo aver subito un attacco o dopo un’attivazione corrispondente.',
  Defend: 'Difesa',
  'Destructive Strike': 'Colpo distruttivo',
  'Details pending': 'Dettagli in attesa',
  Disarm: 'Disarmo',
  Disarmed: 'Disarmato',
  Dodge: 'Schivata',
  Dodging: 'Schivata',
  'Dynamic icon behavior pending capture.':
    'Comportamento dell’icona dinamica in attesa di acquisizione.',
  'Dynamic icon capture pending.': 'Acquisizione dell’icona dinamica in attesa.',
  'Earn some as milestone rewards in cumulative gem-spend events.':
    'Ottienine alcuni come ricompense traguardo negli eventi di spesa cumulativa di gemme.',
  'Epic Hero Medal': 'Medaglia eroe epico',
  Eternity: 'Eternità',
  Everlasting: 'Eterno',
  'Exchange Perfect Crystals for them in the Premium Shop.':
    'Scambiali con Cristalli perfetti nel Negozio premium.',
  Faltering: 'Cedimento',
  'Fatal Blow': 'Colpo fatale',
  Feverish: 'Febbre',
  'First to Attack': 'Primo ad attaccare',
  'First-Aid': 'Primo soccorso',
  Flammable: 'Infiammabile',
  Footmen: 'Fanteria',
  'Forces or redirects enemy attacks toward the taunting squad.':
    'Forza o reindirizza gli attacchi nemici verso la squadra che provoca.',
  'Granted on activation (owning the skin).': 'Conferito all’attivazione, possedendo la skin.',
  Healing: 'Cura',
  'Healing or recovery effect that restores troop power.':
    'Effetto di cura o recupero che ripristina la potenza delle truppe.',
  Inheriting: 'Ereditario',
  'Inheriting Skill': 'Abilità ereditaria',
  'Inheriting skill details pending.': 'Dettagli dell’abilità ereditaria in attesa.',
  'Inheriting skill details will be added after capture.':
    'I dettagli dell’abilità ereditaria verranno aggiunti dopo l’acquisizione.',
  Intermediate: 'Intermedio',
  Interrupting: 'Interruzione',
  'Leadership Skill': 'Abilità di comando',
  Legendary: 'Leggendario',
  'Legendary Hero Medal': 'Medaglia eroe leggendario',
  'Mass Attack': 'Attacco di massa',
  Melee: 'Mischia',
  'More unlocked Biography Skin variants can add stronger Hidden Power when a hero has additional variants.':
    'Ulteriori varianti di Skin biografica sbloccate possono conferire un Potere nascosto maggiore quando un eroe possiede più varianti.',
  Mythic: 'Mitico',
  'Normal Attack': 'Attacco normale',
  'Only two heroes have Mythic skins.': 'Solo due eroi possiedono skin mitiche.',
  'Own 2 Biography Skin variants': 'Possiedi 2 varianti di Skin biografica',
  'Owned skin bonus': 'Bonus della skin posseduta',
  pending: 'in attesa',
  'Physical Damage': 'Danni fisici',
  'Pick select skins up from the Eden Skin Store rotation.':
    'Ottieni skin selezionate dalla rotazione del Negozio skin Eden.',
  Poisoned: 'Avvelenato',
  'Pre-Battle Skill': 'Abilità pre-battaglia',
  'Pre-Battle Skills': 'Abilità pre-battaglia',
  'Prep Skills': 'Abilità di preparazione',
  Preserving: 'Conservazione',
  'Preserving Skill': 'Abilità di conservazione',
  'Preserving skill and dynamic icon details pending.':
    'Dettagli dell’abilità di conservazione e dell’icona dinamica in attesa.',
  'Preserving skill details will be added after capture.':
    'I dettagli dell’abilità di conservazione verranno aggiunti dopo l’acquisizione.',
  'Preserving unlock items': 'Oggetti di sblocco della conservazione',
  'Prevents affected squads from recovering troop power while active.':
    'Finché è attivo, impedisce alle squadre colpite di recuperare potenza delle truppe.',
  'Prevents combat skill casting while active.':
    'Finché è attivo, impedisce di usare abilità di combattimento.',
  'Prevents normal attacks while active.': 'Finché è attivo, impedisce gli attacchi normali.',
  'Prevents the squad from acting or casting depending on the skill wording.':
    'Impedisce alla squadra di agire o usare abilità, secondo la formulazione dell’abilità.',
  'Pull from launch or return event packs (about a 1.4% drop rate per pack).':
    'Trovale nei pacchetti degli eventi di lancio o ritorno, con un tasso di ottenimento di circa l’1,4% per pacchetto.',
  'Punishes the affected squad when it performs certain actions, often skill casting.':
    'Punisce la squadra colpita quando compie determinate azioni, spesso quando usa un’abilità.',
  Recovery: 'Recupero',
  'Recruit certain skins with Super Vouchers.': 'Recluta alcune skin con i Super voucher.',
  'Reduces defensive value, making affected squads take more damage.':
    'Riduce il valore difensivo, facendo subire più danni alle squadre colpite.',
  'Replaces Wheel of Fortune with Eternity when the skin reaches Star 2.':
    'Sostituisce Ruota della fortuna con Eternità quando la skin raggiunge Stella 2.',
  Resistance: 'Resistenza',
  'Restores troop power to one or more squads.':
    'Ripristina la potenza delle truppe di una o più squadre.',
  'Restores troop power; usually shown as a recovery rate.':
    'Ripristina la potenza delle truppe; di solito è indicato come tasso di recupero.',
  'Returns or restores a defeated or heavily damaged squad effect depending on the skill.':
    'A seconda dell’abilità, riporta in battaglia o ripristina l’effetto di una squadra sconfitta o gravemente danneggiata.',
  Revived: 'Resurrezione',
  'Royal Exclusive': 'Esclusiva reale',
  S: 'S',
  S1: 'S1',
  S2: 'S2',
  S3: 'S3',
  S4: 'S4',
  'Seasonal Legendary Hero Medal': 'Medaglia eroe leggendario stagionale',
  Silence: 'Silenzio',
  Silenced: 'Silenziato',
  'Skill activated': 'Abilità attivata',
  'Skill Damage': 'Danni da abilità',
  'Skills that need one or more rounds of preparation before firing.':
    'Abilità che richiedono uno o più turni di preparazione prima di attivarsi.',
  'Skin advancement complete': 'Avanzamento della skin completato',
  'Skin advancement unlocks the upgraded hero skill.':
    'L’avanzamento della skin sblocca l’abilità potenziata dell’eroe.',
  'Skin ownership grants biography attributes once details are captured.':
    'Il possesso della skin conferisce gli attributi biografici una volta acquisiti i dettagli.',
  'Skin ownership grants the biography attributes by default.':
    'Il possesso della skin conferisce gli attributi biografici per impostazione predefinita.',
  Sober: 'Lucido',
  'Solid Shield': 'Scudo solido',
  'Some heroes have more than one Biography Skin variant. Those variants share the same Biography Attributes and progress; owning more than one variant unlocks Hidden Power.':
    'Alcuni eroi hanno più di una variante di Skin biografica. Le varianti condividono gli stessi Attributi biografici e lo stesso avanzamento; possederne più di una sblocca Potere nascosto.',
  SP: 'SP',
  'Special preserving unlock items add the preserving skill and moving icon.':
    'Gli oggetti speciali di sblocco della conservazione aggiungono l’abilità di conservazione e l’icona animata.',
  Splash: 'Dispersione',
  'Star 1': 'Stella 1',
  'Star 2': 'Stella 2',
  'Star 3': 'Stella 3',
  'Star 3 uses the same unique icon with a small in-place movement.':
    'Stella 3 usa la stessa icona unica con un lieve movimento sul posto.',
  'Status Skill': 'Abilità di stato',
  'Stops a channeling or prep skill before it completes.':
    'Interrompe un’abilità canalizzata o in preparazione prima che si completi.',
  Suppress: 'Soppressione',
  Suppressed: 'Soppresso',
  'Tactical Might': 'Potenza tattica',
  'Tactical Resistance': 'Resistenza tattica',
  Taunt: 'Provocazione',
  Taunting: 'Provocazione',
  'The basic attack a squad performs without casting a combat skill.':
    'L’attacco base eseguito da una squadra senza usare un’abilità di combattimento.',
  'The entry-level skin tier — it grants an Inheriting Skill but never a Preserving Skill.':
    'Il livello iniziale delle skin: conferisce un’Abilità ereditaria, ma mai un’Abilità di conservazione.',
  "The Hero's squad": 'La squadra dell’eroe',
  "The hero's squad gains 4% HP and takes 2% less damage.":
    'La squadra dell’eroe ottiene il 4% di PS e subisce il 2% di danni in meno.',
  "The Hero's squad takes -10% Skill Damage; the Hero's Legion gains 13% Resistance.":
    'La squadra dell’eroe subisce il -10% di danni da abilità; la legione dell’eroe ottiene il 13% di Resistenza.',
  'The mid tier — it carries both an Inheriting Skill and a Preserving Skill, funded with standard Biography Seals.':
    'Il livello intermedio: include sia un’Abilità ereditaria sia un’Abilità di conservazione, potenziate con Sigilli biografici standard.',
  'The most common skin tier — most heroes with a skin fall here.':
    'Il livello di skin più comune: comprende la maggior parte degli eroi dotati di skin.',
  'The Once and Future King': 'Il re che fu e che sarà',
  'The same unique icon moves slightly in place after the preserving skill is unlocked.':
    'La stessa icona unica si muove leggermente sul posto dopo lo sblocco dell’abilità di conservazione.',
  'The top tier — it also has an Inheriting Skill and a Preserving Skill, but its upgrades cost the pricier Advanced Biography Seals.':
    'Il livello più alto: include anch’esso un’Abilità ereditaria e un’Abilità di conservazione, ma i potenziamenti richiedono i più costosi Sigilli biografici avanzati.',
  "Trade for it in the Eden Skin Store: Beast Queen's Mythic skin runs 400 Biography Skin coins.":
    'Scambiala nel Negozio skin Eden: la skin mitica di Beast Queen costa 400 monete Skin biografica.',
  'Troop Damage': 'Danni alle truppe',
  'Troop Recovery Block': 'Blocco del recupero truppe',
  'Unique icon becomes available with the inheriting skill.':
    'L’icona unica diventa disponibile con l’abilità ereditaria.',
  'Unique skin icon available when the inheriting skill is unlocked.':
    'Icona unica della skin disponibile allo sblocco dell’abilità ereditaria.',
  Vulnerable: 'Vulnerabile',
  'Wheel of Fortune': 'Ruota della fortuna',
};

export default { skills, strings };
