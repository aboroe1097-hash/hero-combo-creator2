const skills = {
  'Immortal:2': {
    type: 'Ataque adicional',
    target: '1 enemigo aleatorio',
    desc: 'Después de un ataque normal, Hay un 40% de probabilidad de atacar a un 1 escuadrón enemigo aleatorio dentro del rango válido a la vez durante 2 veces, con daño de 348% infligido cada vez.',
  },
  'Immortal:5': {
    type: 'Ataque adicional',
    target: '1 enemigo aleatorio',
    desc: 'Después de un ataque normal: existe la posibilidad de que 34% cause daño de 465% al 1 escuadrón enemigo aleatorio dentro del rango y le dé el estado de Silencio al escuadrón enemigo, sin poder usar la habilidad de combate durante el 1 ronda.',
  },
  'Immortal:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Aumenta el daño del 80% para la legión en la que se encuentra el héroe.',
  },
  'Wind-Walker:2': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Cuando el escuadrón realiza ataques normales, se ingresará al estado de primeros auxilios, recuperará tropas en cada turno (tasa de recuperación de 20%), dura 2 rondas, el estado de primeros auxilios puede acumularse 8 veces.',
  },
  'Wind-Walker:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 60% de probabilidad de infligir un 331% de daño a los 2 escuadrones enemigos dentro del alcance y infligir un 331% de daño al propio escuadrón.',
  },
  'Wind-Walker:8': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 50% de probabilidad de provocar a los 2 escuadrones enemigos aleatorios dentro del alcance, lo que dura 2 rondas y hace que el escuadrón entre en estado de contraataque y devuelve el daño de 150% al recibir un ataque normal, aumenta la resistencia de 100% y dura 2 rondas.',
  },
  'Hunk:2': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Cuando el escuadrón recibe daño, la probabilidad de 25% de evadir (inmune a este daño), la probabilidad de 50% en cada turno de aumentar el daño del escuadrón en 50%.',
  },
  'Hunk:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 30% de probabilidad de hacer que los 2 escuadrones enemigos aleatorios entren en estado Confuso (las habilidades y los ataques normales apuntan a objetivos aleatorios) e Inflamable (recibe daño adicional por quemaduras de 50%), dura 2 rondas.',
  },
  'Hunk:8': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'Durante las primeras 6 rondas, todos los escuadrones amistosos tienen 37 mayor velocidad de combate, 50% del daño recibido se contabilizará en el turno 7, la ronda previa a la batalla reparte el daño de 469% al 2 enemigos aleatorios.',
  },
  'Sakura:2': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'Durante las primeras 2 rondas, el 2 enemigos aleatorios se moverá primero, en el segundo turno, infligirá daño de 687% a los 2 escuadrones enemigos aleatorios a 2.',
  },
  'Sakura:5': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'Durante las primeras 3 rondas, los 2 escuadrones enemigos aleatorios reciben un 50% de daño adicional.',
  },
  'Sakura:8': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'Durante las primeras 3 rondas, los 2 escuadrones de arqueros aliados aleatorios infligen daño adicional a 50%.',
  },
  'ELK:2': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Durante las primeras 3 rondas, el escuadrón de arqueros de la primera fila tiene la posibilidad de 70% de entrar en estado de contraataque, lo que inflige a 250% daño de retorno a la fuente al recibir un ataque normal.',
  },
  'ELK:5': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'En la ronda 1/3/5, Hay un 100% de probabilidad de infligir un 220% de daño a 3 escuadrones enemigos aleatorios dentro del rango válido y aplicar el estado Vulnerable al objetivo, lo que hace que el objetivo reciba 15% más daño que la ronda anterior, lo que dura 1 ronda.',
  },
  'ELK:8': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'Los primeros tres turnos, los 2 escuadrones aliados aleatorios tienen la posibilidad de 70% de estar firmezas (inmunes a Silenciar, Desarmar, Suprimir, Confundir) y 55% tiene mayor poder.',
  },
  'Mary Tudor:2': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 60% de probabilidad de infligir un 325% de daño al 1 escuadrón enemigo aleatorio dentro del rango válido; Si el poder de las tropas del objetivo es menor que 50%, 195% causará más daño.',
  },
  'Mary Tudor:5': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Cada vez que Mary I lanza una habilidad de combate, su escuadrón inflige un +25% de daño de habilidad (acumulable hasta 6 veces) que dura hasta que termina la batalla.',
  },
  'Mary Tudor:8': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 50% de probabilidad de infligir un 368% de daño a 2 escuadrones enemigos aleatorios dentro del rango válido y someterlos a un estado de sangrado, lo que los hace recibir daño 155% antes de realizar acciones al comienzo de cada ronda, lo que dura rondas 2.',
  },
  'Cicero:2': {
    type: 'Ataque adicional',
    target: '2 enemigos aleatorios',
    desc: 'Después de un ataque normal, Hay un 30% de probabilidad de infligir un 310% de daño a los 2 escuadrones enemigos aleatorios dentro del alcance, lo que los hace recibir un 20% de daño adicional durante los 2 rondas.',
  },
  'Cicero:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 60% de probabilidad de que los 2 escuadrones enemigos aleatorios entren en estado de ruptura de armadura, menor defensa de -200% y 2 rondas.',
  },
  'Cicero:8': {
    type: 'Habilidad de combate',
    target: '1 aliado aleatorio',
    desc: 'Hay un 50% de probabilidad de tener la primera fila para tener 100% posibilidades de evasión en el próximo daño recibido de 3, que duran 2 rondas.',
  },
  'Beowulf:2': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Después de cada ataque normal, el daño causado por el ataque normal del héroe será ampliado un 20%, apilable hasta 5 acumulaciones; después de alcanzar el límite de acumulación, el héroe entra en estado de Ataque masivo, causando un daño igual a 260% + recuento de capas del efecto "Furia" *50% a los dos escuadrones enemigos distintos del objetivo en ataque normal; el efecto puede causar daño crítico; Mientras tanto, Hay un 100% de probabilidad de ignorar el estado de esquiva del enemigo al infligir daño.',
  },
  'Beowulf:5': {
    type: 'Habilidades prebatalla',
    target: '1 enemigo aleatorio',
    desc: 'Por cada ataque normal de 2 lanzado, restaura parte del poder de las tropas para los escuadrones amigos aleatorios del héroe y 1 (tasa de recuperación: 75%) e inflige un 350% de daño físico a los 1 escuadrón enemigo aleatorio (podría desencadenar el golpe fatal), sometiendo a los escuadrones enemigos objetivo al estado Desarmado durante las 1 ronda.',
  },
  'Beowulf:8': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Obtiene una probabilidad del 20% de golpe fatal. Después de cada efecto de curación recibido, obtiene el efecto Furia y una probabilidad adicional de 10% de golpe fatal (el efecto Furia se puede acumular hasta 8 veces), que dura hasta que termina la batalla; Mientras tanto, Hay un 90% de probabilidad de que el héroe elimine todos los estados negativos del héroe y entre en el estado Firmeza, inmune a los efectos de control y que dura hasta el siguiente movimiento.',
  },
  'Theodora:2': {
    type: 'Habilidad de combate',
    target: '1 aliado aleatorio',
    desc: 'Hay un 60% de probabilidad de infligir daño con la habilidad 20% a los 1 escuadrón aliado aleatorio, excluyendo al escuadrón de héroes, lo que hace que los escuadrones objetivo causen más daño a 50%, lo que dura 2 rondas.',
  },
  'Theodora:5': {
    type: 'Habilidades prebatalla',
    target: '3 enemigos aleatorios',
    desc: 'Cuando el héroe recibe daño, Hay un 40% de probabilidad de infligir un 160% de daño de habilidad a todos los escuadrones enemigos, con 40% la posibilidad de someterlos al estado aleatorio 1 durante las 2 rondas suprimido/silenciado/desarmado/confundido.',
  },
  'Theodora:8': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Cuando el escuadrón de frente bajo inflige daño, restaura algo de poder de tropas para el escuadrón al 60% del daño causado, que dura 6 rondas; El efecto puede tener efecto hasta 2 veces en una ronda. Cuando el escuadrón de primera fila esté muerto, el héroe luchará durante más 1 ronda (el efecto no se aplica a las batallas contra los Guardianes del Territorio).',
  },
  'Caesar:2': {
    type: 'Habilidad de combate',
    target: '3 aliados aleatorios',
    desc: 'A partir de la ronda 3, Caesar tiene la posibilidad de 40% de lanzar una habilidad en cada ronda, lo que aumenta el poder y la resistencia de todos tus escuadrones de caballería según 200% y el daño según 60%. Mientras tanto, Caesar tiene 20% más posibilidades de lanzar ataques adicionales, que duran hasta que termina la batalla (esta habilidad solo se puede lanzar una vez). En cada ronda, la posibilidad de lanzar esta habilidad aumenta en 20%.',
  },
  'Caesar:5': {
    type: 'Ataque adicional',
    target: '2 enemigos aleatorios',
    desc: 'Después de un ataque normal, Hay un 60% de probabilidad de infligir daño físico (índice de daño: 480%) a 2 escuadrones enemigos aleatorios. 50% del daño se utilizará para restaurar el poder de las tropas para los 2 escuadrones aliados aleatorios. La habilidad tendrá un tiempo de reutilización después de que se lance el anuncio de ronda 1. La primera vez que esquivas el daño en cada ronda, Hay un 100% de probabilidad de lanzar la habilidad, esta vez sin que se active un período de recuperación.',
  },
  'Caesar:8': {
    type: 'Ataque adicional',
    target: '3 enemigos aleatorios',
    desc: 'Después de un ataque normal, Hay un 50% de probabilidad de infligir daño físico a los escuadrones 2-3 (índice de daño: 310%); la tasa de daño de la regla dictadora aumentará en 1 cada vez que se lance la habilidad; este efecto se puede acumular y dura hasta el final de la batalla (esta habilidad solo se puede activar una vez por ronda).',
  },
  'Octavius:2': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Cada ronda, Octavius tiene un 80% de probabilidad de obtener Provocación. Cuando una habilidad activa o un ataque adicional enemigo vaya a seleccionar un escuadrón al azar, Octavius tendrá prioridad como objetivo. La probabilidad de activar esta habilidad disminuye un 5% cada ronda.',
  },
  'Octavius:5': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Octavius recibe un -25% de daño. Al comenzar la batalla, otorga Esquiva durante 2 rondas a tus escuadrones de las filas central y trasera, que serán inmunes a las siguientes 3 instancias de daño. Cada vez que Octavius recibe daño, hay un 100% de probabilidad de aumentar un 30% el Poder de 1 escuadrón de caballería aliado aleatorio [máximo: 300%]. El efecto se acumula hasta 10 veces por escuadrón.',
  },
  'Octavius:8': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Cuando el HP cae por debajo de 85% por primera vez, todos tus escuadrones recibirán daño de habilidad de -50%, lo que durará 3 rondas; Cuando el HP cae por debajo del 50% por primera vez, todos los escuadrones enemigos recibirán inmediatamente algo de daño físico (índice de daño: 350%); Cuando el HP cae por debajo del 25% por primera vez, todos los escuadrones enemigos recibirán inmediatamente algo de daño físico (índice de daño: 350%). Cada vez que se activa la habilidad, aumentará su propia Resistencia en 150%.',
  },
  'Boudica:2': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Boudica avanza. Hay una probabilidad del 70% de infligir un 200% de daño a 1 escuadrón enemigo de la fila central o trasera dentro del alcance válido durante 3 ataques consecutivos; el 40% del daño se usa para restaurar tropas de 2 escuadrones aliados aleatorios.',
  },
  'Boudica:5': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Boudica tiene protección natural de forma permanente. Al infligir daño de habilidad, Hay un 30% de probabilidad de causar un golpe destructivo al objetivo; Si Boudica actúa antes que todos los escuadrones enemigos, aumenta su probabilidad de lanzar habilidades y Golpe Destructivo un 20% al precio de impedir que lance ataques normales.',
  },
  'Boudica:8': {
    type: 'Habilidades prebatalla',
    target: '1 enemigo aleatorio',
    desc: 'Antes de la batalla, 2 marca los escuadrones enemigos aleatorios dentro del rango válido con marcas de lanza 5; cada capa de marca aumentará el daño de habilidad que recibe el objetivo según 10%; mientras tanto, se ignorará el efecto retardador sobre todo el daño que reciba el objetivo; las marcas se reducirán en la capa 1 en cada ronda; en las batallas, Hay un 60% de probabilidad de infligir un 500% de daño masivo en cada ronda al escuadrón enemigo con el menor poder de tropas.',
  },
  "Jeanne d'Arc:2": {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 50% de probabilidad de infligir un 477% de daño a 2 escuadrones enemigos aleatorios dentro del rango válido y hacer que los escuadrones reciban más daño de habilidad de 30%.',
  },
  "Jeanne d'Arc:5": {
    type: 'Habilidad de combate',
    target: '2 aliados aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 65% de probabilidad de otorgar el estado «Revivido» a 2 escuadrones aliados aleatorios. Mientras dure 2 rondas, tendrán un 50% de probabilidad de recuperar tropas (tasa de recuperación: 101%) al recibir daño.',
  },
  "Jeanne d'Arc:8": {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'En las batallas, tus escuadrones de caballería tendrán la oportunidad 60% de saltarse la ronda de preparación de 1 al lanzar habilidades de preparación (pueden activarse hasta el momento 1 por cada escuadrón en cada ronda); Mientras tanto, Hay un 80% de probabilidad de aumentar el daño de habilidad infligido por el escuadrón del héroe un 86%, lo que dura 1 ronda. El resultado de cada efecto se determinará de forma independiente.',
  },
  'Alfred:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 35% de probabilidad de infligir un 335% de daño a los 2 escuadrones enemigos dentro del rango válido y hacer que el poder de las tropas del objetivo restaure el efecto -40%. Si el objetivo ya está sujeto a un estado que le impide restaurar el poder de las tropas o frena su restauración de poder, el objetivo recibirá 30% más daño de habilidad durante 2 rondas.',
  },
  'Alfred:5': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Hay un 30% de probabilidad de infligir un 492% de daño masivo a todos los escuadrones enemigos, al precio de que todos tus escuadrones reciban daño 95%.',
  },
  'Alfred:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Alfred asume la misión en caso de emergencia. Cuando el poder de las tropas de su escuadrón cae por debajo de 90%/70%/50%/30% por primera vez, Alfred tendrá 50% más posibilidades de lanzar habilidades de combate y su escuadrón inflige a 40% más daño de habilidad y recibe un -35% de daño, lo que dura una ronda de 1.',
  },
  'Ramses II:2': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Durante las primeras 2 rondas, todos los enemigos y tus escuadrones reciben daño físico de -45%; En la ronda 3-6, todos tus escuadrones tienen la posibilidad de 80% de lanzar ataques normales 2 veces en cada ronda.',
  },
  'Ramses II:5': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'En batalla, todos tus escuadrones de arqueros obtienen un 40% de probabilidad de «Golpe fatal»; la habilidad puede aumentar esa probabilidad hasta un 60%. La parte que exceda el límite de «Golpe fatal» se multiplica por 3 y se convierte en bonificación de daño de «Golpe fatal».',
  },
  'Ramses II:8': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Cada vez que tu escuadrón activa el "Golpe fatal", restaura parte del poder de las tropas para el escuadrón (tasa de recuperación: 238%) y aumenta la tasa de daño de su Golpe fatal en 80%[560% máx.] (acumulable hasta veces 7), que dura hasta que termina la batalla.',
  },
  'Cleopatra VII:2': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Durante las primeras 4 rondas, el escuadrón amigo con el menor poder de tropas tiene la posibilidad de 40% de esquivar el daño entrante cuando es atacado; A partir de la ronda 4, tu escuadrón con el menor poder de tropas restaurará algo de poder de tropas (tasa de recuperación: 150%).',
  },
  'Cleopatra VII:5': {
    type: 'Habilidades prebatalla',
    target: '3 enemigos aleatorios',
    desc: 'Cleopatra hipnotiza al enemigo, como resultado, por cada ataque normal de 2 de cada escuadrón enemigo, el escuadrón tiene una probabilidad de 50% de confundirse y terminar eligiendo un objetivo aleatorio para su habilidad/ataque normal, en la última ronda de 1.',
  },
  'Cleopatra VII:8': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Cuando el héroe realiza acciones, Hay un 100% de probabilidad de hacer que el escuadrón enemigo confundido permanezca en un estado vulnerable, lo que significa que, cada vez que recibe daño, 15% recibirá más daño en el momento posterior, lo que durará 2 rondas; mientras tanto, tiene una probabilidad del 50% de recibir daño 225% inmediatamente.',
  },
  'King Arthur:2': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'El daño que recibe el héroe -80% al comienzo de la batalla. Cada vez que el héroe reciba daño, el efecto de mitigación de daño se reducirá en 8%, la resistencia aumentará en 20% y el daño infligido aumentará en 10% (apilable hasta 16 acumulaciones), efectivo hasta el final de la batalla.',
  },
  'King Arthur:5': {
    type: 'Ataque adicional',
    target: '1 enemigo aleatorio',
    desc: 'Arthur empuña su espada sagrada; Después de un ataque normal, Hay un 50% de probabilidad de infligir un 700% de daño físico a 1 escuadrón enemigo aleatorio dentro del rango válido. 40% de este daño se utilizará para restaurar el poder de las tropas de los 2 escuadrones aliados aleatorios. Después de lanzar la Espada en la Piedra, Hay un 50% de probabilidad de aplicarla al escuadrón de la fila media o trasera del enemigo una vez más.',
  },
  'King Arthur:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Arthur recibe de forma permanente un 15% más de curación. Por cada 6 instancias de daño infligidas por tus escuadrones, la probabilidad de lanzar Espada en la piedra aumenta un 4%, hasta 5 acumulaciones, y se mantiene hasta el final de la batalla. Al alcanzar el máximo, obtiene un 100% de probabilidad de ignorar el estado de esquiva del enemigo al infligir daño durante 2 rondas.',
  },
  'Leonidas:2': {
    type: 'Ataque adicional',
    target: '2 enemigos aleatorios',
    desc: 'Después de lanzar un ataque normal, Hay un 40% de probabilidad de crear Poder -50% y Resistencia -50% para los 2 escuadrones enemigos aleatorios dentro del rango válido y silenciar los escuadrones para el turno 1.',
  },
  'Leonidas:5': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Hay un 50% de probabilidad de infligir un 220% de daño a 2-3 escuadrones enemigos aleatorios dentro del rango válido.',
  },
  'Leonidas:8': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'En las primeras 2 rondas, todos tus escuadrones de arqueros recuperan algo de HP en cada ronda (tasa de recuperación: 55%); A partir de 3, todos tus escuadrones de arqueros reciben daño de -30% y obtienen el efecto de robo de vida 5%, que dura hasta que termina la batalla.',
  },
  'Isabella I:2': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 70% de probabilidad de lanzar fuego de dragón en cada ronda sobre un 1 escuadrón enemigo aleatorio a la vez durante 6, lo que inflige un 83% de daño por quemadura; Si todos los escuadrones enemigos son alcanzados en la ronda, el 1 escuadrón aliado aleatorio recibió Claridad (inmune a los efectos de Supresión/Silenciamiento/Desarmado/Confusión) para la ronda 1.',
  },
  'Isabella I:5': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'A partir de la ronda 3, al precio de permanecer en llamas permanentemente, el escuadrón del héroe tiene la posibilidad de 70% en cada ronda de infligir un 236% de daño por quemadura a los 2 escuadrones enemigos aleatorios, cuyo daño de habilidad de combate luego será -20%.',
  },
  'Isabella I:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Otorga un escudo a su(s) escuadrón(s) que se mantienen firmezas debido a la habilidad 2 y el daño que el(los) escuadrón(s) recibe(n) -50% para los próximos 2 golpes; Cuando esté en llamas por primera vez, el héroe recuperará una gran cantidad de poder de tropas para su escuadrón de primera fila (tasa de recuperación: 304) y suprimirá los 1 escuadrón enemigo aleatorio-2 dentro del rango válido en la siguiente ronda de 1.',
  },
  'Desert Storm:2': {
    type: 'Habilidades prebatalla',
    target: '3 enemigos aleatorios',
    desc: 'En turnos, 1, 3 y 5, hacen que todos los escuadrones enemigos entren en Maldición, Quemadura y Veneno, e infligen daño 24%, 29% y 34% en turnos correspondientes, que dura hasta el final de la batalla.',
  },
  'Desert Storm:5': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'Al comienzo del turno 5, los 2 escuadrones aliados aleatorios recuperarán unidades cada turno (tasa de recuperación: 60%).',
  },
  'Desert Storm:8': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 100% de probabilidad de infligir un 243% de daño a un escuadrón enemigo dentro del alcance, interrumpiendo las habilidades de canalización.',
  },
  'Soaring Hawk:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de infligir un 179% de daño a 2 escuadrones enemigos aleatorios dentro del alcance y reducir su Poder un -38% durante 2 rondas.',
  },
  'Soaring Hawk:5': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'El escuadrón de héroes tiene la posibilidad de 100% de contraatacar al recibir un ataque normal, lo que inflige un 120% de daño a la fuente atacante.',
  },
  'Soaring Hawk:8': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Durante las primeras 2 rondas, todos los escuadrones amigos reciben daño de -30%, después del turno 3, escuadrón de héroes Recupera unidades 30% al infligir daño.',
  },
  'The Brave:2': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'Durante las primeras 3 rondas de la batalla, 80% tiene la oportunidad en cada turno de desarmar a los 2 escuadrones enemigos dentro del alcance.',
  },
  'The Brave:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación; 30% para silenciar a 2 escuadrones enemigos aleatorios dentro del alcance, que duran 2 rondas.',
  },
  'The Brave:8': {
    type: 'Habilidades prebatalla',
    target: '3 enemigos aleatorios',
    desc: 'En la batalla, todos los escuadrones enemigos pierden un -60% de Poder y Resistencia, velocidad de combate -100, el daño recibido aumenta un 5% y el daño infligido un -5% de la ronda 5, todos tus escuadrones de caballería causan más daño a 40%.',
  },
  'Jade Eagle:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de lanzar ataques 2, cada uno de los cuales inflige un 142% de daño a los 2 escuadrones enemigos aleatorios dentro del rango válido, con una probabilidad del 25% de silenciar los objetivos durante 1 ronda.',
  },
  'Jade Eagle:4': {
    type: 'Habilidad de liderazgo',
    target: 'Escuadrón del héroe',
    desc: "Los arqueros en Hero's Squad tienen 60% mayor poder, 20% mayor daño infligido, 20% mayor daño recibido.",
  },
  'Jade Eagle:5': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 50% de probabilidad de infligir un 310% de daño a todos los escuadrones enemigos, haciendo que los infantería enemigos (no pueden recuperar unidades), la caballería enemiga (daño de habilidad de combate -50%), los arqueros enemigos estén (desarmados), y duran 1 ronda.',
  },
  'Jade Eagle:8': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'En las rondas 2 y 4, Hay un 100% de probabilidad de infligir daño masivo a 863% a los 3 escuadrones enemigos aleatorios dentro del alcance; Si el objetivo está desarmado o suprimido, 40% sufrirá más daño. 2 rondas.',
  },
  'Immortal Guardian:2': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Escuadrón del héroe Daño recibido -30%',
  },
  'Immortal Guardian:5': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'En la batalla, cuando los 2 escuadrones enemigos aleatorios dentro del alcance lanzan habilidades de combate o ataques normales, les causan un -5% de daño, este efecto se acumula un máximo de 8 veces.',
  },
  'Immortal Guardian:8': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Durante las primeras 3 rondas. Todas las unidades amigables reciben daño -20%, Hay un 50% de probabilidad de recuperar unidades cuando reciben daño (tasa de recuperación: 45%).',
  },
  'Divine Arrow:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 25% de probabilidad de infligir un 211% de daño al 2 enemigos aleatorios, desarmándolos para el turno 1.',
  },
  'Divine Arrow:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 30% de probabilidad de causar el estado de Cadena, vinculando a 2 enemigos aleatorios, cuando un escuadrón recibe daño, el otro también recibirá daño de 25%, lo que dura 2 rondas.',
  },
  'Divine Arrow:8': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'En la batalla, todos los arqueros amigos tienen el estado Salpicadura, los ataques normales también pueden infligir un 40% de daño a los escuadrones enemigos de la última fila de 2.',
  },
  'Che Liu:2': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: '50% Mayor daño para el escuadrón. Cuando la tropa actual se reduce a la mitad, obtienes 100% poder y resistencia adicionales.',
  },
  'Che Liu:5': {
    type: 'Ataque adicional',
    target: '1 enemigo aleatorio',
    desc: 'Después de un ataque normal, Hay un 100% de probabilidad de infligir un 247% de daño a un escuadrón enemigo dentro del alcance.',
  },
  'Che Liu:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Hay un 100% de probabilidad de realizar dos ataques normales cuando el poder actual de las tropas cae por debajo de 50% de la cantidad al comienzo de la batalla. Cuando el escuadrón de este héroe es derrotado o tiene la moral rota, este héroe continuará luchando por un turno más (al atacar territorios, si la lealtad de la Legión es menor que Fervor rebelde, entonces el héroe no podrá continuar luchando).',
  },
  'War Lord:2': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Durante la batalla, todos los escuadrones de caballería amigos tienen daño de ataque normal -20%, 45% aumenta el daño de las habilidades de combate.',
  },
  'War Lord:5': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Durante las primeras 2 rondas, cada vez que el escuadrón del héroe sufre daño, Hay un 70% de probabilidad de evadir (Esquivar) y evitar este daño.',
  },
  'War Lord:8': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Probabilidad de 100% de aumentar la probabilidad de lanzamiento de habilidades de combate final del escuadrón amistoso aleatorio 1 a 100% en las rondas 1, 3, 5 y 7. Si la habilidad requiere preparación. Hay un 60% de probabilidad de saltarse la ronda de preparación de 1.',
  },
  'Jane:2': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 35% de probabilidad de infligir un 334.5% de daño a todos los escuadrones enemigos dentro del alcance.',
  },
  'Jane:5': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Hay un 30% de probabilidad de infligir un 255% de daño a todos los escuadrones enemigos dentro del alcance, lo que les impide recuperar unidades, lo que dura el 2 rondas.',
  },
  'Jane:8': {
    type: 'Habilidad de combate',
    target: '1 aliado aleatorio',
    desc: 'Durante la batalla, el escuadrón de héroes no puede lanzar ataques normales a cambio de aumentar el daño de las habilidades de combate por parte del 35% y también inflige daño de las habilidades del 301% a un escuadrón enemigo aleatorio dentro del alcance.',
  },
  'Sky Breaker:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de infligir un 325% de daño a un 2 enemigos aleatorios y hacer que el daño de habilidad inflija -20% durante 2 rondas.',
  },
  'Sky Breaker:5': {
    type: 'Habilidades prebatalla',
    target: '3 enemigos aleatorios',
    desc: 'Durante las primeras 2 rondas, desarma los 2 escuadrones enemigos aleatorios, haciéndolos incapaces de realizar ataques normales; en la ronda 2, inflige un 267.5% de daño a todos los escuadrones enemigos.',
  },
  'Sky Breaker:8': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 50% de probabilidad de infligir un 260% de daño a un 2 enemigos aleatorios y curarse a sí mismo y a un escuadrón amigo aleatorio (tasa de recuperación: 142%).',
  },
  'Rokuboshuten:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de infligir un 255% de daño a un 2 enemigos aleatorios, lo que hace que su poder y resistencia -55% duren 2 rondas.',
  },
  'Rokuboshuten:5': {
    type: 'Habilidad de estado',
    target: '2 aliados aleatorios',
    desc: 'Durante la batalla, cada vez que se lanza una habilidad que requiere preparación, 100% tiene una oportunidad para que el escuadrón de héroes entre en el estado Claridad (inmune al silencio, desarmado, supresión y confusión) que dura 2 rondas, después de lanzar una habilidad de combate, Hay un 100% de probabilidad de aumentar el poder y la resistencia un 100% a dos escuadrones amigos aleatorios, que duran 2 rondas.',
  },
  'Rokuboshuten:8': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 40% de probabilidad de infligir un 196.5% de daño a todos los enemigos, silenciándolos y haciéndolos incapaces de usar habilidades de combate, lo que dura 1 ronda.',
  },
  'Bleeding Steed:2': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'Durante las primeras 3 rondas, los escuadrones amigos de 2 tienen un 60% de daño adicional.',
  },
  'Bleeding Steed:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 50% de probabilidad de confundir a 2. El enemigo aleatorio, las habilidades y los objetivos de ataque normal se convierten en objetivos aleatorios durante 2 rondas.',
  },
  'Bleeding Steed:8': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Durante la batalla, cuando todos los escuadrones amigos reciben daño, Hay un 50% de probabilidad de recuperar algunas unidades (tasa de recuperación: 33%).',
  },
  'Rozen Blade:2': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Hay un 30% de probabilidad de eliminar los efectos negativos de la caballería y los arqueros aliados (excepto los aplicados por habilidades prebatalla). Sus ataques normales obtienen un 25% de probabilidad de aplicar Supresión de 1 turno durante 1 ronda.',
  },
  'Rozen Blade:5': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Durante las primeras 3 rondas, todos los escuadrones aliados obtienen 100 de Velocidad de combate y un 70% de probabilidad de realizar 2 ataques normales por ronda (los efectos del mismo tipo no se acumulan).',
  },
  'Rozen Blade:8': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'Durante la batalla, cada vez que 2 escuadrones enemigos aleatorios reciben daño, el daño que reciben aumenta un 12%. El efecto se acumula hasta 5 veces.',
  },
  'Jade:2': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: '1 Preparación del turno. Hay un 40% de probabilidad de atacar a 6 veces, cada ataque selecciona aleatoriamente un escuadrón enemigo dentro del alcance que inflige un 162% de daño.',
  },
  'Jade:5': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'El escuadrón con héroe aumenta el daño del 10%. Este efecto se acumula una vez por turno.',
  },
  'Jade:8': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de infligir un 160% de daño a 2 escuadrones aleatorios dentro del rango efectivo y otorgar el estado de Maldición a un escuadrón enemigo, que sufrirá daño 80% cada vez que use habilidades de combate, durante 2 rondas.',
  },
  'Witch Hunter:2': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Hay un 30% de probabilidad de infligir un 237% de daño a todos los escuadrones enemigos dentro del rango válido e infligirles el estado Inflamable, lo que aumenta el daño por quemaduras que reciben un 35% durante los 2 rondas.',
  },
  'Witch Hunter:5': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'Durante las primeras tres rondas, el daño de habilidad de 2 escuadrones enemigos aleatorios se reduce un -75%. Además, hay un 90% de probabilidad de silenciarlos e impedirles usar habilidades de combate durante 1 turno.',
  },
  'Witch Hunter:8': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de atacar a todo el escuadrón con daño 135% dentro del rango y darle el estado de quemado al escuadrón, recibir daño 142%, último 2 rondas.',
  },
  'Peace Bringer:2': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'El escuadrón del héroe tiene un 50% de probabilidad de se mejore en cada turno, lo que hace que -50% reciba menos daño en esos turnos. El escuadrón del héroe tiene la posibilidad de 35% de contraatacar cuando se le realiza un ataque normal, lo que inflige un 190% de daño a la fuente de daño.',
  },
  'Peace Bringer:5': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Los primeros tres turnos reducen el daño causado un -45% para todos los escuadrones, todo nuestro escuadrón reduce el daño recibido un -20%, a partir del cuarto turno, aumenta el daño de nuestras habilidades de combate un 20%, hasta el final de la batalla.',
  },
  'Peace Bringer:8': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Hay un 30% de probabilidad de infligir un 203% de daño a todos los escuadrones enemigos dentro del rango y otorgar el estado Vulnerable al escuadrón, cada vez que el enemigo es atacado causando un 20% de daño adicional, último 1 ronda.',
  },
  'Inquisitor:2': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: '1 se prepara para los turnos, Hay un 35% de probabilidad de atacar a todo el escuadrón para infligir un 246% de daño dentro del rango y darle el estado de Desarmar al escuadrón enemigo, el enemigo no puede realizar un ataque normal, dura 2 rondas.',
  },
  'Inquisitor:5': {
    type: 'Habilidades prebatalla',
    target: '3 enemigos aleatorios',
    desc: 'Aumenta el daño recibido de los arqueros un 50% a todos los escuadrones enemigos.',
  },
  'Inquisitor:8': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 35% de probabilidad de infligir un 342% de daño a los 2 escuadrones aleatorios dentro del alcance; si el objetivo está en estado Inflamable, existe la posibilidad de que 50% lo ponga en estado Suprimir, sin poder moverse.',
  },
  'BeastQueen:2': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'En la primera ronda, el daño de los ataques normales y de las habilidades de persecución de todos tus escuadrones aumenta un 80%; el efecto se reduce en 1/4 cada ronda.',
  },
  'BeastQueen:5': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'Durante las primeras 3 rondas, 2 escuadrones aliados aleatorios tienen un 70% de probabilidad de entrar en estado de Tambaleo; sus ataques normales infligen un 160% de daño a 2 escuadrones enemigos situados detrás del objetivo.',
  },
  'BeastQueen:8': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Durante las primeras 3 rondas de batalla, el escuadrón de caballería de la primera fila tiene un 70% de probabilidad de entrar en estado de contraataque, lo que inflige a 250% daño de retorno a la fuente al recibir un ataque normal.',
  },
  'Cao Cao:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 80% de probabilidad de infligir un 157% de daño a 2 escuadrones enemigos aleatorios dentro del rango válido.',
  },
  'Cao Cao:5': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Cada vez que Cao Cao lanza la habilidad de combate, el daño de su escuadrón aumenta en 18%, acumulable hasta 10 veces hasta que termina la batalla.',
  },
  'Cao Cao:7': {
    type: 'Habilidad activa',
    target: 'Legión del héroe',
    desc: 'Tras usar la habilidad, la formación del héroe obtiene un 100% de velocidad de marcha adicional y un 70% de poder de infantería durante 20 min; tiene un tiempo de recarga de 15 h. Fuera del periodo activo, se aplica el 50% del efecto durante el combate.',
  },
  'Cao Cao:8': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 50% de probabilidad de infligir un 396% de daño a un 1 enemigo aleatorio y aplicar el estado Vacilación a dichos escuadrones, lo que hace que los objetivos reciban más daño de 302% cada vez que los objetivos reciben daño. El efecto se puede activar hasta 3 veces cada vez que se lanza la habilidad, durando el turno 1.',
  },
  'Charles the Great:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de infligir un 255% de daño al 2 escuadrones enemigos aleatorios dentro del rango válido y hacer que la resistencia de los objetivos -170% durante turnos 2.',
  },
  'Charles the Great:5': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'Durante las primeras 4 rondas, aumenta el daño infligido por los 2 escuadrones aliados aleatorios un 20%, acumulable hasta 4 veces hasta que termine la batalla.',
  },
  'Charles the Great:8': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 50% de probabilidad de infligir un 510% de daño al 1 escuadrón enemigo aleatorio dentro del rango válido y permite que su escuadrón de la última fila tenga una probabilidad del 100% de ingresar al estado Esquivar, los próximos 2 golpes que reciba daño.',
  },
  'Black Prince:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Oportunidad de 35% de aplicar el estado 1 fuera de Suprimir, Silenciar y Desarmar a 2 escuadrones enemigos aleatorios dentro del rango válido, con una duración de 2 rondas.',
  },
  'Black Prince:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Nivel máx. Hay un 60% de probabilidad de robar la Resistencia 200% de los 2 escuadrones enemigos aleatorios dentro del rango válido, con una duración de turnos 2 (apilable hasta 2 veces).',
  },
  'Black Prince:8': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 50% de probabilidad de infligir un 490% de daño a 2 escuadrones enemigos aleatorios dentro del rango válido y hacer que el poder de los objetivos -150% durante los 2 rondas.',
  },
  'Lionheart:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de infligir un 250% de daño a los 2 escuadrones enemigos aleatorios dentro del rango válido y hacer que el daño de habilidad de Lionheart aumente en 40% para el 1 ronda.',
  },
  'Lionheart:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 50% de probabilidad de infligir un 288% de daño a los 2 escuadrones enemigos aleatorios dentro del rango válido y 288% más daño al escuadrón enemigo dentro de la resistencia más baja.',
  },
  'Lionheart:7': {
    type: 'Habilidad activa',
    target: 'Legión del héroe',
    desc: 'Tras usar la habilidad, la formación del héroe obtiene un 100% de velocidad de marcha adicional y un 70% de poder de caballería durante 20 min; tiene un tiempo de recarga de 15 h. Fuera del periodo activo, se aplica el 50% del efecto durante el combate.',
  },
  'Lionheart:8': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 60% de probabilidad de infligir daño masivo a 343% a todos los escuadrones enemigos dentro del rango válido; durante la preparación, aplica el estado Primero en atacar, al turno Lionheart para 1.',
  },
  'Al Fatih:2': {
    type: 'Habilidad de combate',
    target: '1 aliado aleatorio',
    desc: 'Hay un 80% de probabilidad de aumentar el daño infligido en ataques normales realizados por Al Fatih un 60% para el 1 ronda.',
  },
  'Al Fatih:5': {
    type: 'Habilidad de combate',
    target: '1 aliado aleatorio',
    desc: 'Los ataques normales de Al Fatih apuntan a 1 escuadrón enemigo aleatorio y tienen un 50% de probabilidad de activar Golpe fatal.',
  },
  'Al Fatih:7': {
    type: 'Habilidad activa',
    target: 'Legión del héroe',
    desc: 'Tras usar la habilidad, la formación del héroe obtiene un 100% de velocidad de marcha adicional y un 70% de poder de arqueros durante 20 min; tiene un tiempo de recarga de 15 h. Fuera del periodo activo, se aplica el 50% del efecto durante el combate.',
  },
  'Al Fatih:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'La tasa de daño del Golpe Fatal lanzado por Al Fatih aumenta en 60%, dentro del tiempo de efecto acumulado de 1 en cada turno hasta 4 veces hasta que termina la batalla.',
  },
  'Edward the Confessor:2': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Todos tus escuadrones tienen un 100% de probabilidad de obtener Esquiva la primera vez que son atacados. Durante las primeras 4 rondas, tienen un 70% de probabilidad por ronda de reducir un -40% el daño de habilidad de todos los escuadrones enemigos.',
  },
  'Edward the Confessor:5': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 35% de probabilidad de infligir un 480% de daño a 1 escuadrón enemigo aleatorio dentro del alcance efectivo y aplicarle Supresión durante 1 ronda.',
  },
  'Edward the Confessor:8': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'A partir de la ronda 3, el daño físico de 2 escuadrones aliados aleatorios aumenta un 30% en cada ronda. El efecto se acumula hasta 4 veces y dura hasta el final de la batalla.',
  },
  'Constantine the Great:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 45% de probabilidad de infligir un 330% de daño a 2 escuadrones enemigos aleatorios dentro del rango válido.',
  },
  'Constantine the Great:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de infligir un 203% de daño a los 2 escuadrones enemigos dentro del rango válido y hacer que el daño de habilidad de tu escuadrón de la última fila aumente en 50% para el turno 1.',
  },
  'Constantine the Great:8': {
    type: 'Habilidades prebatalla',
    target: '1 enemigo aleatorio',
    desc: 'Cuando todos tus escuadrones se están preparando para las habilidades de preparación, Constantine tiene un 80% de probabilidad de infligir un 304% de daño al 1 escuadrón enemigo aleatorio dentro del rango válido.',
  },
  'Genghis Khan:2': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 50% de probabilidad de aplicar el estado Sangrado a todos los escuadrones enemigos, lo que les hace recibir daño de 213% en cada ronda durante los 2 rondas.',
  },
  'Genghis Khan:5': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Hay un 50% de probabilidad de infligir un 202% de daño a 2 escuadrones enemigos aleatorios dentro del rango válido. 50% oportunidad de causar más daño a 202% a todos los escuadrones enemigos.',
  },
  'Genghis Khan:8': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'Por cada habilidad de combate de 4 lanzada por cualquiera de tus escuadrones durante el combate, Genghis Khan restaurará algo de poder para los 2 escuadrones aliados aleatorios (tasa de recuperación: 152%).',
  },
  'Jiguang Qi:2': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de infligir un 192% de daño a todos los escuadrones enemigos dentro del rango válido.',
  },
  'Jiguang Qi:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de infligir un 220% de daño a los 2 escuadrones enemigos dentro del alcance válido, lo que reduce el daño físico infligido por los escuadrones un -40% durante el 1 ronda.',
  },
  'Jiguang Qi:8': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Por cada habilidad de combate 2 lanzada por cualquiera de tus escuadrones, la resistencia de Jiguang Qi aumenta en 80%, acumulable por hasta veces 10 hasta que termine la batalla.',
  },
  'Valkyrie:2': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 100% de probabilidad de hacer que el propio escuadrón no pueda lanzar ataques normales, 30% aumenta el daño, porque 2 gira e inflige un 218% de daño al 1 escuadrón enemigo aleatorio dentro del alcance.',
  },
  'Valkyrie:5': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 45% de probabilidad de infligir un 310% de daño a los 3 escuadrones enemigos dentro del alcance.',
  },
  'Valkyrie:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'El contraataque del propio escuadrón a los infantes y las caballerías aumenta en 30%, la probabilidad de 70% en cada turno de ignorar 50% de la resistencia base del escuadrón enemigo.',
  },
  'Lawman:2': {
    type: 'Habilidad de estado',
    target: '1 enemigo aleatorio',
    desc: 'Cuando el propio escuadrón recibe daño, Hay un 50% de probabilidad de infligir un 63% de daño a los 2 escuadrones aleatorios dentro del rango de 2.',
  },
  'Lawman:5': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'El escuadrón propio y el escuadrón aliado aleatorio de 1 recuperan tropas cada turno (tasa de recuperación 96.5%).',
  },
  'Lawman:8': {
    type: 'Habilidad de combate',
    target: '2 aliados aleatorios',
    desc: 'Hay un 40% de probabilidad de reducir el daño de -30% recibido por el propio escuadrón y recibir daño de 30% de los enemigos para los otros escuadrones amigos de 2 durante los 2 rondas.',
  },
  'Spectral Reaper:2': {
    type: 'Ataque adicional',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 35% de probabilidad de atacar nuevamente después de ataques normales al mismo objetivo que causan daño a 742%, lo que les impide recuperar tropas durante los 1 ronda.',
  },
  'Spectral Reaper:5': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Probabilidad de 40% de infligir un 455% de daño al 1 escuadrón enemigo aleatorio dentro del rango válido, probabilidad de 90% de aumentar los intentos de ataque normales del escuadrón del héroe en 1 por ronda, con una duración de 1 ronda.',
  },
  'Spectral Reaper:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'El escuadrón del héroe causa más daño a 100% en ataques normales; Después de lanzar cada habilidad de combate, el escuadrón del héroe obtiene la oportunidad +40% de lanzar un ataque adicional, que dura una ronda 1. Cuando la habilidad lanzada por el enemigo necesita calcular su alcance efectivo, el escuadrón del héroe se considerará +1 en distancia del enemigo.',
  },
  'Defender:2': {
    type: 'Ataque adicional',
    target: '1 aliado aleatorio',
    desc: 'Después de un ataque normal, Hay un 80% de probabilidad de hacer que el daño que el escuadrón del héroe reciba. -20% durante las 2 rondas. El estado se puede acumular.',
  },
  'Defender:5': {
    type: 'Ataque adicional',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 50% de probabilidad de infligir un 310% de daño al 1 escuadrón enemigo aleatorio dentro del alcance después de ataques normales y recuperar algunas tropas para el propio escuadrón (tasa de recuperación 67%).',
  },
  'Defender:8': {
    type: 'Habilidad de combate',
    target: '2 aliados aleatorios',
    desc: 'Hay un 35% de probabilidad de crear 2 escuadrones aliados aleatorios para atacar dos veces, con 30% mayor daño durante los 2 rondas.',
  },
  'Army Breaker:2': {
    type: 'Habilidad de combate',
    target: '2 aliados aleatorios',
    desc: 'Oportunidad de 55% de recuperar algunas tropas para 2 escuadrones aliados aleatorios dentro del alcance (tasa de recuperación de 84%) y eliminar desventajas (no se pueden eliminar desventajas previas a la batalla).',
  },
  'Army Breaker:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 40% de probabilidad de silenciar a los 2 escuadrones enemigos aleatorios dentro del alcance y causar menos daño a -20% durante los 2 rondas.',
  },
  'Army Breaker:8': {
    type: 'Habilidad de combate',
    target: '3 aliados aleatorios',
    desc: 'Hay un 30% de probabilidad de hacer que todos los escuadrones amigos tengan la posibilidad de 60% de entrar en estado de evasión al tomar el siguiente 3 daña y aumenta el poder y la resistencia de 47% durante los 2 rondas.',
  },
  'The Avalanche:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 60% de probabilidad de infligir un 226% de daño a múltiples objetivos enemigos.',
  },
  'The Avalanche:5': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Requiere 1 ronda de preparación; posibilidad de 40% de infligir un 595% de daño al 1 escuadrón enemigo aleatorio dentro del alcance, posibilidad de 60% de infligir un 310% de daño al escuadrón enemigo de la última fila, haciéndolos suprimidos e incapaces de realizar acciones durante los 1 ronda.',
  },
  'The Avalanche:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'En combate, el escuadrón del héroe obtiene Claridad y se vuelve inmune al silencio, el desarme, la supresión y la confusión; además, su Poder aumenta un 60% e inflige un 30% de daño adicional.',
  },
  'Dach Tengri:2': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 100% de probabilidad de hacer que un 1 escuadrón enemigo aleatorio esté dentro del alcance para recibir un 6% de daño adicional, 6% reduce el daño infligido, -38 reduce la velocidad de combate y hace que los 2 escuadrones aliados aleatorios reciban menos daño de -6%, inflige daño adicional a -6%, 38 aumenta la velocidad de combate para los 1 ronda.',
  },
  'Dach Tengri:5': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'A partir del turno 4, cada turno hay una posibilidad de 70% de hacer que los 2 escuadrones enemigos aleatorios dentro del alcance no puedan recuperar tropas y reducir el daño recibido por 2 y el daño de los escuadrones amigos aleatorios recibidos un -25%.',
  },
  'Dach Tengri:8': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'Los primeros 3 rondas, cada turno otorga a 2 escuadrones amistosos aleatorios 7% mayor daño (efecto acumulable), hasta que termina la batalla, comenzando el turno 4, se otorga el estado de salpicadura, los ataques normales causarán daño de 40% a los 2 escuadrones enemigos en la parte trasera hasta el final de la batalla.',
  },
  'Tarantula:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Hay un 30% de probabilidad de infligir un 641% de daño a los 2 escuadrones enemigos aleatorios dentro del alcance, mientras que el daño infligido por el escuadrón del héroe y el escuadrón de la última fila aumenta en 40% para los próximos 2 ataques. Si el escuadrón del héroe es el escuadrón de la última fila, obtiene un efecto de mejora de daño doble. Dura las rondas 2.',
  },
  'Tarantula:5': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 35% de probabilidad de infligir un 402% de daño al 1 escuadrón enemigo aleatorio dentro del alcance y antes de la siguiente acción del escuadrón de la última fila, inflige un 403% de daño al 1 escuadrón enemigo aleatorio dentro del alcance de 4 del escuadrón de la última fila.',
  },
  'Tarantula:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'En batalla, el escuadrón del héroe obtiene al azar uno de estos efectos en cada ronda: 1: restaura parte de sus tropas (tasa de recuperación: 100%); 2: aumenta un 60% el Poder, la Resistencia, el Poder táctico y la Resistencia táctica; 3: recibe un -40% de daño.',
  },
  'Alexander:2': {
    type: 'Habilidades prebatalla',
    target: '1 enemigo aleatorio',
    desc: 'En las rondas 1 y 3, impacta a los 1 escuadrón enemigo aleatorio, lo que hace que los escuadrones reciban un 325% de daño adicional cada vez que reciben daño, y dura hasta que termina la batalla.',
  },
  'Alexander:5': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'El héroe recibe menos daño de -60% y obtiene el efecto de curación ampliado de 20%, pero 300% también aumentará el daño por quemaduras recibido.',
  },
  'Alexander:8': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'Hay un 100% de probabilidad de hacer sangrar a todos los escuadrones enemigos, lo que les hace recibir daño de 260% antes de actuar en cada ronda, y dura hasta que termina la batalla. Si el escuadrón del héroe pierde 25% del poder total de tropas en cualquier ronda, parte del poder de tropas del escuadrón se restaurará (tasa de recuperación: 350%) al final de esa ronda.',
  },
  'Lancelot:2': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 50% de probabilidad de infligir un 356% de daño a todos los escuadrones enemigos; Si un objetivo está sujeto a un efecto de curación reducido o no puede restaurar el poder de las tropas, inflige un 356% de daño adicionalmente a todos los escuadrones enemigos, con una probabilidad del 90% para que cada escuadrón enemigo entre en el estado Suprimido durante 1 ronda.',
  },
  'Lancelot:5': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'El héroe no puede lanzar ataques normales (el efecto no se puede anular). En cada ronda, Hay un 100% de probabilidad de infligir un 356% de daño a los 1 escuadrón enemigo aleatorio, mientras que el héroe obtiene uno de los sellos de Coraje/Justicia/Misericordia (Coraje: daño aumentado en 20%; Justicia: tasa de evasión aumentada en 10%; Misericordia: el portador del sello puede restaurar algo de poder de las tropas en cada ronda al realizar acciones, tasa de recuperación: 67%), que dura hasta que termina la batalla y se puede acumular hasta 2 acumulaciones; Cuando se obtienen los tres sellos, la habilidad apuntará a todos los escuadrones enemigos.',
  },
  'Lancelot:8': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Al comienzo de la batalla, aplica un efecto a todos los escuadrones amigos: cuando lanzan una habilidad de preparación, Hay un 80% de probabilidad de saltarse 1 ronda (efectivo hasta 3 veces). Al obtener el efecto y agotar los intentos del efecto, aplica el(los) sello(s) 1 al portador.',
  },
  'Ragnar:2': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 50% de probabilidad de infligir un 420% de daño a un escuadrón enemigo aleatorio dentro del alcance válido.',
  },
  'Ragnar:5': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'En la ronda 1 inflige un 160% de daño, en la ronda 3 inflige un 320% de daño, en la ronda 5 inflige un 480% de daño y en la ronda 7 inflige un 640% de daño a todos los escuadrones enemigos respectivamente.',
  },
  'Ragnar:8': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Tras infligir daño, hay un 50% de probabilidad de que el escuadrón del héroe y el de la fila trasera obtengan un 8% de probabilidad de activar Golpe fatal y Golpe devastador. El efecto dura hasta el final de la batalla y se acumula hasta 5 veces. Falta confirmar la línea final de la captura de pantalla.',
  },
  'Bjorn:2': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 40% de probabilidad de atacar al 1 escuadrón enemigo aleatorio dentro del alcance de 2 veces, cada vez infligiendo daño 348%. Cada ataque apunta aleatoriamente a un enemigo.',
  },
  'Bjorn:5': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Todos los escuadrones amigos infligen daño +70% a los escuadrones enemigos silenciados, desarmados, reprimidos y confusos. Los escuadrones enemigos tienen una probabilidad del 30% de extender la duración de la desventaja de control por turno 1 (silenciado, desarmado, suprimido y confundido).',
  },
  'Bjorn:8': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'Durante las primeras 3 rondas, los 2 escuadrones enemigos aleatorios dentro del alcance infligen daño a -30%. En el turno de 4, estos escuadrones se vuelven Confundidos, atacan y lanzan habilidades en objetivos aleatorios durante los 2 rondas.',
  },
  'Skanda:2': {
    type: 'Habilidad de combate',
    target: '2 aliados aleatorios',
    desc: 'Oportunidad de 50% de curarse a sí mismo y al equipo de primera fila (tasa de recuperación de 247%). Si ya estás en la primera fila, duplica la curación.',
  },
  'Skanda:5': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 70% de probabilidad de infligir un 260% de daño al escuadrón enemigo más alejado dentro del alcance y suprimirlo durante el 1 ronda.',
  },
  'Skanda:8': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'En el turno 5, elimina las desventajas amistosas de la primera fila. Cuando el objetivo recibe daño, Hay un 100% de probabilidad de esquivar y volverse inmune a este daño, lo que dura 2 rondas.',
  },
  'Liberator:2': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Hay un 50% de probabilidad de contraatacar y causar daño a 150% cuando es golpeado por ataques normales. Además, Hay un 50% de probabilidad de que tu propio escuadrón reciba un -60% de daño de habilidad en cada turno, durante 1 ronda.',
  },
  'Liberator:5': {
    type: 'Ataque adicional',
    target: '1 aliado aleatorio',
    desc: 'Los ataques normales tienen una probabilidad del 80% de aplicar un bloqueo de recuperación de tropas, que dura 1 ronda. También existe la posibilidad de que 70% otorgue Claridad de Mente a tu última fila, haciéndola inmune al Silencio, Desarmado, Suprimido y Confundido durante 1 ronda.',
  },
  'Liberator:8': {
    type: 'Habilidades prebatalla',
    target: '3 aliados aleatorios',
    desc: 'Cuando el escuadrón del héroe está en la primera fila, todos los escuadrones aliados reciben menos daño de -20% durante las primeras 3 rondas. A partir de la ronda 4, 40% del daño que inflige tu escuadrón de la última fila se convierte en tropas de la primera fila en recuperación una vez que finaliza el efecto.',
  },
  'Ashen Verdict:2': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios',
    desc: 'Ashen Verdict obtiene la marca de persecución 1 por cada ataque normal realizado por tus escuadrones. Cuando las Marcas se acumulan en 7, todos los escuadrones enemigos reciben un un 400% de daño adicional y se eliminan todas las marcas existentes.',
  },
  'Ashen Verdict:5': {
    type: 'Habilidad de combate',
    target: '1 aliado aleatorio',
    desc: 'Hay un 35% de probabilidad de que el escuadrón del héroe tenga un ataque normal adicional de 1 en cada turno, que dura 2 rondas. El escuadrón es inmune a Desarmado mientras dure.',
  },
  'Ashen Verdict:8': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'El escuadrón del héroe tiene una probabilidad del 35% de aplicar una condición a un escuadrón enemigo aleatorio después de cada ataque normal de 2: Desarmado, Silenciado, Confundido, Interrumpido o Recuperación de tropas bloqueada. La probabilidad se determina de forma independiente para cada efecto. Todos los efectos duran el último turno del 1.',
  },
  'Warden:2': {
    type: 'Habilidades prebatalla',
    target: '2 aliados aleatorios',
    desc: 'Durante las primeras 4 rondas, la probabilidad de lanzar habilidades de la habilidad 5 de tus otros dos héroes aumenta en 10% (limitado a habilidades de combate y habilidades pasivas). En el turno 5, la probabilidad de lanzar habilidades aumenta con 30%, pero solo para la habilidad 5 de uno de los otros dos héroes.',
  },
  'Warden:5': {
    type: 'Habilidades prebatalla',
    target: '3 enemigos aleatorios, aliado aleatorio',
    desc: 'Cuando está sujeto a un estado de control (silenciado, desarmado, suprimido o confundido), tu escuadrón sufre daño -70%. El efecto puede activarse hasta 3 veces en un escuadrón en batalla. En las rondas 1 y 5, inflige un 510% de daño a un escuadrón enemigo aleatorio.',
  },
  'Warden:8': {
    type: 'Habilidades prebatalla',
    target: '3 enemigos aleatorios',
    desc: 'Durante las batallas, los ataques normales están desactivados para el escuadrón del héroe, pero tu escuadrón de la última fila obtiene una ventaja: ataque normal +1 por ronda. Cada ataque normal aumenta el daño de su siguiente habilidad en 12%, acumulándose hasta 5 rondas.',
  },
  'Warhammer:2': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio, aliado aleatorio',
    desc: 'Gana la capa +1 de carga de armadura reflectante cada vez que un escuadrón amigo sufre daño. Cuando la armadura alcance las 9 acumulaciones, otorga una capa de Escudo reflectante a un escuadrón amigo aleatorio, con la posibilidad de que 30% agregue otra capa. El escudo puede anular 100% del siguiente daño entrante al atacante y proteger al portador del escudo de cualquier daño esta vez. Después de otorgar un escudo, todas las capas apiladas de Armadura reflectante se reinician.',
  },
  'Warhammer:5': {
    type: 'Habilidad de combate',
    target: '3 enemigos aleatorios, aliado aleatorio',
    desc: 'Hay un 100% de probabilidad de infligir un 108% de daño a todos los escuadrones enemigos, pero todos los escuadrones amigos reciben 20% del daño infligido a los escuadrones enemigos. Este daño proporciona cargos por armadura reflectante.',
  },
  'Warhammer:8': {
    type: 'Habilidades prebatalla',
    target: '3 enemigos aleatorios, aliado aleatorio',
    desc: 'Reducir la recuperación de tropas para escuadrones enemigos y amigos un -25%. A partir del turno 4, se reduce el efecto de recuperación de tropas para todos los escuadrones enemigos en -15% por turno. Este efecto se acumula y dura hasta el final del combate.',
  },
  'Eidolon:2': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'El escuadrón del héroe tiene una tasa de evasión base 10% y obtiene un 25% adicional cada vez que recibe daño, acumulándose hasta 100%. Una vez que el escuadrón evade con éxito un ataque, se elimina la tasa de evasión adicional.',
  },
  'Eidolon:5': {
    type: 'Habilidad de combate',
    target: '2 aliados aleatorios',
    desc: 'Oportunidad de activación de 40%: 2 otros escuadrones amigos extraen un 60% de Poder y Resistencia del 1 escuadrón enemigo aleatorio. Además, cada ataque normal tiene una probabilidad de 100% de infligir daño adicional a 250% durante el 1 ronda.',
  },
  'Eidolon:8': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'El escuadrón del héroe tiene un 33% de probabilidad de recuperar tropas de 80% después de una Evasión exitosa, una oportunidad 33% de recibir daño reducido de -35% y una oportunidad 33% de hacer que los 2 escuadrones enemigos aleatorios reciban más daño de 15%. Cada probabilidad se calcula de forma independiente y no se acumula. Cada efecto dura 2 rondas.',
  },
  'Scarlet Reaver:2': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Hay un 100% de probabilidad de infligir un 100% de daño al escuadrón enemigo de la primera fila, con una probabilidad del 40% de infligir un daño 500% adicional al escuadrón enemigo con las tropas más bajas.',
  },
  'Scarlet Reaver:5': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Requiere 1 ronda de preparación. Hay un 40% de probabilidad de atacar a 5 veces, y cada ataque selecciona un escuadrón enemigo aleatorio e inflige daño a 150%. Cada ataque también tiene un 65% de probabilidad de aplique un estado para el 1 ronda según el escuadrón enemigo: Desarmar para los arqueros, Silencio para los infantería y la caballería. Desarmar y Silenciar pueden acumularse hasta 2 acumulaciones.',
  },
  'Scarlet Reaver:8': {
    type: 'Habilidades prebatalla',
    target: '2 enemigos aleatorios',
    desc: 'En el 1 ronda, 4 y 7, establece el estado de quema en 2 escuadrones enemigos aleatorios durante los 2 rondas, lo que inflige un 150% de daño en cada turno. El escuadrón del héroe obtiene 35% para contraatacar contra la caballería, y todos los escuadrones aliados infligen un +50% de daño de habilidad contra objetivos en llamas.',
  },
  'Rainforest Ranger:2': {
    type: 'Habilidades prebatalla',
    target: '1 aliado aleatorio',
    desc: 'El daño que inflige el escuadrón de este héroe ignora el 25% de la resistencia básica del escuadrón enemigo. Durante las primeras 3 rondas, los ataques normales del escuadrón de este héroe se fijan en el escuadrón enemigo en la misma posición e ignoran el doble de la resistencia básica.',
  },
  'Rainforest Ranger:5': {
    type: 'Ataque adicional',
    target: '1 enemigo aleatorio',
    desc: 'Probabilidad de 50% después de un ataque normal de infligir un 350% de daño adicional al objetivo. Existe una posibilidad de 50% cuando se activa el daño adicional para infligir supresión a un 1 enemigo aleatorio durante el 1 ronda.',
  },
  'Rainforest Ranger:8': {
    type: 'Ataque adicional',
    target: '1 aliado aleatorio',
    desc: 'Hay un 35% de probabilidad después de un ataque normal de infligir un 600% de daño adicional al objetivo. Este daño adicional aumenta a 810% si el poder de tropas del escuadrón objetivo es 50% menor que al comienzo de la batalla.',
  },
  'Fortuneteller:2': {
    type: 'Habilidades prebatalla',
    target: '1 enemigo aleatorio',
    desc: 'Marca el 1 escuadrón enemigo aleatorio y reduce su recuperación de tropas un -70%, luego aplica una desventaja basada en el tipo de tropa del escuadrón marcado. Lacayos: todos los escuadrones enemigos reciben +20% menos daño de ataque normal. arqueros: todos los escuadrones enemigos infligen -40% menos daño de ataque normal. caballerías: todos los escuadrones enemigos infligen -30% menos daño de habilidad.',
  },
  'Fortuneteller:5': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Oportunidad de 50% de vincular el 1 escuadrón enemigo aleatorio con el escuadrón marcado para los 2 rondas. Cuando cualquiera de los escuadrones sufre daño, el otro escuadrón recibe 50% de ese daño.',
  },
  'Fortuneteller:8': {
    type: 'Habilidad de combate',
    target: '1 enemigo aleatorio',
    desc: 'Obtienes +1 carga cada vez que un escuadrón amigo lanza una habilidad de combate. Una vez que se acumulan las cargas de 6, inflige un 750% de daño al escuadrón marcado y suprimelos durante el 1 ronda.',
  },
  'Cyrus:2': {
    type: 'Habilidad de combate',
    target: '2 enemigos aleatorios',
    desc: 'Requiere 1 ronda de preparación. Hay un 65% de probabilidad de infligir un 325% de daño a 2 escuadrones enemigos aleatorios, impidiéndoles restaurar el poder de las tropas durante 1 ronda. Esta habilidad tiene un 80% de probabilidad de pasar por alto la etapa de preparación y lanzarse directamente.',
  },
  'Cyrus:5': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'Todos los escuadrones de caballería aliados obtienen el efecto caballería de tormenta: al lanzar una habilidad activa, infligen un 40% más de daño; al lanzar una habilidad de persecución, el daño recibido se reduce un 40% durante 2 rondas. Cuando cualquiera de tus escuadrones activa caballería de tormenta, Cyrus obtiene un 50% de su efecto, acumulable hasta 5 veces y vigente hasta el final de la batalla.',
  },
  'Cyrus:8': {
    type: 'Habilidad de estado',
    target: '1 aliado aleatorio',
    desc: 'El equipo de Cyrus tiene una posibilidad de 10% de esquivar. Después de cada esquiva exitosa, Cyrus obtiene aleatoriamente uno de varios efectos, incluidos Primero en atacar y Firmeza. Si esquivar falla, todos tus escuadrones se vuelven firmezas inmediatamente durante la ronda de 1 y obtienen un efecto que reduce el daño recibido un 50% para el siguiente ataque entrante, efectivo una vez por ronda.',
  },
};

const strings = {
  Basic: 'Básico',
  Intermediate: 'Intermedio',
  Advanced: 'Avanzado',
  'The entry-level skin tier — it grants an Inheriting Skill but never a Preserving Skill.':
    'El nivel inicial de aspectos: otorga una habilidad de Herencia, pero nunca una de Preservación.',
  'The mid tier — it carries both an Inheriting Skill and a Preserving Skill, funded with standard Biography Seals.':
    'El nivel intermedio: incluye habilidades de Herencia y Preservación, y se mejora con Sellos de biografía normales.',
  'The top tier — it also has an Inheriting Skill and a Preserving Skill, but its upgrades cost the pricier Advanced Biography Seals.':
    'El nivel más alto: también incluye ambas habilidades, pero sus mejoras requieren los más costosos Sellos de biografía avanzados.',
  'Granted on activation (owning the skin).': 'Se otorga al activar el aspecto (con solo tenerlo).',
  "Buy directly during that hero's launch event — yours to keep once purchased.":
    'Cómpralo directamente durante el evento de lanzamiento de ese héroe; una vez comprado, será tuyo para siempre.',
  "Trade for it in the Eden Skin Store: Beast Queen's Mythic skin runs 400 Biography Skin coins.":
    'Canjéalo en Eden Skin Store: el aspecto Mythic de Beast Queen cuesta 400 monedas de Biography Skin.',
  'Pull from launch or return event packs (about a 1.4% drop rate per pack).':
    'Obtenlo en paquetes del evento de lanzamiento o regreso (aprox. 1,4 % de probabilidad por paquete).',
  'Pick select skins up from the Eden Skin Store rotation.':
    'Consigue aspectos seleccionados en la rotación de Eden Skin Store.',
  'Recruit certain skins with Super Vouchers.':
    'Consigue determinados aspectos con Super Vouchers.',
  'Earn some as milestone rewards in cumulative gem-spend events.':
    'Consigue algunos como recompensas de hito en eventos de gasto acumulado de gemas.',
  'Exchange Perfect Crystals for them in the Premium Shop.':
    'Usa Perfect Crystals para obtenerlos en Premium Shop.',
  'Only two heroes have Mythic skins.': 'Solo dos héroes tienen aspectos Mythic.',
  'The most common skin tier — most heroes with a skin fall here.':
    'El nivel de aspectos más común: la mayoría de los héroes con aspecto pertenecen a este nivel.',
  'Epic Hero Medal': 'Medalla de héroe épico',
  'Legendary Hero Medal': 'Medalla de héroe legendario',
  'Seasonal Legendary Hero Medal': 'Medalla de héroe legendario de temporada',
  'Biography Seal': 'Sello de biografía',
  'Advanced Biography Seal': 'Sello de biografía avanzado',
  '1 random friendly squad within effective range':
    '1 escuadrón amigo aleatorio dentro del alcance efectivo',
  '3 random friendly squads within effective range':
    '3 escuadrones amigos aleatorios dentro del alcance efectivo',
  'A castable battle skill. Some have prep time, chance to trigger, range, and target rules.':
    'Una habilidad de batalla lanzable. Algunos tienen tiempo de preparación, posibilidad de activar, rango y reglas de objetivo.',
  'A cleansing or control-resistance state that helps remove or avoid negative effects.':
    'Un estado de limpieza o resistencia al control que ayuda a eliminar o evitar efectos negativos.',
  'A commander-style passive effect that usually applies as long as the hero is in the legion.':
    'Un efecto pasivo estilo comandante que normalmente se aplica mientras el héroe esté en la legión.',
  'A control-immunity or cleansing state; usually protects from disabling effects for its duration.':
    'Un estado de control-inmunidad o de limpieza; normalmente protege de efectos incapacitantes durante su duración.',
  'A damage-over-time status that keeps hurting the affected squad while active.':
    'Un estado de daño en el tiempo que sigue dañando al escuadrón afectado mientras está activo.',
  'A damage-over-time style status that keeps hurting the affected squad while active.':
    'Un estado de estilo de daño en el tiempo que sigue dañando al escuadrón afectado mientras está activo.',
  'A disabling status such as Silence, Disarm, Suppress, or Confuse.':
    'Un estado de desactivación como Silenciar, Desarmar, Suprimir o Confundir.',
  'A normal attack state that hits additional enemy squads beyond the main target.':
    'Un estado de ataque normal que golpea a escuadrones enemigos adicionales más allá del objetivo principal.',
  'A passive/status-driven skill that changes states, immunities, damage rules, or ongoing battle behavior.':
    'Una habilidad pasiva/basada en estado que cambia estados, inmunidades, reglas de daño o comportamiento de batalla en curso.',
  'A skill that can trigger during battle when its conditions and chance roll are met.':
    'Una habilidad que puede activarse durante la batalla cuando se cumplen sus condiciones y tirada de probabilidad.',
  'A special damage effect that can bypass or punish defenses depending on the skill.':
    'Un efecto de daño especial que puede eludir o castigar las defensas según la habilidad.',
  'A special strike effect with its own chance and damage rate, often scaling with buffs.':
    'Un efecto de golpe especial con su propia probabilidad y tasa de daño, que a menudo aumenta con ventajas.',
  'A stackable buff used by some heroes to increase follow-up effects, damage, or trigger chances.':
    'Un beneficio acumulable utilizado por algunos héroes para aumentar los efectos de seguimiento, el daño o las posibilidades de activación.',
  'A status that makes the target vulnerable to fire-related effects.':
    'Un estado que hace que el objetivo sea vulnerable a los efectos relacionados con el fuego.',
  'A weakening status that reduces effectiveness while active.':
    'Un estado debilitante que reduce la efectividad mientras está activo.',
  'Active Skill': 'Habilidad activa',
  'Acts before enemy squads, which can unlock extra skill effects for some heroes.':
    'Actúa antes que los escuadrones enemigos, lo que puede desbloquear efectos de habilidades adicionales para algunos héroes.',
  'Additional Attack': 'Ataque adicional',
  'Adds or modifies normal attacks, often creating extra hits or effects after attacks.':
    'Agrega o modifica ataques normales, a menudo creando golpes o efectos adicionales después de los ataques.',
  'Affected squad may attack or cast skills on random targets.':
    'El escuadrón afectado puede atacar o lanzar habilidades sobre objetivos aleatorios.',
  'Affected squad takes more damage or loses protection while active.':
    'El escuadrón afectado recibe más daño o pierde protección mientras está activo.',
  'All Biography Attributes activated': 'Todos los atributos de biografía activados',
  'Applies before or at battle start, often setting buffs, debuffs, opening conditions, or early-round rules.':
    'Se aplica antes o al comienzo de la batalla, y a menudo establece ventajas, desventajas, condiciones de apertura o reglas para las primeras rondas.',
  'Armor break': 'Ruptura de armadura',
  'Army Defense': 'Defensa del ejército',
  'Army HP': 'HP del ejército',
  'Army Might': 'Poder del ejército',
  'Arthur Pendragon the Once and Future King': 'Arthur Pendragon, el rey que fue y será',
  'Avoids an incoming damage instance or attack while active.':
    'Evita una instancia de daño entrante o un ataque mientras está activo.',
  Biography: 'Biografía',
  'Biography attributes': 'Atributos de la biografía',
  'Biography Attributes': 'Atributos de biografía',
  'Biography skin details pending': 'Detalles del aspecto biográfico pendientes',
  'Biography: Hidden Power': 'Biografía: Poder Oculto',
  Bleeding: 'Sangrado',
  'Captured screenshot shows Eternity at Lv.10 and max level reached.':
    'La captura muestra Eternidad en Nv.10, con el nivel máximo alcanzado.',
  Chain: 'cadena',
  Clarity: 'claridad',
  'Combat Skill': 'Habilidad de combate',
  'Combat Skill Damage': 'Daño de habilidad de combate',
  Confuse: 'Confusión',
  Confused: 'Confundido',
  'Control Debuff': 'Debuff de control',
  'Counter-attack': 'Contraataque',
  Counterattack: 'Contraataque',
  Cursed: 'Maldición',
  'Damage dealt by a skill rather than a normal attack.':
    'Daño infligido por una habilidad en lugar de un ataque normal.',
  'Damage dealt specifically by combat skills, not normal attacks.':
    'El daño infligido específicamente por habilidades de combate, no por ataques normales.',
  'Damage or effects can jump from one squad to another.':
    'Los daños o efectos pueden saltar de un escuadrón a otro.',
  'Damage spills onto nearby or additional squads.':
    'El daño se extiende a escuadrones cercanos o adicionales.',
  'Damage taken': 'Daño recibido',
  'Damage taken by the hero is reduced by 80% at the start of battle. Each time the hero takes damage, the mitigation is reduced by 8% (reduced by 4% each time for the first 3 rounds), while Resistance increases by 20% and Damage dealt increases by 10%, stackable up to 20 layers, until battle ends.':
    'Al comenzar la batalla, el daño recibido por el héroe se reduce en 80%. Cada vez que recibe daño, la mitigación baja 8% (4% durante las primeras 3 rondas), mientras que su Resistencia aumenta 20% y el daño infligido aumenta 10%. Se acumula hasta 20 veces y dura hasta el final de la batalla.',
  'Damage type usually tied to normal or physical strikes.':
    'El tipo de daño generalmente está relacionado con golpes normales o físicos.',
  'Deals damage back after being attacked or after a matching trigger.':
    'Inflige daño después de ser atacado o después de una activación coincidente.',
  Defend: 'Defensa',
  'Destructive Strike': 'Golpe destructivo',
  'Details pending': 'Detalles pendientes',
  Disarm: 'Desarme',
  Disarmed: 'Desarmado',
  Dodge: 'Evasión',
  Dodging: 'Evasión',
  'Dynamic icon behavior pending capture.':
    'Comportamiento dinámico del icono pendiente de captura.',
  'Dynamic icon capture pending.': 'Captura de ícono dinámico pendiente.',
  Eternity: 'Eternidad',
  Everlasting: 'Eterno',
  Faltering: 'Vacilación',
  'Fatal Blow': 'Golpe fatal',
  Feverish: 'Furia',
  'First to Attack': 'Iniciativa',
  'First-Aid': 'Primeros auxilios',
  Flammable: 'Inflamable',
  Footmen: 'Infantería',
  'Forces or redirects enemy attacks toward the taunting squad.':
    'Obliga a los enemigos a atacar al escuadrón con Provocación o redirige sus ataques hacia él.',
  Healing: 'Curación',
  'Healing or recovery effect that restores troop power.':
    'Efecto curativo o de recuperación que restaura el poder de las tropas.',
  Inheriting: 'Herencia',
  'Inheriting Skill': 'Habilidad de herencia',
  'Inheriting skill details pending.': 'Detalles de la habilidad de herencia pendientes.',
  'Inheriting skill details will be added after capture.':
    'Los detalles de la habilidad de herencia se añadirán después de documentarla.',
  Interrupting: 'Interrupción',
  'Leadership Skill': 'Habilidad de liderazgo',
  Legendary: 'Legendario',
  'Mass Attack': 'Ataque en masa',
  Melee: 'Cuerpo a cuerpo',
  'More unlocked Biography Skin variants can add stronger Hidden Power when a hero has additional variants.':
    'Más variantes de aspectos de biografía desbloqueadas pueden agregar un poder oculto más fuerte cuando un héroe tiene variantes adicionales.',
  Mythic: 'Mítico',
  'Normal Attack': 'Ataque normal',
  'Own 2 Biography Skin variants': 'Consigue 2 variantes de aspecto biográfico',
  'Owned skin bonus': 'Bonificación por aspecto obtenido',
  pending: 'pendiente',
  'Physical Damage': 'Daño físico',
  Poisoned: 'Envenenado',
  'Pre-Battle Skill': 'Habilidad previa a la batalla',
  'Pre-Battle Skills': 'Habilidades prebatalla',
  'Prep Skills': 'Habilidades de preparación',
  Preserving: 'Conservación',
  'Preserving Skill': 'Habilidad de conservación',
  'Preserving skill and dynamic icon details pending.':
    'Detalles de la habilidad de conservación y del icono dinámico pendientes.',
  'Preserving skill details will be added after capture.':
    'Los detalles de la habilidad de conservación se añadirán después de documentarla.',
  'Preserving unlock items': 'Objetos para desbloquear la conservación',
  'Prevents affected squads from recovering troop power while active.':
    'Evita que los escuadrones afectados recuperen el poder de sus tropas mientras están activos.',
  'Prevents combat skill casting while active.':
    'Impide el lanzamiento de habilidades de combate mientras está activo.',
  'Prevents normal attacks while active.': 'Previene ataques normales mientras está activo.',
  'Prevents the squad from acting or casting depending on the skill wording.':
    'Evita que el escuadrón actúe o lance dependiendo de la redacción de la habilidad.',
  'Punishes the affected squad when it performs certain actions, often skill casting.':
    'Castiga al escuadrón afectado cuando realiza ciertas acciones, a menudo lanzando habilidades.',
  Recovery: 'Recuperación',
  'Reduces defensive value, making affected squads take more damage.':
    'Reduce el valor defensivo, lo que hace que los escuadrones afectados reciban más daño.',
  'Replaces Wheel of Fortune with Eternity when the skin reaches Star 2.':
    'Reemplaza Rueda de la fortuna por Eternidad cuando el aspecto alcanza la Estrella 2.',
  Resistance: 'Resistencia',
  'Restores troop power to one or more squads.':
    'Restaura el poder de las tropas en uno o más escuadrones.',
  'Restores troop power; usually shown as a recovery rate.':
    'Restaura el poder de las tropas; generalmente se muestra como una tasa de recuperación.',
  'Returns or restores a defeated or heavily damaged squad effect depending on the skill.':
    'Devuelve o restaura un efecto de escuadrón derrotado o muy dañado según la habilidad.',
  Revived: 'Revivido',
  'Royal Exclusive': 'Exclusivo real',
  S: 'S',
  S1: 'S1',
  S2: 'S2',
  S3: 'S3',
  S4: 'S4',
  Silence: 'Silencio',
  Silenced: 'Silenciado',
  'Skill activated': 'Habilidad activada',
  'Skill Damage': 'Daño de habilidad',
  'Skills that need one or more rounds of preparation before firing.':
    'Habilidades que necesitan una o más rondas de preparación antes de disparar.',
  'Skin advancement complete': 'Mejora del aspecto completada',
  'Skin advancement unlocks the upgraded hero skill.':
    'La mejora del aspecto desbloquea la habilidad de héroe mejorada.',
  'Skin ownership grants biography attributes once details are captured.':
    'Poseer el aspecto otorga atributos de biografía cuando se documentan sus detalles.',
  'Skin ownership grants the biography attributes by default.':
    'Poseer el aspecto otorga los atributos de biografía de forma predeterminada.',
  Sober: 'Lucidez',
  'Solid Shield': 'Escudo sólido',
  'Some heroes have more than one Biography Skin variant. Those variants share the same Biography Attributes and progress; owning more than one variant unlocks Hidden Power.':
    'Algunos héroes tienen más de una variante de aspecto biográfico. Todas comparten los mismos atributos de biografía y progreso; poseer más de una variante desbloquea el Poder oculto.',
  SP: 'SP',
  'Special preserving unlock items add the preserving skill and moving icon.':
    'Los objetos especiales de desbloqueo añaden la habilidad de conservación y el icono animado.',
  Splash: 'Salpicadura',
  'Star 1': 'Estrella 1',
  'Star 2': 'Estrella 2',
  'Star 3': 'Estrella 3',
  'Star 3 uses the same unique icon with a small in-place movement.':
    'La Estrella 3 usa el mismo icono único, con una ligera animación en el sitio.',
  'Status Skill': 'Habilidad de estado',
  'Stops a channeling or prep skill before it completes.':
    'Detiene una habilidad de canalización o preparación antes de que se complete.',
  Suppress: 'Supresión',
  Suppressed: 'Suprimido',
  'Tactical Might': 'Poder táctico',
  'Tactical Resistance': 'Resistencia táctica',
  Taunt: 'Provocación',
  Taunting: 'Provocación',
  'The basic attack a squad performs without casting a combat skill.':
    'El ataque básico que realiza un escuadrón sin lanzar una habilidad de combate.',
  "The Hero's squad": 'El escuadrón del héroe',
  "The hero's squad gains 4% HP and takes 2% less damage.":
    'El escuadrón del héroe obtiene 4% de PV y recibe 2% menos de daño.',
  "The Hero's squad takes -10% Skill Damage; the Hero's Legion gains 13% Resistance.":
    'El escuadrón del héroe recibe -10% de daño de habilidad; la legión del héroe obtiene 13% de Resistencia.',
  'The Once and Future King': 'El rey que fue y será',
  'The same unique icon moves slightly in place after the preserving skill is unlocked.':
    'El mismo icono único se anima ligeramente en el sitio al desbloquear la habilidad de conservación.',
  'Troop Damage': 'Daño a las tropas',
  'Troop Recovery Block': 'Bloqueo de recuperación de tropas',
  'Unique icon becomes available with the inheriting skill.':
    'El icono único pasa a estar disponible al desbloquear la habilidad de herencia.',
  'Unique skin icon available when the inheriting skill is unlocked.':
    'El icono de aspecto único está disponible al desbloquear la habilidad de herencia.',
  Vulnerable: 'Expuesto',
  'Wheel of Fortune': 'Rueda de la fortuna',
};

export default { skills, strings };
