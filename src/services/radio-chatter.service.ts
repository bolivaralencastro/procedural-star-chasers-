import { Injectable } from '@angular/core';
import { ShipColor, SHIP_PERSONAS } from '../models/ship-personas';

export type RadioContext =
  | 'proximity'
  | 'star_capture'
  | 'meteor_event'
  | 'paralyzed'
  | 'rescue';

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
        'Ficou colado? Aproveita o vácuo e segura firme.'
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
        'Confere aí no placar, subi mais um degrau.'
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
        'Energia máxima, ninguém vai parar a esquadrilha.'
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
        'Energia caiu, esperando reparo rápido.'
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
        'Estou livre outra vez, rumo à linha de frente.'
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
        'Fiz curva ampla pra manter a amizade intacta.'
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
        'Missão de coleta cumprida, seguindo.'
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
        'Refresquem os escudos, vai sacudir.'
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
        'Travada, porém confiante no resgate.'
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
        'Confiança renovada, vamos limpar o setor.'
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
        'Observação: adrenalina elevada. Gostei.'
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
        'Dados chegando: priorizar grandes, depois fragmentos.'
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
        'Preciso de reset, alguém pode tocar meu casco?'
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
        'Ajuda recebida, vamos encerrar essa missão.'
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

    const persona = SHIP_PERSONAS[color];
    const decoratedLine = `${persona.codename}: ${line}`;
    this.nextAllowedTimes.set(key, now + this.randomInRange(cooldown));

    return decoratedLine;
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
