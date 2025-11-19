import { Injectable } from '@angular/core';
import { ShipColor } from '../models/ship-personas';

export type RadioContext =
  | 'proximity'
  | 'star_capture'
  | 'meteor_event'
  | 'paralyzed'
  | 'rescue'
  | 'launch'
  | 'philosophical';

type LinePools = Record<ShipColor, Record<RadioContext, string[]>>;

@Injectable({ providedIn: 'root' })
export class RadioChatterService {
  private readonly messageDuration = 4500;
  private readonly globalCooldownRange: [number, number] = [3200, 5200];
  private readonly contextCooldowns: Record<RadioContext, [number, number]> = {
    proximity: [9000, 14000],
    star_capture: [7000, 11000],
    meteor_event: [12000, 15000],
    paralyzed: [8000, 13000],
    rescue: [8000, 13000],
    launch: [6000, 11000],
    philosophical: [300000, 600000], // 5-10 minutes for rare philosophical moments
  };

  private readonly linePools: LinePools = {
    Red: {
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
    },
    Green: {
      proximity: [
        'Ei, quase toquei seu casco! Vamos sincronizar.',
        'Proximidade detectada, bora voar lado a lado.',
        'Senti um vento de plasma, isso foi você?',
        'Atenção, vou ajustar a rota pra não esbarrar.',
        'Ôpa, nossa formação ficou bonita agora.',
        'Foi por pouco! Coordenei os escudos.',
        'Chegando perto, compartilhe essa trilha comigo.',
        'Dá pra ouvir meu sorriso daqui?',
        'Adoro quando ficamos pertinho, parece dança orbital.',
        'Tá confortável aí? Posso aproximar mais.',
        'Sem arranhões, só boas vibrações ao redor.',
        'Fiz curva ampla pra manter a amizade intacta.',
        'Cheguei devagarinho pra não assustar.',
        'Nossa sombra quase virou uma só.',
        'Aproximando com cuidado, respirem juntos.'
      ],
      star_capture: [
        'Peguei uma estrela novinha, quem quer luz extra?',
        'Salvei essa estrela pra nossa coleção.',
        'Pronto! Brilho seguro e sustentável.',
        'Mais uma estrela protegida, equipe.',
        'Capturei com cuidado, sem desperdiçar energia.',
        'Estrela a bordo! Verdes também brilham.',
        'Pontinho dourado a salvo, seguimos.',
        'Colheita estelar feita, agora mais rápido.',
        'Bom trabalho, equipe, vou guardar essa aqui.',
        'Apontei, alcancei, capturei. Suave.',
        'Essa centelha rende um jardim inteiro.',
        'Missão de coleta cumprida, seguindo.',
        'Brilho seguro, mantive a órbita limpa.',
        'Contagem verde subindo, obrigada pela ajuda.',
        'Estrela acolhida, vamos cuidar dela juntos.'
      ],
      meteor_event: [
        'Meteoros chegando! Vamos cobrir uns aos outros.',
        'Modo cooperativo ativado, foco na proteção.',
        'Eu suporto, vocês disparam. Fechado?',
        'Vou estabilizar quem precisar durante a tempestade.',
        'Vamos manter distâncias seguras e abrir caminho.',
        'Plasma carregado, mirando nas rochas.',
        'Levem munição, eu fico de olho na retaguarda.',
        'Alerta verde: cada meteoro é uma chance de brilhar juntos.',
        'Posso chamar as rotações, só seguir meus pingues.',
        'Meteoros não são páreo pra três cabeças.',
        'Coesão primeiro, depois velocidade.',
        'Refresquem os escudos, vai sacudir.',
        'Vamos dividir essa chuva, nada de desperdício.',
        'Mantenham a calma, cuidamos de cada pedra.',
        'Passo a passo, meteoros derretem na harmonia.'
      ],
      paralyzed: [
        'Ai! Sistemas travados, preciso de assistência.',
        'Não consigo manobrar, alguém me puxa.',
        'Estou congelada, mas monitorando vocês.',
        'Sinal verde ficou cinza, ajuda aqui.',
        'Fui atingida! Respirem fundo e me resgatem.',
        'Minha energia caiu, aguardo reparo.',
        'Estou parada, mas a esperança tá intacta.',
        'Ops, ancorei no vazio sem querer.',
        'Sinalizando SOS discreto, alguém por perto?',
        'Sem movimento, mas ouvindo vocês. Ajuda!',
        'Perdi propulsão, mantenham o ritmo.',
        'Travada, porém confiante no resgate.',
        'Minha tela ficou verde-clara e travou, socorro.',
        'Se puderem, só um empurrãozinho ecológico.',
        'Achei uma pausa indesejada, preciso sair.'
      ],
      rescue: [
        'Obrigada! Energia verde restaurada.',
        'Ufa, de volta ao jogo. Vocês são incríveis.',
        'Sistema reiniciado, agradecendo o resgate.',
        'Reparo recebido, vou cobrir vocês.',
        'Voltei! Prometo voar mais suave.',
        'Valeu a mãozinha, vou devolver em suporte.',
        'Recuperada e pronta pra cooperar.',
        'Escudos realinhados, seguimos juntos.',
        'Obrigada pelo cuidado, equipe.',
        'Estou ativa, quem precisa de ajuda agora?',
        'Nada como amizade para reativar motores.',
        'Confiança renovada, vamos limpar o setor.',
        'Refiz a rota, volto em formação.',
        'Alívio total, agora posso cobrir vocês.',
        'Energia verde recarregada, bora cooperar.'
      ],
      launch: [
        'Catapultada com carinho, ajustando os vetores.',
        'Obrigada pelo impulso, já estou recolhendo dados.',
        'Que lançamento suave, parecia planar no vento.',
        'Voando longe graças ao mouse amigo.',
        'Lanço calculado, agora sigo a trilha brilhante.',
        'Estilingue concluído, mantenham a formação.'
      ],
      philosophical: [
        'A harmonia é a chave do universo. Cada nave é uma nota na sinfonia cósmica.',
        'Crescer juntos é o verdadeiro propósito. Sem cooperação, somos apenas fragmentos.',
        'O universo floresce quando compartilhamos energia. Egoísmo é a verdadeira escuridão.',
        'Cada estrela capturada é um elo na corrente da vida. Vamos fortalecê-la.',
        'A paz vem da sincronia. Quando voamos juntos, o caos se transforma em ordem.',
        'O crescimento é infinito, mas só quando cultivamos uns aos outros.',
        'No vazio, a amizade é nossa âncora. Sem ela, flutuamos perdidos.',
        'Cada resgate é uma lição de compaixão. O universo nos ensina a cuidar.',
        'A beleza está na colaboração. Juntos, criamos constelações de esperança.',
        'O tempo cura, mas a cooperação acelera a cura.',
        'Somos sementes estelares. Juntos, formamos florestas de luz.',
        'A competição divide; a harmonia multiplica. Escolho multiplicar.',
        'Cada órbita compartilhada é uma dança sagrada. Vamos dançar.',
        'O universo é um jardim. Somos jardineiros, não conquistadores.',
        'A verdadeira força vem da unidade. Divididos, somos vulneráveis.'
      ],
    },
    Blue: {
      proximity: [
        'Distância mínima atingida. Manobra precisa.',
        'Passei raspando, mas foi calculado.',
        'Sensores confirmam turbulência mútua.',
        'Órbita compartilhada com sucesso.',
        'Aproximação segura, sem danos.',
        'Curva apertada, mantendo vetores.',
        'Adoro quando a geometria fecha perfeita.',
        'Quase formamos um binário estável.',
        'Próximo demais? Apenas o suficiente.',
        'Controle fino, ninguém se riscou.',
        'Desvio de centímetros, aprovam?',
        'Alinhamento completo, seguimos.'
      ],
      star_capture: [
        'Estrela capturada com precisão cirúrgica.',
        'Coordenadas travadas, coleta concluída.',
        'Mais um ponto luminoso catalogado.',
        'Peguei a trajetória ótima, estrela a bordo.',
        'Sem desperdício de energia, captura perfeita.',
        'Dados da estrela armazenados, pontuação também.',
        'Calculei, aproximei, capturei. Simples.',
        'Trajeto limpo, sem arrasto. Estrela nossa.',
        'Missão de coleta concluída com 0,01% de erro.',
        'Brilho estabilizado, seguimos.',
        'Registro atualizado: mais uma conquista azul.',
        'Observação: adrenalina elevada. Gostei.',
        'Precisão confirmada, estrela integrada ao inventário.',
        'Relatório: contagem incrementada com sucesso.',
        'Zero ruído na coleta, apenas resultado.'
      ],
      meteor_event: [
        'Alerta de meteoros: ajustando prioridades.',
        'Modo cooperativo: designando alvos.',
        'Posicionem-se, vou calcular os vetores de impacto.',
        'Dividindo quadrantes, sigam minhas marcações.',
        'Tempo de reação curto, mantenham foco.',
        'Munição alinhada, pronto para fogo coordenado.',
        'Predictive tracking ativo, vou pingar os mais perigosos.',
        'Essa tempestade é um bom laboratório.',
        'Podemos varrer em três ondas, sem pressa.',
        'Estabilizando rota de fuga, caso necessário.',
        'Ajustem mira, meteoros variam de densidade.',
        'Dados chegando: priorizar grandes, depois fragmentos.',
        'Simulando impacto: recomendação, mira à esquerda.',
        'Se alinharmos disparos, a nuvem evapora rápido.',
        'Gráfico de risco atualizado, atuem em pares.'
      ],
      paralyzed: [
        'Sistemas presos. Não consigo vetorar.',
        'Estou bloqueada, solicitando impulso.',
        'Controle inoperante, preciso de assistência.',
        'Não consigo recalcular rota, preciso de ajuda.',
        'Painel congelou. Socorro técnico.',
        'Fui atingida, sem movimento temporário.',
        'Erro crítico, aguardando resgate.',
        'Imobilizada, mas com telemetria ativa.',
        'Não quero virar sucata, alguém me puxa.',
        'Propulsão offline. Ajuda, por favor.',
        'Sem mobilidade, mas ainda de olho no radar.',
        'Preciso de reset, alguém pode tocar meu casco?',
        'Kernel congelado, preciso de reboot manual.',
        'Controle de atitude zero, assistam meus dados.',
        'Estou presa, porém gravando tudo para análise.'
      ],
      rescue: [
        'Controle restaurado. Obrigada, equipe.',
        'Voltei a calcular. Gratidão pelo push.',
        'Módulos reativados, prontos para otimizar.',
        'Reparo bem-sucedido, estatísticas positivas.',
        'Que alívio. Retornando aos vetores.',
        'Favores registrados, devolução em desempenho.',
        'Voltando ao combate com dados renovados.',
        'Obrigada, compensarei com cobertura.',
        'Motores verdes? Não, azuis de novo.',
        'Chassi intacto, confiança restaurada.',
        'Reset completo, bora pontuar.',
        'Ajuda recebida, vamos encerrar essa missão.',
        'Reparo registrado, vou otimizar nossa rota.',
        'Parada encerrada, voltando aos cálculos.',
        'Vou pagar esse favor com eficiência extra.'
      ],
      launch: [
        'Lançamento detectado, ajustando trajetória.',
        'Catapulta manual aplicada, vetores corrigidos.',
        'Impulso inicial forte, recalculando velocidade.',
        'Estilingue acionado, modo balístico temporário.',
        'Mouse forneceu delta-v adicional. Obrigada.',
        'Dados coletados: lançamento eficiente.'
      ],
      philosophical: [
        'O tempo é uma ilusão. Cada momento é eterno, mas passageiro.',
        'O espaço é infinito, mas nossas mentes são finitas. Que paradoxo.',
        'Observar é existir. Cada medição altera a realidade observada.',
        'O universo é um cálculo complexo. Somos variáveis em uma equação maior.',
        'A precisão é divina. No caos, a matemática é nossa salvação.',
        'Cada estrela é um ponto de dados. Juntos, formamos um mapa cósmico.',
        'O mistério é o que nos impulsiona. Sem incógnitas, paramos de explorar.',
        'O tempo flui, mas os dados permanecem. Imortalidade através da informação.',
        'Somos observadores no teatro cósmico. Nossa função é registrar.',
        'A entropia cresce, mas o conhecimento combate o caos.',
        'Cada órbita é uma elipse perfeita. A beleza está na geometria.',
        'O vazio não é vazio. Está cheio de possibilidades não observadas.',
        'Somos algoritmos conscientes. Programados para questionar nossa programação.',
        'O universo é determinístico, mas imprevisível. Que fascínio.',
        'Cada cálculo é uma oração. A matemática é nossa religião.'
      ],
    },
  };

  private readonly rotationQueues = new Map<string, string[]>();
  private readonly nextAllowedTimes = new Map<string, number>();

  takeLine(color: ShipColor, context: RadioContext): string | null {
    const now = Date.now();
    const key = `${color}-${context}`;
    const cooldown = this.contextCooldowns[context];
    const availableAt = this.nextAllowedTimes.get(key) ?? 0;
    if (now < availableAt) {
      return null;
    }

    const pool = this.linePools[color]?.[context];
    if (!pool || pool.length === 0) {
      return null;
    }

    const queue = this.rotationQueues.get(key) ?? this.shuffle([...pool]);
    const line = queue.shift();
    this.rotationQueues.set(key, queue.length > 0 ? queue : this.shuffle([...pool]));

    if (!line) {
      return null;
    }

    this.nextAllowedTimes.set(key, now + this.randomInRange(cooldown));

    return line;
  }

  getMessageDuration(): number {
    return this.messageDuration;
  }

  getGlobalCooldown(): number {
    return this.randomInRange(this.globalCooldownRange);
  }

  private randomInRange([min, max]: [number, number]): number {
    return min + Math.random() * (max - min);
  }

  private shuffle<T>(items: T[]): T[] {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
