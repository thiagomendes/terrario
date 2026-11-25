/**
 * Esboço da spec 037 "Construir melhor" (só com `?esboco=primeira-pessoa`): a câmera em
 * primeira pessoa, num botão com um olhinho. O `main.ts` importa este arquivo sob demanda: vira
 * um pedaço à parte que o jogo nunca baixa. Aprovado pelo dono no celular em 25 nov.
 *
 * Desde a T04, o braço, a mão e o item são o código de verdade (`src/render/bracoPrimeiraPessoa.ts`,
 * pelo gancho `braco()`): o esboço só faz o que é da T03 (a câmera, a mira e o olhinho), até a
 * T03 levar isso para o jogo e tirar o esboço:
 * - a câmera fica à altura dos olhos do controle (1,62), com a cabeça escondida; o campo vertical
 *   nunca dá menos que 42,4° na horizontal (80° no celular em pé); ao entrar, o olhar vai para a
 *   frente (`estudo-visao-primeira-pessoa.md`);
 * - a mira segue o dedo, como na terceira pessoa: o contorno aparece embaixo do dedo enquanto ele
 *   segura e um instante depois; no computador, o clique age onde está o ponteiro;
 * - a entrada e a saída pela cabeça com o olhinho; a câmera solta.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import type { GanchoPrimeiraPessoa } from '../render/cena';
import { todosItens } from '../jogo/itens';

interface EsbocoPrimeiraPessoa {
  /** Liga (true) ou desliga a primeira pessoa, com a transição. */
  primeira(sim: boolean): void;
  ligada(): boolean;
  /** 0 em terceira pessoa, 1 dentro da cabeça (a transição no meio). */
  fracao(): number;
  /** Peso da mão na tela (0 fora, 1 inteira). */
  maos(): { direita: number; esquerda: number };
  /** A célula do contorno agora (embaixo do dedo ou do ponteiro; null sem contorno). */
  mira(): [number, number, number] | null;
  /** Malhas e triângulos do braço, da sombra e do contorno. */
  custo(): { malhas: number; triangulos: number };
  /** Onde a mão e o ombro caem na tela (px), e o ombro achado para esta tela. */
  tela(): { mao: [number, number]; ombro: [number, number]; ombroCamera: number[]; maoPx: number };
  /** A conferência do ombro desde o último `zerarPonta` (quadros e a menor folga, px). */
  ponta(): { quadros: number; menorFolgaPx: number };
  zerarPonta(): void;
  /** O ritmo desde o último zerar: os golpes e colocações do jogo e os movimentos do braço. */
  ritmo(): { golpes: number; balancos: number; colocacoes: number; empurroes: number };
  zerarRitmo(): void;
  /** Os itens que a mão pode segurar (para a folha de itens). */
  itens(): { id: string; tipo: string }[];
  /** Só para o estudo da escala: a altura dos olhos (blocos) e o campo vertical (graus); null volta à regra. */
  ajustarCamera(altura: number | null, fovV: number | null): void;
}

declare global {
  interface Window {
    __primeiraPessoa?: EsbocoPrimeiraPessoa;
  }
}

// ------------------------------------------------------------------ números do esboço
/** A entrada e a saída pela cabeça (s). */
const DURACAO_TRANSICAO = 0.7;
/**
 * A câmera de dentro, em relação aos pés (blocos): à altura dos olhos do controle (1,62, a mesma
 * do jogo de blocos de referência num corpo de 1,8, e a mesma de onde o alcance é medido), na
 * frente da cabeça escondida (`estudo-visao-primeira-pessoa.md`). A câmera sai da posição do corpo
 * no quadro, sem o balanço da cabeça.
 */
const OLHOS_ALTURA = 1.62;
const OLHOS_FRENTE = 0.345;
/** Olhando bem para baixo, o olhar passa um tico da vertical: aparecem o peito e os sapatos. */
const PITCH_CURVADO = 0.35;
/** Pouso: quanto a câmera abaixa (blocos) por segundo de queda, no máximo POUSO_MAXIMO. */
const POUSO_POR_SEGUNDO = 0.14;
const POUSO_MAXIMO = 0.09;
/**
 * O campo de visão de dentro: o vertical de hoje (70°), mas nunca menos que 42,4° na horizontal
 * (no celular em pé, 80° na vertical). A conta e a grade: `conta-escala.mjs`.
 */
const FOV_H_MINIMO = (42.4 * Math.PI) / 180;
const fovDeDentro = (aspecto: number, fovJogo: number) =>
  Math.max(fovJogo, 2 * Math.atan(Math.tan(FOV_H_MINIMO / 2) / aspecto));
/** Ao entrar, o olhar vai para a frente: o horizonte no terço de cima da tela. */
const pitchDeEntrada = (fovV: number) => Math.atan(Math.tan(fovV / 2) / 3);
/** Depois do toque, o contorno fica na célula por um instante (s). */
const CONTORNO_DEPOIS_DO_TOQUE = 0.6;

const suave = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export function prepararEsbocoPrimeiraPessoa(): void {
  const esperar = () => {
    const g = window.__brumaluz?.primeiraPessoa;
    if (!g || !window.__brumaluz?.ready) {
      setTimeout(esperar, 300);
      return;
    }
    ligar(g);
  };
  esperar();
}

function ligar(g: GanchoPrimeiraPessoa): void {
  const { scene, visao, olhos } = g;
  let ligado = false;
  let t = 0;
  // o braço, a mão e o item: o código de verdade (T04)
  const braco = g.braco();
  // nada do esboço entra no brilho da tela (o halo borrava o contorno da mira)
  const glow = scene.effectLayers?.find((l) => l.name === 'glow') as GlowLayer | undefined;
  const semBrilho = (m: AbstractMesh) => glow?.addExcludedMesh(m as Mesh);
  let noArDesde = -1;
  let pouso = 0;
  let pousoVel = 0;
  /** A inclinação ao entrar (o olhar vai para a frente durante a entrada). */
  let entrada: { de: number; para: number } | null = null;

  // ---------------------------------------------------------------- a mira de colocar
  // onde o bloco vai entrar: um contorno de gomos finos e claros na célula, com o miolo bem de
  // leve (a mesma conta do toque: `preverToque`, com o raio saindo da câmera que desenha a tela).
  // A grossura do gomo acompanha a distância: de perto fica fino e, fora do brilho, não borra.
  const matMira = new StandardMaterial('esb-pp-mira', scene);
  matMira.diffuseColor = Color3.Black();
  matMira.emissiveColor = new Color3(0.96, 0.96, 0.92);
  matMira.specularColor = Color3.Black();
  matMira.disableLighting = true;
  matMira.alpha = 0.85;
  const matMiolo = new StandardMaterial('esb-pp-mira-miolo', scene);
  matMiolo.emissiveColor = new Color3(1, 1, 0.92);
  matMiolo.diffuseColor = Color3.Black();
  matMiolo.specularColor = Color3.Black();
  matMiolo.disableLighting = true;
  matMiolo.alpha = 0.12;
  const contornos = new Map<number, Mesh>();
  const contornoDe = (nivel: number): Mesh => {
    let c = contornos.get(nivel);
    if (c) return c;
    const G = nivel * 0.004;
    const barras: Mesh[] = [];
    for (const eixo of [0, 1, 2])
      for (const a of [0, 1])
        for (const b of [0, 1]) {
          const tam = [G, G, G];
          tam[eixo] = 1 + G;
          const bar = MeshBuilder.CreateBox('esb-pp-mira-barra', { width: tam[0], height: tam[1], depth: tam[2] }, scene);
          const pos = [a - 0.5, b - 0.5, 0];
          const p3 = eixo === 0 ? [0, pos[0], pos[1]] : eixo === 1 ? [pos[0], 0, pos[1]] : [pos[0], pos[1], 0];
          bar.position.set(p3[0], p3[1], p3[2]);
          barras.push(bar);
        }
    c = Mesh.MergeMeshes(barras, true)!;
    c.name = 'esb-pp-mira';
    c.material = matMira;
    c.isPickable = false;
    c.setEnabled(false);
    semBrilho(c);
    contornos.set(nivel, c);
    return c;
  };
  let contorno: Mesh | null = null;
  const miolo = MeshBuilder.CreateBox('esb-pp-mira-miolo', { size: 0.98 }, scene);
  miolo.material = matMiolo;
  miolo.isPickable = false;
  miolo.setEnabled(false);
  semBrilho(miolo);
  let celulaMira: [number, number, number] | null = null;
  // ---------------------------------------------------------------- o dedo (e o ponteiro)
  // a primeira pessoa age onde a criança toca, como a terceira pessoa (o toque, o segurar e o
  // arrastar são os de sempre, de `src/ui/toque.ts`): o esboço só acompanha o dedo para mostrar
  // o contorno embaixo dele enquanto segura e por um instante depois do toque; no computador, o
  // contorno fica embaixo do ponteiro
  const dedo = { ativo: false, mouse: false, x: 0, y: 0, x0: 0, y0: 0, t0: 0, ate: 0, arrastou: false };
  const canvas = scene.getEngine().getRenderingCanvas()!;
  const naTelaDoJogo = (ev: PointerEvent) => {
    const alvo = ev.target as HTMLElement | null;
    return !!alvo && (alvo === canvas || alvo.classList?.contains('olhar'));
  };
  const noCanvas = (ev: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [ev.clientX - r.left, ev.clientY - r.top];
  };
  window.addEventListener(
    'pointerdown',
    (ev) => {
      if (!naTelaDoJogo(ev)) return;
      [dedo.x, dedo.y] = noCanvas(ev);
      dedo.x0 = dedo.x;
      dedo.y0 = dedo.y;
      dedo.t0 = performance.now() / 1000;
      dedo.ativo = true;
      dedo.arrastou = false;
      dedo.mouse = ev.pointerType === 'mouse';
    },
    { capture: true, passive: true },
  );
  window.addEventListener(
    'pointermove',
    (ev) => {
      if (ev.pointerType === 'mouse' && !dedo.ativo) {
        // o ponteiro passeando: o contorno vai embaixo dele
        if (!naTelaDoJogo(ev)) return;
        dedo.mouse = true;
        [dedo.x, dedo.y] = noCanvas(ev);
        return;
      }
      if (!dedo.ativo) return;
      [dedo.x, dedo.y] = noCanvas(ev);
      if (Math.hypot(dedo.x - dedo.x0, dedo.y - dedo.y0) > 12) dedo.arrastou = true;
    },
    { capture: true, passive: true },
  );
  const soltarDedo = () => {
    if (!dedo.ativo) return;
    dedo.ativo = false;
    dedo.ate = dedo.arrastou ? 0 : performance.now() / 1000 + CONTORNO_DEPOIS_DO_TOQUE;
    // (o ponteiro do computador volta a passear: o contorno volta para baixo dele)
    if (dedo.mouse) dedo.arrastou = false;
  };
  window.addEventListener('pointerup', soltarDedo, { capture: true, passive: true });
  window.addEventListener('pointercancel', soltarDedo, { capture: true, passive: true });
  /** Onde o contorno vai agora (px no canvas), ou null; e se é para quebrar (segurando). */
  const pontoDoContorno = (): { x: number; y: number; quebrar: boolean } | null => {
    const agora = performance.now() / 1000;
    const segurando = dedo.ativo && !dedo.arrastou;
    if (dedo.mouse) return dedo.arrastou ? null : { x: dedo.x, y: dedo.y, quebrar: segurando && agora - dedo.t0 > 0.35 };
    if (segurando) return { x: dedo.x, y: dedo.y, quebrar: agora - dedo.t0 > 0.35 };
    if (agora < dedo.ate) return { x: dedo.x, y: dedo.y, quebrar: false };
    return null;
  };
  function atualizarMira(ligada: boolean, colocaBloco: boolean): void {
    const e = window.__brumaluz;
    let cel: [number, number, number] | null = null;
    const ponto = ligada ? pontoDoContorno() : null;
    if (ponto && e?.preverToque) {
      const prev = e.preverToque(ponto.x, ponto.y);
      const a = prev.alvo;
      // com bloco na mão e sem segurar, a célula onde ele entra; senão, o bloco que vai quebrar
      if (a) cel = colocaBloco && !ponto.quebrar ? [a.x + a.normal.x, a.y + a.normal.y, a.z + a.normal.z] : [a.x, a.y, a.z];
      // a célula onde a própria criança está não recebe bloco: o contorno não aparece ali
      const j = g.jogador();
      if (
        cel &&
        colocaBloco &&
        !ponto.quebrar &&
        cel[0] < j.x + 0.3 &&
        cel[0] + 1 > j.x - 0.3 &&
        cel[2] < j.z + 0.3 &&
        cel[2] + 1 > j.z - 0.3 &&
        cel[1] < j.y + 1.8 &&
        cel[1] + 1 > j.y
      )
        cel = null;
    }
    celulaMira = cel;
    if (!cel) {
      contorno?.setEnabled(false);
      miolo.setEnabled(false);
      return;
    }
    const centro = new Vector3(cel[0] + 0.5, cel[1] + 0.5, cel[2] + 0.5);
    const dist = Vector3.Distance(centro, visao.position);
    // ~2 px de gomo no celular, de perto ou de longe (de 0,012 a 0,04 bloco)
    const nivel = Math.round(Math.min(10, Math.max(3, dist * 1.4)));
    const c = contornoDe(nivel);
    if (c !== contorno) {
      contorno?.setEnabled(false);
      contorno = c;
    }
    c.setEnabled(true);
    c.position.copyFrom(centro);
    miolo.setEnabled(true);
    miolo.position.copyFrom(centro);
    // de perto o miolo some (não vela a tela)
    matMiolo.alpha = 0.12 * suave((dist - 1.6) / 1.4);
    // respira bem devagar (nada de piscar)
    const tt = performance.now() / 1000;
    matMira.alpha = 0.78 + Math.sin(tt * 2.4) * 0.12;
  }

  /** Só para o estudo da escala: a altura dos olhos e o campo vertical (rad) da grade. */
  const ajusteCamera: { altura?: number; fovV?: number } = {};
  /**
   * A câmera de dentro, antes da mira do dedo (o jogo mira e quebra com a câmera que a criança
   * vê): a entrada pela cabeça, o campo de visão, o olhar para a frente ao entrar, os olhos (da
   * posição do corpo neste quadro) e o pouso.
   */
  g.antesDaMira = (dt) => {
    const alvoT = ligado ? 1 : 0;
    t = alvoT > t ? Math.min(1, t + dt / DURACAO_TRANSICAO) : Math.max(0, t - dt / DURACAO_TRANSICAO);
    const e = suave(t);
    if (e <= 0) return;
    const jog = g.jogador();
    const pitch = olhos.rotation.x;
    const yaw = olhos.rotation.y;
    // ---------------- o campo de visão de dentro (mais aberto no celular em pé), entrando junto
    const tela = canvas.getBoundingClientRect();
    const fovJogo = visao.fov;
    const fovDentro = ajusteCamera.fovV ?? fovDeDentro(tela.width / tela.height, fovJogo);
    visao.fov = fovJogo + (fovDentro - fovJogo) * e;
    // ao entrar, o olhar vai para a frente (o horizonte no terço de cima), junto com a entrada
    if (ligado && entrada === null) entrada = { de: pitch, para: pitchDeEntrada(fovDentro) };
    if (entrada && ligado && t < 1) window.__brumaluz?.apontar?.(yaw, entrada.de + (entrada.para - entrada.de) * e);
    // ---------------- o corpo vira junto com o olhar
    const yawCorpo = window.__brumaluz?.yawBoneco?.() ?? yaw;
    g.travarYaw(e >= 1 ? yaw : yawCorpo + ((((yaw - yawCorpo + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * e);
    // ---------------- o pouso: a câmera abaixa um tico e volta macia
    if (jog.noChao) {
      if (noArDesde >= 0) {
        const noAr = performance.now() / 1000 - noArDesde;
        if (noAr > 0.25 && !jog.voando) pousoVel -= Math.min(POUSO_MAXIMO * 9, noAr * POUSO_POR_SEGUNDO * 9);
      }
      noArDesde = -1;
    } else if (noArDesde < 0) noArDesde = performance.now() / 1000;
    pousoVel += (-pouso * 90 - pousoVel * 12) * dt;
    pouso = Math.max(-POUSO_MAXIMO, Math.min(0.02, pouso + pousoVel * dt));
    // ---------------- os olhos (a câmera entra pela cabeça, sem corte seco)
    const destino = new Vector3(
      jog.x + Math.sin(yaw) * OLHOS_FRENTE,
      jog.y + (ajusteCamera.altura ?? OLHOS_ALTURA) + pouso,
      jog.z + Math.cos(yaw) * OLHOS_FRENTE,
    );
    visao.position.copyFrom(Vector3.Lerp(visao.position, destino, e));
    // olhando bem para baixo, o olhar passa um tico da vertical: o peito e os sapatos aparecem
    // (o alto da tela continua sendo a frente: nada vira de ponta-cabeça)
    const curva = suave((pitch - 1.0) / 0.45);
    visao.rotation.x = pitch + PITCH_CURVADO * curva * e;
    visao.updateUpVectorFromRotation = curva > 0;
    if (curva <= 0) visao.upVector.set(0, 1, 0);
  };
  /** A mão, o item e o corpo (o código de verdade) e o contorno, depois do boneco. */
  g.quadro = (dt) => {
    const e = suave(t);
    const mao = g.naMao();
    braco.quadro(dt, {
      fracao: t,
      pitch: olhos.rotation.x,
      jogador: g.jogador(),
      vista: g.vista(),
      gesto: g.gesto(),
      naMao: mao,
      aparencia: g.aparencia(),
    });
    if (e <= 0) {
      visao.updateUpVectorFromRotation = false;
      visao.upVector.set(0, 1, 0);
      g.travarYaw(null);
      entrada = null;
      atualizarMira(false, false);
      document.body.classList.remove('esb-pp-dentro');
      return;
    }
    atualizarMira(e > 0.9, mao.bloco !== null);
    document.body.classList.toggle('esb-pp-dentro', e > 0.5);
  };

  // ---------------------------------------------------------------- o computador
  // de dentro, o clique age onde está o ponteiro (como o dedo): sem travar o mouse, a câmera
  // gira arrastando; clicar põe (ou usa), segurar parado quebra embaixo do ponteiro
  const direto = () => window.__brumaluz?.controleDireto;
  const mouse = { botao: -1, x: 0, y: 0, x0: 0, y0: 0, t0: 0, arrastando: false, quebrando: false, timer: 0 };
  const dentro = () => ligado && t > 0.5;
  // (o clique no canvas pedia o mouse travado: de dentro, não)
  canvas.addEventListener(
    'click',
    (ev) => {
      if (dentro()) ev.stopImmediatePropagation();
    },
    true,
  );
  // (eventos de ponteiro: o motor cancela o pointerdown, e aí o mousedown nem chega)
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'mouse' || !dentro() || document.pointerLockElement === canvas) return;
    const [x, y] = [ev.offsetX, ev.offsetY];
    if (ev.button === 2) {
      direto()?.mirar(x, y);
      direto()?.usar();
      setTimeout(() => direto()?.soltarMira(), 50);
      return;
    }
    if (ev.button !== 0) return;
    Object.assign(mouse, { botao: 0, x, y, x0: x, y0: y, t0: performance.now(), arrastando: false, quebrando: false });
    clearTimeout(mouse.timer);
    mouse.timer = window.setTimeout(() => {
      if (mouse.botao !== 0 || mouse.arrastando) return;
      // segurou parado: quebra embaixo do ponteiro até soltar
      mouse.quebrando = true;
      direto()?.mirar(mouse.x, mouse.y);
      direto()?.quebrar(true);
    }, 350);
  });
  window.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse' || mouse.botao !== 0 || !dentro()) return;
    const r = canvas.getBoundingClientRect();
    const [x, y] = [ev.clientX - r.left, ev.clientY - r.top];
    const [dx, dy] = [x - mouse.x, y - mouse.y];
    mouse.x = x;
    mouse.y = y;
    if (mouse.quebrando) {
      direto()?.mirar(x, y);
      return;
    }
    if (!mouse.arrastando && Math.hypot(x - mouse.x0, y - mouse.y0) > 6) {
      mouse.arrastando = true;
      clearTimeout(mouse.timer);
      direto()?.arrastar(true);
    }
    if (mouse.arrastando) direto()?.olhar(dx * 2.2, dy * 2.2);
  });
  window.addEventListener('pointerup', (ev) => {
    if (ev.pointerType !== 'mouse' || ev.button !== 0 || mouse.botao !== 0) return;
    mouse.botao = -1;
    clearTimeout(mouse.timer);
    const c = direto();
    if (!c) return;
    if (mouse.quebrando) {
      c.quebrar(false);
      c.soltarMira();
    } else if (mouse.arrastando) c.arrastar(false);
    else {
      // um clique: o mesmo toque do dedo, no ponto do ponteiro
      c.mirar(mouse.x, mouse.y);
      c.tocar?.();
      setTimeout(() => c.soltarMira(), 50);
    }
  });

  // ---------------------------------------------------------------- o olhinho
  const estilo = document.createElement('style');
  estilo.textContent = `
    .esb-pp-olho { position: fixed; right: calc(14px + env(safe-area-inset-right)); top: 38%;
      width: 60px; height: 60px; border-radius: 50%; border: 3px solid #fff;
      background: rgba(40, 52, 78, 0.55); display: grid; place-items: center; z-index: 50;
      box-shadow: 0 3px 8px rgba(0,0,0,0.25); touch-action: manipulation; padding: 0; }
    .esb-pp-olho.ligado { background: #ffd34d; border-color: #fff; }
    .esb-pp-olho svg { width: 40px; height: 40px; }
    /* de dentro, a mira do meio da tela sai: o toque e o clique agem onde o dedo e o ponteiro estão */
    body.esb-pp-dentro .hud .mira { display: none; }
  `;
  document.head.appendChild(estilo);
  const olho = document.createElement('button');
  olho.className = 'esb-pp-olho';
  olho.setAttribute('aria-label', 'Ver de dentro');
  olho.dataset.esbOlho = '';
  // o olhinho: o branco do olho, a íris, a pupila e o brilho (o mesmo traço grosso dos ícones)
  olho.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">
    <path d="M3 20 Q20 4 37 20 Q20 36 3 20 Z" fill="#fff" stroke="#24314d" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="20" cy="20" r="7.5" fill="#3f8be0" stroke="#24314d" stroke-width="2"/>
    <circle cx="20" cy="20" r="3.6" fill="#24314d"/>
    <circle cx="22.6" cy="17.4" r="1.8" fill="#fff"/>
  </svg>`;
  olho.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  olho.addEventListener('click', (ev) => {
    ev.stopPropagation();
    api.primeira(!ligado);
  });
  document.body.appendChild(olho);

  const api: EsbocoPrimeiraPessoa = {
    primeira(sim) {
      ligado = sim;
      olho.classList.toggle('ligado', sim);
    },
    ligada: () => ligado,
    fracao: () => t,
    mira: () => celulaMira,
    maos: () => ({ direita: braco.peso(), esquerda: 0 }),
    custo: () => {
      const c = braco.custo();
      if (contorno?.isEnabled())
        for (const m of [contorno, miolo]) {
          c.malhas++;
          c.triangulos += Math.round(m.getTotalIndices() / 3);
        }
      return c;
    },
    tela: () => braco.tela(),
    ponta: () => braco.ponta(),
    zerarPonta: () => braco.zerarPonta(),
    ritmo: () => braco.ritmo(),
    zerarRitmo: () => braco.zerarRitmo(),
    itens: () => todosItens().map((i) => ({ id: i.id, tipo: i.tipo })),
    ajustarCamera(altura, fovV) {
      if (altura === null) delete ajusteCamera.altura;
      else ajusteCamera.altura = altura;
      if (fovV === null) delete ajusteCamera.fovV;
      else ajusteCamera.fovV = (fovV * Math.PI) / 180;
    },
  };
  window.__primeiraPessoa = api;
}
