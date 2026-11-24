import { describe, expect, it } from 'vitest';
import { aparenciaPadrao, type Aparencia, type PremiumVestido } from '../../src/personagem/aparencia';
import { planoBoneco } from '../../src/personagem/boneco';
import { oQueSai } from '../../src/personagem/tesouroEFantasia';
import { girar } from '../../src/personagem/bonecoPremium';
import { bracoDoTesouro } from '../../src/render/boneco';

/**
 * Spec 036 (T03): as peças dos tesouros novos no boneco e o que some debaixo delas (a regra
 * única `acessorioEscondido` da T01, ligada no plano).
 */
const plano = (a: Partial<Aparencia>, premium: PremiumVestido) =>
  planoBoneco({ ...aparenciaPadrao(), ...a, premium });
const nomes = (a: Partial<Aparencia>, premium: PremiumVestido) => plano(a, premium).pecas.map((p) => p.nome);

describe('036 T03: os tesouros novos no boneco', () => {
  it('cada tesouro novo põe as peças dele', () => {
    expect(nomes({}, { chapeu: 'bone-helice' })).toContain('bone-copa');
    expect(nomes({}, { roupa: 'pijama-nuvem' })).toContain('pijama-nuvem-peito');
    expect(nomes({}, { costas: 'asas-borboleta' })).toContain('borboleta-corpo');
    expect(nomes({}, { costas: 'mochila-foguete' })).toContain('foguete-corpo');
    expect(nomes({}, { mao: 'varinha-bolhas' })).toContain('varinha-aro');
    expect(nomes({}, { mao: 'guarda-chuva-gotinhas' })).toContain('guardachuva-gomo0');
    expect(nomes({}, { mao: 'pipa-lacinhos' })).toContain('pipa-laco0-1');
    expect(nomes({}, { bicho: 'passarinho-ombro' })).toContain('passaro-corpo');
  });

  it('os tesouros da mão vão na mão esquerda (a direita segura o item da barra)', () => {
    for (const mao of ['varinha-bolhas', 'guarda-chuva-gotinhas'])
      for (const p of plano({}, { mao }).pecas.filter((q) => /^(varinha|guardachuva)-/.test(q.nome)))
        expect(p.junta, p.nome).toBe('maoE');
    // a pipa voa do lado esquerdo, presa na mão esquerda pela linha
    const pipa = plano({}, { mao: 'pipa-lacinhos' }).pecas.find((p) => p.nome === 'pipa-a')!;
    expect(pipa.subjunta!.pivo[0]).toBeLessThan(0);
    // e o braço esquerdo segura no alto: a varinha e a pipa para cima; o guarda-chuva de lado, com
    // a mão acima do ombro, ao lado da cabeça (portão: o pano por cima vem do cabo, não do braço)
    for (const id of ['varinha-bolhas', 'pipa-lacinhos']) expect(bracoDoTesouro(id, 0)![0]).toBeLessThan(-1.5);
    expect(bracoDoTesouro('guarda-chuva-gotinhas', 0)![2]).toBeLessThan(-1.6);
    expect(bracoDoTesouro('passarinho-ombro', 0)).toBeNull();
  });

  it('o chapéu e o capuz do look somem debaixo do boné; a mochila debaixo das costas; a lanterna debaixo da mão', () => {
    expect(nomes({ acessorio: 'chapeu' }, {})).toContain('chapeu-aba');
    expect(nomes({ acessorio: 'chapeu' }, { chapeu: 'bone-helice' })).not.toContain('chapeu-aba');
    expect(nomes({ acessorio: 'mochila' }, { costas: 'mochila-foguete' })).not.toContain('mochila');
    expect(nomes({ acessorio: 'lanterna' }, {})).toContain('lanterna-alca');
    expect(nomes({ acessorio: 'lanterna' }, { mao: 'guarda-chuva-gotinhas' })).not.toContain('lanterna-alca');
    // (o que não briga continua: a lanterna fica com o boné)
    expect(nomes({ acessorio: 'lanterna' }, { chapeu: 'bone-helice' })).toContain('lanterna-alca');
  });

  it('pelas fotos: a tiara e o enfeite de cabeça saem com o boné; a faixa da testa fica debaixo dele', () => {
    const com = (id: string): Aparencia => ({ ...aparenciaPadrao(), fantasia: { id, cor: 0 } });
    for (const id of ['realeza-flores', 'realeza-mar', 'realeza-neve'])
      expect(oQueSai(com(id), {}, { premium: 'bone-helice' }).length, id).toBeGreaterThan(0);
    for (const id of ['roqueira-palco', 'danca-neon']) expect(oQueSai(com(id), {}, { premium: 'bone-helice' }), id).toEqual([]);
  });

  it('as asas de borboleta não encostam na cabeça nem no cabelo, batendo, em nenhum penteado', () => {
    const tocam: string[] = [];
    for (const corpo of ['feminino', 'masculino'] as const)
      for (let cabeloEstilo = 0; cabeloEstilo < 9; cabeloEstilo++) {
        const pl = plano({ corpo, cabeloEstilo }, { costas: 'asas-borboleta' });
        const jc = pl.juntas.cabeca.pos;
        // a cabeça e o cabelo em caixas (no espaço do tronco, um tico de folga)
        const caixas = pl.pecas
          .filter((p) => p.junta === 'cabeca' && p.forma !== 'placa' && !p.subjunta)
          .map((p) => {
            const h: [number, number, number] =
              p.forma === 'caixa'
                ? [p.tamanho[0] / 2, p.tamanho[1] / 2, p.tamanho[2] / 2]
                : p.forma === 'cilindro'
                  ? [p.tamanho[1], p.tamanho[0] / 2, p.tamanho[1]]
                  : [p.tamanho[0], p.tamanho[1], p.tamanho[2]];
            const c = [jc[0] + p.pos[0], jc[1] + p.pos[1], jc[2] + p.pos[2]];
            return { nome: p.nome, min: c.map((v, i) => v - h[i] - 0.01), max: c.map((v, i) => v + h[i] + 0.01) };
          });
        for (const a of [0.1, 0.35, 0.6])
          for (const p of pl.pecas.filter((q) => q.subjunta?.nome === 'borbE' || q.subjunta?.nome === 'borbD')) {
            const s = p.subjunta!.nome === 'borbD' ? 1 : -1;
            const pts: Array<[number, number, number]> = p.perfil
              ? p.perfil.map(([x, y]) => [x + p.pos[0], y + p.pos[1], p.pos[2]] as [number, number, number])
              : [[p.pos[0], p.pos[1] + p.tamanho[1], p.pos[2]]];
            for (const q of pts) {
              const g = girar(q, [0, s * a, s * 0.08]);
              const w = [g[0] + p.subjunta!.pivo[0], g[1] + p.subjunta!.pivo[1], g[2] + p.subjunta!.pivo[2]];
              const c = caixas.find((b) => w.every((v, i) => v > b.min[i] && v < b.max[i]));
              if (c) {
                tocam.push(`${corpo} cabelo ${cabeloEstilo}: ${p.nome} em ${c.nome}`);
                break;
              }
            }
          }
      }
    expect([...new Set(tocam)]).toEqual([]);
  });

  it('a mochila-foguete não tem a aleta do meio debaixo da janelinha (lia como nariz)', () => {
    const aletas = plano({}, { costas: 'mochila-foguete' }).pecas.filter((p) => p.nome.startsWith('foguete-aleta'));
    expect(aletas).toHaveLength(2);
    // as duas ficam dos lados, nunca no meio das costas do foguete
    for (const a of aletas) expect(Math.abs(a.pos[0])).toBeGreaterThan(0.1);
  });

  it('o pijama troca os sapatos pelas pantufas de nuvem', () => {
    const n = nomes({}, { roupa: 'pijama-nuvem' });
    expect(n.filter((x) => /^perna[ED]-sapato$/.test(x))).toHaveLength(2);
    expect(n.some((x) => x.startsWith('pernaE-pantufa'))).toBe(true);
  });
});
