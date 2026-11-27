import { describe, expect, it } from 'vitest';
import {
  aparenciaPadrao,
  manterMontado,
  normalizarAparencia,
  type Aparencia,
} from '../../src/personagem/aparencia';
import {
  brinquedoMontado,
  criarBrinquedosDeTema,
  motivoSemMontar,
  podeMontar,
  precisaDescer,
  type SituacaoMontar,
} from '../../src/personagem/montar';
import {
  carregarAparencia,
  salvarAparencia,
  CHAVE_APARENCIA,
} from '../../src/personagem/persistencia';
import { IDS_ANDAR } from '../../src/personagem/brinquedoAndar';

const comBrinquedo = (extra: Partial<Aparencia> = {}): Aparencia => ({
  ...aparenciaPadrao(),
  premium: { andar: 'bicicletinha' },
  ...extra,
});

const situacao = (extra: Partial<SituacaoMontar> = {}): SituacaoMontar => ({
  aparencia: comBrinquedo(),
  brinquedos: [],
  dentroDeCasa: false,
  nadando: false,
  voando: false,
  desmaiada: false,
  provador: false,
  modoFoto: false,
  ...extra,
});

function memoria() {
  const m = new Map<string, string>();
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('036: o montado na aparência', () => {
  it('só com o brinquedo de andar vestido, sem patins nem skate, e só o sim', () => {
    expect(normalizarAparencia(comBrinquedo({ montado: true })).montado).toBe(true);
    expect('montado' in normalizarAparencia({ ...aparenciaPadrao(), montado: true })).toBe(false);
    expect('montado' in normalizarAparencia(comBrinquedo({ patins: true, montado: true }))).toBe(false);
    expect('montado' in normalizarAparencia(comBrinquedo({ skate: true, montado: true }))).toBe(false);
    for (const lixo of [1, 'sim', {}, false])
      expect('montado' in normalizarAparencia({ ...comBrinquedo(), montado: lixo })).toBe(false);
    // o brinquedo que não é de andar não monta
    expect(
      'montado' in normalizarAparencia({ ...aparenciaPadrao(), premium: { andar: 'pinguim' }, montado: true }),
    ).toBe(false);
    // sem montar, a aparência de antes sai igual (o campo não existe)
    expect('montado' in normalizarAparencia(comBrinquedo())).toBe(false);
  });

  it('nunca vai salvo; quem carrega entra a pé (com o brinquedo vestido)', () => {
    const loja = memoria();
    expect(salvarAparencia(loja, normalizarAparencia(comBrinquedo({ montado: true })))).toBe(true);
    expect(loja.m.get(CHAVE_APARENCIA)).not.toContain('montado');
    // um guardado de fora (outro aparelho, um teste) com o montado: apaga ao carregar
    loja.m.set(
      CHAVE_APARENCIA,
      JSON.stringify({ versao: 1, aparencia: comBrinquedo({ montado: true }) }),
    );
    const a = carregarAparencia(loja);
    expect(a.premium?.andar).toBe('bicicletinha');
    expect('montado' in a).toBe(false);
  });

  it('o definir de quem não sabe do brinquedo mantém o montado, como os patins', () => {
    const montada = normalizarAparencia(comBrinquedo({ montado: true }));
    // "Meus tesouros" veste o boné: a aparência nova vem sem o montado e continua montada
    const nova = normalizarAparencia({ ...montada, premium: { ...montada.premium, chapeu: 'bone-helice' }, montado: undefined });
    expect(manterMontado(true, nova).montado).toBe(true);
    // trocar de brinquedo continua montada no novo
    expect(manterMontado(true, normalizarAparencia({ ...nova, premium: { andar: 'nuvem-fofa' } })).montado).toBe(true);
    // tirar o brinquedo desce
    expect('montado' in manterMontado(true, normalizarAparencia({ ...nova, premium: { chapeu: 'bone-helice' } }))).toBe(false);
    // de patins, desce
    expect('montado' in manterMontado(true, { ...nova, patins: true })).toBe(false);
    // a pé, quem não sabe do brinquedo não monta (só montar e descer mudam o montado)
    expect('montado' in manterMontado(false, normalizarAparencia(comBrinquedo({ montado: true })))).toBe(false);
    // nada muda: o mesmo objeto
    expect(manterMontado(true, montada)).toBe(montada);
  });
});

describe('036: o "pode montar"', () => {
  it('a pé, com o brinquedo vestido: pode', () => {
    expect(motivoSemMontar(situacao())).toBeNull();
    expect(podeMontar(situacao())).toBe(true);
  });

  it('cada impedimento da spec tem o seu motivo', () => {
    const casos: [Partial<SituacaoMontar>, string][] = [
      [{ aparencia: aparenciaPadrao() }, 'sem-brinquedo'],
      [{ aparencia: { ...aparenciaPadrao(), premium: { bicho: 'pinguim' } } }, 'sem-brinquedo'],
      [{ aparencia: comBrinquedo({ patins: true }) }, 'patins'],
      [{ aparencia: comBrinquedo({ skate: true }) }, 'skate'],
      [{ brinquedos: ['carrossel'] }, 'brinquedo'],
      [{ dentroDeCasa: true }, 'casa'],
      [{ nadando: true }, 'nadando'],
      [{ voando: true }, 'voando'],
      [{ desmaiada: true }, 'desmaiada'],
      [{ provador: true }, 'provador'],
      [{ modoFoto: true }, 'foto'],
    ];
    for (const [extra, motivo] of casos) {
      expect(motivoSemMontar(situacao(extra)), motivo).toBe(motivo);
      expect(podeMontar(situacao(extra)), motivo).toBe(false);
    }
  });

  it('montada, desce sozinha quando deixa de poder; a pé, nada a descer', () => {
    const montada = comBrinquedo({ montado: true });
    expect(precisaDescer(situacao({ aparencia: montada }))).toBe(false);
    expect(precisaDescer(situacao({ aparencia: montada, brinquedos: ['roda-gigante'] }))).toBe(true);
    expect(precisaDescer(situacao({ aparencia: montada, nadando: true }))).toBe(true);
    // o modo foto não faz descer (a foto em cima do brinquedo); só não deixa montar
    expect(precisaDescer(situacao({ aparencia: montada, modoFoto: true }))).toBe(false);
    expect(podeMontar(situacao({ modoFoto: true }))).toBe(false);
    // com outro motivo junto, desce
    expect(precisaDescer(situacao({ aparencia: montada, modoFoto: true, voando: true }))).toBe(true);
    expect(precisaDescer(situacao({ brinquedos: ['roda-gigante'] }))).toBe(false);
    expect(brinquedoMontado(montada)).toBe('bicicletinha');
    expect(brinquedoMontado(comBrinquedo())).toBeNull();
  });

  it('voando: a nuvem fofa voa junto (não desce nem impede montar); os brinquedos de chão desmontam', () => {
    for (const andar of IDS_ANDAR) {
      const montada = comBrinquedo({ premium: { andar }, montado: true });
      const voa = andar === 'nuvem-fofa';
      expect(precisaDescer(situacao({ aparencia: montada, voando: true })), andar).toBe(!voa);
      expect(podeMontar(situacao({ aparencia: comBrinquedo({ premium: { andar } }), voando: true })), andar).toBe(voa);
      // os outros motivos continuam valendo para a nuvem
      expect(precisaDescer(situacao({ aparencia: montada, voando: true, nadando: true })), andar).toBe(true);
    }
  });

  it('cada brinquedo de tema se registra, e o "pode montar" passa a valer para ele', () => {
    const tema = criarBrinquedosDeTema();
    let noCarrossel = false;
    let guiando = false;
    tema.registrar('carrossel', () => noCarrossel);
    const tirar = tema.registrar('bate-bate', () => guiando);
    expect(tema.agora()).toEqual([]);
    expect(podeMontar(situacao({ brinquedos: tema.agora() }))).toBe(true);
    noCarrossel = true;
    guiando = true;
    expect(tema.agora()).toEqual(['carrossel', 'bate-bate']);
    expect(podeMontar(situacao({ brinquedos: tema.agora() }))).toBe(false);
    noCarrossel = false;
    tirar();
    expect(tema.agora()).toEqual([]);
    // o "tirar" de um registro velho não tira o novo do mesmo id
    const velho = tema.registrar('sofa', () => true);
    tema.registrar('sofa', () => true);
    velho();
    expect(tema.agora()).toEqual(['sofa']);
  });
});
