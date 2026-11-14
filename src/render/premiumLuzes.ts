/**
 * Spec 023 (T10): as luzes dos premium, uma vez por cena para todos os bonecos (o da criança e
 * os dos amigos usam os mesmos materiais): a faixa do tênis que corre o arco-íris, o ouro que
 * pulsa, a pérola das bordas da camiseta, as estrelas da capa piscando em três tempos e o
 * chifre do unicórnio. E a textura das listras da camiseta, que correm devagar.
 *
 * Um só observador por cena anima tudo (o custo não cresce com quantos amigos vestem).
 * Luz é luz: não segue a luz do lugar (à noite e na caverna, o tênis continua aceso).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { IdLuzPremium } from '../personagem/boneco';

/** As sete cores do arco-íris dos premium (as mesmas em todo lugar). */
export const ARCO_PREMIUM = [
  '#ff4f6d',
  '#ff9a3c',
  '#ffd93d',
  '#4fdc7a',
  '#3cc4ff',
  '#7d6bff',
  '#e46bff',
] as const;

interface LuzesDaCena {
  mats: Partial<Record<IdLuzPremium, StandardMaterial>>;
  listras: DynamicTexture | null;
  t: number;
}

const porCena = new WeakMap<Scene, LuzesDaCena>();

/** A cor base de cada luz (a animação passeia em volta dela). */
const BASE: Record<IdLuzPremium, string> = {
  arco: '#ff4f6d',
  ouro: '#ffd25a',
  perola: '#fff4fb',
  estrela0: '#fff3b0',
  estrela1: '#fff3b0',
  estrela2: '#fff3b0',
  chifre: '#fff1a8',
};

function daCena(scene: Scene): LuzesDaCena {
  let d = porCena.get(scene);
  if (d) return d;
  const nova: LuzesDaCena = { mats: {}, listras: null, t: 0 };
  d = nova;
  porCena.set(scene, nova);
  const cor = new Color3();
  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
    nova.t += dt;
    const t = nova.t;
    const m = nova.mats;
    if (m.arco) {
      // a faixa corre o arco-íris inteiro em 2,6 s, sempre bem acesa
      Color3.HSVtoRGBToRef((t * 140) % 360, 0.62, 1, cor);
      m.arco.emissiveColor.copyFrom(cor).scaleInPlace(1.25);
    }
    if (m.ouro) {
      const p = 0.82 + 0.18 * Math.sin(t * 2.4);
      m.ouro.emissiveColor.set(1 * p, 0.82 * p, 0.36 * p);
    }
    if (m.perola) {
      // a pérola respira com um fio de rosa e de azul
      const k = Math.sin(t * 1.3);
      m.perola.emissiveColor.set(0.96 + 0.04 * k, 0.9, 0.97 - 0.05 * k);
    }
    for (let i = 0; i < 3; i++) {
      const e = m[`estrela${i}` as IdLuzPremium];
      if (!e) continue;
      // cada grupo pisca no seu tempo: acende forte, fica, apaga devagar até a brasa
      const f = (t * 0.55 + i / 3) % 1;
      const acesa = f < 0.12 ? f / 0.12 : f < 0.3 ? 1 : Math.max(0, 1 - (f - 0.3) / 0.45);
      const v = 0.38 + 0.9 * acesa;
      e.emissiveColor.set(v, v * 0.95, v * 0.66);
    }
    if (m.chifre) {
      // acima de 1: passa do tom do pós-processo e acende (lê a 12 blocos)
      const p = 1.45 + 0.3 * Math.sin(t * 3.1);
      m.chifre.emissiveColor.set(p, p * 0.86, p * 0.5);
    }
    if (nova.listras) nova.listras.vOffset = (t * 0.09) % 1;
  });
  scene.onDisposeObservable.addOnce(() => {
    scene.onBeforeRenderObservable.remove(obs);
    porCena.delete(scene);
  });
  return nova;
}

/** O material de luz própria (o mesmo para todos os bonecos da cena). */
export function luzPremium(scene: Scene, id: IdLuzPremium): StandardMaterial {
  const d = daCena(scene);
  let m = d.mats[id];
  if (m) return m;
  m = new StandardMaterial(`premium-luz-${id}`, scene);
  m.disableLighting = true;
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  m.emissiveColor = Color3.FromHexString(BASE[id]);
  d.mats[id] = m;
  return m;
}

/**
 * As listras da camiseta arco-íris (a mesma textura para todos, correndo para cima). Cada
 * faixa tem o meio vivo e uma borda clarinha, como fita de cetim; as cores se fundem de leve.
 */
export function texturaListras(scene: Scene): Texture {
  const d = daCena(scene);
  if (d.listras) return d.listras;
  const W = 16;
  const H = 448;
  const t = new DynamicTexture('premium-listras', { width: W, height: H }, scene, true);
  const c = t.getContext() as unknown as CanvasRenderingContext2D;
  const faixa = H / ARCO_PREMIUM.length;
  ARCO_PREMIUM.forEach((cor, i) => {
    const y = i * faixa;
    const g = c.createLinearGradient(0, y, 0, y + faixa);
    g.addColorStop(0, cor);
    g.addColorStop(0.5, cor);
    g.addColorStop(1, cor);
    c.fillStyle = g;
    c.fillRect(0, y, W, faixa);
    // o fio de cetim (claro) no alto de cada faixa
    c.fillStyle = 'rgba(255,255,255,0.38)';
    c.fillRect(0, y + 2, W, 5);
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.fillRect(0, y + 7, W, 4);
  });
  t.wrapU = Texture.WRAP_ADDRESSMODE;
  t.wrapV = Texture.WRAP_ADDRESSMODE;
  t.update();
  d.listras = t;
  return t;
}
