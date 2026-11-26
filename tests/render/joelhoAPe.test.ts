import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { criarBoneco, dadosDaPeca } from '../../src/render/boneco';
import { normalizarAparencia, aparenciaPadrao, IDS_MODELOS } from '../../src/personagem/aparencia';
import { planoBoneco } from '../../src/personagem/boneco';
import { calcularPose, type Pose } from '../../src/personagem/poses';
import { GESTOS, aplicarGesto, aplicarJuntas } from '../../src/personagem/gestos';
import { IDS_ANDAR, temPes, vestirBrinquedoAndar } from '../../src/personagem/brinquedoAndar';
import { medidaDaPerna } from '../../src/personagem/joelho';
import '../../src/temas/todos';

/**
 * Spec 038 (T02):
 * - **a pé com o brinquedo vestido nada muda:** a sola e a ponta do sapato ficam onde estão hoje
 *   (sem brinquedo) ao andar, correr, pular, sentar no parque e fazer os gestos;
 * - **a bandeirinha não treme:** a 20 quadros por segundo, arrancando, andando e parando, nenhum
 *   salto de ângulo de um quadro para o outro passa de 0,15 rad;
 * - **o custo:** cada brinquedo com no máximo 10 mil triângulos; montada, no máximo +7 malhas
 *   (+8 no carrinho) sobre o mesmo boneco a pé sem brinquedo; a pé com brinquedo de pedal vestido,
 *   no máximo +2 (o joelho).
 */
function atualizar(no: TransformNode): void {
  const cadeia: TransformNode[] = [];
  for (let n: TransformNode | null = no; n; n = n.parent as TransformNode | null) cadeia.unshift(n);
  for (const n of cadeia) n.computeWorldMatrix(true);
}
const no = (scene: Scene, nome: string) => scene.getTransformNodeByName(nome) as TransformNode | null;

/** As poses de quem anda a pé (o andar, a corrida, o pulo, sentada no parque e os gestos). */
function poses(): Array<{ nome: string; pose: Pose }> {
  const base = { andando: false, correndo: false, noAr: false, minerando: false, colocando: false, tempo: 0 };
  const lista: Array<{ nome: string; pose: Pose }> = [{ nome: 'parado', pose: calcularPose(base) }];
  for (let i = 0; i < 8; i++) {
    const fase = (i / 8) * Math.PI * 2;
    lista.push({ nome: `andar ${i}`, pose: calcularPose({ ...base, andando: true, passo: { fase, amplitude: 0.55 } }) });
    lista.push({ nome: `correr ${i}`, pose: calcularPose({ ...base, andando: true, correndo: true, passo: { fase, amplitude: 0.85 }, inclina: 0.2 }) });
  }
  lista.push({ nome: 'pulo', pose: calcularPose({ ...base, noAr: true }) });
  lista.push({ nome: 'sentada', pose: aplicarJuntas(calcularPose(base), { pernaD: -1.5, pernaE: -1.5, corpoY: -0.3 }, 1) });
  for (const g of GESTOS) lista.push({ nome: g.id, pose: aplicarGesto(calcularPose({ ...base, tempo: 0.7 }), g.id, 0.7) });
  return lista;
}

/** A sola (o meio e a ponta) de cada pé no mundo. */
function pes(scene: Scene, prefixo: string, quadril: number, coxa: number): Vector3[] {
  const r: Vector3[] = [];
  for (const lado of ['E', 'D']) {
    const joelho = no(scene, `${prefixo}-junta-joelho${lado}`);
    const perna = no(scene, `${prefixo}-junta-perna${lado}`)!;
    const alvo = joelho ?? perna;
    atualizar(alvo);
    const y = joelho ? -(quadril - coxa) : -quadril;
    for (const z of [0.03, 0.17]) r.push(Vector3.TransformCoordinates(new Vector3(0, y, z), alvo.getWorldMatrix()));
  }
  return r;
}

describe('spec 038 (T02): a pé com o brinquedo vestido, nada muda', () => {
  for (const id of IDS_ANDAR.filter((i) => temPes(i)))
    it(`${id}: a sola e a ponta do sapato ficam onde estão hoje`, () => {
      const ruins: string[] = [];
      for (const modelo of [IDS_MODELOS[0], IDS_MODELOS[2], IDS_MODELOS[3]]) {
        const scene = new Scene(new NullEngine());
        const semBrinquedo = normalizarAparencia({ ...aparenciaPadrao(modelo) });
        const comBrinquedo = normalizarAparencia({ ...aparenciaPadrao(modelo), premium: { andar: id } });
        const { quadril, coxa } = medidaDaPerna(planoBoneco(comBrinquedo));
        const a = criarBoneco(scene, semBrinquedo, 'a', undefined, true, true);
        const b = criarBoneco(scene, comBrinquedo, 'b', undefined, true, true);
        expect(no(scene, 'b-junta-joelhoE')).not.toBeNull();
        for (const { nome, pose } of poses()) {
          for (const x of [a, b]) {
            x.aplicarPose(pose);
            x.posicionar(1, 2, 3, 0.4);
          }
          const pa = pes(scene, 'a', quadril, 0);
          const pb = pes(scene, 'b', quadril, coxa);
          for (let i = 0; i < pa.length; i++) {
            const d = Vector3.Distance(pa[i], pb[i]);
            if (d > 1e-4) ruins.push(`${modelo} ${nome} ${i}: ${d.toFixed(4)}`);
          }
        }
        scene.dispose();
      }
      expect(ruins.slice(0, 6)).toEqual([]);
    });
});

describe('spec 038 (T02): a bandeirinha do carrinho', () => {
  /** Anda o carrinho quadro a quadro: parada, arranca, anda, corre, freia e para de novo. */
  const passadaNo = (i: number) => (i < 60 ? 0 : i < 160 ? 1 : i < 240 ? 1.5 : i < 260 ? 0.3 : 0);
  const quadro = (b: ReturnType<typeof criarBoneco>, i: number, dt: number) => {
    const t = i * dt;
    const passada = passadaNo(i);
    b.aplicarPose(calcularPose({ andando: passada > 0, correndo: false, noAr: false, minerando: false, colocando: false, tempo: t }), {
      dt,
      olhar: 0,
      vista: { tempo: t, passada, golpe: null, colocar: null, noAr: 0, comer: null },
    });
  };

  it('parada, aponta para o lado e quase não mexe; andando, o pano vai para trás e tremula; a 20 quadros por segundo, nada salta mais que 0,15 rad', () => {
    const scene = new Scene(new NullEngine());
    const b = criarBoneco(scene, normalizarAparencia({ premium: { andar: 'carrinho-pedal' }, montado: true }), 'p', undefined, true, true);
    const bandeira = no(scene, 'p-junta-andarBandeira')!;
    expect(bandeira).not.toBeNull();
    let antes: number | null = null;
    let maiorSalto = 0;
    const parada = { min: Infinity, max: -Infinity };
    const andando = { min: Infinity, max: -Infinity };
    const dt = 1 / 20;
    for (let i = 0; i < 400; i++) {
      quadro(b, i, dt);
      const y = bandeira.rotation.y;
      if (antes !== null) maiorSalto = Math.max(maiorSalto, Math.abs(y - antes));
      antes = y;
      const faixa = i >= 30 && i < 60 ? parada : i >= 120 && i < 240 ? andando : null;
      if (faixa) {
        faixa.min = Math.min(faixa.min, y);
        faixa.max = Math.max(faixa.max, y);
      }
    }
    expect(maiorSalto).toBeLessThanOrEqual(0.15);
    // parada: para o lado (-90°), quase quieta
    expect(Math.abs((parada.min + parada.max) / 2 + Math.PI / 2)).toBeLessThan(0.05);
    expect(parada.max - parada.min).toBeLessThan(0.1);
    // andando: o pano girou de 70° a 90° para trás e tremula um pouco por cima
    const giro = (andando.min + andando.max) / 2 + Math.PI / 2;
    expect(giro).toBeGreaterThan((70 * Math.PI) / 180);
    expect(giro).toBeLessThan((95 * Math.PI) / 180);
    expect(andando.max - andando.min).toBeGreaterThan(0.08);
    expect(andando.max - andando.min).toBeLessThan(0.3);
    scene.dispose();
  });

  it.each(['capa-estrelas', 'asas-borboleta', 'mochila-foguete', 'dragao'])('o pano não encosta na cabeça nem no tesouro das costas (%s), parada e andando', (costas) => {
    const ruins: string[] = [];
    for (const corpo of ['feminino', 'masculino'] as const) {
      const scene = new Scene(new NullEngine());
      const cat = costas === 'dragao' ? 'fantasia' : 'costas';
      const b = criarBoneco(scene, normalizarAparencia({ corpo, premium: { andar: 'carrinho-pedal', [cat]: costas }, montado: true }), 'p', undefined, true, true);
      const pano = scene.meshes.filter((m) => /^p-andarBandeira-fundida$/.test(m.name));
      expect(pano.length).toBe(1);
      // tudo o que é do boneco: a cabeça, o cabelo, o tronco, a capa, as asas e a mochila
      const doBoneco = b.raiz.getChildMeshes(false).filter((m) => m.isEnabled() && !/(andar|brinquedo|joelho|perna|prancha)/.test(m.name));
      for (let i = 0; i < 300; i += 1) {
        quadro(b, i, 1 / 20);
        if (i % 10) continue;
        const pts = (m: (typeof pano)[number]) => {
          atualizar(m);
          const pos = m.getVerticesData('position')!;
          const r: Vector3[] = [];
          for (let k = 0; k < pos.length; k += 3) r.push(Vector3.TransformCoordinates(new Vector3(pos[k], pos[k + 1], pos[k + 2]), m.getWorldMatrix()));
          return r;
        };
        // (a caixa do pano no espaço dele mesmo: fina e do tamanho dele, girando junto)
        const flag = pano[0];
        atualizar(flag);
        const paraPano = flag.getWorldMatrix().clone().invert();
        const local = flag.getVerticesData('position')!;
        const mn = new Vector3(Infinity, Infinity, Infinity);
        const mx = new Vector3(-Infinity, -Infinity, -Infinity);
        for (let k = 0; k < local.length; k += 3) {
          const v = new Vector3(local[k], local[k + 1], local[k + 2]);
          mn.minimizeInPlace(v);
          mx.maximizeInPlace(v);
        }
        const folga = 0.02;
        for (const m of doBoneco) {
          const q = pts(m as (typeof pano)[number]).map((v) => Vector3.TransformCoordinates(v, paraPano));
          const dentro = q.some(
            (v) => v.x > mn.x - folga && v.x < mx.x + folga && v.y > mn.y - folga && v.y < mx.y + folga && v.z > mn.z - folga && v.z < mx.z + folga,
          );
          if (dentro) ruins.push(`${corpo} quadro ${i}: ${m.name}`);
        }
      }
      scene.dispose();
    }
    expect([...new Set(ruins)].slice(0, 6)).toEqual([]);
  });
});

describe('spec 038 (T02): o custo dos brinquedos de pedal', () => {
  const acesas = (b: ReturnType<typeof criarBoneco>) => b.raiz.getChildMeshes(false).filter((m) => m.isEnabled()).length;
  it.each(IDS_ANDAR.filter((i) => temPes(i)))('%s: até 10 mil triângulos; montada +7 malhas (+8 no carrinho); a pé com ele, +2', (id) => {
    const lista: Parameters<typeof vestirBrinquedoAndar>[1] = [];
    vestirBrinquedoAndar(id, lista);
    let tri = 0;
    for (const p of lista) tri += (dadosDaPeca(p).indices?.length ?? 0) / 3;
    expect(tri).toBeLessThanOrEqual(10_000);
    const scene = new Scene(new NullEngine());
    const aPe = criarBoneco(scene, normalizarAparencia({}), 'a', undefined, true, true);
    const vestido = criarBoneco(scene, normalizarAparencia({ premium: { andar: id } }), 'b', undefined, true, true);
    const montada = criarBoneco(scene, normalizarAparencia({ premium: { andar: id }, montado: true }), 'c', undefined, true, true);
    const teto = id === 'carrinho-pedal' ? 8 : 7;
    expect(acesas(vestido) - acesas(aPe)).toBeLessThanOrEqual(2);
    expect(acesas(montada) - acesas(aPe)).toBeLessThanOrEqual(teto);
    scene.dispose();
  });
});
