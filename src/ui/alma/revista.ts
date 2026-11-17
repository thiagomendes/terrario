/**
 * A revista da banca (spec 026, parte 2, etapa B): o toque no expositor abre uma capa grande na
 * tela, inventada e sem nenhuma letra (onde iria o título ficam faixas e formas: a criança de 3
 * anos "lê" o desenho). São quatro capas, uma de cada vez: o skate, a guitarra-raio, o robô de
 * brinquedo e a lhama. Cores da época, duas ou três por capa (nada de arco-íris, nenhuma marca,
 * ninguém de verdade).
 *
 * A capa entra com um pulinho, torta como revista na mão, e um toque em qualquer lugar fecha.
 */

const K = '#24232a';
const CREME = '#fff6e0';
const VERMELHO = '#e8302a';
const AZUL = '#2f8cff';
const AMARELO = '#ffe14a';
const TURQUESA = '#22c2b0';
const GRAFITE = '#2e2d36';
const L = 'stroke-linejoin="round" stroke-linecap="round"';
const k = (w = 6) => `stroke="${K}" stroke-width="${w}" ${L}`;

const estrela = (cx: number, cy: number, r: number) => {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    p.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return p.join(' ');
};

/** O selo de pontas (onde iria o preço): só a forma e uma estrelinha dentro. */
const selo = (cx: number, cy: number, r: number, cor: string, miolo: string) => {
  const p: string[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const rr = i % 2 ? r * 0.8 : r;
    p.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polygon points="${p.join(' ')}" fill="${cor}" ${k(5)}/>
  <polygon points="${estrela(cx, cy + 1, r * 0.46)}" fill="${miolo}"/>`;
};

/** As faixas do "título" (formas no lugar das letras) e o risco embaixo. */
const titulo = (cor: string, cor2: string) => `
  <rect x="22" y="24" width="146" height="40" rx="9" fill="${cor}" ${k(5)}/>
  <rect x="178" y="24" width="46" height="40" rx="9" fill="${cor}" ${k(5)}/>
  <rect x="234" y="24" width="44" height="40" rx="20" fill="${cor2}" ${k(5)}/>
  <rect x="22" y="74" width="104" height="10" rx="5" fill="${cor2}"/>`;

/** As "chamadas" da capa: três risquinhos gordos. */
const chamadas = (x: number, y: number, cor: string) => `
  <rect x="${x}" y="${y}" width="84" height="11" rx="5.5" fill="${cor}"/>
  <rect x="${x}" y="${y + 19}" width="56" height="11" rx="5.5" fill="${cor}"/>
  <rect x="${x}" y="${y + 38}" width="70" height="11" rx="5.5" fill="${cor}"/>`;

const moldura = `<rect x="7" y="7" width="286" height="386" rx="6" fill="none" stroke="${CREME}" stroke-width="4" opacity="0.85"/>`;

const CAPAS: readonly string[] = [
  // ------------------------------------------------------------ o skate
  `<rect width="300" height="400" fill="${TURQUESA}"/>
  <path d="M0 400 L300 170 V400 Z" fill="${AMARELO}"/>
  <polygon points="168,96 214,96 186,168 226,168 132,296 160,204 120,204" fill="${CREME}" ${k()}/>
  <path d="M26 150 h54 M18 178 h40 M34 206 h30" stroke="${CREME}" stroke-width="9" stroke-linecap="round"/>
  <g transform="rotate(-18 150 262)">
    <rect x="76" y="262" width="36" height="14" rx="4" fill="#d4d8e2" ${k(5)}/>
    <rect x="188" y="262" width="36" height="14" rx="4" fill="#d4d8e2" ${k(5)}/>
    <circle cx="94" cy="288" r="19" fill="${CREME}" ${k()}/><circle cx="94" cy="288" r="6.5" fill="${AZUL}"/>
    <circle cx="206" cy="288" r="19" fill="${CREME}" ${k()}/><circle cx="206" cy="288" r="6.5" fill="${AZUL}"/>
    <path d="M52 228 Q36 228 30 216 M248 228 Q264 228 270 216" fill="none" ${k(16)}/>
    <path d="M52 228 Q36 228 30 216 M248 228 Q264 228 270 216" fill="none" stroke="${VERMELHO}" stroke-width="7" ${L}/>
    <rect x="38" y="228" width="224" height="36" rx="18" fill="${VERMELHO}" ${k()}/>
    <rect x="66" y="241" width="168" height="10" rx="5" fill="${CREME}"/>
    <polygon points="${estrela(150, 246, 15)}" fill="${AMARELO}" ${k(3.5)}/>
  </g>
  ${titulo(CREME, VERMELHO)}
  ${chamadas(22, 334, K)}
  ${selo(244, 346, 36, VERMELHO, CREME)}
  ${moldura}`,
  // ------------------------------------------------------------ a guitarra-raio
  `<rect width="300" height="400" fill="${GRAFITE}"/>
  <path d="M0 150 L300 70 V132 L0 212 Z" fill="${AZUL}"/>
  <path d="M0 236 L300 156 V180 L0 260 Z" fill="${AMARELO}"/>
  <g transform="translate(158 222) rotate(-24) scale(4)">
    <g transform="translate(0 -3) scale(1.5)">
      <path d="M-6 0 L12 0 L2 9 L15 9 L-9 30 L-3 15 L-15 15 Z" fill="${VERMELHO}" ${k(1.1)}/>
      <path d="M-3 3 L5 3" stroke="#ff8a80" stroke-width="1.4" stroke-linecap="round"/>
    </g>
    <rect x="-3.5" y="-25" width="7" height="27" rx="2" fill="#f2c27a" ${k(1.3)}/>
    <path d="M-3.5 -18 h7 M-3.5 -11.5 h7 M-3.5 -5 h7" stroke="${K}" stroke-width="0.6"/>
    <rect x="-3" y="4" width="6" height="2.6" rx="1" fill="${CREME}" ${k(0.8)}/>
    <rect x="-3" y="13" width="6" height="2.6" rx="1" fill="${CREME}" ${k(0.8)}/>
    <path d="M-1.2 -24 V14 M1.2 -24 V14" stroke="${CREME}" stroke-width="0.5"/>
    <rect x="-5.5" y="-34" width="11" height="10.5" rx="3" fill="${CREME}" ${k(1.3)}/>
    <circle cx="-8" cy="-31" r="2.2" fill="${AMARELO}" ${k(1)}/><circle cx="8" cy="-31" r="2.2" fill="${AMARELO}" ${k(1)}/>
    <circle cx="8" cy="-25.6" r="2.2" fill="${AMARELO}" ${k(1)}/>
    <polygon points="${estrela(-4, 30, 4.2)}" fill="${AMARELO}" ${k(0.8)}/>
  </g>
  <polygon points="${estrela(54, 286, 20)}" fill="${AMARELO}" ${k(4)}/>
  <polygon points="${estrela(252, 118, 13)}" fill="${CREME}" ${k(3.5)}/>
  <polygon points="${estrela(268, 262, 9)}" fill="${CREME}"/>
  ${titulo(AMARELO, VERMELHO)}
  ${chamadas(22, 336, CREME)}
  ${moldura}`,
  // ------------------------------------------------------------ o robô de brinquedo
  `<rect width="300" height="400" fill="${AMARELO}"/>
  <circle cx="150" cy="272" r="124" fill="${VERMELHO}"/>
  <path d="M150 122 V98" ${k()}/><circle cx="150" cy="92" r="10" fill="${AZUL}" ${k(5)}/>
  <rect x="60" y="204" width="28" height="64" rx="9" fill="#d4d8e2" ${k()}/>
  <rect x="212" y="204" width="28" height="64" rx="9" fill="#d4d8e2" ${k()}/>
  <circle cx="74" cy="278" r="14" fill="${AMARELO}" ${k()}/><circle cx="226" cy="278" r="14" fill="${AMARELO}" ${k()}/>
  <rect x="108" y="286" width="32" height="50" fill="#d4d8e2" ${k()}/><rect x="160" y="286" width="32" height="50" fill="#d4d8e2" ${k()}/>
  <rect x="96" y="330" width="52" height="22" rx="7" fill="${GRAFITE}" ${k()}/><rect x="152" y="330" width="52" height="22" rx="7" fill="${GRAFITE}" ${k()}/>
  <rect x="138" y="182" width="24" height="16" fill="#8a8ea0" ${k(5)}/>
  <rect x="92" y="196" width="116" height="96" rx="12" fill="${AZUL}" ${k()}/>
  <rect x="112" y="212" width="76" height="40" rx="7" fill="${CREME}" ${k(4.5)}/>
  <circle cx="129" cy="232" r="8" fill="${VERMELHO}" ${k(3.5)}/><circle cx="150" cy="232" r="8" fill="${AMARELO}" ${k(3.5)}/>
  <circle cx="171" cy="232" r="8" fill="#d4d8e2" ${k(3.5)}/>
  <rect x="112" y="264" width="76" height="11" rx="5.5" fill="#1c5fc0"/><rect x="112" y="264" width="44" height="11" rx="5.5" fill="${CREME}"/>
  <rect x="102" y="120" width="96" height="66" rx="12" fill="#d4d8e2" ${k()}/>
  <rect x="118" y="136" width="24" height="24" rx="5" fill="${AZUL}" ${k(4)}/><rect x="158" y="136" width="24" height="24" rx="5" fill="${AZUL}" ${k(4)}/>
  <rect x="123" y="141" width="8" height="8" rx="2" fill="#fff"/><rect x="163" y="141" width="8" height="8" rx="2" fill="#fff"/>
  <path d="M130 170 Q150 180 170 170" fill="none" ${k(5)}/>
  <rect x="92" y="142" width="10" height="20" rx="3" fill="${VERMELHO}" ${k(4)}/><rect x="198" y="142" width="10" height="20" rx="3" fill="${VERMELHO}" ${k(4)}/>
  ${titulo(AZUL, VERMELHO)}
  <polygon points="${estrela(36, 362, 15)}" fill="${AZUL}" ${k(4)}/>
  <polygon points="${estrela(266, 364, 12)}" fill="${CREME}" ${k(3.5)}/>
  ${selo(250, 126, 30, AZUL, CREME)}
  ${moldura}`,
  // ------------------------------------------------------------ a lhama
  `<rect width="300" height="400" fill="${AZUL}"/>
  <circle cx="150" cy="222" r="122" fill="${AMARELO}"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 25}" y="350" width="25" height="25" fill="${i % 2 ? GRAFITE : CREME}"/><rect x="${i * 25}" y="375" width="25" height="25" fill="${i % 2 ? CREME : GRAFITE}"/>`).join('')}
  <path d="M110 352 V236 Q110 204 150 204 Q190 204 190 236 V352 Z" fill="#f4e6cf" ${k()}/>
  <path d="M168 320 L178 366 L206 358 L194 312 Z" fill="${VERMELHO}" ${k(5)}/>
  <rect x="98" y="292" width="104" height="32" rx="16" fill="${VERMELHO}" ${k()}/>
  <path d="M112 308 h20 M146 308 h20" stroke="#ff8a80" stroke-width="5" stroke-linecap="round"/>
  <g transform="rotate(-16 118 122)"><ellipse cx="118" cy="122" rx="14" ry="32" fill="#f4e6cf" ${k()}/><ellipse cx="118" cy="126" rx="6" ry="19" fill="#ffb4a8"/></g>
  <g transform="rotate(16 182 122)"><ellipse cx="182" cy="122" rx="14" ry="32" fill="#f4e6cf" ${k()}/><ellipse cx="182" cy="126" rx="6" ry="19" fill="#ffb4a8"/></g>
  <ellipse cx="150" cy="188" rx="64" ry="54" fill="#f4e6cf" ${k()}/>
  <path d="M116 152 Q128 120 150 134 Q172 120 184 152 Q166 144 150 160 Q134 144 116 152 Z" fill="#fff7e6" ${k(4.5)}/>
  <ellipse cx="150" cy="212" rx="31" ry="23" fill="#fff7e6"/>
  <path d="M141 201 h18 l-9 11 Z" fill="${K}"/>
  <path d="M135 220 Q150 233 165 220" fill="none" ${k(5)}/>
  <circle cx="118" cy="182" r="11" fill="${K}"/><circle cx="182" cy="182" r="11" fill="${K}"/>
  <circle cx="122" cy="178" r="4" fill="#fff"/><circle cx="186" cy="178" r="4" fill="#fff"/>
  <ellipse cx="100" cy="208" rx="12" ry="7.5" fill="#ffb4a8"/><ellipse cx="200" cy="208" rx="12" ry="7.5" fill="#ffb4a8"/>
  ${titulo(AMARELO, CREME)}
  ${selo(48, 126, 28, VERMELHO, AMARELO)}
  ${moldura}`,
];

/** Quantas capas a banca tem. */
export const N_CAPAS = CAPAS.length;
/** O nome do painel no corpo da página (as dicas e os botões do jogo somem com ele aberto). */
export const OVERLAY_REVISTA = 'vila-revista';
/** Um toque logo depois de abrir não fecha (o dedinho que tocou duas vezes sem querer). */
const ESPERA_MS = 350;

const CSS = `
.vila-revista { position: fixed; inset: 0; z-index: 95; display: grid; place-items: center; overflow: hidden;
  background: rgba(24, 16, 44, 0.6); touch-action: none; user-select: none; -webkit-user-select: none;
  animation: vila-revista-fundo 0.2s ease-out both; }
.vila-revista .capa { width: min(78vw, 55vh); aspect-ratio: 3 / 4; border-radius: 10px; overflow: hidden;
  transform: rotate(-4deg); background: #fff6e0;
  box-shadow: 4px 4px 0 #efe6cf, 8px 8px 0 #d9ccab, 0 26px 50px rgba(8, 4, 20, 0.55);
  animation: vila-revista-entra 0.42s cubic-bezier(.2, 1.4, .4, 1) both; }
.vila-revista .capa svg { width: 100%; height: 100%; display: block; }
@keyframes vila-revista-fundo { from { opacity: 0; } to { opacity: 1; } }
@keyframes vila-revista-entra {
  from { transform: translateY(18%) rotate(-16deg) scale(0.35); opacity: 0; }
  to { transform: rotate(-4deg) scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .vila-revista .capa { animation: vila-revista-fundo 0.2s ease-out both; } }
`;

export interface Revista {
  /** Abre a capa `n` (sem `n`, a próxima da vez). */
  abrir(n?: number): void;
  fechar(): void;
  aberta(): boolean;
}

export function criarRevista(): Revista {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const raiz = document.createElement('div');
  raiz.className = 'vila-revista';
  raiz.setAttribute('data-revista', '');
  const capa = document.createElement('div');
  capa.className = 'capa';
  raiz.appendChild(capa);
  let aberta = false;
  let vez = 0;
  let desde = 0;

  function fechar(): void {
    if (!aberta) return;
    aberta = false;
    raiz.remove();
    if (document.body.dataset.overlay === OVERLAY_REVISTA) delete document.body.dataset.overlay;
  }
  // um toque em qualquer lugar fecha (e não chega no jogo que está atrás)
  raiz.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (performance.now() - desde >= ESPERA_MS) fechar();
  });
  for (const tipo of ['pointerup', 'pointermove', 'click', 'touchstart', 'touchend', 'mousedown'])
    raiz.addEventListener(tipo, (e) => e.stopPropagation());

  return {
    abrir(n) {
      const qual = (((n ?? vez) % N_CAPAS) + N_CAPAS) % N_CAPAS;
      vez = qual + 1;
      capa.dataset.capa = String(qual);
      capa.innerHTML = `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${CAPAS[qual]}</svg>`;
      desde = performance.now();
      if (!aberta) {
        aberta = true;
        document.body.appendChild(raiz);
      } else {
        // outra capa por cima da que estava: o pulinho de novo
        capa.style.animation = 'none';
        void capa.offsetWidth;
        capa.style.animation = '';
      }
      if (!document.body.dataset.overlay) document.body.dataset.overlay = OVERLAY_REVISTA;
    },
    fechar,
    aberta: () => aberta,
  };
}
