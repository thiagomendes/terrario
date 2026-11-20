/**
 * Spec 034: sem rastro do que a criança ganhou nos quatro temas que saíram (decisão do dono, 19
 * nov 2026). As lembranças do aparelho que guardam um id que não existe mais são passadas a
 * limpo uma vez a cada abertura (é barato e idempotente):
 *
 * - `terrario:aparencia`: a fantasia vestida que saiu vira "sem fantasia", e o guardado é
 *   regravado já normalizado (o id velho não fica lá);
 * - `terrario:fantasias-brilhou` e `terrario:fantasia-anterior`: sem as fantasias que saíram;
 * - `terrario:trilha-saida` (a medida da trilha dos testes de tela, na sessão): sai se for de
 *   um tema que saiu;
 * - `terrario:fantasia-sugerida` e `terrario:mundo-novo` guardam ids de mundo: os mundos
 *   apagados (os desses temas) saem delas por `esquecerMundos`, chamado por quem apaga.
 *
 * Ficam com a criança as moedinhas, o XP, os pontos e o nível (`terrario:alma-crianca`): são
 * dela, não do mundo.
 */
import { CHAVE_ANTERIOR, CHAVE_BRILHOU } from '../ui/abaFantasias';
import { CHAVE_MUNDO_NOVO, CHAVE_SUGERIDAS } from '../ui/sugestaoFantasia';
import {
  CHAVE_APARENCIA,
  carregarAparencia,
  salvarAparencia,
  type Armazenamento,
} from './persistencia';

/** Os quatro temas que saíram do jogo na spec 034. */
export const TEMAS_QUE_SAIRAM: readonly string[] = [
  'bruma-e-luz',
  'planeta-vivo',
  'mata-encantada',
  'era-dos-dinos',
];
/** As fantasias desses temas (o catálogo não tem mais). */
export const FANTASIAS_QUE_SAIRAM: readonly string[] = [
  'dino',
  'cientista',
  'guardia-mata',
  'lanterneira',
];
/** A medida da trilha que os testes de tela leem ao sair do mundo (na sessão). */
export const CHAVE_TRILHA_SAIDA = 'terrario:trilha-saida';

function apagar(loja: Armazenamento, chave: string): void {
  const l = loja as Armazenamento & { removeItem?: (k: string) => void };
  if (typeof l.removeItem === 'function') l.removeItem(chave);
  else l.setItem(chave, '');
}

function lerJson(loja: Armazenamento, chave: string): unknown {
  const bruto = loja.getItem(chave);
  if (!bruto) return undefined;
  try {
    return JSON.parse(bruto);
  } catch {
    return undefined;
  }
}

const objeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Passa a limpo as lembranças do aparelho com o que saiu junto com os quatro temas. */
export function limparRastrosDosTemas(
  loja: Armazenamento | null,
  sessao: Armazenamento | null = null,
): void {
  if (loja) {
    try {
      // a aparência guardada com uma fantasia que saiu: regravada sem ela
      const ap = lerJson(loja, CHAVE_APARENCIA);
      const vestida = objeto(ap) && objeto(ap.aparencia) ? ap.aparencia.fantasia : undefined;
      if (objeto(vestida) && FANTASIAS_QUE_SAIRAM.includes(String(vestida.id)))
        salvarAparencia(loja, carregarAparencia(loja));
    } catch {
      // sem armazenamento: nada guardado para limpar
    }
    try {
      const brilhou = lerJson(loja, CHAVE_BRILHOU);
      if (Array.isArray(brilhou) && brilhou.some((id) => FANTASIAS_QUE_SAIRAM.includes(id)))
        loja.setItem(
          CHAVE_BRILHOU,
          JSON.stringify(brilhou.filter((id) => !FANTASIAS_QUE_SAIRAM.includes(id))),
        );
    } catch {
      // idem
    }
    try {
      const anterior = lerJson(loja, CHAVE_ANTERIOR);
      if (objeto(anterior) && FANTASIAS_QUE_SAIRAM.includes(String(anterior.id)))
        apagar(loja, CHAVE_ANTERIOR);
    } catch {
      // idem
    }
  }
  if (sessao) {
    try {
      const trilha = lerJson(sessao, CHAVE_TRILHA_SAIDA);
      if (objeto(trilha) && TEMAS_QUE_SAIRAM.includes(String(trilha.tema)))
        apagar(sessao, CHAVE_TRILHA_SAIDA);
    } catch {
      // idem
    }
  }
}

/** Os mundos apagados saem das lembranças que guardam id de mundo. */
export function esquecerMundos(loja: Armazenamento | null, ids: readonly string[]): void {
  if (!loja || !ids.length) return;
  try {
    const sugeridas = lerJson(loja, CHAVE_SUGERIDAS);
    if (Array.isArray(sugeridas) && sugeridas.some((id) => ids.includes(id)))
      loja.setItem(
        CHAVE_SUGERIDAS,
        JSON.stringify(sugeridas.filter((id) => !ids.includes(id))),
      );
    const novo = loja.getItem(CHAVE_MUNDO_NOVO);
    if (novo && ids.includes(novo)) apagar(loja, CHAVE_MUNDO_NOVO);
  } catch {
    // sem armazenamento: nada guardado para limpar
  }
}
