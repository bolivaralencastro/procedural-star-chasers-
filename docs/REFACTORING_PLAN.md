# Plano de Refatoração — Procedural Star Chasers

> Objetivo: migrar para uma stack mais leve e uma organização que permita
> adicionar interatividade e recursos ao longo do tempo sem degradar
> qualidade nem performance.

## Diagnóstico (estado atual)

| Achado | Evidência | Impacto |
|---|---|---|
| Angular usado só como "shell" | 5 componentes, 14 `signal()`, 0 uso de RxJS | Framework inteiro pago, pouco usado |
| **Compilador JIT no bundle** | `import '@angular/compiler'` em `index.tsx:1` | Centenas de KB desnecessários + parse/boot mais lento |
| Engine quase puro, mas amarrado ao Angular | `ChangeDetectorRef` em `star-chasers.engine.ts:29` + ~14 chamadas `deps.cdr.detectChanges()` | Único acoplamento real do game core com o framework |
| Services amarrados sem necessidade | `@Injectable` em 8 services (`src/services/`) que não usam nada de DI além de instanciação | Impede reuso do core fora do Angular |
| Código morto | `star-chasers-backup.component.ts` (2.424 linhas) | Ruído, busca poluída, risco de editar arquivo errado |
| Dependências mortas/frágeis | `rxjs` (0 imports), `tailwindcss: "latest"` (sem pin) | Peso e build não-reprodutível |
| Cache commitado no git | `.angular/cache/**` aparece no `git status` | Diffs poluídos, repo inchado |
| Raiz do projeto poluída | 6+ guias `.md` de marketing/social na raiz, `sourceRoot: "./"` | Estrutura confusa |
| UI acoplada por polling | `star-chasers.base.ts` expõe ~13 getters lidos pelo template a cada `detectChanges()` | Padrão frágil; não escala com mais UI |
| Zero testes / lint | sem script `test`, sem eslint | Refatorar sem rede de segurança |

## Stack alvo (recomendada)

- **Build:** Vite puro (já é dependência) — sai `@angular/cli`/`@angular/build`.
- **Game core:** TypeScript puro, zero dependência de framework (já está ~95% lá).
- **UI shell (HUD, menus, diálogos):** **SolidJS** — signals nativos (modelo mental
  igual ao que já se usa), runtime de ~7 KB, JSX, ótimo para crescer a UI com o tempo.
  - *Alternativa mais enxuta:* Vanilla TS + Web Components — zero framework, mas
    cada recurso novo de UI custa mais código manual. Válida se a UI for permanecer mínima.
- **Render:** Canvas 2D mantido, mas atrás de uma interface `Renderer` para permitir
  trocar por **PixiJS/WebGL** no futuro sem tocar na lógica do jogo.
- **Estilo:** Tailwind v4 (plugin oficial do Vite), versão pinada.
- **Qualidade:** Vitest (engine é lógica pura — testável de graça), ESLint + Prettier, CI simples.

## Arquitetura alvo

```
src/
  game/                     # 100% TS puro — roda sem browser framework
    core/                   # loop (timestep fixo), world, camera, rng
    entities/               # ship, asteroid, projectile, star, wormhole
    systems/                # collision, behavior/IA, spawn, star-events, scoring
    render/                 # Renderer (interface) + Canvas2DRenderer
    audio/                  # audio engine (hoje em services/audio/)
    input/                  # input-manager (eventos brutos -> intents)
    data/                   # radio-chatter, personas, constants
    events.ts               # EventBus tipado: game -> UI (score, radio, focus...)
    state.ts                # GameState + snapshot para a UI
  ui/                       # componentes Solid
    App.tsx
    Hud/ (minimap, scores, clock)
    Menus/ (mobile menu, context menu)
    AboutDialog.tsx
  main.ts                   # bootstrap: cria engine, monta UI, conecta EventBus
docs/                       # todos os .md de guia saem da raiz
```

**Regra de dependência (a mais importante do plano):**
`game/` **nunca** importa de `ui/`. A UI conversa com o jogo por dois canais:
1. **EventBus tipado** (game → UI): `score-changed`, `radio-message`, `ship-focused`…
2. **Comandos** (UI → game): `engine.followShip(id)`, `engine.toggleAudio()`…

Isso substitui os 13 getters + `detectChanges()` e é o que permite adicionar
recursos sem virar espaguete.

---

## Fases

### Fase 0 — Higiene (sem risco, ~1 sessão)
Vale a pena mesmo que a migração nunca aconteça.

- [ ] Commitar/guardar o trabalho pendente atual (há 7 arquivos modificados).
- [ ] Adicionar `.angular/` ao `.gitignore` e remover do índice (`git rm -r --cached .angular`).
- [ ] Deletar `star-chasers-backup.component.ts` (o git guarda a história).
- [ ] Mover guias `.md` da raiz para `docs/`.
- [ ] Remover `rxjs` do `package.json`; pinar `tailwindcss`.
- [ ] Investigar remoção do `import '@angular/compiler'` (AOT) — ganho imediato de bundle.

### Fase 1 — Desacoplar o game core (o passo que paga a migração)
Ainda dentro do Angular; o app continua funcionando igual.

- [ ] Trocar `cdr: ChangeDetectorRef` em `EngineDeps` por `notifyUi: () => void`
      (o componente Angular passa `() => this.cdr.detectChanges()`).
- [ ] Converter os 8 services em classes puras (tirar `@Injectable`/`inject`);
      instanciá-las no engine ou receber via construtor.
- [ ] Criar `src/game/` e mover engine + managers + services + models + data para lá,
      seguindo a árvore acima (mover em commits pequenos, um subsistema por vez).
- [ ] Critério de aceite: `src/game/` compila num projeto TS isolado sem `@angular/*`.

### Fase 2 — Trocar o shell (Angular → Vite + Solid)
Agora é pequeno: só 5 componentes e ~220 linhas de template.

- [ ] `npm create vite` (template solid-ts) em paralelo; apontar para o mesmo `src/game/`.
- [ ] Portar templates: `app.component.html` (34 linhas), `star-chasers.component.html`
      (184 linhas — HUD/minimap/menus) e `about-dialog`.
- [ ] Ligar EventBus → signals do Solid (substitui `notifyUi`).
- [ ] Migrar Tailwind para o plugin Vite v4.
- [ ] Verificação: paridade visual/funcional lado a lado (desktop + mobile),
      depois deletar `@angular/*`, `angular.json`, `index.tsx`.
- [ ] Medir: bundle antes/depois (meta: shell de UI < 15 KB gzip vs. framework atual).

### Fase 3 — Rede de segurança e qualidade contínua
- [ ] Vitest cobrindo os sistemas puros: colisão, IA/behavior, spawn, scoring
      (agora trivial, pois `game/` não depende de DOM/framework).
- [ ] ESLint + Prettier + `tsc --noEmit` em CI (GitHub Actions).
- [ ] Regra de arquitetura no lint: proibir import de `ui/` dentro de `game/`.
- [ ] Budget de bundle no CI (falha se passar de X KB).

### Fase 4 — Fundação para crescer (interatividade e recursos)
- [ ] **Loop com timestep fixo** (update a 60 Hz fixo, render interpolado) —
      física estável em qualquer monitor/dispositivo; pré-requisito para
      gameplay mais complexo.
- [ ] Consolidar os ~20 managers em **systems** com interface única
      (`update(world, dt)`) — adicionar um recurso novo = adicionar um system,
      sem tocar nos existentes.
- [ ] Interface `Renderer` estável → habilita PixiJS/WebGL depois, se a contagem
      de partículas/naves justificar.
- [ ] Save/config em `localStorage` (volume, preferências) via um `SettingsStore`.

### Fase 5 — Recursos novos (exemplos que a arquitetura destrava)
- Novos tipos de evento cósmico = novo system + entradas no EventBus.
- Modo replay/screenshot: o snapshot de `GameState` já existe por design.
- Multiplayer local ou IA plugável: `input/` já traduz eventos em *intents*.
- HUD mais rico (gráficos de score, timeline de rádio): componentes Solid isolados.

---

## Ordem e estimativa

| Fase | Esforço | Risco | Pode parar aqui? |
|---|---|---|---|
| 0 — Higiene | horas | nulo | Sim — já melhora |
| 1 — Core puro | 1–2 dias | baixo (mover código, não reescrever) | Sim — core testável mesmo em Angular |
| 2 — Shell Solid | 1–2 dias | médio (paridade visual) | Sim — stack final atingida |
| 3 — Qualidade | 1 dia | nulo | — |
| 4 — Fundação | 2–3 dias | médio (timestep muda o feel — testar) | — |

**Estratégia geral:** *strangler* — o app roda em todas as fases; nenhum big-bang.
A Fase 1 é o investimento-chave: depois dela, a troca de shell (Fase 2) é barata
e reversível, e qualquer decisão futura de stack fica desacoplada do jogo em si.
