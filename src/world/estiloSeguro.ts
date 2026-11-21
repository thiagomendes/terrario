/**
 * Estilo do mundo vindo de fora (servidor da nuvem, spec 010): só formas conhecidas e
 * números no intervalo certo. Qualquer outra coisa vira o padrão, sem quebrar a geração.
 */
import type { EstiloMundo, FormaArvore, FormaEstrutura } from '../temas/tipos';
import { ESTILO_PADRAO, type Bioma } from './chunk';
import {
  FORMAS_PADRAO,
  type FormaCasa,
  type FormaMarco,
  type FormasPovoado,
  type PlantaPovoado,
} from './povoado';

const BIOMAS: readonly Bioma[] = [
  'oceano',
  'praia',
  'floresta',
  'campos',
  'deserto',
  'taiga',
  'montanhas',
  'pantano',
];
const ARVORES: readonly FormaArvore[] = [
  'carvalho',
  'betula',
  'pinho',
  'lanterna',
  'fungo',
  'pirulito',
  'cristal',
  'araucaria',
];
const ESTRUTURAS: readonly FormaEstrutura[] = [
  'ruina',
  'cupula',
  'casinha',
  'torre',
  'espantalho',
  'roda-gigante',
];
const CASAS: readonly FormaCasa[] = ['duas-aguas', 'cupula', 'redonda', 'modulo'];
const MARCOS: readonly FormaMarco[] = ['poco', 'fonte', 'antena', 'moinho'];
const PLANTAS: readonly PlantaPovoado[] = ['vila', 'sitio', 'cidade', 'bairro', 'baile'];
const NOITES: readonly NonNullable<EstiloMundo['noite']>[] = ['assusta', 'mansa', 'devagar'];
const DOMAR: readonly NonNullable<EstiloMundo['domar']>[] = ['frutinhas', 'peixe'];

const entre01 = (v: unknown, padrao: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : padrao;
const uma = <T extends string>(v: unknown, lista: readonly T[], padrao: T): T =>
  lista.includes(v as T) ? (v as T) : padrao;

export function estiloSeguro(v: unknown): EstiloMundo {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const arvores: EstiloMundo['arvores'] = {};
  const a = (o.arvores && typeof o.arvores === 'object' ? o.arvores : {}) as Record<
    string,
    unknown
  >;
  for (const b of BIOMAS) {
    const l = a[b];
    if (!Array.isArray(l)) continue;
    const formas = l
      .filter((f): f is FormaArvore => ARVORES.includes(f as FormaArvore))
      .slice(0, 8);
    if (formas.length) arvores[b] = formas;
  }
  const p =
    o.povoado && typeof o.povoado === 'object' ? (o.povoado as Record<string, unknown>) : null;
  const povoado: FormasPovoado | undefined = p
    ? {
        casa: uma(p.casa, CASAS, FORMAS_PADRAO.casa),
        oficina: uma(p.oficina, CASAS, FORMAS_PADRAO.oficina),
        deposito: uma(p.deposito, CASAS, FORMAS_PADRAO.deposito),
        marco: uma(p.marco, MARCOS, FORMAS_PADRAO.marco),
        // spec 013: sem o campo, continua sem (o povoado de sempre)
        ...(PLANTAS.includes(p.planta as PlantaPovoado)
          ? { planta: p.planta as PlantaPovoado }
          : {}),
      }
    : undefined;
  return {
    arvores,
    estrutura: uma(o.estrutura, ESTRUTURAS, ESTILO_PADRAO.estrutura),
    crateras: entre01(o.crateras, ESTILO_PADRAO.crateras),
    flora: entre01(o.flora, ESTILO_PADRAO.flora),
    ...(povoado ? { povoado } : {}),
    ...(NOITES.includes(o.noite as never) ? { noite: o.noite as EstiloMundo['noite'] } : {}),
    // spec 014: sem o campo, continua sem (frutinhas, como sempre)
    ...(DOMAR.includes(o.domar as never) ? { domar: o.domar as EstiloMundo['domar'] } : {}),
  };
}
