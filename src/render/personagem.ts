import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { Aparencia } from '../personagem/aparencia';
import type { Pose } from '../personagem/poses';
import type { Vista } from '../player/animacao';
import { criarBoneco } from './boneco';
import { efeitosPremium, type RegistroPremium } from './premiumMundo';

/** Dados extras para suavizar a pose do corpo. */
export interface ExtrasPose {
  dt: number;
  /** Pitch do olhar: a cabeça acompanha (e o braço mira no golpe). */
  olhar: number;
  vista: Vista;
}

/** Limite de peças do personagem de caixas (plano de modelo.ts, usado nos retratos). */
export const MAXIMO_MALHAS_PERSONAGEM = 12;

export interface Personagem {
  raiz: TransformNode;
  aplicarAparencia(aparencia: Aparencia): void;
  /**
   * Spec 036 (T04): monta ou desce do brinquedo de andar já vestido, sem refazer o boneco (só
   * acende o brinquedo e troca a pose). Sem brinquedo vestido, não faz nada.
   */
  definirMontado?(montado: boolean): void;
  /** Spec 036 (T04): a criança está montada agora (no desenho)? */
  montado?(): boolean;
  aplicarPose(pose: Pose, extras?: ExtrasPose): void;
  posicionar(x: number, y: number, z: number, yaw: number): void;
  definirVisivel(visivel: boolean): void;
  /**
   * Spec 027 (T22): o boneco de longe (menos gomos, as mesmas peças e os mesmos ossos), só nos
   * bonecos com esqueleto (os moradores). Devolve false quando não há boneco de longe.
   */
  definirLonge?(sim: boolean): boolean;
  /** Spec 027 (T22): é o boneco de longe que aparece agora? */
  deLonge?(): boolean;
  /**
   * Meio transparente quando a câmera chega perto demais (spec 015). Só mexe nas malhas
   * quando o valor muda; 1 volta ao desenho normal, sem custo de transparência.
   */
  definirOpacidade(a: number): void;
  opacidade(): number;
  definirLuz(f: number): void;
  /** O que a mão direita segura (`qtd`: a pilha; a sacola de doces mostra quantos restam). */
  definirNaMao(bloco: number | null, item: string | null, qtd?: number): void;
  /** Spec 032: o nó da mão direita (a comida mordida e o lanche da entrega vão nele). */
  noDaMao(): TransformNode;
  /** Spec 032: a cabeça e a boca nela (+z é a frente do rosto): a comida para na frente da boca. */
  boca(): { no: TransformNode; pos: [number, number, number] };
  /** Spec 032: a mão segura outra coisa por um tempo (o item de sempre some até soltar). */
  ocuparMao(ocupada: boolean): void;
  /** Spec 032: os plásticos do boneco (a comida mordida acende com a mesma luz). */
  plasticos(): import('./formas').Plasticos;
  contarMalhas(): number;
  /** Peças do item na mão (0 com a mão vazia). */
  contarMalhasMao(): number;
  descartar(): void;
  /** Spec 023: o puf de brilho ao vestir um premium (só no personagem do jogo). */
  festaPremium?(): void;
  /** Spec 023: o bichinho premium que segue (testes). */
  bichoPremium?(): ReturnType<RegistroPremium['bicho']>;
  /** Spec 037: de dentro, a mão da frente (as bolhas da varinha saem do aro dela). */
  maoDeDentro?(f: (() => TransformNode | null) | null): void;
}

/**
 * O personagem do jogo: o boneco de brinquedo (spec 012). Desde a spec 015 ele aparece o
 * tempo todo (só terceira pessoa): as peças da mesma junta e do mesmo material são fundidas
 * numa malha só, como nos moradores (menos desenhos por quadro; trocar a aparência remonta).
 */
export function criarPersonagem(scene: Scene, aparencia: Aparencia): Personagem {
  const p = criarBoneco(scene, aparencia, 'personagem', undefined, true, true);
  // spec 023: o que os premium fazem no mundo (pegadas, brilhos, o bichinho que segue)
  const efeitos = efeitosPremium(scene).registrar(p.raiz, aparencia.premium);
  return {
    ...p,
    aplicarAparencia(a) {
      p.aplicarAparencia(a);
      efeitos.vestir(a.premium);
    },
    definirLuz(f) {
      p.definirLuz(f);
      efeitos.definirLuz(f);
    },
    definirVisivel(v) {
      p.definirVisivel(v);
      efeitos.definirVisivel(v);
    },
    festaPremium: () => efeitos.festa(),
    maoDeDentro: (f) => efeitos.maoDeDentro(f),
    bichoPremium: () => efeitos.bicho(),
    descartar() {
      efeitos.soltar();
      p.descartar();
    },
  };
}
