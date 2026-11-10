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
import { normalizarAparencia } from '../personagem/aparencia';
import { blocoDoItem } from '../jogo/itens';
import type { JogadorVisto, PerfilJogador } from '../nucleo/protocolo';

/** Apelido em HTML por cima do jogo: nítido em qualquer tela (sem desfoque do 3D). */
const CSS_ROTULO = `
.rotulo-amigo { position: fixed; left: 0; top: 0; z-index: 6; pointer-events: none;
  padding: 3px 12px; border-radius: 999px; background: rgba(255, 250, 240, 0.92); color: #3b2a1e;
  font: 800 14px var(--jogo, system-ui), sans-serif; white-space: nowrap; will-change: transform;
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.35), 0 4px 10px rgba(40, 25, 10, 0.2); }
.rotulo-amigo[hidden] { display: none; }
body[data-overlay] .rotulo-amigo, body.modo-foto .rotulo-amigo, body.tela-titulo .rotulo-amigo { display: none; }
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
  apelido: string;
  /** Últimos contadores de golpe, colocação e comida vistos (null antes do primeiro). */
  acoes: [number, number, number] | null;
}

export function criarOutrosJogadores(scene: Scene) {
  const ponto = new Vector3();
  const tela = new Vector3();
  const outros = new Map<string, Outro>();
  let perfis: Record<string, PerfilJogador> = {};

  function criar(v: JogadorVisto): Outro {
    const perfil = perfis[v.id];
    const apelido = perfil?.apelido ?? 'Amigo';
    const personagem = criarPersonagem(scene, normalizarAparencia(perfil?.aparencia ?? {}));
    const placa = criarRotulo(apelido);
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
      acoes: null,
      apelido,
    };
  }

  function descartar(o: Outro): void {
    o.personagem.descartar();
    o.placa.remove();
  }

  return {
    /** Apelidos e aparências (chegam quando alguém entra ou muda). */
    definirPerfis(p: Record<string, PerfilJogador>) {
      perfis = p;
      for (const o of outros.values()) {
        const novo = perfis[o.id];
        if (!novo) continue;
        o.personagem.aplicarAparencia(normalizarAparencia(novo.aparencia));
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
    atualizar(dt: number, luz: number) {
      const k = Math.min(1, dt * 14);
      const cam = scene.activeCamera;
      const motor = scene.getEngine();
      const canvas = motor.getRenderingCanvas();
      const larg = motor.getRenderWidth();
      const alt = motor.getRenderHeight();
      const vista = cam?.viewport.toGlobal(larg, alt);
      const transform = scene.getTransformMatrix();
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
        let dy = a.yaw - o.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        o.yaw += dy * k;
        if (a.mao !== o.mao) {
          o.mao = a.mao;
          const b = blocoDoItem(a.mao);
          o.personagem.definirNaMao(b || null, !b && a.mao ? a.mao : null);
        }
        // o amigo golpeou, colocou um bloco ou comeu: o mesmo movimento do boneco dele
        if (a.acoes) {
          const antes = o.acoes;
          if (antes) {
            if (a.acoes[0] > antes[0]) o.animador.evento('golpe');
            if (a.acoes[1] > antes[1]) o.animador.evento('colocacao');
            if (a.acoes[2] > antes[2]) o.animador.evento('comer');
          }
          o.acoes = [a.acoes[0], a.acoes[1], a.acoes[2]];
        }
        const va = o.animador.vista();
        const agindo = va.golpe !== null || va.colocar !== null;
        const pose = o.animador.atualizar(dt, {
          velocidadeHoriz: a.vel,
          correndo: a.correndo,
          noChao: a.noChao,
          voando: a.voando,
          vx: o.vx,
          vz: o.vz,
          // minerando ou construindo, vira para onde o amigo olha (o bloco dele)
          alvoYaw: agindo ? o.yaw : null,
          olharYaw: o.yaw,
        });
        o.personagem.aplicarPose(pose, { dt, olhar: a.pitch, vista: o.animador.vista() });
        o.personagem.posicionar(o.x, o.y, o.z, o.animador.yaw());
        o.personagem.definirLuz(luz);
        // apelido acima da cabeça, projetado na tela (some atrás da câmera e muito longe)
        let mostrar = false;
        if (cam && vista && canvas) {
          ponto.set(o.x, o.y + 2.2, o.z);
          const dist = Vector3.Distance(cam.globalPosition, ponto);
          Vector3.ProjectToRef(ponto, Matrix.IdentityReadOnly, transform, vista, tela);
          if (tela.z > 0 && tela.z < 1 && dist < 64) {
            const r = canvas.getBoundingClientRect();
            const x = r.left + (tela.x / larg) * r.width;
            const y = r.top + (tela.y / alt) * r.height;
            const e = o.placa;
            e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
            e.style.opacity = String(dist > 40 ? Math.max(0.35, 1 - (dist - 40) / 30) : 1);
            mostrar = true;
          }
        }
        if (o.placa.hidden === mostrar) o.placa.hidden = !mostrar;
      }
    },
    /** Para o minimapa e a seta que aponta para os amigos. */
    get lista() {
      return [...outros.values()].map((o) => ({
        id: o.id,
        apelido: o.apelido,
        x: o.x,
        y: o.y,
        z: o.z,
        /** Movimento em curso no boneco do amigo (testes e diagnóstico). */
        golpeando: o.animador.vista().golpe !== null,
        acoes: o.acoes,
        /** Para onde o corpo está virado e para onde o amigo olha (rad). */
        yawCorpo: o.animador.yaw(),
        yawOlhar: o.yaw,
      }));
    },
  };
}
