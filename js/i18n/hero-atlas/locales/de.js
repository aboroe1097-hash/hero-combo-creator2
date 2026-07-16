const skills = {
  'Immortal:2': {
    type: 'Zusatzangriff',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Nach einem Normalangriff besteht eine Chance von 40%, 1 zuf\u00e4lligen gegnerischen Trupp in g\u00fcltiger Reichweite 2-mal anzugreifen. Jeder Treffer verursacht 348% Schaden.',
  },
  'Immortal:5': {
    type: 'Zusatzangriff',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Nach einem Normalangriff besteht eine Chance von 34%, 1 zuf\u00e4lligen gegnerischen Trupp in Reichweite mit 465% Schaden zu treffen und 1 Runde lang mit Stille zu belegen, sodass er keinen Kampfskill einsetzen kann.',
  },
  'Immortal:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Erh\u00f6ht den Schaden f\u00fcr die Legion, in der sich der Held befindet, um 80 %.',
  },
  'Wind-Walker:2': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Wenn der Trupp von einem Normalangriff getroffen wird, erh\u00e4lt er Erste Hilfe und regeneriert pro Runde Truppenst\u00e4rke mit einer Regenerationsrate von 20%. Der Effekt h\u00e4lt 2 Runden an und ist bis zu 8-mal stapelbar.',
  },
  'Wind-Walker:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '60 % Chance, 2 gegnerischen Trupps in Reichweite 331 % Schaden zuzuf\u00fcgen und dem eigenen Trupp 331 % Schaden zuzuf\u00fcgen.',
  },
  'Wind-Walker:8': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Mit einer Chance von 50% provoziert der Held 2 zuf\u00e4llige gegnerische Trupps in Reichweite f\u00fcr 2 Runden und wechselt in den Konterangriffsstatus. Wird der Trupp normal angegriffen, verursacht er 150% Gegenschaden und erh\u00e4lt 100% Widerstand. H\u00e4lt 2 Runden an.',
  },
  'Hunk:2': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Wenn der Trupp Schaden erleidet, besteht eine Chance von 25 %, auszuweichen (immun gegen diesen Schaden), eine Chance von 50 %, den Truppschaden in jeder Runde um 50 % zu erh\u00f6hen.',
  },
  'Hunk:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '30 % Chance, 2 zuf\u00e4llige gegnerische Trupps 2 Runden lang mit Verwirrung und Entflammbar zu belegen. Verwirrte Trupps w\u00e4hlen f\u00fcr Skills und Normalangriffe zuf\u00e4llige Ziele; entflammbare Trupps erleiden 50 % zus\u00e4tzlichen Brandschaden.',
  },
  'Hunk:8': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 6 Runden erhalten alle verb\u00fcndeten Trupps 37 zus\u00e4tzliche Kampfgeschwindigkeit. 50 % des erlittenen Schadens werden erst in Runde 7 verrechnet. Vor Beginn der Kampfrunde f\u00fcgen sie 2 zuf\u00e4lligen gegnerischen Trupps 469 % Schaden zu.',
  },
  'Sakura:2': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 2 Runden bewegen sich 2 zuf\u00e4llige Feinde zuerst, in der zweiten Runde f\u00fcgen sie 2 zuf\u00e4lligen bis 2 zuf\u00e4lligen feindlichen Trupps 687 % Schaden zu.',
  },
  'Sakura:5': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'In den ersten 3 Runden erleiden 2 zuf\u00e4llige feindliche Trupps 50 % zus\u00e4tzlichen Schaden.',
  },
  'Sakura:8': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 3 Runden verursachen 2 zuf\u00e4llige befreundete Bogensch\u00fctzentrupps 50 % zus\u00e4tzlichen Schaden.',
  },
  'ELK:2': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'In den ersten 3 Runden hat der Bogensch\u00fctzentrupp in der Frontreihe eine Chance von 70%, in den Konterangriffsstatus zu wechseln. Wird er normal angegriffen, f\u00fcgt er dem Angreifer 250% Gegenschaden zu.',
  },
  'ELK:5': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'In Runde 1/3/5 besteht eine Chance von 100 %, 3 zuf\u00e4lligen gegnerischen Trupps innerhalb des g\u00fcltigen Bereichs 220 % Schaden zuzuf\u00fcgen und dem Ziel den Status \u201eVerwundbar\u201c zu verleihen, wodurch das Ziel 15 % mehr Schaden als in der vorherigen Runde erleidet und 1 Runde anh\u00e4lt.',
  },
  'ELK:8': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten drei Runden haben 2 zuf\u00e4llige verb\u00fcndete Trupps eine Chance von 70%, Unbeirrt zu erhalten und damit gegen Stille, Entwaffnung, Unterdr\u00fcckung und Verwirrung immun zu werden. Zus\u00e4tzlich steigt ihre Kampfkraft um 55%.',
  },
  'Mary Tudor:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '60 % Chance, 1 zuf\u00e4lligen gegnerischen Trupp innerhalb der g\u00fcltigen Reichweite 325 % Schaden zuzuf\u00fcgen; Wenn die Truppenst\u00e4rke des Ziels weniger als 50 % betr\u00e4gt, wird 195 % mehr Schaden verursacht.',
  },
  'Mary Tudor:5': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Jedes Mal, wenn Mary I. einen Kampfskill einsetzt, erh\u00e4lt ihr Trupp +25 % Skillschaden. Bis zu 6-mal stapelbar und bis zum Kampfende aktiv.',
  },
  'Mary Tudor:8': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde Vorbereitung. 50 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 368 % Schaden zuzuf\u00fcgen und sie in einen Blutungsstatus zu versetzen, wodurch sie zu Beginn jeder Runde 155 % Schaden erleiden, bevor sie Aktionen ausf\u00fchren, was 2 Runden anh\u00e4lt.',
  },
  'Cicero:2': {
    type: 'Zusatzangriff',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Nach normalen Angriffen besteht eine Chance von 30 %, 2 zuf\u00e4lligen gegnerischen Trupps in Reichweite 310 % Schaden zuzuf\u00fcgen, wodurch sie 2 Runden lang 20 % zus\u00e4tzlichen Schaden erleiden.',
  },
  'Cicero:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '60 % Chance, dass 2 zuf\u00e4llige gegnerische Trupps in den R\u00fcstungsbruch-Status gelangen, geringere Verteidigung um -200 %, h\u00e4lt 2 Runden an.',
  },
  'Cicero:8': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: '50 % Chance, dass die erste Reihe bei den n\u00e4chsten 3 erlittenen Schadensinstanzen 100 % Ausweichchance hat, was 2 Runden anh\u00e4lt.',
  },
  'Beowulf:2': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Nach jedem normalen Angriff wird der durch den normalen Angriff des Helden verursachte Schaden um 20 % erh\u00f6ht, stapelbar f\u00fcr bis zu 5 Stapel; Nach Erreichen der stapelbaren Grenze wechselt der Held in den Status \u201eFl\u00e4chenangriff\u201c und f\u00fcgt den beiden feindlichen Trupps au\u00dfer dem Ziel im normalen Angriff Schaden in H\u00f6he von 260 % + Stapelanzahl des \u201eKampfrausch\u201c-Effekts *50 % zu; der Effekt kann kritischen Schaden verursachen; Gleichzeitig besteht eine Chance von 100 %, den Ausweichstatus des Gegners beim Verursachen von Schaden zu ignorieren.',
  },
  'Beowulf:5': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Nach jeweils 2 Normalangriffen regenerieren der Heldentrupp und 1 zuf\u00e4lliger verb\u00fcndeter Trupp Truppenst\u00e4rke mit einer Regenerationsrate von 75%. Zus\u00e4tzlich erleidet 1 zuf\u00e4lliger gegnerischer Trupp 350% physischen Schaden, der einen Todessto\u00df ausl\u00f6sen kann, und wird 1 Runde lang entwaffnet.',
  },
  'Beowulf:8': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Gew\u00e4hrt eine Todessto\u00df-Chance von 20%. Nach jedem erhaltenen Heileffekt erh\u00e4lt der Held Kampfrausch und weitere 10% Todessto\u00df-Chance. Kampfrausch ist bis zu 8-mal stapelbar und h\u00e4lt bis zum Kampfende an. Zus\u00e4tzlich besteht eine Chance von 90%, alle negativen Status zu entfernen und bis zum n\u00e4chsten Zug Unbeirrt zu erhalten, wodurch der Held gegen Kontrolleffekte immun ist.',
  },
  'Theodora:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Mit einer Chance von 60% f\u00fcgt der Held 1 zuf\u00e4lligen verb\u00fcndeten Trupp au\u00dferhalb des eigenen Trupps 20% Skillschaden zu. Daf\u00fcr verursacht das Ziel 50% mehr Schaden. H\u00e4lt 2 Runden an.',
  },
  'Theodora:5': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Wenn der Held Schaden erleidet, besteht eine Chance von 40%, allen gegnerischen Trupps 160% Skillschaden zuzuf\u00fcgen. Zus\u00e4tzlich besteht eine Chance von 40%, sie 2 Runden lang mit 1 zuf\u00e4lligen Kontrollstatus zu belegen: Unterdr\u00fcckung, Stille, Entwaffnung oder Verwirrung.',
  },
  'Theodora:8': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Wenn der Trupp in der Frontreihe Schaden verursacht, regeneriert er Truppenst\u00e4rke in H\u00f6he von 60% des verursachten Schadens. Der Effekt h\u00e4lt 6 Runden an und kann pro Runde bis zu 2-mal ausgel\u00f6st werden. Wird der Trupp in der Frontreihe besiegt, k\u00e4mpft der Held noch 1 weitere Runde. Dieser Effekt gilt nicht gegen Gebiets-W\u00e4chter.',
  },
  'Caesar:2': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Ab Runde 3 besteht f\u00fcr Caesar pro Runde eine Chance von 40%, einen Skill einzusetzen. Dadurch steigen Kampfkraft und Widerstand aller verb\u00fcndeten Kavallerietrupps um 200% und ihr Schaden um 60%. Zus\u00e4tzlich erh\u00e4lt Caesar 20% h\u00f6here Zusatzangriffs-Chance. Der Effekt h\u00e4lt bis zum Kampfende an und kann nur einmal aktiviert werden. Die Ausl\u00f6sechance steigt pro Runde um 20%.',
  },
  'Caesar:5': {
    type: 'Zusatzangriff',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Nach einem Normalangriff besteht eine Chance von 60%, 2 zuf\u00e4lligen gegnerischen Trupps physischen Schaden mit einer Schadensrate von 480% zuzuf\u00fcgen. 50% dieses Schadens regenerieren die Truppenst\u00e4rke von 2 zuf\u00e4lligen verb\u00fcndeten Trupps. Nach dem Einsatz hat der Skill 1 Runde Abklingzeit. Wenn der Held pro Runde zum ersten Mal Schaden ausweicht, wird der Skill mit einer Chance von 100% ohne Abklingzeit ausgel\u00f6st.',
  },
  'Caesar:8': {
    type: 'Zusatzangriff',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Nach einem Normalangriff besteht eine Chance von 50%, 2-3 Trupps physischen Schaden mit einer Schadensrate von 310% zuzuf\u00fcgen. Bei jedem Einsatz erh\u00f6ht sich die Schadensrate von Diktatorischer Herrscher um das 1-Fache. Der Bonus ist stapelbar und h\u00e4lt bis zum Kampfende an. Dieser Skill kann nur einmal pro Runde ausgel\u00f6st werden.',
  },
  'Octavius:2': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Octavius erh\u00e4lt pro Runde mit einer Chance von 80% Provokation. Soll ein zuf\u00e4lliger Trupp von einem gegnerischen Aktivskill oder Zusatzangriff verfolgt werden, wird Octavius vorrangig als Ziel gew\u00e4hlt. Die Ausl\u00f6sechance dieses Skills sinkt pro Runde um 5%.',
  },
  'Octavius:5': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Octavius erleidet -25% Schaden. Zu Kampfbeginn erhalten die Trupps in der Mittel- und Hinterreihe einen Ausweichstatus, der sie gegen die n\u00e4chsten 3 Schadensinstanzen immun macht und 2 Runden anh\u00e4lt. Nach jedem erlittenen Schaden besteht eine Chance von 100%, die Kampfkraft von 1 zuf\u00e4lligen verb\u00fcndeten Kavallerietrupp um 30% zu erh\u00f6hen [maximal 300%]. Dieser Effekt ist f\u00fcr jeden Trupp bis zu 10-mal stapelbar.',
  },
  'Octavius:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Wenn die HP erstmals unter 85% fallen, erleiden alle verb\u00fcndeten Trupps 3 Runden lang -50% Skillschaden. Fallen die HP erstmals unter 50%, erleiden alle gegnerischen Trupps sofort physischen Schaden mit einer Schadensrate von 350%. Fallen die HP erstmals unter 25%, erleiden sie erneut physischen Schaden mit einer Schadensrate von 350%. Bei jeder Ausl\u00f6sung erh\u00f6ht der Skill den eigenen Widerstand um 150%.',
  },
  'Boudica:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Boudica st\u00fcrmt vor. Mit einer Chance von 70% trifft sie 1 gegnerischen Trupp in der Mittel- oder Hinterreihe innerhalb g\u00fcltiger Reichweite 3-mal hintereinander und verursacht pro Treffer 200% Schaden. 40% des verursachten Schadens regenerieren die Truppenst\u00e4rke von 2 zuf\u00e4lligen verb\u00fcndeten Trupps.',
  },
  'Boudica:5': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Boudica besitzt dauerhaft Nat\u00fcrlicher Schutz. Wenn sie Skillschaden verursacht, besteht eine Chance von 30%, dem Ziel einen Vernichtungsschlag zuzuf\u00fcgen. Handelt Boudica vor allen gegnerischen Trupps, steigt ihre Ausl\u00f6sechance f\u00fcr Skills und Vernichtungsschl\u00e4ge um 20%. Daf\u00fcr kann sie keine Normalangriffe ausf\u00fchren.',
  },
  'Boudica:8': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Vor dem Kampf erhalten 2 zuf\u00e4llige gegnerische Trupps in g\u00fcltiger Reichweite 5 Speermarken. Jeder Stapel erh\u00f6ht ihren erlittenen Skillschaden um 10% und l\u00e4sst die Schadensverz\u00f6gerung des Ziels au\u00dfer Kraft. Pro Runde wird 1 Stapel entfernt. Zus\u00e4tzlich besteht im Kampf pro Runde eine Chance von 60%, dem gegnerischen Trupp mit der niedrigsten Truppenst\u00e4rke 500% massiven Schaden zuzuf\u00fcgen.',
  },
  "Jeanne d'Arc:2": {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde Vorbereitung. 50 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps innerhalb des g\u00fcltigen Bereichs 477 % Schaden zuzuf\u00fcgen und die Trupps 30 % mehr Skillschaden erleiden zu lassen.',
  },
  "Jeanne d'Arc:5": {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: '1 Runde Vorbereitung. 65 % Chance, aus 2 zuf\u00e4lligen Trupps den Status \u201eWiederbelebt\u201c zu erreichen, mit 50 % Chance, bei erlittenem Schaden etwas Truppenst\u00e4rke wiederherzustellen (Wiederherstellungsrate: 101 %), h\u00e4lt 2 Runden an.',
  },
  "Jeanne d'Arc:8": {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Im Kampf haben verb\u00fcndete Kavallerietrupps eine Chance von 60%, beim Einsatz eines Vorbereitungsskills 1 Vorbereitungsrunde zu \u00fcberspringen. Der Effekt kann von jedem Trupp pro Runde bis zu 1-mal ausgel\u00f6st werden. Zus\u00e4tzlich besteht eine Chance von 80%, den Skillschaden des Heldentrupps 1 Runde lang um 86% zu erh\u00f6hen. Beide Effekte werden unabh\u00e4ngig voneinander gepr\u00fcft.',
  },
  'Alfred:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '35 % Chance, 2 gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 335 % Schaden zuzuf\u00fcgen und den Truppenst\u00e4rke-Wiederherstellungseffekt des Ziels um -40 % zu verringern. Wenn das Ziel bereits einem Status unterliegt, der die Wiederherstellung der Truppenst\u00e4rke verhindert oder die Wiederherstellung der Truppenst\u00e4rke einschr\u00e4nkt, erleidet das Ziel 2 Runden lang 30 % mehr Skillschaden.',
  },
  'Alfred:5': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Mit einer Chance von 30% f\u00fcgt der Held allen gegnerischen Trupps 492% massiven Schaden zu. Daf\u00fcr erleiden alle verb\u00fcndeten Trupps 95% Schaden.',
  },
  'Alfred:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Alfred greift ein, wenn die Lage kritisch wird. F\u00e4llt die Truppenst\u00e4rke seines Trupps erstmals unter 90 %/70 %/50 %/30 %, steigt seine Chance, Kampfskills einzusetzen, um 50 %. Sein Trupp verursacht 1 Runde lang 40 % mehr Skillschaden und erleidet -35 % Schaden.',
  },
  'Ramses II:2': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 2 Runden erleiden alle gegnerischen und verb\u00fcndeten Trupps -45% physischen Schaden. In den Runden 3-6 haben alle verb\u00fcndeten Trupps eine Chance von 80%, pro Runde 2 Normalangriffe auszuf\u00fchren.',
  },
  'Ramses II:5': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Alle verb\u00fcndeten Bogensch\u00fctzentrupps erhalten im Kampf 40% Todessto\u00df-Chance. Der Skill kann die Todessto\u00df-Chance auf bis zu 60% erh\u00f6hen. Jeder Anteil \u00fcber diesem Limit wird mit dem 3-Fachen multipliziert und in zus\u00e4tzliche Todessto\u00df-Schadensrate umgewandelt.',
  },
  'Ramses II:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Jedes Mal, wenn Ihr Trupp den \u201eT\u00f6dlichen Schlag\u201c ausl\u00f6st, wird etwas Truppenkraft f\u00fcr den Trupp wiederhergestellt (Wiederherstellungsrate: 238 %) und die Schadensrate seines T\u00f6dlichen Schlags um 80 % [560 % max.] (bis zu 7-mal stapelbar) erh\u00f6ht, was bis zum Ende des Kampfes anh\u00e4lt.',
  },
  'Cleopatra VII:2': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'In den ersten 4 Runden hat der befreundete Trupp mit der niedrigsten Truppenst\u00e4rke eine Chance von 40 %, dem eingehenden Schaden auszuweichen, wenn er angegriffen wird; Ab Runde 4 stellt Ihr Trupp mit der niedrigsten Truppenst\u00e4rke etwas Truppenst\u00e4rke wieder her (Erholungsrate: 150 %).',
  },
  'Cleopatra VII:5': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Cleopatra hypnotisiert den Gegner. Nach jeweils 2 Normalangriffen eines gegnerischen Trupps besteht eine Chance von 50%, ihn zu verwirren. Der betroffene Trupp w\u00e4hlt f\u00fcr seinen Skill oder Normalangriff ein zuf\u00e4lliges Ziel. H\u00e4lt 1 Runde an.',
  },
  'Cleopatra VII:8': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Wenn der Held handelt, besteht eine Chance von 100%, den verwirrten gegnerischen Trupp zus\u00e4tzlich mit Verwundbar zu belegen. Nach jedem erlittenen Schaden erleidet das Ziel beim n\u00e4chsten Treffer 15% mehr Schaden. H\u00e4lt 2 Runden an. Zus\u00e4tzlich besteht eine Chance von 50%, sofort 225% Schaden zu verursachen.',
  },
  'King Arthur:2': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Der Schaden, den der Held zu Beginn des Kampfes erleidet, betr\u00e4gt -80 %. Jedes Mal, wenn der Held Schaden erleidet, wird der Schadensminderungseffekt um 8 % verringert, der Widerstand um 20 % erh\u00f6ht und der verursachte Schaden um 10 % erh\u00f6ht (stapelbar bis zu 16 Stapel), wirksam bis zum Ende des Kampfes.',
  },
  'King Arthur:5': {
    type: 'Zusatzangriff',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Arthur schwingt sein heiliges Schwert. Nach einem Normalangriff besteht eine Chance von 50%, 1 zuf\u00e4lligen gegnerischen Trupp in g\u00fcltiger Reichweite mit 700% physischem Schaden zu treffen. 40% dieses Schadens regenerieren die Truppenst\u00e4rke von 2 zuf\u00e4lligen verb\u00fcndeten Trupps. Nach dem Einsatz von Schwert im Stein besteht eine Chance von 50%, den Skill zus\u00e4tzlich einmal auf einen gegnerischen Trupp in der Mittel- oder Hinterreihe anzuwenden.',
  },
  'King Arthur:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Arthur erh\u00f6ht dauerhaft alle erhaltenen Heileffekte um 15%. Nach jeweils 6 Schadensinstanzen durch verb\u00fcndete Trupps steigt die Ausl\u00f6sechance von Schwert im Stein um 4%. Der Effekt ist bis zu 5-mal stapelbar und h\u00e4lt bis zum Kampfende an. Bei maximalen Stapeln besteht eine Chance von 100%, den Ausweichstatus des Gegners beim Verursachen von Schaden zu ignorieren. H\u00e4lt 2 Runden an.',
  },
  'Leonidas:2': {
    type: 'Zusatzangriff',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Nach dem Starten eines normalen Angriffs besteht eine Chance von 40 %, dass die Kampfkraft -50 % und der Widerstand -50 % f\u00fcr 2 zuf\u00e4llige feindliche Trupps innerhalb der g\u00fcltigen Reichweite erhalten und die Trupps f\u00fcr 1 Runde mit Stille belegt werden.',
  },
  'Leonidas:5': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Mit einer Chance von 50% f\u00fcgt der Held 2-3 zuf\u00e4lligen gegnerischen Trupps in g\u00fcltiger Reichweite 220% Schaden zu.',
  },
  'Leonidas:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 2 Runden regenerieren alle verb\u00fcndeten Bogensch\u00fctzentrupps pro Runde Truppenst\u00e4rke mit einer Regenerationsrate von 55%. Ab Runde 3 erleiden sie -30% Schaden und erhalten 5% Lebensraub. H\u00e4lt bis zum Kampfende an.',
  },
  'Isabella I:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Pro Runde besteht eine Chance von 70%, 1 zuf\u00e4lligen gegnerischen Trupp 6-mal mit Drachenfeuer zu treffen und pro Treffer 83% Verbrennungsschaden zu verursachen. Werden in einer Runde alle gegnerischen Trupps getroffen, erh\u00e4lt 1 zuf\u00e4lliger verb\u00fcndeter Trupp 1 Runde lang Klarheit und wird gegen Unterdr\u00fcckung, Stille, Entwaffnung und Verwirrung immun.',
  },
  'Isabella I:5': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Ab Runde 3 bleibt der Heldentrupp dauerhaft in Flammen. Daf\u00fcr besteht pro Runde eine Chance von 70%, 2 zuf\u00e4lligen gegnerischen Trupps 236% Verbrennungsschaden zuzuf\u00fcgen und ihren Kampfskillschaden um -20% zu ver\u00e4ndern.',
  },
  'Isabella I:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Gew\u00e4hrt allen durch Skill 2 unbeirrten verb\u00fcndeten Trupps einen Schild, der den erlittenen Schaden f\u00fcr die n\u00e4chsten 2 Treffer um -50% ver\u00e4ndert. Wenn der Held erstmals in Flammen steht, regeneriert der Trupp in der Frontreihe Truppenst\u00e4rke mit einer Regenerationsrate von 304 und unterdr\u00fcckt 1-2 zuf\u00e4llige gegnerische Trupps in g\u00fcltiger Reichweite f\u00fcr die n\u00e4chste 1 Runde.',
  },
  'Desert Storm:2': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Lassen Sie in den Runden 1, 3 und 5 alle gegnerischen Trupps \u201eVerflucht\u201c, \u201eBrennen\u201c und \u201eVergiftet\u201c betreten und verursachen Sie in den entsprechenden Runden 24 %, 29 % und 34 % Schaden, der bis zum Ende des Kampfes anh\u00e4lt.',
  },
  'Desert Storm:5': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Zu Beginn von Runde 5 regenerieren 2 zuf\u00e4llige verb\u00fcndete Trupps in jeder Runde Truppenst\u00e4rke mit einer Regenerationsrate von 60%.',
  },
  'Desert Storm:8': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '100 % Chance, einem gegnerischen Trupp in Reichweite 243 % Schaden zuzuf\u00fcgen und Kanalisierungsf\u00e4higkeiten zu unterbrechen.',
  },
  'Soaring Hawk:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Mit einer Chance von 40% f\u00fcgt der Held 2 zuf\u00e4lligen gegnerischen Trupps in Reichweite 179% Schaden zu, senkt ihre Kampfkraft um -38% und h\u00e4lt 2 Runden an.',
  },
  'Soaring Hawk:5': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Heldentrupps haben bei einem Standardangriff eine Chance von 100 %, einen Gegenangriff durchzuf\u00fchren, und f\u00fcgen der angreifenden Quelle 120 % Schaden zu.',
  },
  'Soaring Hawk:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 2 Runden erleiden alle befreundeten Trupps -30 % Schaden, nach Runde 3 regeneriert der Heldentrupp 30 % der Einheiten, wenn er Schaden verursacht.',
  },
  'The Brave:2': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'In den ersten 3 Runden der Schlacht besteht eine Chance von 80 % pro Runde, 2 feindliche Trupps in Reichweite zu entwaffnen.',
  },
  'The Brave:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Nach 1 Runde Vorbereitung besteht eine Chance von 30%, 2 zuf\u00e4llige gegnerische Trupps in Reichweite 2 Runden lang mit Stille zu belegen.',
  },
  'The Brave:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Im Kampf verlieren alle gegnerischen Trupps -60% Kampfkraft und Widerstand sowie -100 Kampftempo. Ihr erlittener Schaden steigt um 5% und ihr verursachter Schaden sinkt um -5%. Ab Runde 5 verursachen alle verb\u00fcndeten Kavallerietrupps 40% mehr Schaden.',
  },
  'Jade Eagle:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '40 % Chance, 2 Angriffe auszuf\u00fchren, die jeweils 2 zuf\u00e4lligen gegnerischen Trupps in Reichweite 142 % Schaden zuf\u00fcgen. Jeder Angriff hat eine Chance von 25 %, die Ziele 1 Runde lang mit Stille zu belegen.',
  },
  'Jade Eagle:4': {
    type: 'F\u00fchrungsskill',
    target: 'Trupp des Helden',
    desc: 'Bogensch\u00fctzen im Heldentrupp haben 60 % mehr Kampfkraft, 20 % mehr verursachten Schaden und 20 % mehr erlittenen Schaden.',
  },
  'Jade Eagle:5': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde Vorbereitung. 50 % Chance, allen gegnerischen Trupps 310 % Schaden zuzuf\u00fcgen und sie 1 Runde lang je nach Truppentyp zu schw\u00e4chen: Infanterie kann keine Truppenst\u00e4rke regenerieren, Kavallerie erh\u00e4lt -50 % Kampfskillschaden und Bogensch\u00fctzen werden entwaffnet.',
  },
  'Jade Eagle:8': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'In Runde 2 und 4 besteht eine Chance von 100 %, 3 zuf\u00e4lligen gegnerischen Trupps in Reichweite 863 % massiven Schaden zuzuf\u00fcgen; Wenn das Ziel entwaffnet oder unterdr\u00fcckt ist, erleidet es 40 % mehr Schaden. dauert 2 Runden.',
  },
  'Immortal Guardian:2': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Erlittener Schaden des Heldentrupps -30 %',
  },
  'Immortal Guardian:5': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Wenn im Kampf 2 zuf\u00e4llige gegnerische Trupps in Reichweite Kampfskills oder Normalangriffe einsetzen, verursachen sie -5% Schaden. Dieser Effekt ist bis zu 8-mal stapelbar.',
  },
  'Immortal Guardian:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 3 Runden erleiden alle verb\u00fcndeten Trupps -20% Schaden. Wenn sie Schaden erleiden, besteht eine Chance von 50%, Truppenst\u00e4rke mit einer Regenerationsrate von 45% wiederherzustellen.',
  },
  'Divine Arrow:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '25 % Chance, 2 zuf\u00e4lligen Feinden 211 % Schaden zuzuf\u00fcgen und sie f\u00fcr 1 Runde zu entwaffnen.',
  },
  'Divine Arrow:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '30 % Chance, einen Kettenstatus zu verursachen, der 2 zuf\u00e4llige Feinde verbindet. Wenn ein Trupp Schaden erleidet, erleidet der andere ebenfalls 25 % Schaden, was 2 Runden anh\u00e4lt.',
  },
  'Divine Arrow:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Im Kampf haben alle befreundeten Bogensch\u00fctzen den Splash-Status. Einfache Angriffe k\u00f6nnen au\u00dferdem 40 % Schaden an 2 gegnerischen Trupps in der hinteren Reihe verursachen.',
  },
  'Che Liu:2': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: '50 % erh\u00f6hter Schaden f\u00fcr den Trupp. Wenn die aktuelle Truppe halbiert wird, erh\u00e4ltst du 100 % zus\u00e4tzliche Kampfkraft und Widerstand',
  },
  'Che Liu:5': {
    type: 'Zusatzangriff',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Nach automatischen Angriffen besteht eine Chance von 100 %, einem gegnerischen Trupp in Reichweite 247 % Schaden zuzuf\u00fcgen',
  },
  'Che Liu:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: '100 % Chance, zwei normale Angriffe auszuf\u00fchren, wenn die aktuelle Truppenst\u00e4rke unter 50 % der Menge zu Beginn des Gefechts f\u00e4llt. Wenn die Truppe dieses Helden besiegt wird oder die Moral gebrochen ist, k\u00e4mpft dieser Held noch eine weitere Runde weiter (wenn beim Angriff auf Gebiete die Loyalit\u00e4t der Legion geringer ist als der Eifer der Rebellen, kann der Held nicht weiterk\u00e4mpfen).',
  },
  'War Lord:2': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'W\u00e4hrend des Kampfes erleiden alle befreundeten Kavallerietrupps -20 % des Normalangriffsschadens und 45 % mehr Kampff\u00e4Skillschaden.',
  },
  'War Lord:5': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'In den ersten 2 Runden besteht jedes Mal, wenn der Heldentrupp Schaden erleidet, eine Chance von 70%, diesem Schaden durch Ausweichen vollst\u00e4ndig zu entgehen.',
  },
  'War Lord:8': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Mit einer Chance von 100% wird die endg\u00fcltige Ausl\u00f6sechance des Kampfskills von 1 zuf\u00e4lligen verb\u00fcndeten Trupp in den Runden 1, 3, 5 und 7 auf 100% erh\u00f6ht. Ben\u00f6tigt der Skill Vorbereitung, besteht eine Chance von 60%, 1 Vorbereitungsrunde zu \u00fcberspringen.',
  },
  'Jane:2': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Nach 1 Runde Vorbereitung besteht eine Chance von 35%, allen gegnerischen Trupps in Reichweite 334,5% Schaden zuzuf\u00fcgen.',
  },
  'Jane:5': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '30 % Chance, allen gegnerischen Trupps in Reichweite 255 % Schaden zuzuf\u00fcgen, sodass sie keine Einheiten zur\u00fcckgewinnen k\u00f6nnen. Dauer: 2 Runden.',
  },
  'Jane:8': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Im Kampf kann der Heldentrupp keine Normalangriffe ausf\u00fchren. Daf\u00fcr steigt sein Kampfskillschaden um 35 % und er f\u00fcgt einem zuf\u00e4lligen gegnerischen Trupp in Reichweite zus\u00e4tzlich 301 % Skillschaden zu.',
  },
  'Sky Breaker:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '40 % Chance, 2 zuf\u00e4lligen Feinden 325 % Schaden zuzuf\u00fcgen und den Skillschaden f\u00fcr 2 Runden -20 % zu verursachen.',
  },
  'Sky Breaker:5': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'In den ersten 2 Runden werden 2 zuf\u00e4llige gegnerische Trupps entwaffnet und k\u00f6nnen keine Normalangriffe ausf\u00fchren. In Runde 2 erleiden alle gegnerischen Trupps 267,5% Schaden.',
  },
  'Sky Breaker:8': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde Vorbereitung. 50 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps 260 % Schaden zuzuf\u00fcgen und die Truppenst\u00e4rke des eigenen sowie eines zuf\u00e4lligen verb\u00fcndeten Trupps zu regenerieren (Regenerationsrate: 142 %).',
  },
  'Rokuboshuten:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Mit einer Chance von 40% f\u00fcgt der Held 2 zuf\u00e4lligen gegnerischen Trupps 255% Schaden zu und senkt ihre Kampfkraft und ihren Widerstand um -55%. H\u00e4lt 2 Runden an.',
  },
  'Rokuboshuten:5': {
    type: 'Statusskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Wenn der Held im Kampf einen Vorbereitungsskill einsetzt, besteht eine Chance von 100%, dass der Heldentrupp 2 Runden lang Klarheit erh\u00e4lt und gegen Stille, Entwaffnung, Unterdr\u00fcckung und Verwirrung immun wird. Nach dem Einsatz eines Kampfskills besteht eine Chance von 100%, Kampfkraft und Widerstand von zwei zuf\u00e4lligen verb\u00fcndeten Trupps um 100% zu erh\u00f6hen. H\u00e4lt 2 Runden an.',
  },
  'Rokuboshuten:8': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Nach 1 Runde Vorbereitung besteht eine Chance von 40%, allen gegnerischen Trupps 196,5% Schaden zuzuf\u00fcgen und sie mit Stille zu belegen, sodass sie keine Kampfskills einsetzen k\u00f6nnen. H\u00e4lt 1 Runde an.',
  },
  'Bleeding Steed:2': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 3 Runden haben 2 befreundete Trupps 60 % Bonusschaden.',
  },
  'Bleeding Steed:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Nach 1 Runde Vorbereitung besteht eine Chance von 50%, 2 zuf\u00e4llige gegnerische Trupps zu verwirren. Die Skills und Normalangriffe der Ziele w\u00e4hlen dadurch zuf\u00e4llige Ziele. H\u00e4lt 2 Runden an.',
  },
  'Bleeding Steed:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Wenn im Kampf alle verb\u00fcndeten Trupps Schaden erleiden, besteht eine Chance von 50%, Truppenst\u00e4rke mit einer Regenerationsrate von 33% wiederherzustellen.',
  },
  'Rozen Blade:2': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Mit einer Chance von 30% werden Debuffs von verb\u00fcndeten Kavallerie- und Bogensch\u00fctzentrupps entfernt, ausgenommen Debuffs durch Vorkampfskills. Ihre Normalangriffe erhalten eine Chance von 25%, 1 Runde lang Unterdr\u00fcckung zu verursachen. H\u00e4lt 1 Runde an.',
  },
  'Rozen Blade:5': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 3 Runden erhalten alle verb\u00fcndeten Trupps 100 Kampfgeschwindigkeit und eine Chance von 70 %, pro Runde 2 Normalangriffe auszuf\u00fchren. Effekte desselben Typs sind nicht stapelbar.',
  },
  'Rozen Blade:8': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Wenn im Kampf 2 zuf\u00e4llige gegnerische Trupps Schaden erleiden, erh\u00f6ht sich ihr erlittener Schaden um 12%. Bis zu 5-mal stapelbar.',
  },
  'Jade:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '1 Runde Vorbereitung. 40 % Chance, 6 Mal anzugreifen. Jeder Angriff w\u00e4hlt zuf\u00e4llig einen gegnerischen Trupp in Reichweite aus und verursacht 162 % Schaden.',
  },
  'Jade:5': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Der Trupp mit Held erh\u00f6ht den Schaden um 10 %. Dieser Effekt wird einmal in jeder Runde gestapelt.',
  },
  'Jade:8': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '40 % Chance, 2 zuf\u00e4lligen Trupps innerhalb der effektiven Reichweite 160 % Schaden zuzuf\u00fcgen und einem feindlichen Trupp den Status \u201eFluch\u201c zu verleihen, der 2 Runden lang 80 % Schaden erleidet, wenn er Kampfskills einsetzt.',
  },
  'Witch Hunter:2': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Chance von 30 %, allen gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 237 % Schaden zuzuf\u00fcgen und ihnen den Status \u201eEntflammbar\u201c zu verleihen, wodurch der brennende Schaden, den sie erleiden, f\u00fcr 2 Runden um 35 % erh\u00f6ht wird.',
  },
  'Witch Hunter:5': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'In den ersten drei Runden verursachen 2 zuf\u00e4llige gegnerische Trupps -75% Kampfskillschaden. Zus\u00e4tzlich besteht eine Chance von 90%, sie 1 Runde lang mit Stille zu belegen, sodass sie keine Kampfskills einsetzen k\u00f6nnen.',
  },
  'Witch Hunter:8': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '40 % Chance, den gesamten Trupp innerhalb der Reichweite anzugreifen und ihm 135 % Schaden zuzuf\u00fcgen und dem Trupp den Brennstatus zu verleihen, 142 % Schaden zu erleiden, h\u00e4lt 2 Runden lang an.',
  },
  'Peace Bringer:2': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Der Trupp des Helden hat in jeder Runde eine Chance von 50 %, verst\u00e4rkt zu werden, wodurch er in diesen Runden -50 % weniger Schaden erleidet. Der Trupp des Helden hat bei einem normalen Angriff eine Chance von 35 %, einen Gegenangriff durchzuf\u00fchren, der der Schadensquelle 190 % Schaden zuf\u00fcgt.',
  },
  'Peace Bringer:5': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten drei Runden erhalten alle Trupps -45 % verursachten Schaden und alle verb\u00fcndeten Trupps -20 % erlittenen Schaden. Ab der vierten Runde steigt der Kampfskillschaden aller verb\u00fcndeten Trupps bis zum Kampfende um 20 %.',
  },
  'Peace Bringer:8': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '30 % Chance, allen gegnerischen Trupps in der Reichweite 203 % Schaden zuzuf\u00fcgen und dem Trupp den Status \u201eVerwundbar\u201c zu verleihen, wobei jedes Mal, wenn der Feind angegriffen wird, in der letzten 1 Runde zus\u00e4tzlich 20 % Schaden verursacht werden.',
  },
  'Inquisitor:2': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde Vorbereitung. 35 % Chance, allen gegnerischen Trupps in Reichweite 246 % Schaden zuzuf\u00fcgen und sie 2 Runden lang zu entwaffnen, sodass sie keine Normalangriffe ausf\u00fchren k\u00f6nnen.',
  },
  'Inquisitor:5': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Erh\u00f6ht den von Bogensch\u00fctzen erlittenen Schaden an allen gegnerischen Trupps um 50 %.',
  },
  'Inquisitor:8': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '35 % Chance, 2 zuf\u00e4lligen Trupps in Reichweite 342 % Schaden zuzuf\u00fcgen. Wenn sich das Ziel im Status \u201eEntflammbar\u201c befindet, besteht eine Chance von 50 %, es in den Status \u201eUnterdr\u00fccken\u201c zu versetzen und sich nicht bewegen zu k\u00f6nnen.',
  },
  'BeastQueen:2': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In der ersten Runde wurde der Schaden der normalen Angriffs- und Verfolgungsfertigkeiten aller unserer Trupps um 80 % erh\u00f6ht, der Effekt wurde um 1/4 Runde verringert.',
  },
  'BeastQueen:5': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 3 Runden haben 2 zuf\u00e4llige befreundete Trupps eine Chance von 70 %, in den Streuschuss-Status zu gelangen. Ein normaler Angriff verursacht 160 % Schaden an 2 feindlichen Trupps hinter dem Ziel.',
  },
  'BeastQueen:8': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'In den ersten 3 Runden hat der Kavallerietrupp in der Frontreihe eine Chance von 70%, in den Konterangriffsstatus zu wechseln. Wird er normal angegriffen, f\u00fcgt er dem Angreifer 250% Gegenschaden zu.',
  },
  'Cao Cao:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '80 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 157 % Schaden zuzuf\u00fcgen.',
  },
  'Cao Cao:5': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Jedes Mal, wenn Cao Cao einen Kampfskill einsetzt, steigt der Schaden seines Trupps um 18 %. Bis zu 10-mal stapelbar und bis zum Kampfende aktiv.',
  },
  'Cao Cao:7': {
    type: 'Aktivskill',
    target: 'Legion des Helden',
    desc: 'Nach Einsatz der Fertigkeit verf\u00fcgt die Heldenformation \u00fcber 100 % zus\u00e4tzliche Marschgeschwindigkeit, 70 % zus\u00e4tzliche Kampfkraft der Infanterie f\u00fcr 20 Minuten und 15 Stunden Abklingzeit. Wenn es nicht aktiv ist, wird der Effekt im Kampf zu 50 % genutzt.',
  },
  'Cao Cao:8': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Mit einer Chance von 50% f\u00fcgt der Held 1 zuf\u00e4lligen gegnerischen Trupp 396% Schaden zu und belegt ihn mit Wankend. Jedes Mal, wenn das Ziel Schaden erleidet, erleidet es zus\u00e4tzlich 302% Schaden. Dieser Effekt kann bei jedem Einsatz des Skills bis zu 3-mal ausgel\u00f6st werden und h\u00e4lt 1 Runde an.',
  },
  'Charles the Great:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '40 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 255 % Schaden zuzuf\u00fcgen und den Widerstand der Ziele f\u00fcr 2 Runden um -170 % zu senken.',
  },
  'Charles the Great:5': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 4 Runden verursachen 2 zuf\u00e4llige verb\u00fcndete Trupps 20% mehr Schaden. Bis zu 4-mal stapelbar und bis zum Kampfende aktiv.',
  },
  'Charles the Great:8': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Mit einer Chance von 50% f\u00fcgt der Held 1 zuf\u00e4lligen gegnerischen Trupp in g\u00fcltiger Reichweite 510% Schaden zu. Zus\u00e4tzlich erh\u00e4lt der verb\u00fcndete Trupp in der Hinterreihe eine Chance von 100%, den n\u00e4chsten 2 Schadensinstanzen auszuweichen.',
  },
  'Black Prince:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '35 % Chance, 2 zuf\u00e4lligen feindlichen Trupps innerhalb des g\u00fcltigen Bereichs 1 Status aus Unterdr\u00fccken, Stille und Entwaffnen zu verleihen, f\u00fcr 2 Runden.',
  },
  'Black Prince:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Max. Lvl. 60 % Chance, 200 % Widerstand von 2 zuf\u00e4lligen feindlichen Trupps innerhalb der g\u00fcltigen Reichweite zu stehlen, h\u00e4lt 2 Runden an (bis zu 2 Mal stapelbar).',
  },
  'Black Prince:8': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde Vorbereitung. 50 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps in Reichweite 490 % Schaden zuzuf\u00fcgen und ihnen 2 Runden lang -150 % Kampfkraft zu verleihen.',
  },
  'Lionheart:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '40 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 250 % Schaden zuzuf\u00fcgen und den Skillschaden von L\u00f6wenherz 1 Runde lang um 40 % zu erh\u00f6hen.',
  },
  'Lionheart:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde Vorbereitung. 50 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps in Reichweite 288 % Schaden und dem gegnerischen Trupp mit dem niedrigsten Widerstand zus\u00e4tzlich 288 % Schaden zuzuf\u00fcgen.',
  },
  'Lionheart:7': {
    type: 'Aktivskill',
    target: 'Legion des Helden',
    desc: 'Nach dem Einsatz erh\u00e4lt die Heldenformation 20 Minuten lang 100 % Marschgeschwindigkeit und 70 % Kavallerie-Kampfkraft. Abklingzeit: 15 Stunden. Solange der Skill nicht aktiv ist, wirken im Kampf 50 % des Bonus.',
  },
  'Lionheart:8': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde vorbereiten. 60 % Chance, allen gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 343 % massiven Schaden zuzuf\u00fcgen; Verleiht dem L\u00f6wenherz beim Vorbereiten f\u00fcr 1 Runde den Status \u201eErster angreifen\u201c.',
  },
  'Al Fatih:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: '80 % Chance, den verursachten Schaden bei normalen Angriffen von Al Fatih 1 Runde lang um 60 % zu erh\u00f6hen.',
  },
  'Al Fatih:5': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Al Fatih zielt bei normalen Angriffen auf 1 zuf\u00e4lligen gegnerischen Trupp und hat eine Chance von 50 %, \u201eTodessto\u00df\u201c zu wirken.',
  },
  'Al Fatih:7': {
    type: 'Aktivskill',
    target: 'Legion des Helden',
    desc: 'Nach Einsatz der Fertigkeit verf\u00fcgt die Heldenformation \u00fcber 100 % zus\u00e4tzliche Marschgeschwindigkeit, 70 % zus\u00e4tzliche Bogensch\u00fctzenmacht f\u00fcr 20 Minuten und 15 Stunden Abklingzeit. Wenn es nicht aktiv ist, wird der Effekt im Kampf zu 50 % genutzt.',
  },
  'Al Fatih:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Die Schadensrate des von Al Fatih gewirkten \u201eT\u00f6dlichen Schlags\u201c erh\u00f6ht sich um 60 %, wobei der Effekt bis zum Ende des Kampfes 1-mal pro Runde und bis zu 4-mal stapelbar ist.',
  },
  'Edward the Confessor:2': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Alle verb\u00fcndeten Trupps erhalten beim ersten Angriff mit einer Chance von 100% den Ausweichstatus. In den ersten 4 Runden besteht pro Runde eine Chance von 70%, den Skillschaden aller gegnerischen Trupps um -40% zu ver\u00e4ndern.',
  },
  'Edward the Confessor:5': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '35 % Chance, 1 zuf\u00e4lligen gegnerischen Trupp in g\u00fcltiger Reichweite mit 480 % Schaden zu treffen und das Ziel 1 Runde lang zu unterdr\u00fccken.',
  },
  'Edward the Confessor:8': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Ab Runde 3 kann der physische Schaden von 2 zuf\u00e4lligen verb\u00fcndeten Trupps pro Runde um 30% erh\u00f6ht werden. Bis zu 4-mal stapelbar und bis zum Kampfende aktiv.',
  },
  'Constantine the Great:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde vorbereiten. 45 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 330 % Schaden zuzuf\u00fcgen.',
  },
  'Constantine the Great:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '40 % Chance, 2 gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 203 % Schaden zuzuf\u00fcgen und den Skillschaden Ihres Trupps in der hinteren Reihe f\u00fcr 1 Runde um 50 % zu erh\u00f6hen.',
  },
  'Constantine the Great:8': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Wenn sich alle verb\u00fcndeten Trupps auf Vorbereitungsskills vorbereiten, besteht f\u00fcr Constantine eine Chance von 80%, 1 zuf\u00e4lligen gegnerischen Trupp in g\u00fcltiger Reichweite mit 304% Schaden zu treffen.',
  },
  'Genghis Khan:2': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde vorbereiten. 50 % Chance, allen gegnerischen Trupps den Status \u201eBlutend\u201c zu verleihen, wodurch sie 2 Runden lang jede Runde 213 % Schaden erleiden.',
  },
  'Genghis Khan:5': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '50 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 202 % Schaden zuzuf\u00fcgen. 50 % Chance, allen gegnerischen Trupps 202 % mehr Schaden zuzuf\u00fcgen.',
  },
  'Genghis Khan:8': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Nach jeweils 4 Kampfskills, die ein verb\u00fcndeter Trupp im Kampf einsetzt, regeneriert Genghis Khan die Truppenst\u00e4rke von 2 zuf\u00e4lligen verb\u00fcndeten Trupps mit einer Regenerationsrate von 152%.',
  },
  'Jiguang Qi:2': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '40 % Chance, allen gegnerischen Trupps innerhalb der g\u00fcltigen Reichweite 192 % Schaden zuzuf\u00fcgen.',
  },
  'Jiguang Qi:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '40 % Chance, 2 gegnerischen Trupps in g\u00fcltiger Reichweite 220 % Schaden zuzuf\u00fcgen, wodurch der von den Trupps verursachte physische Schaden 1 Runde lang um -40 % verringert wird.',
  },
  'Jiguang Qi:8': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Nach jeweils 2 Kampfskills eines verb\u00fcndeten Trupps steigt der Widerstand von Jiguang Qi um 80%. Bis zu 10-mal stapelbar und bis zum Kampfende aktiv.',
  },
  'Valkyrie:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Mit einer Chance von 100% kann der eigene Trupp keine Normalangriffe ausf\u00fchren, verursacht daf\u00fcr 30% mehr Schaden und h\u00e4lt 2 Runden an. Zus\u00e4tzlich f\u00fcgt er 1 zuf\u00e4lligen gegnerischen Trupp in Reichweite 218% Schaden zu.',
  },
  'Valkyrie:5': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde Vorbereitung. 45 % Chance, 3 gegnerischen Trupps in Reichweite 310 % Schaden zuzuf\u00fcgen.',
  },
  'Valkyrie:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Der Heldentrupp erh\u00e4lt 30 % Widerstand gegen Infanterie und Kavallerie. Pro Runde besteht eine Chance von 70 %, 50 % des Basiswiderstands des gegnerischen Trupps zu ignorieren.',
  },
  'Lawman:2': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Wenn der eigene Trupp Schaden erleidet, besteht eine Chance von 50 %, 2 zuf\u00e4lligen Trupps im Umkreis von 2 63 % Schaden zuzuf\u00fcgen.',
  },
  'Lawman:5': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Der eigene Trupp und 1 zuf\u00e4lliger verb\u00fcndeter Trupp regenerieren in jeder Runde Truppenst\u00e4rke mit einer Regenerationsrate von 96,5%.',
  },
  'Lawman:8': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: '40 % Chance, den erlittenen Schaden des eigenen Trupps um -30 % zu reduzieren und den Schaden der anderen 2 befreundeten Trupps um 30 % f\u00fcr 2 Runden zu erleiden.',
  },
  'Spectral Reaper:2': {
    type: 'Zusatzangriff',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Nach einem Normalangriff auf dasselbe Ziel besteht eine Chance von 35%, erneut anzugreifen und 742% Schaden zu verursachen. Das Ziel kann 1 Runde lang keine Truppenst\u00e4rke regenerieren.',
  },
  'Spectral Reaper:5': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '40 % Chance, 1 zuf\u00e4lligen gegnerischen Trupp innerhalb des g\u00fcltigen Bereichs 455 % Schaden zuzuf\u00fcgen, 90 % Chance, die normalen Angriffsversuche des Heldentrupps um 1 pro Runde zu erh\u00f6hen, Dauer 1 Runde.',
  },
  'Spectral Reaper:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Die Normalangriffe des Heldentrupps verursachen 100% mehr Schaden. Nach jedem eingesetzten Kampfskill erh\u00e4lt der Heldentrupp +40% Zusatzangriffs-Chance. H\u00e4lt 1 Runde an. Wenn ein gegnerischer Skill seine Wirkungsreichweite berechnet, gilt der Abstand zum Heldentrupp als um +1 erh\u00f6ht.',
  },
  'Defender:2': {
    type: 'Zusatzangriff',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Nach normalen Angriffen besteht eine Chance von 80 %, dass der Trupp des Helden 2 Runden lang Schaden von -20 % erleidet. Der Status ist stapelbar.',
  },
  'Defender:5': {
    type: 'Zusatzangriff',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '50 % Chance, nach einfachen Angriffen 1 zuf\u00e4lligen gegnerischen Trupp in Reichweite 310 % Schaden zuzuf\u00fcgen und einige Truppen f\u00fcr den Selbsttrupp wiederherzustellen (67 % Wiederherstellungsrate).',
  },
  'Defender:8': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: '35 % Chance, 2 zuf\u00e4llige befreundete Trupps zweimal angreifen zu lassen, mit 30 % erh\u00f6htem Schaden f\u00fcr 2 Runden.',
  },
  'Army Breaker:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: '55 % Chance, einige Truppen f\u00fcr 2 zuf\u00e4llige befreundete Trupps in Reichweite wiederherzustellen (84 % Wiederherstellungsrate) und Debuffs zu entfernen (Debuffs vor dem Kampf k\u00f6nnen nicht entfernt werden).',
  },
  'Army Breaker:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '40 % Chance, 2 zuf\u00e4llige gegnerische Trupps in Reichweite 2 Runden lang mit Stille zu belegen und ihnen -20 % verursachten Schaden zu verleihen.',
  },
  'Army Breaker:8': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Mit einer Chance von 30% erhalten alle verb\u00fcndeten Trupps eine Chance von 60%, den n\u00e4chsten 3 Schadensinstanzen auszuweichen. Zus\u00e4tzlich steigen Kampfkraft und Widerstand 2 Runden lang um 47%.',
  },
  'The Avalanche:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '60 % Chance, mehreren gegnerischen Zielen 226 % Schaden zuzuf\u00fcgen.',
  },
  'The Avalanche:5': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Nach 1 Runde Vorbereitung besteht eine Chance von 40%, 1 zuf\u00e4lligen gegnerischen Trupp in Reichweite mit 595% Schaden zu treffen. Zus\u00e4tzlich besteht eine Chance von 60%, dem gegnerischen Trupp in der Hinterreihe 310% Schaden zuzuf\u00fcgen und ihn 1 Runde lang zu unterdr\u00fccken, sodass er nicht handeln kann.',
  },
  'The Avalanche:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Im Kampf erh\u00e4lt der eigene Trupp Klarheit und wird gegen Stille, Entwaffnung, Unterdr\u00fcckung und Verwirrung immun. Zus\u00e4tzlich erh\u00e4lt er 60% Kampfkraft und verursacht 30% mehr Schaden.',
  },
  'Dach Tengri:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '100 % Chance, dass 1 zuf\u00e4lliger gegnerischer Trupp in Reichweite 6 % zus\u00e4tzlichen Schaden erleidet, 6 % weniger verursachter Schaden, -38 verringerte Kampfgeschwindigkeit und 2 zuf\u00e4llige befreundete Trupps -6 % weniger Schaden erleiden, -6 % zus\u00e4tzlichen Schaden verursachen, 38 erh\u00f6hte Kampfgeschwindigkeit f\u00fcr 1 Runde.',
  },
  'Dach Tengri:5': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Ab Runde 4 besteht in jeder Runde eine Chance von 70%, 2 zuf\u00e4llige gegnerische Trupps in Reichweite an der Regeneration von Truppenst\u00e4rke zu hindern und den erlittenen Schaden von 2 zuf\u00e4lligen verb\u00fcndeten Trupps um -25% zu ver\u00e4ndern.',
  },
  'Dach Tengri:8': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 3 Runden f\u00fcgt jede Runde 2 zuf\u00e4lligen befreundeten Trupps 7 % mehr Schaden zu (Effekt stapelbar), bis zum Ende des Kampfes, beginnend mit Runde 4, wird der Splash-Status gew\u00e4hrt, grundlegende Angriffe f\u00fcgen 2 feindlichen Trupps im Hintergrund bis zum Ende des Kampfes 40 % Schaden zu.',
  },
  'Tarantula:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '30 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps in Reichweite 641 % Schaden zuzuf\u00fcgen, w\u00e4hrend der Schaden, der vom Trupp des Helden und vom Trupp in der hinteren Reihe verursacht wird, f\u00fcr die n\u00e4chsten 2 Angriffe um 40 % erh\u00f6ht wird. Wenn der Trupp des Helden der Trupp in der hinteren Reihe ist, erh\u00e4lt er einen doppelten Schadens-Buff-Effekt. Dauert 2 Runden.',
  },
  'Tarantula:5': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Mit einer Chance von 35% f\u00fcgt der Held 1 zuf\u00e4lligen gegnerischen Trupp in Reichweite 402% Schaden zu. Vor der n\u00e4chsten Aktion des Trupps in der Hinterreihe f\u00fcgt er au\u00dferdem 1 zuf\u00e4lligen gegnerischen Trupp in Reichweite 4 der Hinterreihe 403% Schaden zu.',
  },
  'Tarantula:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Im Kampf erh\u00e4lt der Heldentrupp pro Runde zuf\u00e4llig einen der folgenden Buffs: 1 - regeneriert Truppenst\u00e4rke (Regenerationsrate: 100 %); 2 - erh\u00e4lt 60 % Kampfkraft, Widerstand, taktische Kampfkraft und taktischen Widerstand; 3 - erleidet -40 % Schaden.',
  },
  'Alexander:2': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'In den Runden 1 und 3 wird 1 zuf\u00e4lliger gegnerischer Trupp ersch\u00fcttert. Jedes Mal, wenn das Ziel Schaden erleidet, erleidet es zus\u00e4tzlich 325% Schaden. H\u00e4lt bis zum Kampfende an.',
  },
  'Alexander:5': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Der Held erleidet -60 % Schaden und erh\u00e4lt 20 % st\u00e4rkere Heilung, daf\u00fcr steigt sein erlittener Brandschaden um 300 %.',
  },
  'Alexander:8': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: '100 % Chance, alle gegnerischen Trupps bluten zu lassen, wodurch sie in jeder Runde 260 % Schaden erleiden, bevor sie handeln, und zwar bis zum Ende des Kampfes. Wenn der Trupp des Helden in einer Runde 25 % der gesamten Truppenst\u00e4rke verliert, wird am Ende dieser Runde ein Teil der Truppenst\u00e4rke des Trupps wiederhergestellt (Wiederherstellungsrate: 350 %).',
  },
  'Lancelot:2': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde Vorbereitung. 50 % Chance, allen gegnerischen Trupps 356 % Schaden zuzuf\u00fcgen; Wenn ein Ziel einer verringerten Heilwirkung ausgesetzt ist oder nicht in der Lage ist, die Truppenst\u00e4rke wiederherzustellen, f\u00fcgt es allen gegnerischen Trupps zus\u00e4tzlich 356 % Schaden zu, mit einer Chance von 90 %, dass jedes gegnerische Trupp f\u00fcr 1 Runde in den Unterdr\u00fcckt-Status \u00fcbergeht.',
  },
  'Lancelot:5': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Der Held kann keine normalen Angriffe ausf\u00fchren (der Effekt kann nicht aufgehoben werden). In jeder Runde besteht eine Chance von 100 %, 1 zuf\u00e4lligen feindlichen Trupp(en) 356 % Schaden zuzuf\u00fcgen, w\u00e4hrend der Held eines der Siegel aus \u201eMut/Gerechtigkeit/Gnade\u201c erh\u00e4lt (Mut: Schaden um 20 % erh\u00f6ht; Gerechtigkeit: Ausweichrate um 10 % erh\u00f6ht; Gnade: Der Siegeltr\u00e4ger kann bei Aktionen jede Runde etwas Truppenst\u00e4rke wiederherstellen, Wiederherstellungsrate: 67 %), h\u00e4lt bis zum Ende des Kampfes an und ist f\u00fcr bis zu 2 Stapel stapelbar; Wenn alle drei Siegel erlangt wurden, zielt die Fertigkeit stattdessen auf alle feindlichen Trupps.',
  },
  'Lancelot:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Zu Kampfbeginn erhalten alle verb\u00fcndeten Trupps einen Effekt: Beim Einsatz eines Vorbereitungsskills besteht eine Chance von 80%, 1 Vorbereitungsrunde zu \u00fcberspringen. Der Effekt kann bis zu 3-mal ausgel\u00f6st werden. Nachdem alle Ausl\u00f6sungen verbraucht wurden, erh\u00e4lt der Tr\u00e4ger 1 Siegel.',
  },
  'Ragnar:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '50 % Chance, einem zuf\u00e4lligen gegnerischen Trupp in g\u00fcltiger Reichweite 420 % Schaden zuzuf\u00fcgen.',
  },
  'Ragnar:5': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Verursacht in Runde 1 160 % Schaden, in Runde 3 320 % Schaden, in Runde 5 480 % Schaden und in Runde 7 jeweils 640 % Schaden an allen gegnerischen Trupps.',
  },
  'Ragnar:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Nach dem Verursachen von Schaden besteht eine Chance von 50%, dem Heldentrupp und dem Trupp in der Hinterreihe jeweils 8% Todessto\u00df- und Vernichtungsschlag-Chance zu gew\u00e4hren. H\u00e4lt bis zum Kampfende an und ist bis zu 5-mal stapelbar. Die letzte Zeile des Screenshots muss noch best\u00e4tigt werden.',
  },
  'Bjorn:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '40 % Chance, 1 zuf\u00e4lligen gegnerischen Trupp in Reichweite 2-mal anzugreifen und dabei jedes Mal 348 % Schaden zu verursachen. Jeder Angriff zielt zuf\u00e4llig auf einen Feind.',
  },
  'Bjorn:5': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Alle befreundeten Trupps verursachen +70 % Schaden an mit Stille belegten, entwaffneten, unterdr\u00fcckten und verwirrten feindlichen Trupps. Feindliche Trupps haben eine Chance von 30 %, die Dauer des Kontrolldebuffs um 1 Runde zu verl\u00e4ngern (mit Stille belegt, entwaffnet, unterdr\u00fcckt und verwirrt).',
  },
  'Bjorn:8': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'In den ersten 3 Runden verursachen 2 zuf\u00e4llige gegnerische Trupps in Reichweite -30% Schaden. In Runde 4 werden diese Trupps verwirrt und greifen 2 Runden lang zuf\u00e4llige Ziele an oder setzen Skills gegen sie ein.',
  },
  'Skanda:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Mit einer Chance von 50% heilt der Held den eigenen Trupp und den Trupp in der Frontreihe mit einer Regenerationsrate von 247%. Befindet sich der eigene Trupp bereits in der Frontreihe, wird die Heilung verdoppelt.',
  },
  'Skanda:5': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '70 % Chance, dem am weitesten entfernten gegnerischen Trupp in Reichweite 260 % Schaden zuzuf\u00fcgen und ihn 1 Runde lang zu unterdr\u00fccken.',
  },
  'Skanda:8': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Entfernt in Runde 5 die Debuffs des verb\u00fcndeten Trupps in der Frontreihe. Wenn das Ziel Schaden erleidet, besteht eine Chance von 100 %, diesem Schaden auszuweichen und 2 Runden lang dagegen immun zu werden.',
  },
  'Liberator:2': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: '50 % Chance auf einen Gegenangriff mit 150 % Schaden, wenn er von normalen Angriffen getroffen wird. Au\u00dferdem besteht eine Chance von 50 %, dass Ihr eigener Trupp in jeder Runde -60 % Skillschaden erleidet, was 1 Runde anh\u00e4lt.',
  },
  'Liberator:5': {
    type: 'Zusatzangriff',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Normalangriffe haben eine Chance von 80%, 1 Runde lang Heilungsblockade zu verursachen. Zus\u00e4tzlich besteht eine Chance von 70%, der Hinterreihe 1 Runde lang Klarer Geist zu verleihen und sie gegen Stille, Entwaffnung, Unterdr\u00fcckung und Verwirrung immun zu machen.',
  },
  'Liberator:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Wenn sich der Trupp des Helden in der ersten Reihe befindet, erleiden alle verb\u00fcndeten Trupps in den ersten 3 Runden -20 % weniger Schaden. Ab der 4. Runde werden 40 % des Schadens, den Ihr Trupp in der hinteren Reihe verursacht, nach Ende des Effekts in sich erholende Truppen in der ersten Reihe umgewandelt.',
  },
  'Ashen Verdict:2': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'Ashen Verdict erh\u00e4lt f\u00fcr jeden Normalangriff eines verb\u00fcndeten Trupps 1 Verfolgungsmarke. Bei 7 Marken erleiden alle gegnerischen Trupps zus\u00e4tzlich 400% Schaden und s\u00e4mtliche Marken werden entfernt.',
  },
  'Ashen Verdict:5': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: '35 % Chance, dass der Heldentrupp pro Runde 1 zus\u00e4tzlichen Normalangriff ausf\u00fchrt. H\u00e4lt 2 Runden an; w\u00e4hrenddessen ist der Trupp gegen Entwaffnung immun.',
  },
  'Ashen Verdict:8': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Nach jeweils 2 Normalangriffen hat der Heldentrupp eine Chance von 35 %, einen der folgenden Effekte auf einen zuf\u00e4lligen gegnerischen Trupp anzuwenden: Entwaffnung, Stille, Verwirrung, Unterbrechung oder blockierte Truppenregeneration. Jeder Effekt wird unabh\u00e4ngig gepr\u00fcft und h\u00e4lt 1 Runde an.',
  },
  'Warden:2': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'In den ersten 4 Runden steigt die Ausl\u00f6sechance des 5. Skills der beiden anderen Helden um 10%. Dies gilt nur f\u00fcr Kampfskills und passive Skills. In Runde 5 steigt die Ausl\u00f6sechance um 30%, jedoch nur f\u00fcr den 5. Skill eines der beiden anderen Helden.',
  },
  'Warden:5': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps sowie ein zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Wenn der eigene Trupp mit Stille, Entwaffnung, Unterdr\u00fcckung oder Verwirrung belegt ist, erleidet er -70% Schaden. Dieser Effekt kann pro Trupp im Kampf bis zu 3-mal ausgel\u00f6st werden. In den Runden 1 und 5 f\u00fcgt der Held einem zuf\u00e4lligen gegnerischen Trupp 510% Schaden zu.',
  },
  'Warden:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps',
    desc: 'W\u00e4hrend K\u00e4mpfen sind normale Angriffe f\u00fcr den Trupp des Helden deaktiviert, aber Ihr Trupp in der hinteren Reihe erh\u00e4lt einen Buff: +1 normaler Angriff pro Runde. Jeder normale Angriff erh\u00f6ht den Schaden der n\u00e4chsten Fertigkeit um 12 %, stapelbar bis zu 5 Runden.',
  },
  'Warhammer:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp sowie ein zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Jedes Mal, wenn ein verb\u00fcndeter Trupp Schaden erleidet, erh\u00e4lt der Held +1 Ladung Reflektierende R\u00fcstung. Bei 9 Ladungen erh\u00e4lt ein zuf\u00e4lliger verb\u00fcndeter Trupp Reflektierender Schild; mit einer Chance von 30 % wird ein weiterer Schild gew\u00e4hrt. Der Schild hebt 100 % des n\u00e4chsten eingehenden Schadens auf, wirft ihn auf den Angreifer zur\u00fcck und sch\u00fctzt den Tr\u00e4ger vor dieser Schadensinstanz. Nach der Vergabe werden alle Ladungen Reflektierende R\u00fcstung zur\u00fcckgesetzt.',
  },
  'Warhammer:5': {
    type: 'Kampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps sowie ein zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: '100 % Chance, allen feindlichen Trupps 108 % Schaden zuzuf\u00fcgen, aber alle befreundeten Trupps erhalten 20 % des Schadens, der feindlichen Trupps zugef\u00fcgt wird. Dieser Schaden liefert Ladungen f\u00fcr reflektierende R\u00fcstung.',
  },
  'Warhammer:8': {
    type: 'Vorkampfskill',
    target: '3 zuf\u00e4llige gegnerische Trupps sowie ein zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Alle verb\u00fcndeten und gegnerischen Trupps erhalten -25 % Truppenregeneration. Ab Runde 4 erhalten alle gegnerischen Trupps pro Runde zus\u00e4tzlich -15 % Truppenregeneration. Der Effekt ist stapelbar und bis zum Kampfende aktiv.',
  },
  'Eidolon:2': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Der Trupp des Helden hat eine Basis-Ausweichrate von 10 % und erh\u00e4lt jedes Mal, wenn er Schaden erleidet, einen Bonus von 25 %, stapelbar bis zu 100 %. Sobald der Trupp einem Angriff erfolgreich ausweicht, wird die Bonus-Ausweichrate gel\u00f6scht.',
  },
  'Eidolon:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige verb\u00fcndete Trupps',
    desc: 'Mit einer Chance von 40% entziehen 2 andere verb\u00fcndete Trupps 1 zuf\u00e4lligen gegnerischen Trupp 60% Kampfkraft und Widerstand. Zus\u00e4tzlich hat jeder Normalangriff eine Chance von 100%, 1 Runde lang 250% Bonusschaden zu verursachen.',
  },
  'Eidolon:8': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Nach erfolgreichem Ausweichen hat der Heldentrupp eine Chance von 33%, 80% der Truppenst\u00e4rke zu regenerieren, eine Chance von 33%, den Effekt \u201eErlittener Schaden -35%\u201c zu erhalten, und eine Chance von 33%, 2 zuf\u00e4llige gegnerische Trupps 15% mehr Schaden erleiden zu lassen. Jede Chance wird unabh\u00e4ngig berechnet und ist nicht stapelbar. Jeder Effekt h\u00e4lt 2 Runden an.',
  },
  'Scarlet Reaver:2': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: '100 % Chance, dem gegnerischen Trupp in der ersten Reihe 100 % Schaden zuzuf\u00fcgen, mit einer Chance von 40 %, dem gegnerischen Trupp mit den niedrigsten Truppen zus\u00e4tzlich 500 % Schaden zuzuf\u00fcgen.',
  },
  'Scarlet Reaver:5': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Nach 1 Runde Vorbereitung besteht eine Chance von 40%, 5 Angriffe auszuf\u00fchren. Jeder Angriff w\u00e4hlt einen zuf\u00e4lligen gegnerischen Trupp und verursacht 150% Schaden. Zus\u00e4tzlich besteht pro Angriff eine Chance von 65%, abh\u00e4ngig vom Truppentyp 1 Runde lang Entwaffnung auf Bogensch\u00fctzen oder Stille auf Infanterie und Kavallerie anzuwenden. Entwaffnung und Stille sind bis zu 2-mal stapelbar.',
  },
  'Scarlet Reaver:8': {
    type: 'Vorkampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: 'Belegt in den Runden 1, 4 und 7 jeweils 2 zuf\u00e4llige gegnerische Trupps 2 Runden lang mit Brennen, das pro Runde 150 % Schaden verursacht. Der Heldentrupp erh\u00e4lt 35 % Konter gegen Kavallerie und alle verb\u00fcndeten Trupps verursachen +50 % Skillschaden gegen brennende Ziele.',
  },
  'Rainforest Ranger:2': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Der Schaden des Heldentrupps ignoriert 25% des Grundwiderstands des gegnerischen Trupps. In den ersten 3 Runden fixieren seine Normalangriffe den gegnerischen Trupp an derselben Position und ignorieren den doppelten Grundwiderstand.',
  },
  'Rainforest Ranger:5': {
    type: 'Zusatzangriff',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Nach einem Normalangriff besteht eine Chance von 50%, dem Ziel 350% Bonusschaden zuzuf\u00fcgen. Wird der Bonusschaden ausgel\u00f6st, besteht eine Chance von 50%, 1 zuf\u00e4lligen gegnerischen Trupp 1 Runde lang zu unterdr\u00fccken.',
  },
  'Rainforest Ranger:8': {
    type: 'Zusatzangriff',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: '35 % Chance, dem Ziel nach einem normalen Angriff 600 % zus\u00e4tzlichen Schaden zuzuf\u00fcgen. Dieser zus\u00e4tzliche Schaden wird auf 810 % erh\u00f6ht, wenn die Truppenst\u00e4rke des Zieltrupps 50 % niedriger ist als zu Beginn des Gefechts.',
  },
  'Fortuneteller:2': {
    type: 'Vorkampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Markiert 1 zuf\u00e4lligen gegnerischen Trupp und verleiht ihm -70 % Truppenregeneration. Je nach Truppentyp gilt zus\u00e4tzlich: Infanterie gew\u00e4hrt allen gegnerischen Trupps +20 % Reduktion des erlittenen Normalangriffsschadens; Bogensch\u00fctzen verleihen ihnen -40 % verursachten Normalangriffsschaden; Kavallerie verleiht ihnen -30 % verursachten Skillschaden.',
  },
  'Fortuneteller:5': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '50 % Chance, 1 zuf\u00e4lligen feindlichen Trupp f\u00fcr 2 Runden mit dem markierten Trupp zu verbinden. Wenn einer der Trupps Schaden erleidet, erleidet der andere Trupp 50 % dieses Schadens.',
  },
  'Fortuneteller:8': {
    type: 'Kampfskill',
    target: '1 zuf\u00e4lliger gegnerischer Trupp',
    desc: 'Erh\u00e4lt jedes Mal +1 Ladung, wenn ein verb\u00fcndeter Trupp einen Kampfskill einsetzt. Bei 6 Ladungen erleidet der markierte Trupp 750 % Schaden und wird 1 Runde lang unterdr\u00fcckt.',
  },
  'Cyrus:2': {
    type: 'Kampfskill',
    target: '2 zuf\u00e4llige gegnerische Trupps',
    desc: '1 Runde Vorbereitung. 65 % Chance, 2 zuf\u00e4lligen gegnerischen Trupps 325 % Schaden zuzuf\u00fcgen, wodurch sie 1 Runde lang daran gehindert werden, ihre Truppenst\u00e4rke wiederherzustellen. Bei dieser Fertigkeit besteht eine Chance von 80 %, die Vorbereitungsphase zu umgehen und direkt gewirkt zu werden.',
  },
  'Cyrus:5': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: 'Alle verb\u00fcndeten Kavallerietrupps erhalten Sturmkavallerie. Beim Einsatz eines Aktivskills verursachen sie 40% mehr Schaden. Beim Einsatz eines Verfolgungsskills erleiden sie 40% weniger Schaden. H\u00e4lt 2 Runden an. Wenn ein verb\u00fcndeter Trupp Sturmkavallerie ausl\u00f6st, erh\u00e4lt Cyrus 50% dieses Effekts. Bis zu 5-mal stapelbar und bis zum Kampfende aktiv.',
  },
  'Cyrus:8': {
    type: 'Statusskill',
    target: '1 zuf\u00e4lliger verb\u00fcndeter Trupp',
    desc: "Cyrus' Trupp hat eine Ausweichchance von 10%. Nach jedem erfolgreichen Ausweichen erh\u00e4lt Cyrus zuf\u00e4llig einen von mehreren Effekten, darunter Erstangriff und Unbeirrt. Scheitert das Ausweichen, erhalten alle verb\u00fcndeten Trupps sofort 1 Runde lang Unbeirrt sowie einen Effekt, der den erlittenen Schaden des n\u00e4chsten eingehenden Angriffs um 50% verringert und einmal pro Runde ausgel\u00f6st werden kann.",
  },
};

const strings = {
  '1 random friendly squad within effective range':
    '1 zuf\u00e4lliger verb\u00fcndeter Trupp in Wirkungsreichweite',
  '3 random friendly squads within effective range':
    '3 zuf\u00e4llige verb\u00fcndete Trupps in Wirkungsreichweite',
  'A castable battle skill. Some have prep time, chance to trigger, range, and target rules.':
    'Ein einsetzbarer Kampfskill. Manche haben Vorbereitungszeit, eine Ausl\u00f6sechance sowie eigene Reichweiten- und Zielregeln.',
  'A cleansing or control-resistance state that helps remove or avoid negative effects.':
    'Ein Reinigungs- oder Kontrollwiderstandszustand, der dabei hilft, negative Auswirkungen zu beseitigen oder zu vermeiden.',
  'A commander-style passive effect that usually applies as long as the hero is in the legion.':
    'Ein passiver Effekt im Commander-Stil, der normalerweise gilt, solange der Held in der Legion ist.',
  'A control-immunity or cleansing state; usually protects from disabling effects for its duration.':
    'Ein Zustand mit Kontrollimmunit\u00e4t oder Reinigung; sch\u00fctzt f\u00fcr seine Dauer meist vor Kontrolleffekten.',
  'A damage-over-time status that keeps hurting the affected squad while active.':
    'Ein Schaden-\u00fcber-Zeit-Status, der dem betroffenen Trupp weiterhin Schaden zuf\u00fcgt, w\u00e4hrend er aktiv ist.',
  'A damage-over-time style status that keeps hurting the affected squad while active.':
    'Ein Schaden-\u00fcber-Zeit-Status, der dem betroffenen Trupp Schaden zuf\u00fcgt, solange er aktiv ist.',
  'A disabling status such as Silence, Disarm, Suppress, or Confuse.':
    'Ein Kontrolleffekt wie Stille, Entwaffnung, Unterdr\u00fcckung oder Verwirrung.',
  'A normal attack state that hits additional enemy squads beyond the main target.':
    'Ein normaler Angriffszustand, der \u00fcber das Hauptziel hinaus weitere feindliche Trupps trifft.',
  'A passive/status-driven skill that changes states, immunities, damage rules, or ongoing battle behavior.':
    'Eine passive/statusgesteuerte F\u00e4higkeit, die Zust\u00e4nde, Immunit\u00e4ten, Schadensregeln oder das laufende Kampfverhalten \u00e4ndert.',
  'A skill that can trigger during battle when its conditions and chance roll are met.':
    'Eine Fertigkeit, die w\u00e4hrend des Kampfes ausgel\u00f6st werden kann, wenn ihre Bedingungen und ihr Zufallswurf erf\u00fcllt sind.',
  'A special damage effect that can bypass or punish defenses depending on the skill.':
    'Ein besonderer Schadenseffekt, der je nach Fertigkeit Verteidigungen umgehen oder bestrafen kann.',
  'A special strike effect with its own chance and damage rate, often scaling with buffs.':
    'Ein besonderer Schlageffekt mit eigener Chance und Schadensrate, der oft mit Buffs skaliert.',
  'A stackable buff used by some heroes to increase follow-up effects, damage, or trigger chances.':
    'Ein stapelbarer Buff, der von einigen Helden verwendet wird, um Folgeeffekte, Schaden oder Ausl\u00f6sechancen zu erh\u00f6hen.',
  'A status that makes the target vulnerable to fire-related effects.':
    'Ein Status, der das Ziel anf\u00e4llig f\u00fcr feuerbedingte Effekte macht.',
  'A weakening status that reduces effectiveness while active.':
    'Ein Schw\u00e4chungszustand, der die Wirksamkeit im aktiven Zustand verringert.',
  'Active Skill': 'Aktivskill',
  'Acts before enemy squads, which can unlock extra skill effects for some heroes.':
    'Agiert vor feindlichen Trupps, wodurch f\u00fcr einige Helden zus\u00e4tzliche Fertigkeitseffekte freigeschaltet werden k\u00f6nnen.',
  'Additional Attack': 'Zusatzangriff',
  'Adds or modifies normal attacks, often creating extra hits or effects after attacks.':
    'F\u00fcgt normale Angriffe hinzu oder modifiziert sie und erzeugt oft zus\u00e4tzliche Treffer oder Effekte nach Angriffen.',
  'Affected squad may attack or cast skills on random targets.':
    'Der betroffene Trupp kann zuf\u00e4llige Ziele angreifen oder Fertigkeiten auf sie wirken.',
  'Affected squad takes more damage or loses protection while active.':
    'Der betroffene Trupp erleidet mehr Schaden oder verliert seinen Schutz, w\u00e4hrend er aktiv ist.',
  'All Biography Attributes activated': 'Alle Biografieattribute aktiviert',
  'Applies before or at battle start, often setting buffs, debuffs, opening conditions, or early-round rules.':
    'Wird vor oder zu Kampfbeginn angewendet und legt oft Buffs, Debuffs, Startbedingungen oder Regeln f\u00fcr die ersten Runden fest.',
  'Armor break': 'R\u00fcstungsbruch',
  'Army Defense': 'Armeeverteidigung',
  'Army HP': 'Armee-HP',
  'Army Might': 'Armeekampfkraft',
  'Arthur Pendragon the Once and Future King': 'Arthur Pendragon, der einstige und künftige König',
  'Avoids an incoming damage instance or attack while active.':
    'Vermeidet eingehende Schadensinstanzen oder Angriffe, w\u00e4hrend es aktiv ist.',
  Biography: 'Biografie',
  'Biography attributes': 'Biografieattribute',
  'Biography Attributes': 'Biografieattribute',
  'Biography skin details pending': 'Details zum Biografie-Skin ausstehend',
  'Biography: Hidden Power': 'Biografie: Verborgene Kraft',
  Bleeding: 'Blutung',
  'Captured screenshot shows Eternity at Lv.10 and max level reached.':
    'Der erfasste Screenshot zeigt Ewigkeit auf Stufe 10 und damit auf Maximalstufe.',
  Chain: 'Ketteneffekt',
  Clarity: 'Klarheit',
  'Combat Skill': 'Kampfskill',
  'Combat Skill Damage': 'Kampfskillschaden',
  Confuse: 'Verwirrung',
  Confused: 'Verwirrt',
  'Control Debuff': 'Kontroll-Debuff',
  'Counter-attack': 'Konterangriff',
  Counterattack: 'Konterangriff',
  Cursed: 'Verflucht',
  'Damage dealt by a skill rather than a normal attack.':
    'Schaden, der durch eine Fertigkeit und nicht durch einen normalen Angriff verursacht wird.',
  'Damage dealt specifically by combat skills, not normal attacks.':
    'Schaden, der speziell durch Kampfskills verursacht wird, nicht durch normale Angriffe.',
  'Damage or effects can jump from one squad to another.':
    'Schaden oder Effekte k\u00f6nnen von einem Trupp zum anderen \u00fcberspringen.',
  'Damage spills onto nearby or additional squads.':
    'Der Schaden verteilt sich auf nahegelegene oder zus\u00e4tzliche Trupps.',
  'Damage taken': 'Erlittener Schaden',
  'Damage taken by the hero is reduced by 80% at the start of battle. Each time the hero takes damage, the mitigation is reduced by 8% (reduced by 4% each time for the first 3 rounds), while Resistance increases by 20% and Damage dealt increases by 10%, stackable up to 20 layers, until battle ends.':
    'Zu Kampfbeginn wird der vom Helden erlittene Schaden um 80% verringert. Jedes Mal, wenn der Held Schaden erleidet, sinkt die Schadensminderung um 8% (in den ersten 3 Runden jeweils um 4%), w\u00e4hrend sein Widerstand um 20% und sein verursachter Schaden um 10% steigen. Bis zu 20-mal stapelbar und bis zum Kampfende aktiv.',
  'Damage type usually tied to normal or physical strikes.':
    'Die Schadensart ist normalerweise an normale oder physische Schl\u00e4ge gebunden.',
  'Deals damage back after being attacked or after a matching trigger.':
    'Verursacht nach einem Angriff oder nach einem passenden Ausl\u00f6ser Schaden zur\u00fcck.',
  Defend: 'Verteidigen',
  'Destructive Strike': 'Vernichtungsschlag',
  'Details pending': 'Details ausstehend',
  Disarm: 'Entwaffnung',
  Disarmed: 'Entwaffnet',
  Dodge: 'Ausweichen',
  Dodging: 'Ausweichstatus',
  'Dynamic icon behavior pending capture.':
    'Das Verhalten des dynamischen Icons muss noch erfasst werden.',
  'Dynamic icon capture pending.': 'Das dynamische Icon muss noch erfasst werden.',
  Eternity: 'Ewigkeit',
  Everlasting: 'Ewig',
  Faltering: 'Wankend',
  'Fatal Blow': 'Todessto\u00df',
  Feverish: 'Kampfrausch',
  'First to Attack': 'Erstangriff',
  'First-Aid': 'Erste Hilfe',
  Flammable: 'Brennbar',
  Footmen: 'Infanterie',
  'Forces or redirects enemy attacks toward the taunting squad.':
    'Erzwingt oder leitet feindliche Angriffe auf den verspottenden Trupp um.',
  Healing: 'Heilung',
  'Healing or recovery effect that restores troop power.':
    'Heil- oder Erholungseffekt, der die Truppenst\u00e4rke wiederherstellt.',
  Inheriting: 'Vererbung',
  'Inheriting Skill': 'Vererbter Skill',
  'Inheriting skill details pending.': 'Details zum vererbten Skill ausstehend.',
  'Inheriting skill details will be added after capture.':
    'Details zum vererbten Skill werden nach der Erfassung erg\u00e4nzt.',
  Interrupting: 'Unterbrechung',
  'Leadership Skill': 'F\u00fchrungsskill',
  Legendary: 'Legend\u00e4r',
  'Mass Attack': 'Fl\u00e4chenangriff',
  Melee: 'Nahkampf',
  'More unlocked Biography Skin variants can add stronger Hidden Power when a hero has additional variants.':
    'Weitere freigeschaltete Biografie-Skin-Varianten k\u00f6nnen die Verborgene Kraft verst\u00e4rken, wenn ein Held zus\u00e4tzliche Varianten besitzt.',
  Mythic: 'Mythisch',
  'Normal Attack': 'Normalangriff',
  'Own 2 Biography Skin variants': 'Besitze 2 Varianten des Biografie-Skins',
  'Owned skin bonus': 'Bonus f\u00fcr Skin-Besitz',
  pending: 'Ausstehend',
  'Physical Damage': 'Physischer Schaden',
  Poisoned: 'Vergiftet',
  'Pre-Battle Skill': 'Vorkampfskill',
  'Pre-Battle Skills': 'Vorkampfskills',
  'Prep Skills': 'Vorbereitungsskills',
  Preserving: 'Bewahren',
  'Preserving Skill': 'Bewahrungsskill',
  'Preserving skill and dynamic icon details pending.':
    'Details zum Bewahrungsskill und zum animierten Icon stehen noch aus.',
  'Preserving skill details will be added after capture.':
    'Details zum Bewahrungsskill werden nach der Erfassung erg\u00e4nzt.',
  'Preserving unlock items': 'Freischaltitems f\u00fcr den Bewahrungsskill',
  'Prevents affected squads from recovering troop power while active.':
    'Verhindert, dass betroffene Trupps ihre Truppenst\u00e4rke wiederherstellen, w\u00e4hrend sie aktiv sind.',
  'Prevents combat skill casting while active.':
    'Verhindert das Wirken von Kampfskills, w\u00e4hrend es aktiv ist.',
  'Prevents normal attacks while active.': 'Verhindert normale Angriffe, solange es aktiv ist.',
  'Prevents the squad from acting or casting depending on the skill wording.':
    'Verhindert, dass der Trupp je nach Fertigkeitswortlaut agiert oder wirkt.',
  'Punishes the affected squad when it performs certain actions, often skill casting.':
    'Bestraft den betroffenen Trupp, wenn er bestimmte Aktionen ausf\u00fchrt, h\u00e4ufig das Ausl\u00f6sen von Fertigkeiten.',
  Recovery: 'Regeneration',
  'Reduces defensive value, making affected squads take more damage.':
    'Reduziert den Verteidigungswert, wodurch betroffene Trupps mehr Schaden erleiden.',
  'Replaces Wheel of Fortune with Eternity when the skin reaches Star 2.':
    'Ersetzt Rad des Schicksals durch Ewigkeit, sobald der Skin Stern 2 erreicht.',
  Resistance: 'Widerstand',
  'Restores troop power to one or more squads.':
    'Stellt die Truppenst\u00e4rke eines oder mehrerer Trupps wieder her.',
  'Restores troop power; usually shown as a recovery rate.':
    'Stellt Truppenst\u00e4rke wieder her; wird normalerweise als Wiederherstellungsrate angezeigt.',
  'Returns or restores a defeated or heavily damaged squad effect depending on the skill.':
    'Bringt je nach Skill einen besiegten Trupp zur\u00fcck oder regeneriert einen stark angeschlagenen Trupp.',
  Revived: 'Wiederbelebt',
  'Royal Exclusive': 'K\u00f6niglich exklusiv',
  S: 'S',
  S1: 'S1',
  S2: 'S2',
  S3: 'S3',
  S4: 'S4',
  Silence: 'Stille',
  Silenced: 'Stumm',
  'Skill activated': 'Skill aktiviert',
  'Skill Damage': 'Skillschaden',
  'Skills that need one or more rounds of preparation before firing.':
    'Fertigkeiten, die vor dem Abfeuern eine oder mehrere Vorbereitungsrunden erfordern.',
  'Skin advancement complete': 'Skin-Aufwertung abgeschlossen',
  'Skin advancement unlocks the upgraded hero skill.':
    'Die Skin-Aufwertung schaltet den verbesserten Heldenskill frei.',
  'Skin ownership grants biography attributes once details are captured.':
    'Der Besitz des Skins gew\u00e4hrt Biografieattribute, sobald die Details erfasst wurden.',
  'Skin ownership grants the biography attributes by default.':
    'Der Besitz des Skins gew\u00e4hrt die Biografieattribute automatisch.',
  Sober: 'Unbeirrt',
  'Solid Shield': 'Unersch\u00fctterlicher Schild',
  'Some heroes have more than one Biography Skin variant. Those variants share the same Biography Attributes and progress; owning more than one variant unlocks Hidden Power.':
    'Einige Helden besitzen mehrere Varianten ihres Biografie-Skins. Diese Varianten teilen sich Biografieattribute und Fortschritt; mehrere besessene Varianten schalten die Verborgene Kraft frei.',
  SP: 'SP',
  'Special preserving unlock items add the preserving skill and moving icon.':
    'Spezielle Freischaltitems gew\u00e4hren den Bewahrungsskill und das animierte Icon.',
  Splash: 'Fl\u00e4chenschaden',
  'Star 1': 'Stern 1',
  'Star 2': 'Stern 2',
  'Star 3': 'Stern 3',
  'Star 3 uses the same unique icon with a small in-place movement.':
    'Stern 3 verwendet dasselbe einzigartige Icon mit einer leichten Animation.',
  'Status Skill': 'Statusskill',
  'Stops a channeling or prep skill before it completes.':
    'Stoppt eine Kanalisierungs- oder Vorbereitungsfertigkeit, bevor sie abgeschlossen ist.',
  Suppress: 'Unterdr\u00fcckung',
  Suppressed: 'Unterdr\u00fcckt',
  'Tactical Might': 'Taktikkampfkraft',
  'Tactical Resistance': 'Taktikwiderstand',
  Taunt: 'Provokation',
  Taunting: 'Provokation',
  'The basic attack a squad performs without casting a combat skill.':
    'Der Standardangriff eines Trupps, bei dem kein Kampfskill eingesetzt wird.',
  "The Hero's squad": 'Trupp des Helden',
  "The hero's squad gains 4% HP and takes 2% less damage.":
    'Der Trupp des Helden erh\u00e4lt 4% HP und erleidet 2% weniger Schaden.',
  "The Hero's squad takes -10% Skill Damage; the Hero's Legion gains 13% Resistance.":
    'Der Trupp des Helden erleidet -10% Skillschaden; die Legion des Helden erh\u00e4lt 13% Widerstand.',
  'The Once and Future King': 'Der einstige und k\u00fcnftige K\u00f6nig',
  'The same unique icon moves slightly in place after the preserving skill is unlocked.':
    'Nach Freischaltung des Bewahrungsskills wird dasselbe einzigartige Icon leicht animiert.',
  'Troop Damage': 'Truppenschaden',
  'Troop Recovery Block': 'Heilungsblockade',
  'Unique icon becomes available with the inheriting skill.':
    'Mit dem vererbten Skill wird ein einzigartiges Icon verf\u00fcgbar.',
  'Unique skin icon available when the inheriting skill is unlocked.':
    'Nach Freischaltung des vererbten Skills ist ein einzigartiges Skin-Icon verf\u00fcgbar.',
  Vulnerable: 'Verwundbar',
  'Wheel of Fortune': 'Rad des Schicksals',
};

export default Object.freeze({
  skills: Object.freeze(skills),
  strings: Object.freeze(strings),
});
