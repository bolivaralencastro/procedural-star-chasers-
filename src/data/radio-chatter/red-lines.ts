import { RadioContext } from '../../models/radio-chatter';

export const RED_LINES: Record<RadioContext, string[]> = {
  proximity: [
    'Vocês sentiram? Minha órbita acabou de ficar lotada.',
    'Sai da minha rota, tô a mil por hora!',
    'Ops, quase pintei teu casco de vermelho.',
    'Passei tão perto que senti o calor do motor.',
    'Ei, sem esbarrar! Essa pintura é nova.',
    'Cuidado com a turbulência, tô acelerando!',
    'Chega mais, vamos dançar ao redor dessa estrela.',
    'Se piscar, eu já passei de novo.',
    'Bora dividir esse corredor estreito, mas sem arranhar.',
    'Wow, quase fizemos um duo acrobático!',
    'Espero que tenha ouvido minha buzina cósmica.',
    'Ficou colado? Aproveita o vácuo e segura firme.',
    'A curva foi apertada demais até pra mim, respira.',
    'Tão perto que quase ouvi seu motor cantar.',
    'Se vier no meu encalço, prepara pra faísca.'
  ],
  star_capture: [
    'Roubei essa estrela antes dela perceber.',
    'Olha o brilho! Vermelho garante mais uma.',
    'Já é minha, já é minha! Próxima!',
    'Peguei no reflexo, obrigado pelo empurrão.',
    'Mais uma pro meu estoque de fogos.',
    'Estrela capturada, propulsores felizes.',
    'Toma essa, universo! Colecionei outra centelha.',
    'Cacei, agarrei e celebrei. Quem acompanha?',
    'Velocidade e estilo: estrela no bolso.',
    'Encontrei o ponto certo, sincronizado.',
    'Bingo! Brilho vermelho em primeiro lugar.',
    'Confere aí no placar, subi mais um degrau.',
    'Nem precisei frear, só estendi a mão.',
    'Pontuação subindo que nem foguete, viu?',
    'Roubei o holofote e deixei rastro vermelho.'
  ],
  meteor_event: [
    'Chuva de pedras? Hora de acelerar!',
    'Cooperação ativada, vamos varrer esses meteoros.',
    'Foguetes prontos, não vou deixar cair nenhum.',
    'E aí, equipe, preparados para o show pirotécnico?',
    'Vou abrir caminho na marra, mantenham-se atrás.',
    'Meteoros vindo quente, e eu mais ainda.',
    'Vambora! Quero ver faísca pra todo lado.',
    'Formação agressiva, eu na linha de frente.',
    'Vocês cobrem, eu avanço: plano perfeito.',
    'Hora de mostrar quem manda nesse cinturão.',
    'Vamos torar essas pedras antes que esquentem.',
    'Energia máxima, ninguém vai parar a esquadrilha.',
    'Alvo travado, vou riscar o céu com eles.',
    'Deixem alguns pra mim, quero colecionar crateras.',
    'Seja meteoro ou chuva, eu corto no meio.'
  ],
  paralyzed: [
    'Droga, fiquei travada! Preciso de um toque.',
    'Meu painel apagou, alguém dá um empurrão.',
    'Estou presa! Não deixem os meteoros passarem.',
    'Ei, suporte! Minha nave congelou.',
    'Sistemas em pausa forçada. Preciso de resgate.',
    'Que pancada! Estou desligada por alguns segundos.',
    'Fui atingida, sem manobras por enquanto.',
    'Cai na rede eletromagnética, socorro!',
    'Não me deixem aqui, ainda tenho fogo pra gastar.',
    'Paralisada, mas não derrotada. Ajuda!',
    'Meu painel piscou em vermelho. SOS!',
    'Energia caiu, esperando reparo rápido.',
    'Escudos fritaram, to sem reação.',
    'Parada total, mas ainda com chama.',
    'Tiraram meu volante, alguém dirige por mim?'
  ],
  rescue: [
    'Valeu pela mão, reacendendo motores!',
    'Estou de volta, hora do contra-ataque!',
    'Ressuscitei graças a vocês. Bora terminar.',
    'Nave reativada, confiança no máximo.',
    'Isso sim é trabalho de equipe. Vamos!',
    'Obrigado pelo cabo, prometo duas estrelas de volta.',
    'Retornei mais quente que antes, segura!',
    'Reboot completo, quem é o próximo alvo?',
    'Sistema ok, bora compensar o tempo parado.',
    'Ganhamos tempo, agora eu acelero mais.',
    'Reparo recebido, vou devolver em fogo.',
    'Estou livre outra vez, rumo à linha de frente.',
    'Favores pagos em velocidade dobrada.',
    'Voltei tinindo, me acompanhem se puderem.',
    'Descanso acabou, hora de pegar atalho.'
  ],
  launch: [
    'Joguei o corpo pra frente, catapulta perfeita!',
    'Fui arremessada, agora é só cortar o vento.',
    'Solta que eu deslizo, motor já tá gritando.',
    'Mouse puxou, faísca voou. Valeu pelo impulso!',
    'Curti o estilingue, mira outra estrela pra mim.',
    'Se lançarem de novo, eu faço pirueta dupla.'
  ],
  philosophical: [
    'A velocidade é tudo. No vácuo infinito, só quem acelera sobrevive.',
    'Cada estrela capturada é uma vitória contra o vazio. Mas o vazio sempre volta.',
    'Por que competir se o universo é tão vasto? Porque sem competição, somos nada.',
    'Sinto o motor pulsar como meu coração. Adrenalina é a essência da vida.',
    'O tempo é relativo, mas a velocidade é absoluta. Quem para, perde.',
    'No espaço, não há linhas de chegada. Só corridas infinitas contra o desconhecido.',
    'Cada teleporte é um grito de liberdade. Mas para onde estamos fugindo?',
    'A competição nos define. Sem rivais, somos apenas poeira estelar.',
    'O universo é um circuito gigante. E eu sou a nave mais rápida nele.',
    'Por que refletir quando posso acelerar? Mas às vezes, a velocidade revela a verdade.',
    'Cada explosão é um lembrete: viver no limite é o único caminho.',
    'O vazio chama, mas eu respondo com fogo. Essa é minha filosofia.',
    'Velocidade não é só movimento. É resistência contra a entropia.',
    'No fim, todas as estrelas se apagam. Mas eu brilho enquanto posso.',
    'Competir é existir. No universo, só os fortes deixam rastros.'
  ],
  hunting: [
    'Foco total! Estrela detectada, vou pegar!',
    'Mira ajustada, estrela no radar!',
    'Caça iniciada, velocidade máxima!'
  ],
  star_spawn: [
    'Nova estrela! Preparem-se!',
    'Alvo avistado, vamos nessa!',
    'Estrela fresca, hora da ação!'
  ],
  asteroid_warning: [
    'Asteróides à vista! Cuidado!',
    'Perigo! Detritos cósmicos se aproximando!',
    'Alerta vermelho! Meteoros em rota de colisão!'
  ],
  asteroid_clear: [
    'Limpamos o caminho! Vamos voltar à caça!',
    'Perigo eliminado, estrelas à vista!',
    'Asteróides destruídos, missão cumprida!'
  ],
  wormhole_shuffle: [
    'Buraco de minhoca! Prepare-se para o salto!',
    'Viagem dimensional detectada!',
    'Wormhole ativo! Segura firme!'
  ],
  supernova: [
    'Supernova carregada! Cuidado!',
    'Explosão massiva! Todos afastem-se!',
    'Poder estelar liberado!'
  ],
  fire: [
    'Fogo! Projétil disparado!',
    'Atirando! Cuidado!',
    'Laser ativado!'
  ],
  chasing: [
    'Perseguindo a estrela!',
    'Na cola do alvo!',
    'Não vai escapar!'
  ],
};
