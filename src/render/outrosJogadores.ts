/**
 * Os outros jogadores no mundo (spec 010): o personagem de cada um com a aparência que
 * escolheu, o apelido flutuando acima da cabeça, o item na mão e as animações de andar,
 * correr e voar. A posição chega 20 vezes por segundo e anda suave entre os quadros.
 */
import type { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { criarPersonagem } from './personagem';
import { criarAnimador } from '../player/animacao';
import { normalizarAparencia } from '../personagem/aparencia';
import { blocoDoItem } from '../jogo/itens';
import type { JogadorVisto, PerfilJogador } from '../nucleo/protocolo';

interface Outro {
  id: string;
  personagem: ReturnType<typeof criarPersonagem>;
  animador: ReturnType<typeof criarAnimador>;
  placa: Mesh;
  alvo: JogadorVisto;
  x: number;
  y: number;
  z: number;
  yaw: number;
  mao: string | null;
  apelido: string;
}

function desenharPlaca(scene: Scene, texto: string): Mesh {
  const tex = new DynamicTexture(`placa-${texto}`, { width: 256, height: 64 }, scene, false);
  tex.hasAlpha = true;
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = '700 34px system-ui, sans-serif';
  const w = Math.min(244, ctx.measureText(texto).width + 28);
  ctx.fillStyle = 'rgba(14, 10, 20, 0.72)';
  ctx.beginPath();
  ctx.roundRect((256 - w) / 2, 8, w, 48, 14);
  ctx.fill();
  ctx.fillStyle = '#fff4d8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 128, 33, 230);
  tex.update();
  const mat = new StandardMaterial(`placa-mat-${texto}`, scene);
  mat.diffuseTexture = tex;
  mat.emissiveColor = Color3.White();
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.backFaceCulling = false;
  const p = MeshBuilder.CreatePlane(`placa-${texto}`, { width: 1.6, height: 0.4 }, scene);
  p.material = mat;
  p.billboardMode = Mesh.BILLBOARDMODE_ALL;
  p.isPickable = false;
  // o apelido aparece mesmo atrás de folhas e paredes finas
  p.renderingGroupId = 1;
  return p;
}

export function criarOutrosJogadores(scene: Scene, semBrilho: (m: Mesh) => void) {
  const outros = new Map<string, Outro>();
  let perfis: Record<string, PerfilJogador> = {};

  function criar(v: JogadorVisto): Outro {
    const perfil = perfis[v.id];
    const apelido = perfil?.apelido ?? 'Amigo';
    const personagem = criarPersonagem(scene, normalizarAparencia(perfil?.aparencia ?? {}));
    const placa = desenharPlaca(scene, apelido);
    semBrilho(placa);
    return {
      id: v.id,
      personagem,
      animador: criarAnimador(),
      placa,
      alvo: v,
      x: v.x,
      y: v.y,
      z: v.z,
      yaw: v.yaw,
      mao: null,
      apelido,
    };
  }

  function descartar(o: Outro): void {
    o.personagem.descartar();
    o.placa.material?.dispose(true, true);
    o.placa.dispose();
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
          o.placa.material?.dispose(true, true);
          o.placa.dispose();
          o.placa = desenharPlaca(scene, novo.apelido);
          semBrilho(o.placa);
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
      for (const o of outros.values()) {
        const a = o.alvo;
        // longe demais (teleporte, renasceu): vai direto
        if (Math.abs(a.x - o.x) + Math.abs(a.y - o.y) + Math.abs(a.z - o.z) > 8) {
          o.x = a.x;
          o.y = a.y;
          o.z = a.z;
        } else {
          o.x += (a.x - o.x) * k;
          o.y += (a.y - o.y) * k;
          o.z += (a.z - o.z) * k;
        }
        let dy = a.yaw - o.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        o.yaw += dy * k;
        if (a.mao !== o.mao) {
          o.mao = a.mao;
          const b = blocoDoItem(a.mao);
          o.personagem.definirNaMao(b || null, !b && a.mao ? a.mao : null);
        }
        const pose = o.animador.atualizar(dt, {
          velocidadeHoriz: a.vel,
          correndo: a.correndo,
          noChao: a.noChao,
          voando: a.voando,
        });
        o.personagem.aplicarPose(pose, { dt, olhar: a.pitch, vista: o.animador.vista() });
        o.personagem.posicionar(o.x, o.y, o.z, o.yaw);
        o.personagem.definirLuz(luz);
        o.placa.position.set(o.x, o.y + 2.25, o.z);
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
      }));
    },
    /** O golpe (animação) quando o amigo quebra ou bate. */
    golpe(id: string) {
      outros.get(id)?.animador.evento('golpe');
    },
  };
}
