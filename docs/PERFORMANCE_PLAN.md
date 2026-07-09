# Plano de Performance — Contemplação Fluida

> Objetivo: o toy deve ser **contemplável sem nenhuma travadinha perceptível**,
> em hardware modesto e mobile, gastando o mínimo de CPU/bateria — é uma peça
> ambiente, não um jogo de ação.

## Definição de "fluido" (metas mensuráveis)

| Métrica | Meta | Por quê |
|---|---|---|
| p95 frame time @ CPU normal | ≤ 11 ms | headroom folgado em 60–120 Hz |
| p95 frame time @ CPU 6× throttle | ≤ 16.7 ms | dispositivo modesto segura 60 fps |
| Frames > 20 ms @ 6× throttle | 0 | zero jank perceptível |
| Crescimento de heap em steady state | ≤ 0.2 MB / 5s | GC raro = sem micro-stutters em sessão longa |
| Forced reflow atribuído no trace | 0 ms | sem layout síncrono no loop |

## Baseline medida (2026-07-09, dev build, MacBook @ ~100 Hz)

| Condição | FPS | p50 | p95 | p99 | Frames >20ms | Obs |
|---|---|---|---|---|---|---|
| CPU 1× | 100.2 | 10.0 ms | 10.9 ms | 11.0 ms | 0/300 | liso nesta máquina |
| CPU 6× (simula device modesto) | 89.3 | 10.1 ms | **20.2 ms** | 20.9 ms | **21/300 (7%)** | jank real |

Outras medições:
- **Heap: +1.6 MB a cada 5 s** de lixo em steady state → GC minor periódico = micro-stutter em contemplação longa.
- **74 ms de forced reflow** em 12 s de trace (geometria lida no loop de input/HUD).
- Nenhum culling: o mundo inteiro é desenhado mesmo fora da câmera (o retângulo
  da viewport no minimapa é fração pequena do mundo — desperdício grande).

## Causas identificadas no código

| # | Custo | Onde | Evidência |
|---|---|---|---|
| C1 | Sem viewport culling — tudo desenha sempre | `render/rendering-adapter.ts` + renderers | nenhum hit para cull/visible no código |
| C2 | `createRadialGradient` por entidade **por frame** | `ship-renderer.ts:73`, `effects-renderer.ts:134,195,231`, `background-renderer.ts:23,54` | 6 call sites em hot path |
| C3 | `shadowBlur` em projéteis | `projectile-renderer.ts` | recurso mais caro do Canvas 2D |
| C4 | 200 estrelas: `beginPath/arc/fill` + **regex replace de string** cada uma, por frame | `background-renderer.ts` (`drawBackgroundStars`) | ~12.000 alocações de string/s |
| C5 | ~30 alocações `new Vector2D`/`.clone()` por tick nos hot paths | `ship-update-manager.ts` (20), `asteroid-manager.ts` (7), `entity-update-coordinator.ts` (4) | heap +1.6 MB/5s |
| C6 | HUD/minimap: writes de `left/top` (%) a 60 Hz + leituras de `getBoundingClientRect` no mousemove | `ui/StarChasers.tsx`, `input-manager.ts` | 74 ms forced reflow |
| C7 | Nenhum modo idle — 100% do custo mesmo sem ninguém interagindo | `core/star-chasers.engine.ts` (gameLoop) | é um toy ambiente |

---

## Fases (cada uma termina com medição antes/depois)

### P0 — Instrumentação (pré-requisito) ✅ CONCLUÍDA (2026-07-09)
Sem medir, otimização é chute.

- [x] **`PerfMonitor`** (`game/core/perf-monitor.ts`): ring buffer de 300 frames,
      alocação-zero no hot path; `snapshot()` computa fps/p50/p95/p99/max/jank.
      5 testes cobrindo (inclusive um bug de sentinela `!== 0` que o teste pegou).
- [x] Engine chama `perf.frame(now)` no gameLoop e expõe `renderStats {drawn,total}`
      (populado no `rendering-adapter`; drawn==total até o culling do P1).
- [x] **Overlay Solid** (`ui/dev/PerfOverlay.tsx`) ativado por `?debug=perf`:
      FPS, p50/p95, p99/max, jank>20ms, entities drawn/total, heap + growth/5s.
      Polling a 2 Hz (não por frame) para não distorcer a medida. Verificado no
      browser: FPS 100, p95 10.8 ms, jank 0, 240 entities.

**Protocolo de benchmark** (usar em todas as fases seguintes):
- **Frame time**: sampler de 300 frames (script no console) OU o overlay, em
  CPU 1× e 6× (DevTools throttle), viewport ~1920×937, jogo em estado padrão.
- **Heap**: sampler standalone em **build de produção** (`npm run build` +
  `preview`), *sem* o overlay ligado — o overlay e o HMR do dev adicionam
  churn próprio (~18 MB/5s no dev vs. 1.6 MB/5s medido limpo). O overlay serve
  para tendência relativa, não para o número absoluto de GC.

### P1 — Render: culling + sprites ✅ CONCLUÍDA (2026-07-09)

- [x] **1.1 Viewport culling** (ataca C1): `render/view-bounds.ts` +
      `isInView(x,y,raio,view)` (margem = raio próprio da entidade). Aplicado em
      todos os renderers de lista e no loop de naves do `drawScene`, que agora
      retorna a contagem de desenhados (alimenta o overlay). Verificado com
      câmera em movimento — sem pop-in de tails.
- [x] **1.3 Estrelas de fundo + partículas sem alocação** (ataca C4):
      `color.replace(/rgba/)` por frame → `ctx.globalAlpha` + cor opaca
      memoizada (`render/color-utils.ts`). Elimina ~12k strings/s.
- [x] **Verificação P1** (sampler @6× throttle, free camera):
      **antes p95 20.2 ms / 21 frames com jank; depois p95 10.7 ms / 0 jank.**
      Seguindo nave: 12/234 entidades desenhadas (95% culled). Paridade visual
      confirmada por screenshot. 4 testes novos (33 no total).

**1.2 Cache de sprites de glow — NÃO FEITO (decisão baseada em dados).**
A hipótese era que `createRadialGradient` por frame (C2/C3) fosse um custo
grande. Medindo, as entidades que usam gradiente são **poucas** (3 naves +
1 estrela-alvo + 1 cursor ≈ 5 gradientes/frame) — os "6 call sites" eram
locais no código, não frequência por frame. Com 1.1+1.3 o orçamento de frame
(p95 ≤ 14 ms @6×) já foi **superado** (10.7 ms), então o retorno de sprites de
glow não paga o risco de regressão visual **agora**. Reavaliar só se um trace
de GPU em mobile real apontar a rasterização de gradiente como gargalo, ou se
a densidade de naves crescer muito. `shadowBlur` do projétil (C3) fica junto
dessa reavaliação — projéteis também são poucos e já sofrem culling.

### P2 — GC quase-zero (mata os micro-stutters, ~0.5–1 dia)

- [ ] **2.1 Scratch vectors** (ataca C5): funções in-place em `Vector2D`
      (`addScaled`, `copyFrom`, `setFrom`) + vetores temporários reutilizáveis
      module-level nos 3 arquivos quentes. Regra: nenhum `new`/`clone()` em
      código executado por tick, exceto criação real de entidade.
- [ ] **2.2 Pool de partículas e projéteis**: free-list simples; hoje os
      updates filtram/recriam arrays por frame. Partículas mortas voltam ao
      pool em vez de virar lixo.
- [ ] **2.3 Tails como ring buffer**: `TAIL_LENGTH=20` por nave hoje empurra/
      remove `Vector2D` do array a cada tick → 3 naves × 60 Hz de alocações.
      Ring buffer de posição fixa zera isso.
- [ ] **Verificação P2**: heap growth ≤ 0.2 MB/5s no sampler; contagem de
      minor GCs no trace de 30 s ~zero.

### P3 — DOM sem reflow (ataca C6, ~2–3h)

- [ ] **3.1 Minimap por `transform`**: trocar `left/top` (%) por
      `transform: translate()` nos dots do minimapa — composite-only, sem
      layout.
- [ ] **3.2 Throttle do HUD a 15 Hz**: `notifyUi` só a cada 4º tick (constante
      em `engine-updater.ts`). Minimapa/stats a 15 Hz são visualmente
      idênticos; corta 75% do trabalho Solid+DOM.
- [ ] **3.3 Cache de `getBoundingClientRect`** do canvas em `input-manager.ts`:
      invalidar apenas em `resize` (o canvas é fullscreen fixo). Elimina a
      leitura de geometria por mousemove.
- [ ] **Verificação P3**: trace de 12 s sem atribuição de forced reflow.

### P4 — Modo ambiente (bateria/idle, ~2–3h)

- [ ] **4.1 Idle a 30 fps**: sem input (mouse/tecla/touch) por 10 s, renderizar
      frame sim frame não (updates seguem a 60 Hz — física idêntica, só o draw
      é pulado). Qualquer interação volta a 60 imediatamente. É um toy
      contemplativo: metade da GPU/bateria, invisível a olho.
- [ ] **4.2 Tab oculta**: rAF já pausa; auditar que timers de evento
      (`Date.now()`-based em spawns/cooldowns) não "explodem" eventos
      acumulados ao voltar — o clamp de 250 ms no loop já protege os ticks,
      conferir os agendamentos absolutos (`nextStarSpawnTime` etc.).
- [ ] **4.3 `prefers-reduced-motion`**: reduzir densidade de partículas e
      twinkle — acessibilidade de graça.

### P5 — Só se precisar (critério de decisão, não fazer agora)

- **PixiJS/WebGL via seam `Renderer`** (da Fase 4 do refactor): justificado
  apenas se, após P1–P3, p95 @6× ficar acima de 16.7 ms **ou** se você quiser
  multiplicar a densidade de partículas/naves por >5×.
- **OffscreenCanvas + Worker**: tirar o render da main thread. Grande; só se
  o HUD/DOM um dia competir seriamente com o canvas.

---

## Ordem, esforço e ganho esperado

| Fase | Esforço | Ganho esperado | Risco |
|---|---|---|---|
| P0 instrumentação | ~1h | visibilidade | nulo |
| P1 culling+sprites | ~1 dia | -40–60% frame time @6× | baixo (visual A/B) |
| P2 GC zero | 0.5–1 dia | fim dos micro-stutters em sessão longa | baixo |
| P3 DOM | 2–3h | -74ms reflow, -75% trabalho de HUD | nulo |
| P4 idle | 2–3h | ~-50% bateria em contemplação | baixo |

Protocolo: **uma fase por vez, sempre com o sampler antes/depois nas condições
1× e 6×**, commit por fase com os números no corpo da mensagem — igual ao
processo do refactor (`docs/REFACTORING_PLAN.md`).
