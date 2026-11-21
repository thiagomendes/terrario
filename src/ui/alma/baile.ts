/**
 * O toque nas peças da Noite das Fantasias (spec 027, parte 1): a abóbora gigante pisca os olhos
 * e dá uma risadinha; a porta fechada da Loja, do Castelinho, da Casa da Vovó e das casinhas
 * balança e brilha, sem abrir (a regra da Vila: nada de placa de "em breve"). É desenho só da tela
 * de quem tocou: nenhum estado novo no núcleo.
 *
 * O dedo vale perto da peça (o toque generoso da Vila Neon): a abóbora a até 16 blocos e as
 * portas a até 6, e o dedo a até 60 px do ponto da peça na tela (80 px de alvo, a regra da 031).
 */
import type { EstadoDepuracao } from '../../render/cena';
import { tocarSomInterface } from '../../audio/somInterface';

const RAIO_TOQUE = 60;

export function ligarBaile(e: EstadoDepuracao): void {
  const plano = e.baile?.();
  if (!plano) return;
  const tela = (x: number, y: number, z: number) => e.telaDoPonto?.(x, y, z) ?? null;
  const noJogo = () => {
    const b = document.body;
    return !b.dataset.overlay && !b.classList.contains('modo-foto') && !b.classList.contains('tela-titulo');
  };
  window.addEventListener(
    'pointerdown',
    (ev) => {
      const alvo = ev.target as HTMLElement | null;
      if (alvo?.closest?.('button, .alma-fundo, .roleta, .barra, .joystick, .menu-hud, .controle-toque'))
        return;
      if (!noJogo()) return;
      const preso = !!document.pointerLockElement;
      const x = preso ? innerWidth / 2 : ev.clientX;
      const y = preso ? innerHeight / 2 : ev.clientY;
      const pes = e.jogadorPes?.();
      if (!pes) return;
      const perto = (px: number, pz: number, r: number) => Math.hypot(pes[0] - px, pes[2] - pz) <= r;
      let melhor: { d: number; f: () => void } | null = null;
      const conferir = (px: number, py: number, pz: number, r: number, f: () => void) => {
        if (!perto(px, pz, r)) return;
        const t = tela(px, py, pz);
        if (!t) return;
        const d = Math.hypot(t.x - x, t.y - y);
        if (d <= RAIO_TOQUE && (!melhor || d < melhor.d)) melhor = { d, f };
      };
      const a = plano.pontos.abobora;
      // o rosto da abóbora (o meio da cara, na frente da casca) e o meio do corpo
      conferir(a.x, a.y + 0.45 * a.lado, a.z + 0.5 * a.lado, 16, () => e.baileToque?.({ a: 'abobora' }));
      conferir(a.x, a.y + 0.3 * a.lado, a.z + 0.45 * a.lado, 16, () => e.baileToque?.({ a: 'abobora' }));
      (e.bailePortas?.() ?? []).forEach((p, i) =>
        conferir(p.x, p.y, p.z, 6, () => e.baileToque?.({ a: 'porta', i })),
      );
      const m = melhor as { d: number; f: () => void } | null;
      if (!m) return;
      m.f();
      tocarSomInterface('plim');
      ev.stopImmediatePropagation();
      ev.preventDefault();
    },
    { capture: true },
  );
}
