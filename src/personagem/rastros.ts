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
 *   apagados (os desses temas) saem delas por `esquecerMundos`, chamado por quem apaga;
 * - `terrario:identidade`: o apelido que termina no complemento de um tema que saiu (o nome
 *   sugerido da spec 011, como "Aventureira da Bruma") troca só esse final pelo da Vila Neon
 *   ("Aventureira da Vila"; decisão do dono, 20 nov 2026). O resto da identidade não muda.
 *
 * Ficam com a criança as moedinhas, o XP, os pontos e o nível (`terrario:alma-crianca`): são
 * dela, não do mundo.
 */
import { TEMAS_QUE_SAIRAM } from '../temas/tipos';
import { CHAVE_IDENTIDADE, COMPLEMENTO_PADRAO } from '../cliente/identidade';
import { CHAVE_TRILHA_SAIDA } from '../audio/trilha';
import { CHAVE_ANTERIOR, CHAVE_BRILHOU } from '../ui/abaFantasias';
import { CHAVE_MUNDO_NOVO, CHAVE_SUGERIDAS } from '../ui/sugestaoFantasia';
import {
  CHAVE_APARENCIA,
  VERSAO_APARENCIA,
  carregarAparencia,
  salvarAparencia,
  type Armazenamento,
} from './persistencia';

export { TEMAS_QUE_SAIRAM };
/** As fantasias desses temas (o catálogo não tem mais). */
export const FANTASIAS_QUE_SAIRAM: readonly string[] = [
  'dino',
  'cientista',
  'guardia-mata',
  'lanterneira',
];
export { CHAVE_TRILHA_SAIDA };
/**
 * Os complementos do nome sugerido nos temas que saíram (spec 011), com o espaço da frente: só
 * o apelido que termina exatamente num deles muda.
 */
export const FINAIS_QUE_SAIRAM: readonly string[] = [
  ' da Bruma',
  ' dos Dinos',
  ' da Mata',
  ' Estelar',
];

/** O apelido com o final de um tema que saiu ganha o final da Vila Neon; os outros ficam. */
export function apelidoSemTemaQueSaiu(apelido: string): string {
  const final = FINAIS_QUE_SAIRAM.find((f) => apelido.endsWith(f) && apelido.length > f.length);
  return final ? `${apelido.slice(0, -final.length)} ${COMPLEMENTO_PADRAO}` : apelido;
}

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
      // a aparência guardada com uma fantasia que saiu: regravada sem ela (só a do formato de
      // agora; a de outro formato o carregamento não lê, e regravar zeraria a do jogador)
      const ap = lerJson(loja, CHAVE_APARENCIA);
      const vestida =
        objeto(ap) && ap.versao === VERSAO_APARENCIA && objeto(ap.aparencia)
          ? ap.aparencia.fantasia
          : undefined;
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
    try {
      const ident = lerJson(loja, CHAVE_IDENTIDADE);
      if (objeto(ident) && typeof ident.apelido === 'string') {
        const novo = apelidoSemTemaQueSaiu(ident.apelido);
        if (novo !== ident.apelido)
          loja.setItem(CHAVE_IDENTIDADE, JSON.stringify({ ...ident, apelido: novo }));
      }
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
