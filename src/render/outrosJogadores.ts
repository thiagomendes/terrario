/**
 * Os outros jogadores no mundo (spec 010): o personagem de cada um com a aparência que
 * escolheu, o apelido flutuando acima da cabeça, o item na mão e as animações de andar,
 * correr e voar. A posição chega 20 vezes por segundo e anda suave entre os quadros.
 * O corpo vira para onde o amigo anda (spec 015), tirado das posições suavizadas; a cabeça
 * acompanha para onde ele olha, e minerando ou construindo ele vira para o olhar.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { criarPersonagem } from './personagem';
import { criarAnimador } from '../player/animacao';
import { normalizarAparencia, type Aparencia } from '../personagem/aparencia';
import { blocoDoItem } from '../jogo/itens';
import type { JogadorVisto, PerfilJogador } from '../nucleo/protocolo';
// spec 015 (gestos): o gesto é uma camada do animador; o balão fica em cima da cabeça
import {
  aplicarJuntas,
  fazerGesto,
  gestoDoAnimador,
  type IdGesto,
  type Juntas,
} from '../personagem/gestos';

/** Spec 026 (parte 2): a cadeira de um amigo sentado (o lugar, o rumo e a pose). */
export interface AssentoDoAmigo {
  x: number;
  y: number;
  z: number;
  yaw: number;
  juntas: Juntas;
  /** Parte 3: no trilho da rampa de skate, a inclinação da prancha (o boneco deita junto). */
  inclina?: number;
}
import { criarBalao, type BalaoGesto } from './balaoGesto';

/** Apelido em HTML por cima do jogo: nítido em qualquer tela (sem desfoque do 3D). */
const CSS_ROTULO = `
.rotulo-amigo { position: fixed; left: 0; top: 0; z-index: 6; pointer-events: none;
  padding: 3px 12px; border-radius: 999px; background: rgba(255, 250, 240, 0.92); color: #3b2a1e;
  font: 800 14px var(--jogo, system-ui), sans-serif; white-space: nowrap; will-change: transform;
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.35), 0 4px 10px rgba(40, 25, 10, 0.2); }
.rotulo-amigo[hidden] { display: none; }
body[data-overlay] .rotulo-amigo, body.modo-foto .rotulo-amigo, body.tela-titulo .rotulo-amigo { display: none; }
/* spec 023 (T09): a etiqueta colorida (nível 2) e com estrela (nível 7), presentes de nível.
   Uma cor quente só (coral para laranja), nada de arco-íris (regra do dono) */
.rotulo-amigo.etiqueta-cor, .rotulo-amigo.etiqueta-estrela { color: #fff; text-shadow: 0 1px 0 rgba(140, 60, 20, 0.55);
  background: linear-gradient(100deg, #ff8a5c 0%, #ffb347 100%);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85), 0 2px 0 rgba(160, 80, 30, 0.4), 0 4px 12px rgba(160, 80, 30, 0.3); }
.rotulo-amigo.etiqueta-estrela { padding-left: 30px; }
.rotulo-amigo.etiqueta-estrela::before { content: ''; position: absolute; left: 6px; top: 50%; width: 20px; height: 20px; margin-top: -10px;
  background: no-repeat center/contain url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path d='M10 1 L12.6 7 L19 7.4 L14 11.6 L15.6 18 L10 14.4 L4.4 18 L6 11.6 L1 7.4 L7.4 7 Z' fill='%23ffe066' stroke='%23b8740a' stroke-width='1.4' stroke-linejoin='round'/></svg>"); }
`;
let cssPosto = false;
function criarRotulo(texto: string): HTMLDivElement {
  if (!cssPosto) {
    cssPosto = true;
    const st = document.createElement('style');
    st.textContent = CSS_ROTULO;
    document.head.append(st);
  }
  const d = document.createElement('div');
  d.className = 'rotulo-amigo';
  d.textContent = texto;
  d.hidden = true;
  document.body.append(d);
  return d;
}

interface Outro {
  id: string;
  personagem: ReturnType<typeof criarPersonagem>;
  animador: ReturnType<typeof criarAnimador>;
  /** Spec 015: balão do gesto (criado no primeiro gesto). */
  balao?: BalaoGesto;
  placa: HTMLDivElement;
  alvo: JogadorVisto;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Velocidade suavizada a partir das posições (blocos/s): o corpo vira para ela. */
  vx: number;
  vz: number;
  mao: string | null;
  /** Spec 027: a contagem da sacola de doces na mão dele (já desenhada). */
  maoQtd?: number;
  apelido: string;
  /** Auditoria 017: a aparência já vestida, passada a limpo em texto (só refaz quando muda). */
  chaveAparencia: string;
  /** Últimos contadores de golpe, colocação e comida vistos (null antes do primeiro). */
  acoes: [number, number, number] | null;
  /** Transparência do apelido já escrita (só escreve quando muda). */
  opacidadePlaca: number;
  /** Spec 023 (T09): o balão com estrelinha (presente do nível 6 do amigo). */
  balaoEstrela: boolean;
}

/** Spec 023 (T09): a etiqueta do nome pelo presente de nível do amigo. */
function vestirEtiqueta(placa: HTMLDivElement, etiqueta: Aparencia['etiqueta']): void {
  // (o apelido de mentira dos testes não tem lista de classes)
  placa.classList?.toggle('etiqueta-cor', etiqueta === 'cor');
  placa.classList?.toggle('etiqueta-estrela', etiqueta === 'estrela');
}

/** A caixa do canvas na página, medida de novo só quando a janela muda de tamanho ou rola. */
let caixaGuardada: DOMRect | null = null;
let canvasGuardado: HTMLCanvasElement | null = null;
let ouvindoJanela = false;
function medirCanvas(canvas: HTMLCanvasElement | null): DOMRect | undefined {
  if (!canvas) return undefined;
  if (!ouvindoJanela && typeof window !== 'undefined') {
    ouvindoJanela = true;
    const esquecer = () => {
      caixaGuardada = null;
    };
    window.addEventListener('resize', esquecer);
    window.addEventListener('scroll', esquecer, true);
    window.visualViewport?.addEventListener('resize', esquecer);
    document.addEventListener('fullscreenchange', esquecer);
    if (typeof ResizeObserver === 'function') new ResizeObserver(esquecer).observe(canvas);
  }
  if (canvas !== canvasGuardado || !caixaGuardada) {
    canvasGuardado = canvas;
    caixaGuardada = canvas.getBoundingClientRect();
  }
  return caixaGuardada;
}

export function criarOutrosJogadores(scene: Scene) {
  const ponto = new Vector3();
  const tela = new Vector3();
  const outros = new Map<string, Outro>();
  let perfis: Record<string, PerfilJogador> = {};
  const leves: { id: string; x: number; y: number; z: number; aparencia: string }[] = [];
  const levesPorId = new Map<string, (typeof leves)[number]>();
  let assento: ((id: string) => AssentoDoAmigo | null) | null = null;
  let yawFixo: ((id: string) => number | null) | null = null;

  function criar(v: JogadorVisto): Outro {
    const perfil = perfis[v.id];
    const apelido = perfil?.apelido ?? 'Amigo';
    const aparencia = normalizarAparencia(perfil?.aparencia ?? {});
    const personagem = criarPersonagem(scene, aparencia);
    const placa = criarRotulo(apelido);
    vestirEtiqueta(placa, aparencia.etiqueta);
    return {
      id: v.id,
      personagem,
      animador: criarAnimador(v.yaw),
      placa,
      alvo: v,
      x: v.x,
      y: v.y,
      z: v.z,
      yaw: v.yaw,
      vx: 0,
      vz: 0,
      mao: null,
      maoQtd: undefined,
      acoes: null,
      apelido,
      chaveAparencia: JSON.stringify(aparencia),
      opacidadePlaca: -1,
      balaoEstrela: aparencia.balao === 'estrela',
    };
  }

  /** Spec 032: o amigo começou a comer (`item`): a tela faz as três mordidas no boneco dele. */
  let aoComer: ((personagem: Outro['personagem'], item: string | null) => void) | null = null;
  let aoSair: ((personagem: Outro['personagem']) => void) | null = null;

  function descartar(o: Outro): void {
    aoSair?.(o.personagem);
    o.balao?.descartar();
    o.personagem.descartar();
    o.placa.remove();
  }

  return {
    /** Spec 032: quem desenha a refeição do amigo (as mordidas na comida certa). */
    definirRefeicao(
      comer: ((personagem: Outro['personagem'], item: string | null) => void) | null,
      sair: ((personagem: Outro['personagem']) => void) | null,
    ) {
      aoComer = comer;
      aoSair = sair;
    },
    /** Spec 032: o boneco de um amigo (testes, e a entrega do lanche que ele comprou). */
    personagemDe: (id: string) => outros.get(id)?.personagem ?? null,
    /** Spec 032: o animador de um amigo (o braço que paga e pega o lanche). */
    animadorDe: (id: string) => outros.get(id)?.animador ?? null,
    /**
     * Apelidos e aparências (chegam quando alguém entra ou muda). Os perfis vêm todos juntos:
     * só refaz o boneco de quem mudou de visual (auditoria 017); o apelido só troca o texto.
     */
    definirPerfis(p: Record<string, PerfilJogador>) {
      perfis = p;
      for (const o of outros.values()) {
        const novo = perfis[o.id];
        if (!novo) continue;
        const aparencia = normalizarAparencia(novo.aparencia);
        const chave = JSON.stringify(aparencia);
        if (chave !== o.chaveAparencia) {
          o.chaveAparencia = chave;
          o.personagem.aplicarAparencia(aparencia);
          vestirEtiqueta(o.placa, aparencia.etiqueta);
          o.balaoEstrela = aparencia.balao === 'estrela';
        }
        if (novo.apelido !== o.apelido) {
          o.placa.textContent = novo.apelido;
          o.apelido = novo.apelido;
        }
      }
    },
    /** Lista do último quadro: entra quem chegou, sai quem saiu. */
    receber(lista: readonly JogadorVisto[]) {
      const vivos = new Set<string>();
      for (const v of lista) {
        vivos.add(v.id);
        const o = outros.get(v.id);
        if (o) o.alvo = v;
        else outros.set(v.id, criar(v));
      }
      for (const [id, o] of outros)
        if (!vivos.has(id)) {
          descartar(o);
          outros.delete(id);
        }
    },
    /**
     * Spec 026 (parte 2): onde está a cadeira de cada amigo sentado num brinquedo do parque
     * (null: em pé) e a pose de sentado dele.
     */
    definirAssento(f: ((id: string) => AssentoDoAmigo | null) | null) {
      assento = f;
    },
    /** Spec 027 (T11): o rumo do corpo de um amigo preso a algo (o abraço do Bento), ou null. */
    definirYawFixo(f: ((id: string) => number | null) | null) {
      yawFixo = f;
    },
    /** Spec 027 (T11): o animador e os pés de um amigo à vista (o abraço do Bento), ou null. */
    amigo(id: string): {
      animador: ReturnType<typeof criarAnimador>;
      aparencia: Aparencia;
      x: number;
      y: number;
      z: number;
    } | null {
      const o = outros.get(id);
      return o
        ? { animador: o.animador, aparencia: JSON.parse(o.chaveAparencia) as Aparencia, x: o.x, y: o.y, z: o.z }
        : null;
    },
    atualizar(dt: number, luz: number) {
      const k = Math.min(1, dt * 14);
      const cam = scene.activeCamera;
      const motor = scene.getEngine();
      const canvas = motor.getRenderingCanvas();
      const larg = motor.getRenderWidth();
      const alt = motor.getRenderHeight();
      const vista = cam?.viewport.toGlobal(larg, alt);
      const transform = scene.getTransformMatrix();
      // a medida do canvas só muda quando a janela muda (medir a cada quadro força o navegador
      // a refazer o estilo dos apelidos movidos no quadro de antes)
      const caixaCanvas = outros.size ? medirCanvas(canvas) : undefined;
      for (const o of outros.values()) {
        const a = o.alvo;
        const x0 = o.x;
        const z0 = o.z;
        // longe demais (teleporte, renasceu): vai direto
        const saltou = Math.abs(a.x - o.x) + Math.abs(a.y - o.y) + Math.abs(a.z - o.z) > 8;
        if (saltou) {
          o.x = a.x;
          o.y = a.y;
          o.z = a.z;
        } else {
          o.x += (a.x - o.x) * k;
          o.y += (a.y - o.y) * k;
          o.z += (a.z - o.z) * k;
        }
        // a velocidade de verdade sai das posições (chegam aos degraus, 20 por segundo):
        // suavizada, para o corpo virar sem tremer
        if (dt > 0 && !saltou) {
          const kv = 1 - Math.exp(-dt * 8);
          o.vx += ((o.x - x0) / dt - o.vx) * kv;
          o.vz += ((o.z - z0) / dt - o.vz) * kv;
        }
        // parado de verdade (o servidor diz que não anda): sem resto de velocidade
        if (a.vel < 0.05 && Math.hypot(a.x - o.x, a.z - o.z) < 0.02) {
          o.vx *= 0.8;
          o.vz *= 0.8;
        }
        // spec 026 (parte 2): o amigo sentado num brinquedo do parque fica onde a cadeira está
        // (a mesma conta do relógio do mundo que move o brinquedo: nada de atraso de rede)
        const cadeira = assento?.(o.id) ?? null;
        if (cadeira) {
          const ks = Math.min(1, dt * 9);
          const longe = Math.hypot(cadeira.x - o.x, cadeira.y - o.y, cadeira.z - o.z) > 0.6;
          o.x = longe ? o.x + (cadeira.x - o.x) * ks : cadeira.x;
          o.y = longe ? o.y + (cadeira.y - o.y) * ks : cadeira.y;
          o.z = longe ? o.z + (cadeira.z - o.z) * ks : cadeira.z;
          o.vx = 0;
          o.vz = 0;
          o.animador.definirYaw(cadeira.yaw);
        }
        // spec 027 (T11): no abraço do Bento, o corpo do amigo fica de frente para ele
        const fixo = yawFixo?.(o.id) ?? null;
        if (fixo !== null) o.animador.definirYaw(fixo);
        let dy = a.yaw - o.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        o.yaw += dy * k;
        // (spec 027: a sacola de doces muda com a contagem que vem junto)
        if (a.mao !== o.mao || a.maoQtd !== o.maoQtd) {
          o.mao = a.mao;
          o.maoQtd = a.maoQtd;
          const b = blocoDoItem(a.mao);
          o.personagem.definirNaMao(b || null, !b && a.mao ? a.mao : null, a.maoQtd);
        }
        // o amigo golpeou, colocou um bloco ou comeu: o mesmo movimento do boneco dele
        if (a.acoes) {
          const antes = o.acoes;
          if (antes) {
            if (a.acoes[0] > antes[0]) o.animador.evento('golpe');
            if (a.acoes[1] > antes[1]) o.animador.evento('colocacao');
            if (a.acoes[2] > antes[2]) {
              o.animador.evento('comer');
              // spec 032: as três mordidas na comida que ele está comendo (o núcleo diz qual)
              aoComer?.(o.personagem, a.come ?? null);
            }
          }
          o.acoes = [a.acoes[0], a.acoes[1], a.acoes[2]];
        }
        const va = o.animador.vista();
        const agindo = va.golpe !== null || va.colocar !== null;
        let pose = o.animador.atualizar(dt, {
          velocidadeHoriz: cadeira ? 0 : a.vel,
          correndo: cadeira ? false : a.correndo,
          noChao: cadeira ? true : a.noChao,
          voando: cadeira ? false : a.voando,
          vx: o.vx,
          vz: o.vz,
          // minerando ou construindo, vira para onde o amigo olha (o bloco dele)
          alvoYaw: fixo !== null ? fixo : agindo && !cadeira ? o.yaw : null,
          olharYaw: fixo ?? o.yaw,
        });
        if (cadeira) pose = aplicarJuntas(pose, cadeira.juntas, 1);
        o.personagem.aplicarPose(pose, { dt, olhar: a.pitch, vista: o.animador.vista() });
        o.personagem.posicionar(o.x, o.y, o.z, o.animador.yaw());
        // parte 3: na curva da rampa o boneco deita junto com a prancha
        o.personagem.raiz.rotation.x = -(cadeira?.inclina ?? 0) * 0.85;
        o.personagem.definirLuz(luz);
        o.balao?.atualizar(dt);
        // apelido acima da cabeça, projetado na tela (some atrás da câmera e muito longe)
        let mostrar = false;
        if (cam && vista && canvas) {
          ponto.set(o.x, o.y + 2.2, o.z);
          const dist = Vector3.Distance(cam.globalPosition, ponto);
          Vector3.ProjectToRef(ponto, Matrix.IdentityReadOnly, transform, vista, tela);
          if (tela.z > 0 && tela.z < 1 && dist < 64) {
            const r = caixaCanvas!;
            const x = r.left + (tela.x / larg) * r.width;
            const y = r.top + (tela.y / alt) * r.height;
            const e = o.placa;
            e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
            const op = dist > 40 ? Math.round(Math.max(0.35, 1 - (dist - 40) / 30) * 50) / 50 : 1;
            if (op !== o.opacidadePlaca) {
              o.opacidadePlaca = op;
              e.style.opacity = String(op);
            }
            mostrar = true;
          }
        }
        if (o.placa.hidden === mostrar) o.placa.hidden = !mostrar;
      }
    },
    /** Spec 015: o amigo fez um gesto (o boneco dele toca e o balão aparece). */
    gesto(id: string, g: IdGesto) {
      const o = outros.get(id);
      if (!o) return;
      fazerGesto(o.animador, g);
      // spec 023 (T09): o balão com estrelinha de quem ganhou (nível 6)
      (o.balao ??= criarBalao(scene, o.personagem.raiz)).mostrar(g, o.balaoEstrela);
    },
    /**
     * Spec 021: a lista leve para as carinhas (por quadro): os mesmos objetos reaproveitados,
     * só posição e aparência.
     */
    leves(): readonly { id: string; x: number; y: number; z: number; aparencia: string }[] {
      leves.length = 0;
      for (const o of outros.values()) {
        let l = levesPorId.get(o.id);
        if (!l) {
          l = { id: o.id, x: 0, y: 0, z: 0, aparencia: '' };
          levesPorId.set(o.id, l);
        }
        l.x = o.x;
        l.y = o.y;
        l.z = o.z;
        l.aparencia = o.chaveAparencia;
        leves.push(l);
      }
      if (levesPorId.size > outros.size * 2 + 8) levesPorId.clear();
      return leves;
    },
    /** Spec 026 (parte 3): quantos amigos andam de skate agora (o suporte da pista). */
    deSkate(): number {
      let n = 0;
      for (const o of outros.values()) if (o.chaveAparencia.includes('"skate":true')) n++;
      return n;
    },
    /** Para o minimapa e a seta que aponta para os amigos. */
    get lista() {
      return [...outros.values()].map((o) => ({
        id: o.id,
        apelido: o.apelido,
        /** Spec 021: a aparência passada a limpo, em texto (a foto da carinha). */
        aparencia: o.chaveAparencia,
        x: o.x,
        y: o.y,
        z: o.z,
        /** Movimento em curso no boneco do amigo (testes e diagnóstico). */
        golpeando: o.animador.vista().golpe !== null,
        /** Spec 015: gesto em curso e balão (testes). */
        gesto: gestoDoAnimador(o.animador),
        balao: o.balao?.gesto ?? null,
        acoes: o.acoes,
        /** Para onde o corpo está virado e para onde o amigo olha (rad). */
        yawCorpo: o.animador.yaw(),
        yawOlhar: o.yaw,
      }));
    },
  };
}
