Ran terminal command: ls -lh src/assets/sounds

Com base na análise dos arquivos e do código, aqui está a lista dos sons que são placeholders (identificados pelo tamanho muito pequeno, < 200 bytes) e a descrição do que cada um deve fazer no jogo para você produzi-los:

### 🎵 Músicas de Fundo (Loops)
Estes devem ser faixas musicais que tocam em loop.

1.  **`hunting_theme.mp3`** (Placeholder)
    *   **Contexto:** Toca durante o modo "Caça" (Hunting), quando as naves estão competindo agressivamente.
    *   **Sugestão:** Algo mais rápido, tenso, com percussão marcante para dar sensação de urgência e competição.

2.  **`cooperative_theme.mp3`** (Placeholder)
    *   **Contexto:** Toca durante eventos de asteroides, quando as naves precisam cooperar.
    *   **Sugestão:** Uma música mais heroica, orquestral ou eletrônica inspiradora, que sugira união e defesa contra uma ameaça comum.

3.  **`victory_theme.mp3`** (Placeholder)
    *   **Contexto:** Toca quando uma nave vence ou está celebrando.
    *   **Sugestão:** Uma fanfarra curta ou um loop triunfante e alegre.

### 🔊 Efeitos Sonoros de Nave (Loops)
Estes são sons contínuos que mudam de volume/pitch dinamicamente.

4.  **`engine_hum.wav`** (Placeholder - **Crítico**, estava causando erro)
    *   **Contexto:** O som constante do motor da nave. O jogo altera o volume e a velocidade (pitch) desse som baseada na velocidade da nave.
    *   **Sugestão:** Um zumbido grave e constante de motor de nave espacial (tipo *sci-fi thruster*). Deve ser um loop perfeito (sem cortes audíveis).

### 💥 Efeitos Sonoros (One-Shots)
Sons curtos para ações específicas. A maioria dos arquivos `.wav` atuais são placeholders minúsculos.

5.  **`whoosh.wav`** (Placeholder - usado para 'launch')
    *   **Ação:** Quando a nave é lançada/impulsionada (pelo mouse ou estilingue gravitacional).
    *   **Sugestão:** Som de ar cortado ou propulsão súbita.

6.  **`star-collect.wav`** (Placeholder - usado para 'capture')
    *   **Ação:** Quando uma nave captura uma estrela.
    *   **Sugestão:** Um som brilhante, positivo, tipo "moeda" ou "power-up" (ex: *chime* agudo).

7.  **`celebrate.wav`** (Placeholder)
    *   **Ação:** A nave faz uma animação de celebração.
    *   **Sugestão:** Um som curto de alegria, fogos de artifício ou um apito festivo eletrônico.

8.  **`rescue.wav`** (Placeholder)
    *   **Ação:** Quando uma nave "ressuscita" ou ajuda outra que estava paralisada.
    *   **Sugestão:** Som de reparo, energia subindo ou um *ping* de suporte.

9.  **`paralyzed.wav`** (Placeholder)
    *   **Ação:** Quando a nave é atingida e fica imóvel/atordoada.
    *   **Sugestão:** Som de sistema falhando, eletricidade estática ou desligamento (*power down*).

10. **`reload.wav`** (Placeholder)
    *   **Ação:** Recarregamento de habilidade ou arma (se aplicável).
    *   **Sugestão:** Som mecânico ou de energia carregando (*charge up*).

11. **`empty-click.wav`** (Placeholder)
    *   **Ação:** Tentar atirar/usar habilidade sem energia ou munição.
    *   **Sugestão:** Um som seco e curto de "negado" ou clique metálico.

12. **`wormhole-open.wav`** & **`wormhole-close.wav`** (Placeholders)
    *   **Ação:** Abertura e fechamento de portais/buracos de minhoca.
    *   **Sugestão:** Sons espaciais distorcidos, graves e misteriosos.

13. **`laser_shoot.wav`** (Placeholder - usado para 'fire')
    *   **Ação:** Disparo de projétil contra asteroides.
    *   **Sugestão:** O clássico "Pew pew" ou disparo de plasma.

### ✅ Sons que parecem OK (mas você pode querer substituir)
Estes arquivos têm tamanho razoável (>30KB), indicando que já são sons reais, mas vale conferir se combinam com sua nova produção:
*   `deep_space.mp3` (Música ambiente atual - Normal Mode)
*   `blink.mp3` (Som de teleporte/blink)
*   `explosion.mp3` (Explosão de asteroide)
*   `orbit_hum.mp3` (Som de órbita - Loop)

**Nota:** O arquivo `'npm run dev.mp3'` parece ser lixo e pode ser deletado.