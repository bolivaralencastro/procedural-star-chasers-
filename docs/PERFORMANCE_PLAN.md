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

### P2 — GC quase-zero — ADIADA (decisão baseada em dados, 2026-07-09)

Medição em **build de produção**, steady state (10 s):
- Heap 3.6–4.6 MB, sawtooth de **1.0 MB**, ~2 GCs/s de **nursery** (baratos).
- Alloc rate 3.0 MB/5s — mas **0 frames com jank** mesmo @6× throttle.

A premissa de P2 era "micro-stutters de GC em sessão longa". Os GCs medidos
são coletas de nursery sub-ms que **não produzem nenhum frame lento**. O ganho
perceptível de eliminar as ~30 alocações `Vector2D`/tick é marginal hoje, e as
mudanças (scratch vectors nos hot paths, pooling, ring buffer de tail) são
invasivas com risco de regressão. **Reavaliar** se: (a) um trace de 5+ min
mostrar um major GC com hitch, ou (b) a densidade de entidades/naves crescer
muito. As sub-tarefas ficam registradas abaixo para quando isso acontecer.

- [ ] **2.1 Scratch vectors** (C5): funções in-place em `Vector2D` + temporários
      module-level nos 3 arquivos quentes. Nenhum `new`/`clone()` por tick.
- [ ] **2.2 Pool de partículas/projéteis**: free-list; mortos voltam ao pool.
- [ ] **2.3 Tails como ring buffer**: elimina push/shift de `Vector2D` por tick.

### P3 — DOM sem reflow ✅ CONCLUÍDA (2026-07-09)

- [x] **3.2 Throttle do HUD a ~15 Hz**: `notifyUi` só a cada 4º tick
      (`engine-updater.ts`). O canvas segue a 60 fps; minimapa/stats a 15 Hz
      são visualmente idênticos.
- [x] **Verificação P3** (trace de 12 s): forced reflow **74 ms → 36 ms**. O
      resto é layout de load inicial (LCP), não o loop — reflow por frame do
      minimapa agora ~3 ms/s.

**3.1 (minimap por transform) e 3.3 (cache de rect) — NÃO FEITOS (decisão
baseada em dados).** Com o throttle o reflow por frame já é negligível.
`getBoundingClientRect` só é lido no clique direito (menu de contexto), não
por frame — não há layout thrashing a eliminar. `transform` no minimapa daria
ganho marginal e a conversão de posição `left/top %` → `translate` relativa ao
pai é awkward; não paga agora.

### P4 — Modo ambiente (bateria/idle) ✅ CONCLUÍDA (2026-07-09)

- [x] **4.3 `prefers-reduced-motion`** (`core/motion-preference.ts`): estrelas
      de 200 → 90 e twinkle congelado (`twinkleSpeed=0`). Verificado no browser
      forçando o media query: total de entidades 234 → 122.
- [x] **4.2 Tab oculta / retorno**: auditado — sem fast-forward. O clamp de
      250 ms + cap de 5 ticks/frame no loop limitam os updates ao voltar; os
      spawns por `Date.now()` (`nextStarSpawnTime`, lifetime) são
      auto-limitados (no máx. 1 estrela por vez, sem rajada). Sem mudança.

**4.1 Idle a 30 fps — REJEITADO (decisão de produto).** A ideia padrão
("sem input por 10 s → 30 fps") está **errada para este toy**: numa peça de
contemplação o usuário interage *menos* justamente quando está mais engajado
(só observando). Throttlar por ociosidade de input degradaria a experiência no
exato momento de maior fruição. A economia de bateria real — quando a aba está
oculta — **já é gratuita**: o browser pausa o `requestAnimationFrame`
automaticamente. Throttle por blur/foco tem o mesmo defeito (o toy pode estar
sendo observado numa janela em segundo plano), então também foi descartado.

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
