import { describe, expect, it } from 'vitest';
import { aparenciaPadrao, type Aparencia, type PremiumVestido } from '../../src/personagem/aparencia';
import { planoBoneco } from '../../src/personagem/boneco';
import { oQueSai } from '../../src/personagem/tesouroEFantasia';
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
    expect(nomes({}, { chapeu: 'bone-helice' })).toContain('bone-cupula');
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
    // e o braço esquerdo segura no alto
    for (const id of ['varinha-bolhas', 'guarda-chuva-gotinhas', 'pipa-lacinhos'])
      expect(bracoDoTesouro(id, 0)![0]).toBeLessThan(-1.5);
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

  it('o pijama troca os sapatos pelas pantufas de nuvem', () => {
    const n = nomes({}, { roupa: 'pijama-nuvem' });
    expect(n.filter((x) => /^perna[ED]-sapato$/.test(x))).toHaveLength(2);
    expect(n.some((x) => x.startsWith('pernaE-pantufa'))).toBe(true);
  });
});
