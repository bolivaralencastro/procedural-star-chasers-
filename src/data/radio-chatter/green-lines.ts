import { RadioContext } from '../../models/radio-chatter';

export const GREEN_LINES: Record<RadioContext, string[]> = {
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
  hunting: [
    'Estrela avistada! Vamos trabalhar juntos!',
    'Alvo detectado, cooperação em ação!',
    'Unidos pela caça estelar!'
  ],
  star_spawn: [
    'Nova estrela floresceu! Vamos compartilhar!',
    'Luz nova no horizonte, todos se aproximem!',
    'Estrela surgiu, hora de colher juntos!'
  ],
  asteroid_warning: [
    'Asteróides! Vamos nos proteger mutuamente!',
    'Perigo à frente! Formação defensiva!',
    'Cuidado! Vamos enfrentar isso juntos!'
  ],
  asteroid_clear: [
    'Céu limpo! Podemos respirar aliviados!',
    'Perigo passou, gratidão a todos!',
    'Caminho livre, vamos em paz!'
  ],
  wormhole_shuffle: [
    'Portal aberto! Cuidem uns dos outros!',
    'Wormhole ativo! Mantenham contato!',
    'Viagem dimensional! Não se percam!'
  ],
  supernova: [
    'Poder estelar! Usem com sabedoria!',
    'Supernova pronta! Proteção ativada!',
    'Energia máxima! Cuidado com o ambiente!'
  ],
  fire: [
    'Disparando com precisão!',
    'Fogo defensivo! Proteção em andamento!',
    'Tiro certeiro para nossa segurança!'
  ],
  chasing: [
    'Seguindo o alvo com cuidado!',
    'Perseguição coordenada!',
    'Vamos alcançá-la juntos!'
  ],
};
