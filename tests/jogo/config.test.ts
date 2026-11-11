import { describe, expect, it } from 'vitest';
import {
  CONFIG_PADRAO,
  carregarConfig,
  criarGerenciadorConfig,
  normalizarConfig,
  perfilDaQualidade,
} from '../../src/jogo/config';

function memoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    m,
  };
}

describe('config', () => {
  it('normaliza limites, tipos e valores desconhecidos', () => {
    const c = normalizarConfig({
      fov: 500,
      sensibilidade: -3,
      qualidade: 'insana',
      inverterY: 'sim',
      distancia: 5.6,
    });
    expect(c.fov).toBe(100);
    expect(c.sensibilidade).toBe(0.2);
    expect(c.qualidade).toBe(CONFIG_PADRAO.qualidade);
    expect(c.inverterY).toBe(false);
    expect(c.distancia).toBe(6);
    expect(normalizarConfig(null)).toEqual(CONFIG_PADRAO);
  });

  it('volume das vozes (spec 019): padrão 100%, limitado, e quem baixou os efeitos começa igual', () => {
    expect(CONFIG_PADRAO.volumeVozes).toBe(1);
    expect(normalizarConfig({ volumeVozes: 3 }).volumeVozes).toBe(1);
    expect(normalizarConfig({ volumeVozes: -1 }).volumeVozes).toBe(0);
    expect(normalizarConfig({ volumeVozes: 0.4, volumeEfeitos: 0.9 }).volumeVozes).toBe(0.4);
    // configuração de antes da spec 019: as vozes iam nos efeitos
    expect(normalizarConfig({ volumeEfeitos: 0.3 }).volumeVozes).toBe(0.3);
    expect(normalizarConfig({ volumeVozes: 'alto' }).volumeVozes).toBe(1);
  });

  it('carrega o padrão com JSON quebrado e persiste alterações', () => {
    const a = memoria();
    a.setItem('terrario:config', '{quebrado');
    expect(carregarConfig(a)).toEqual(CONFIG_PADRAO);
    const g = criarGerenciadorConfig(a);
    const vistos: number[] = [];
    g.ouvir((c) => vistos.push(c.fov));
    g.alterar({ fov: 90 });
    expect(vistos).toEqual([70, 90]);
    expect(carregarConfig(a).fov).toBe(90);
    g.restaurar();
    expect(carregarConfig(a)).toEqual(CONFIG_PADRAO);
  });

  it('qualidade mais alta nunca tem menos recursos', () => {
    const [b, m, a, u] = (['baixa', 'media', 'alta', 'ultra'] as const).map(perfilDaQualidade);
    expect(b.sombras).toBe(false);
    expect(u.tamanhoSombra).toBeGreaterThan(a.tamanhoSombra);
    expect(a.vagalumes).toBeGreaterThan(m.vagalumes);
    expect(b.escalaMinima).toBeGreaterThan(u.escalaMinima);
  });
});

describe('migração do nome Brumaluz para Terrário', () => {
  it('lê a configuração antiga e grava na chave nova', () => {
    const a = memoria();
    a.setItem('brumaluz:config', JSON.stringify({ ...CONFIG_PADRAO, fov: 88 }));
    expect(carregarConfig(a).fov).toBe(88);
    const g = criarGerenciadorConfig(a);
    g.alterar({ fov: 90 });
    expect(JSON.parse(a.m.get('terrario:config')!).fov).toBe(90);
    // a nova vale mais que a antiga
    expect(carregarConfig(a).fov).toBe(90);
  });
});

describe('só terceira pessoa (spec 015): preferências antigas abrem iguais', () => {
  it('configuração salva com câmera de 1ª pessoa carrega sem erro e some ao gravar', () => {
    const a = memoria();
    a.setItem(
      'terrario:config',
      JSON.stringify({ ...CONFIG_PADRAO, fov: 80, camera: 'primeira', modoCamera: 'frente' }),
    );
    const c = carregarConfig(a);
    expect(c.fov).toBe(80);
    expect('camera' in c).toBe(false);
    expect('modoCamera' in c).toBe(false);
    const g = criarGerenciadorConfig(a);
    g.alterar({ fov: 81 });
    const salvo = JSON.parse(a.m.get('terrario:config')!);
    expect(salvo.camera).toBeUndefined();
    expect(salvo.modoCamera).toBeUndefined();
    // "Balanço ao andar" continua valendo: agora liga a câmera voltar para trás sozinha
    expect(c.balanco).toBe(true);
  });
});
