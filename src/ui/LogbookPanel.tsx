import { For, Show, createMemo, createSignal, type Accessor } from 'solid-js';
import { LogbookService } from '../game/services/logbook-store';
import { fromGameSignal } from './game-bridge';
import { SHIP_PERSONAS, type ShipColor } from '../game/entities/ship-personas';

const SHIP_HEX: Record<ShipColor, string> = {
  Red: '#ef4444',
  Green: '#22c55e',
  Blue: '#3b82f6',
};

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return 'menos de 1 min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

interface LogbookPanelProps {
  isOpen: Accessor<boolean>;
  onClose: () => void;
}

/**
 * The "diário de bordo": a purely local, per-browser record of the visitor's
 * time with the ships. Shows accumulated stats and lets the visitor optionally
 * sign it with a name the ships will use.
 */
export function LogbookPanel(props: LogbookPanelProps) {
  const logbook = LogbookService.shared;
  const revision = fromGameSignal(logbook.revision);

  // Re-read the snapshot whenever the logbook signals a change.
  const snap = createMemo(() => (revision(), logbook.snapshot()));

  const [editingSignature, setEditingSignature] = createSignal(false);
  const [draftName, setDraftName] = createSignal('');

  const startEditing = () => {
    setDraftName(snap().signature ?? '');
    setEditingSignature(true);
  };

  const saveSignature = () => {
    const name = draftName().trim();
    if (name.length > 0) {
      logbook.setSignature(name);
    } else {
      logbook.clearSignature();
    }
    setEditingSignature(false);
  };

  const shipStars = createMemo(() =>
    (Object.keys(SHIP_PERSONAS) as ShipColor[]).map(color => ({
      color,
      codename: SHIP_PERSONAS[color].codename,
      hex: SHIP_HEX[color],
      count: snap().totals.starsWitnessed[color],
    })),
  );

  const Stat = (p: { label: string; value: string | number }) => (
    <div class="flex items-center justify-between py-1">
      <span class="text-gray-400">{p.label}</span>
      <span class="font-semibold text-gray-100">{p.value}</span>
    </div>
  );

  return (
    <Show when={props.isOpen()}>
      <div
        class="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={props.onClose}
      >
        <div
          class="w-[min(92vw,26rem)] max-h-[86vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/80 p-6 font-mono text-sm text-gray-200 shadow-2xl backdrop-blur-md"
          onClick={e => e.stopPropagation()}
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="text-xs uppercase tracking-[0.28em] text-gray-500">Diário de bordo</div>
              <h2 class="mt-1 text-lg font-semibold text-gray-100">
                <Show when={logbook.isReturning} fallback="Primeira visita">
                  Bem-vindo de volta
                </Show>
              </h2>
            </div>
            <button
              type="button"
              class="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-300 hover:bg-white/10"
              onClick={props.onClose}
            >
              Fechar (H)
            </button>
          </div>

          {/* Signature */}
          <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <Show
              when={editingSignature()}
              fallback={
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="text-[10px] uppercase tracking-[0.2em] text-gray-500">Assinatura</div>
                    <div class="truncate text-gray-100">
                      <Show when={snap().signature} fallback={<span class="text-gray-500">sem assinatura</span>}>
                        {snap().signature}
                      </Show>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-300 hover:bg-white/10"
                    onClick={startEditing}
                  >
                    {snap().signature ? 'Editar' : 'Assinar'}
                  </button>
                </div>
              }
            >
              <div class="text-[10px] uppercase tracking-[0.2em] text-gray-500">Como as naves devem te chamar?</div>
              <div class="mt-2 flex items-center gap-2">
                <input
                  class="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-1.5 text-gray-100 outline-none focus:border-white/40"
                  type="text"
                  maxLength={24}
                  autofocus
                  value={draftName()}
                  placeholder="seu nome (opcional)"
                  onInput={e => setDraftName(e.currentTarget.value)}
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === 'Enter') saveSignature();
                    if (e.key === 'Escape') setEditingSignature(false);
                  }}
                />
                <button
                  type="button"
                  class="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-gray-100 hover:bg-white/20"
                  onClick={saveSignature}
                >
                  Salvar
                </button>
              </div>
              <p class="mt-2 text-[10px] leading-relaxed text-gray-500">
                Fica só neste navegador. As naves usam esse nome ao conversar com você.
              </p>
            </Show>
          </div>

          {/* Patron ship ("apadrinhar") */}
          <div class="mt-4">
            <div class="text-[10px] uppercase tracking-[0.2em] text-gray-500">Nave apadrinhada</div>
            <div class="mt-2 grid grid-cols-3 gap-2">
              <For each={Object.keys(SHIP_PERSONAS) as ShipColor[]}>
                {color => {
                  const active = () => snap().patronShipColor === color;
                  return (
                    <button
                      type="button"
                      class="flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs transition-colors"
                      classList={{
                        'border-white/40 bg-white/10 text-gray-100': active(),
                        'border-white/10 text-gray-400 hover:bg-white/5': !active(),
                      }}
                      onClick={() => logbook.setPatron(active() ? undefined : color)}
                    >
                      <span class="h-3 w-3 rounded-full" style={{ 'background-color': SHIP_HEX[color] }}></span>
                      {SHIP_PERSONAS[color].codename}
                    </button>
                  );
                }}
              </For>
            </div>
            <p class="mt-2 text-[10px] leading-relaxed text-gray-500">
              Apadrinhe uma nave: ela comemora suas vitórias e fala com você.
            </p>
          </div>

          {/* Stars witnessed per ship */}
          <div class="mt-4">
            <div class="text-[10px] uppercase tracking-[0.2em] text-gray-500">Estrelas assistidas</div>
            <div class="mt-2 space-y-1">
              <For each={shipStars()}>
                {ship => (
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="h-3 w-3 rounded-full" style={{ 'background-color': ship.hex }}></span>
                      <span class="text-gray-300">{ship.codename}</span>
                    </div>
                    <span class="font-semibold text-gray-100">★ {ship.count}</span>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Totals */}
          <div class="mt-4 border-t border-white/10 pt-3">
            <Stat label="Visitas" value={snap().visitCount} />
            <Stat label="Tempo assistido" value={formatDuration(snap().totals.watchTimeMs)} />
            <Stat label="Naves lançadas" value={snap().totals.shipsLaunched} />
            <Stat label="Buracos de minhoca" value={snap().totals.wormholesCreated} />
            <Stat label="Resgates presenciados" value={snap().totals.rescuesWitnessed} />
            <Stat label="Asteroides destruídos" value={snap().totals.asteroidsDestroyedWatched} />
          </div>

          {/* Records */}
          <div class="mt-4 border-t border-white/10 pt-3">
            <Stat label="Melhor sessão" value={`★ ${snap().bestSession.stars}`} />
            <div class="mt-1 text-right text-[10px] text-gray-500">em {formatDate(snap().bestSession.date)}</div>
            <div class="mt-1 text-[10px] text-gray-500">Primeira visita: {formatDate(snap().firstVisitAt)}</div>
          </div>
        </div>
      </div>
    </Show>
  );
}
