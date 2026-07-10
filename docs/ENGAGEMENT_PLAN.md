# Plano: Naves vivas + Continuidade do visitante

> **Status: M1–M3 implementados** (2026-07-09). Diário de bordo local + percepção do
> visitante (M1); motor de intenções + rituais de persona (M2); relações entre naves,
> nave apadrinhada e assinatura no chatter (M3). Tudo com typecheck limpo e 54 testes
> passando. Mudanças no working tree, aguardando commit.

Objetivo: fazer as naves parecerem independentes (com vontade própria, relações e memória)
e dar ao visitante a **percepção de continuidade**: os pontos continuam registrados entre
visitas, as naves lembram dele, e — se ele quiser — pode deixar seu nome assinado no
diário de bordo. Sem contas, sem backend, sem identificação.

Princípios:

- **Só local.** O app é estático (GitHub Pages). Toda persistência é localStorage no
  próprio navegador. Nenhum dado sai da máquina do visitante.
- **Nome é um gesto, não um cadastro.** Ninguém é identificado. Se o visitante quiser,
  assina o diário de bordo com um nome — puramente para as naves o chamarem por ele.
- **Orçamento de bundle é lei.** `check-bundle-budget.js` limita 60 KB JS gzip. Nenhuma
  dependência nova.
- **As duas trilhas se encontram.** Estatísticas só engajam se as naves *reagirem* a elas
  ("você voltou!"). Memória das naves só emociona se persistir entre visitas.

---

## Trilha A — Vida e independência das naves

### A1. Motor de intenções (substitui o sorteio de personalidade)

Hoje: `switchPersonality` sorteia uma personalidade a cada 15–30 s (timer + random).
É o principal motivo de as naves parecerem autômatos.

Proposta: utility AI leve. Cada nave mantém **drives** (0–1) que evoluem com eventos:

| Drive | Sobe quando | Desce quando |
|---|---|---|
| `energia` | vagando devagar | perseguição, celebração, pilotagem |
| `competitividade` | rival pontua, perde estrela no último segundo | captura estrela |
| `sociabilidade` | tempo isolada | proximidade prolongada |
| `curiosidade` | evento novo no mundo (wormhole, nebulosa, visitante) | investigou o alvo |

A cada ~5 s a nave pontua as **intenções** disponíveis (caçar, explorar, socializar,
descansar, treinar tiro, investigar, rivalizar) = drive × peso da persona, e adota a
vencedora. Persona dá os pesos: Faísca pesa competir, Folhagem socializar, Cobalto
investigar.

- Novo `systems/intent-manager.ts`, entra no pipeline do `engine-updater`.
- Os behaviors atuais (`ship-behavior-manager.ts`) viram *ações* reutilizadas pelas
  intenções — pouco código novo de movimento.
- A intenção corrente aparece no HUD/minimap (ex.: "Cobalto está investigando um
  asteroide") — a independência precisa ser *legível* para ser percebida.

### A2. Relações entre naves

Matriz de afinidade (−1..+1) por par, alterada por eventos que já existem:

- resgate: +0.3 · roubo de estrela no último segundo: −0.2 · colisão: −0.1 ·
  voo próximo prolongado: +0.05
- Efeitos: afinidade alta → voam em formação às vezes, chatter amistoso; baixa →
  disputas mais agressivas, provocações.
- Novos `RadioContext`: `friendly_banter`, `rivalry` (~10 falas por nave cada).
- Persistida no perfil local: as relações continuam de onde pararam entre visitas.

### A3. Rituais por persona (idle único)

- **Faísca**: voltas de velocidade em circuito imaginário, afterburner visível.
- **Folhagem**: visita e "cuida" de nebulosas (partículas verdes suaves ao redor).
- **Cobalto**: escaneia asteroides/pontos do mundo com um feixe fino azul.

Micro-expressões baratas: intensidade do rastro conforme drive de energia; "olhar"
(rotação breve) na direção de eventos próximos; tremor quando assustada.

### A4. Percepção do jogador (aprovado no plano anterior)

- Cursor como entidade percebida por personalidade: tímida foge, agressiva investiga,
  curiosa (Folhagem) segue a distância.
- Novo `RadioContext: 'visitor'` — falas ao notar o cursor, ao ser lançada pela órbita,
  ao ver o wormhole engolir alguém.
- Com a Trilha B: saudação de retorno com a assinatura do diário e referência à última
  visita ("Da última vez você torceu pela Faísca…").
- **Apadrinhamento**: marcar uma nave como "sua"; chatter dela te trata como aliado,
  vitórias dela têm celebração extra, estatística de lealdade no perfil.

---

## Trilha B — Continuidade, histórico e estatísticas (100% local)

### B1. Diário de bordo persistente

`services/logbook-store.ts`, mesmo padrão fail-safe do `settings-store.ts`:

```ts
interface Logbook {
  schemaVersion: number;
  signature?: string;         // nome que o visitante escolheu assinar (opcional)
  firstVisitAt: string;
  lastSeenAt: string;
  visitCount: number;
  patronShipColor?: ShipColor;
  totals: {
    watchTimeMs: number;
    starsWitnessed: Record<ShipColor, number>;
    shipsLaunched: number;
    wormholesCreated: number;
    rescuesWitnessed: number;
    asteroidsDestroyedWatched: number;
    racesWitnessed: number;    // quando corridas existirem
  };
  relationships: Record<string, number>; // afinidade entre naves (Trilha A2)
  bestSession: { stars: number; date: string };
}
```

- Escrita agregada a cada ~30 s + `visibilitychange`/`pagehide` (não a cada evento).
- `schemaVersion` + migrations simples para evoluir sem quebrar diários antigos.
- Sem UUID, sem qualquer identificador — o diário *é* do navegador, e pronto.

### B2. Continuidade sentida (a parte que engaja)

- **Painel "Diário de bordo"** (tecla `H` / botão no navigator): visitas, tempo total,
  estrelas assistidas por nave, recordes, nave apadrinhada.
- **Assinatura opcional**: uma linha no painel — "este diário ainda não tem assinatura" —
  e as naves ocasionalmente convidam via rádio ("A Folhagem quer saber como te chamar").
  Assinar só muda uma coisa: as naves passam a usar o nome no chatter. Dá para apagar
  ou trocar a qualquer momento.
- Naves reconhecem o retorno: chatter de boas-vindas usa `visitCount` e a assinatura
  ("3ª visita, Bolívar? A Cobalto anotou.").
- Estatística vira narrativa no feed de eventos: "🌟 100ª estrela assistida por você".
- Placar de recordes local: melhores sessões, com a assinatura da época ao lado — o
  "deixar o nome registrado" vira um hall da fama pessoal.

---

## Marcos e critérios de aceite

| Marco | Escopo | Aceite |
|---|---|---|
| **M1** | B1 diário de bordo + A4 percepção do visitante | Fechar e reabrir o navegador: naves saúdam o retorno e os totais continuam; painel `H` mostra estatísticas acumuladas; tímida foge do cursor, agressiva investiga |
| **M2** | A1 motor de intenções + A3 rituais | Observando 3 min sem interagir, cada nave exibe ≥2 intenções distintas e seu ritual de persona; HUD mostra a intenção corrente |
| **M3** | A2 relações + chatter novo + apadrinhamento + assinatura | Um resgate muda visivelmente o comportamento do par (formação); provocações entre rivais; assinar o diário faz as naves usarem o nome no chatter |

Ordem recomendada: M1 → M2 → M3. M1 primeiro porque cria a fundação de persistência
que M2/M3 usam para memória das naves, e é o marco com retorno de engajamento mais
imediato — fechar o navegador, voltar, e a Faísca dizer "você de novo!".
