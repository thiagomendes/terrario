/**
 * O Show da Vila na tela (spec 026): o que muda com o estado do núcleo.
 * - os estojos no chão (um por zona), brilhando até a criança passar por eles;
 * - os instrumentos no palco (guitarra-raio, teclado, baquetas) depois de achados;
 * - as três caixas do palco, apagadas ou acesas;
 * - o show: holofotes que varrem, o siga-me no vocalista, estrelinhas frias, fumaça rente ao
 *   chão, o palco piscando no chamado e, no acorde final, confete e estrelinhas douradas.
 *
 * Tudo só com o chão do palco desenhado (a regra do campo de visão). O desenho fino vem da
 * revisão visual (T12); aqui o jeito de ligar no estado.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { caixa, Pecas } from '../solidos';
import type { PlanoVila } from '../../world/vilaNeon';
import type { VilaVista, EventoVila } from '../../nucleo/vila';
import { faseDoShow } from '../../jogo/show';

export interface OpcoesShowVila {
  temMalha(cx: number, cz: number): boolean;
  brilha?(m: Mesh): void;
  tapaOGlow?(m: Mesh): void;
}

export interface ShowVila {
  quadro(t: number, vista: VilaVista | null, tempoNucleo: number, noite: number): void;
  evento(e: EventoVila): void;
  /** Testes: o que está à vista (estojos no chão, instrumentos e caixas acesas). */
  estado(): { estojos: number; instrumentos: number; caixasAcesas: number; fase: string | null };
  descartar(): void;
}

export function criarShowVila(scene: Scene, plano: PlanoVila, opcoes: OpcoesShowVila): ShowVila {
  const p = plano.pontos;
  const chunkTem = (x: number, z: number) =>
    opcoes.temMalha(Math.floor(x / 16), Math.floor(z / 16));
  const matCorpo = new StandardMaterial('vila-show-corpo', scene);
  matCorpo.specularColor = Color3.Black();
  const matLuz = new StandardMaterial('vila-show-luz', scene);
  matLuz.disableLighting = true;
  matLuz.emissiveColor = Color3.White();
  matLuz.diffuseColor = Color3.Black();
  const malha = (nome: string, pecas: Pecas, luz: boolean) => {
    const m = new Mesh(nome, scene);
    pecas.juntar().applyToMesh(m);
    m.material = luz ? matLuz : matCorpo;
    m.isPickable = false;
    m.setEnabled(false);
    if (luz) opcoes.brilha?.(m);
    else opcoes.tapaOGlow?.(m);
    return m;
  };
  // os estojos: caixa grafite com a faixa amarela e o raio vermelho
  const estojos = p.estojos.map(([x, y, z], i) => {
    const c = new Pecas();
    c.add(caixa(x - 0.45, x + 0.45, y, y + 0.32, z - 0.28, z + 0.28, 0.06, 0.06, '#3d3c48', 2));
    c.add(caixa(x - 0.4, x + 0.4, y + 0.14, y + 0.2, z - 0.29, z + 0.29, 0, 0, '#ffd23d', 1));
    c.add(caixa(x - 0.12, x + 0.12, y + 0.32, y + 0.4, z - 0.04, z + 0.04, 0, 0, '#24232a', 1));
    return malha(`vila-estojo-${i}`, c, false);
  });
  // as caixas acesas: a frente brilhando na cor do show
  const acesas = p.caixas.map(([x, y, z], i) => {
    const l = new Pecas();
    l.add(
      caixa(
        x + 0.1,
        x + 0.9,
        y + 0.1,
        y + 1.9,
        z - 0.04,
        z - 0.01,
        0,
        0,
        i === 1 ? '#2f8cff' : '#e8302a',
        1,
      ),
    );
    return malha(`vila-caixa-acesa-${i}`, l, true);
  });
  let fase: string | null = null;
  let insVistos = 0;
  return {
    quadro(t, vista, tempoNucleo) {
      const ins = vista?.ins ?? [false, false, false];
      insVistos = ins.filter(Boolean).length;
      estojos.forEach((m, i) => {
        const [x, , z] = p.estojos[i];
        const ver = !ins[i] && chunkTem(x, z);
        if (m.isEnabled() !== ver) m.setEnabled(ver);
        if (ver) m.position.y = Math.sin(t * 2.4 + i) * 0.04;
      });
      const cx = vista?.cx ?? [false, false, false];
      acesas.forEach((m, i) => {
        const [x, , z] = p.caixas[i];
        const ver = cx[i] && chunkTem(x, z);
        if (m.isEnabled() !== ver) m.setEnabled(ver);
      });
      fase = vista?.show ? faseDoShow(vista.show, tempoNucleo) : null;
    },
    evento() {
      // o plim, o acorde e a festa ficam com o som e a revisão visual (T12)
    },
    estado: () => ({
      estojos: estojos.filter((m) => m.isEnabled()).length,
      instrumentos: insVistos,
      caixasAcesas: acesas.filter((m) => m.isEnabled()).length,
      fase,
    }),
    descartar() {
      for (const m of [...estojos, ...acesas]) m.dispose();
      matCorpo.dispose();
      matLuz.dispose();
    },
  };
}
