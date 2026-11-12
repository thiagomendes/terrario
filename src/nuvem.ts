/**
 * Mundos com amigos (spec 010), do lado da página: entrar pelo código (com tela de
 * carregamento de verdade), levar um mundo do aparelho para a nuvem, o painel do
 * convite e do dono, os avisos de conexão e o diário e o mapa que vão junto.
 */
import { conexaoNuvem, type BemVindo, type ConexaoNuvem } from './cliente/conexaoNuvem';
import {
  definirApelido,
  identidade,
  limparApelido,
  nomeSugerido,
  urlServidor,
} from './cliente/identidade';
import { rotuloDoModelo } from './personagem/aparencia';
import { carregarAparencia } from './personagem/persistencia';
import { estiloMundo } from './world/chunk';
import type { EstiloMundo } from './temas/tipos';
import { normalizarCodigo } from './jogo/codigos';
import type { DadosMundo, MetaMundo, RepositorioMundos } from './jogo/mundos';
import { notificar } from './ui/interface';
import { navegar, recarregar } from './pagina';
import { perguntar } from './ui/dialogo';
import {
  CSS_AMIGOS,
  TEXTO_RECUSA,
  criarAvisoConexao,
  criarBotaoAmigos,
  criarEntrarComCodigo,
  criarPainelAmigos,
  criarTelaEntrar,
} from './ui/amigos';
import { prepararAudioNoGesto } from './audio/ligador';
import { CSS_BRINQUEDO } from './ui/brinquedo';
import { obterTema, temaExiste } from './temas';
import type { MotivoRecusa } from './rede/protocolo';

/** A prévia que o servidor devolve (ou "não existe"). */
interface PreviaMundo {
  codigo: string;
  nome: string;
  tema: string;
  modo: string;
  dono: string;
  presentes: string[];
  fechado: boolean;
  cheio: boolean;
  naoExiste?: boolean;
  limite?: boolean;
}
const VAZIA: PreviaMundo = {
  codigo: '',
  nome: '',
  tema: '',
  modo: '',
  dono: '',
  presentes: [],
  fechado: false,
  cheio: false,
};
import { CSS_SETAS, criarSetasAmigos } from './ui/setasAmigos';
import type { criarCena } from './render/cena';

type Cena = ReturnType<typeof criarCena>;

let estiloPronto = false;
function estilo(): void {
  if (estiloPronto) return;
  estiloPronto = true;
  const e = document.createElement('style');
  // a base de brinquedo (letras, cores, botões-peça) vem junto: estas telas podem aparecer
  // antes do resto da interface (entrar pelo link)
  e.textContent =
    CSS_BRINQUEDO +
    CSS_AMIGOS +
    CSS_SETAS +
    `
.carregando-nuvem {
  position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 24px;
  background: linear-gradient(180deg, #a9d4ff, #dcefff 60%, #fff4dc); color: #3b2a1e;
  font: 700 1.05rem var(--jogo, system-ui, sans-serif); text-align: center;
}
/* cartão creme de brinquedo; as cores vão escritas porque esta tela pode vir antes do resto */
.carregando-nuvem .cartao {
  display: grid; gap: 14px; justify-items: center; width: min(420px, 100%); box-sizing: border-box; padding: 26px 22px 28px;
  border-radius: 24px; background: #fffaf0; box-shadow: 0 8px 0 #f0d9b0, 0 22px 40px rgba(40, 25, 10, 0.25);
}
.carregando-nuvem h2 { margin: 0; font: 700 1.6rem/1.1 var(--display, system-ui, sans-serif); color: #b5531a; }
.carregando-nuvem p { margin: 0; color: #3b2a1e; }
.carregando-nuvem .barra { width: min(260px, 100%); height: 14px; border-radius: 999px; background: #f3e6cc; box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.14); overflow: hidden; }
.carregando-nuvem .barra i { display: block; height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, #ffd45a, #ff9b2f); transition: width 0.4s ease; }
.carregando-nuvem .btn { min-height: 50px; padding: 0 20px; }
`;
  document.head.appendChild(e);
}

/** Tela de entrada no mundo: nome, progresso de verdade e o erro explicado, se houver. */
function telaCarregando(texto: string) {
  estilo();
  const el = document.createElement('div');
  el.className = 'carregando-nuvem';
  el.setAttribute('role', 'status');
  el.setAttribute('data-carregando-nuvem', '');
  const c = document.createElement('div');
  c.className = 'cartao';
  const h = document.createElement('h2');
  h.textContent = texto;
  const p = document.createElement('p');
  p.textContent = 'Conectando…';
  const barra = document.createElement('div');
  barra.className = 'barra';
  const i = document.createElement('i');
  barra.appendChild(i);
  c.append(h, p, barra);
  el.appendChild(c);
  document.body.appendChild(el);
  return {
    passo(t: string, fracao: number) {
      p.textContent = t;
      i.style.width = `${Math.round(fracao * 100)}%`;
    },
    /** `jogarAqui`: um botão a mais que recarrega e entra de novo neste aparelho. */
    erro(t: string, jogarAqui = false) {
      p.textContent = t;
      barra.remove();
      if (jogarAqui) {
        const a = document.createElement('button');
        a.type = 'button';
        a.className = 'btn primario';
        a.textContent = 'Jogar aqui';
        a.setAttribute('data-jogar-aqui', '');
        a.addEventListener('click', () => recarregar());
        c.appendChild(a);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn primario';
      b.textContent = 'Voltar ao meu mundo';
      b.setAttribute('data-voltar-meu-mundo', '');
      b.addEventListener('click', () => voltarAoLocal());
      c.appendChild(b);
      b.focus();
    },
    fechar: () => el.remove(),
  };
}

function voltarAoLocal(): void {
  const u = new URL(location.href);
  u.searchParams.delete('sala');
  u.searchParams.delete('novo');
  navegar(u.toString());
}

/**
 * Vai para o mundo da nuvem. `novo`: quem acabou de criar (o convite abre no mundo).
 * `direto`: já escolheu entrar (código digitado, mundo da lista): sem a tela de prévia.
 */
function irParaSala(codigo: string, novo = false, direto = false): void {
  const u = new URL(location.href);
  u.search = '';
  u.searchParams.set('sala', codigo);
  if (novo) u.searchParams.set('novo', '1');
  if (novo || direto) u.searchParams.set('direto', '1');
  navegar(u.toString());
}

/** Endereço HTTP do servidor (o mesmo do WebSocket, sem o /jogo). */
function httpDoServidor(): string {
  const u = new URL(urlServidor());
  u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
  u.pathname = '';
  return u.toString().replace(/\/$/, '');
}

/** Prévia do mundo (nome, tema, dono, quem está), ou null se não deu para saber. */
async function previaDoMundo(codigo: string): Promise<PreviaMundo | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(`${httpDoServidor()}/previa/${encodeURIComponent(codigo)}`, {
      signal: ctl.signal,
    });
    clearTimeout(t);
    if (r.status === 429) return { ...VAZIA, limite: true };
    if (r.status === 404)
      return {
        codigo: '',
        nome: '',
        tema: '',
        modo: '',
        dono: '',
        presentes: [],
        fechado: false,
        cheio: false,
        naoExiste: true,
      };
    if (!r.ok) return null;
    return (await r.json()) as PreviaMundo;
  } catch {
    return null;
  }
}

function jogador(apelido: string) {
  const id = identidade();
  let aparencia: Record<string, unknown> = {};
  try {
    aparencia = carregarAparencia(window.localStorage) as unknown as Record<string, unknown>;
  } catch {
    // sem armazenamento: aparência padrão
  }
  return { id: id.id, chave: id.chave, apelido: apelidoOuSugerido(apelido), aparencia };
}

function textoDoErro(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return TEXTO_RECUSA[m as MotivoRecusa] ?? TEXTO_RECUSA.servidor;
}

/** Pede o apelido na primeira vez (com o código já preenchido). */
function pedirApelido(raiz: HTMLElement, codigo: string): Promise<string> {
  return new Promise((resolve) => {
    estilo();
    const m = criarEntrarComCodigo(raiz, {
      apelido: sugestaoDeApelido(),
      aoEntrar: async (_c, apelido) => {
        definirApelido(apelido);
        m.fechar();
        resolve(limparApelido(apelido));
      },
    });
    m.abrir(codigo);
  });
}

type TelaProgresso = { passo(t: string, f: number): void; erro(t: string): void; fechar(): void };

/** Conecta e espera o "bem-vindo" (até 15 s). Rejeita com o motivo do servidor. */
async function conectar(
  codigo: string,
  apelido: string,
  tela: TelaProgresso,
  repo?: RepositorioMundos,
): Promise<{ conexao: ConexaoNuvem; bv: BemVindo }> {
  if (!navigator.onLine) throw new Error('sem-internet');
  tela.passo('Conectando ao servidor…', 0.2);
  const conexao = conexaoNuvem({ url: urlServidor(), jogador: jogador(apelido), codigo });
  // o dono que caiu enquanto trazia o mundo para o aparelho recebe o mundo ao voltar
  if (repo)
    conexao.aoDevolvido((dados) => {
      tela.passo('Trazendo o mundo para o aparelho…', 0.9);
      void abrirDevolvido(repo, codigo, dados).catch(() =>
        tela.erro('Não deu para guardar o mundo no aparelho. Tente de novo.'),
      );
    });
  const prazo = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error('servidor')), 15_000),
  );
  try {
    tela.passo('Acordando o mundo…', 0.5);
    const bv = await Promise.race([conexao.pronta, prazo]);
    tela.passo('Montando o terreno…', 0.85);
    return { conexao, bv };
  } catch (e) {
    conexao.encerrar();
    throw e;
  }
}

/** Texto para a criança, a partir do motivo (recusa do servidor, sem internet...). */
function textoDoMotivo(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return (TEXTO_RECUSA as Record<string, string>)[m] ?? TEXTO_RECUSA.servidor;
}

/**
 * Pelo link ou pelo QR (spec 011, T03): o cartão "Entrar no mundo de Ana" aparece na hora e
 * se completa com a prévia (tema, de quem é, quem está). Cada toque em "Entrar" tenta entrar;
 * se não der, o motivo aparece no mesmo cartão e "Tentar de novo" tenta outra vez ali mesmo.
 */
function entrarPeloLink(
  codigo: string,
  repo?: RepositorioMundos,
): Promise<{ conexao: ConexaoNuvem; bv: BemVindo; fecharTela: () => void } | null> {
  estilo();
  return new Promise((resolve) => {
    let tema: string | undefined;
    let tentando = false;
    const tela = criarTelaEntrar({
      apelido: sugestaoDeApelido(),
      aoEntrar: (escrito) => {
        // o toque em "Entrar" é o gesto: o som já fica liberado para o mundo
        prepararAudioNoGesto();
        if (tentando) return;
        tentando = true;
        const apelido = apelidoOuSugerido(escrito, tema);
        definirApelido(apelido);
        const progresso: TelaProgresso = {
          passo: (_t, f) => tela.passo(f),
          erro: (t) => tela.erro(t),
          fechar: tela.fechar,
        };
        conectar(codigo, apelido, progresso, repo)
          .then(({ conexao, bv }) => resolve({ conexao, bv, fecharTela: tela.fechar }))
          .catch(async (e) => {
            tentando = false;
            // mundo deste aparelho preso a um código que deixou de valer: abre o do aparelho
            if (repo && e instanceof Error && e.message === 'codigo')
              if (await soltarCodigoMorto(repo, codigo)) return;
            tela.erro(textoDoMotivo(e));
          });
      },
      aoVoltar: () => voltarAoLocal(),
    });
    if (!navigator.onLine) {
      tela.semPrevia();
      tela.erro(TEXTO_RECUSA['sem-internet']);
      return;
    }
    void previaDoMundo(codigo).then((p) => {
      if (!p) return tela.semPrevia();
      if (p.limite) return tela.erro(TEXTO_RECUSA.limite);
      if (p.naoExiste) {
        tela.semPrevia();
        return tela.erro(TEXTO_RECUSA.codigo);
      }
      tema = p.tema;
      tela.definirPrevia(
        {
          nome: p.nome,
          tema: p.tema,
          nomeTema: temaExiste(p.tema) ? obterTema(p.tema).nome : p.tema,
          dono: p.dono,
          presentes: p.presentes,
        },
        sugestaoDeApelido(p.tema),
      );
      if (p.fechado) tela.erro(TEXTO_RECUSA.fechado);
      else if (p.cheio) tela.erro(TEXTO_RECUSA.cheio);
    });
  });
}

/** Entra no mundo da sala: devolve a conexão e o mundo, ou mostra o erro e para. */
export async function entrarNaSala(
  raiz: HTMLElement,
  codigo: string,
  direto = false,
  repo?: RepositorioMundos,
): Promise<{ conexao: ConexaoNuvem; bv: BemVindo; fecharTela: () => void } | null> {
  if (!direto) return entrarPeloLink(codigo, repo);
  let apelido = identidade().apelido;
  if (!apelido) apelido = await pedirApelido(raiz, codigo);
  const tela = telaCarregando(`Entrando em ${codigo.split('-').join(' · ')}`);
  try {
    const { conexao, bv } = await conectar(codigo, apelido, tela, repo);
    return { conexao, bv, fecharTela: tela.fechar };
  } catch (e) {
    // mundo deste aparelho preso a um código que deixou de valer: abre o do aparelho
    if (
      repo &&
      e instanceof Error &&
      e.message === 'codigo' &&
      (await soltarCodigoMorto(repo, codigo))
    )
      return null;
    tela.erro(textoDoMotivo(e));
    return null;
  }
}

/** Dados iniciais da cena a partir do "bem-vindo" (terreno igual ao do servidor). */
export function dadosDaSala(bv: BemVindo): { mundo: MetaMundo; dados: DadosMundo } {
  const g = (bv.guardado ?? {}) as Record<string, unknown>;
  const agora = Date.now();
  return {
    mundo: {
      id: `nuvem:${bv.mundo.id}`,
      nome: bv.mundo.nome,
      semente: bv.mundo.semente,
      modo: bv.mundo.modo,
      tema: bv.mundo.tema,
      versao: bv.mundo.versaoMundo,
      criadoEm: agora,
      jogadoEm: agora,
      nuvem: bv.sala.codigo,
    },
    dados: {
      versao: 1,
      edicoes: bv.edicoes,
      jogador: bv.pos,
      hora: -1,
      extras: {
        povoados: { semPovoado: bv.semPovoado },
        // spec 014: as obras do canteiro (a cena gera a cidade com as feitas)
        ...(bv.obras ? { obras: bv.obras } : {}),
        // spec 016: quem colocou os blocos (a cena monta a cópia com os mesmos donos)
        ...(bv.donos.length ? { donos: bv.donos } : {}),
        ...(g.diario ? { diario: g.diario } : {}),
        ...(g.marcadores ? { marcadores: g.marcadores } : {}),
      },
    },
  };
}

export interface OpcoesAmigos {
  repo: RepositorioMundos;
  /** Fechou o convite com "Começar a jogar": entra no jogo (mouse preso, som). */
  comecar?(): void;
  /** Mundo do aparelho aberto agora (para levar para a nuvem). */
  mundo?: MetaMundo;
  /** Mundo da nuvem aberto agora. */
  nuvem?: { conexao: ConexaoNuvem; bv: BemVindo; novo: boolean };
}

/** Painel "Jogar com amigos", "Entrar com código", avisos e o diário que vai junto. */
let prazoDevolver: ReturnType<typeof setTimeout> | undefined;

export function ligarAmigos(raiz: HTMLElement, cena: Cena, op: OpcoesAmigos): void {
  estilo();
  const entrar = criarEntrarComCodigo(raiz, {
    apelido: sugestaoDeApelido(),
    aoEntrar: async (codigo, apelido) => {
      definirApelido(apelidoOuSugerido(apelido));
      // já digitou o código e tocou em "Entrar": vai direto para o mundo (sem a prévia)
      irParaSala(codigo, false, true);
    },
  });
  window.addEventListener('brumaluz:entrarCodigo', () => entrar.abrir());
  const nv = op.nuvem;
  const painel = criarPainelAmigos(raiz, {
    abrirParaAmigos: nv ? undefined : () => levarParaNuvem(cena, op),
    dono: nv
      ? {
          expulsar: (id) => nv.conexao.pedir({ t: 'dono', acao: 'expulsar', id }),
          trocarCodigo: () => nv.conexao.pedir({ t: 'dono', acao: 'trocarCodigo' }),
          fechar: (fechado) => nv.conexao.pedir({ t: 'dono', acao: 'fechar', fechado }),
          construir: (pode) => nv.conexao.pedir({ t: 'dono', acao: 'construir', pode }),
          devolver: () => {
            // o diário e o mapa de agora vão junto; a criança vê que está acontecendo
            nv.conexao.pedir({ t: 'guardar', dados: cena.extrasDoCliente() });
            nv.conexao.pedir({ t: 'dono', acao: 'devolver' });
            const t = telaCarregando('Trazendo o mundo para o aparelho…');
            t.passo('Guardando tudo o que vocês construíram…', 0.4);
            prazoDevolver = setTimeout(
              () =>
                t.erro('O servidor não respondeu. O mundo continua com os amigos; tente de novo.'),
              30_000,
            );
          },
        }
      : undefined,
    aoComecar: () => op.comecar?.(),
  });
  window.addEventListener('brumaluz:amigos', () => {
    document.exitPointerLock?.();
    painel.abrir();
  });
  window.addEventListener('brumaluz:sonoEspera', (e) => {
    const faltam = (e as CustomEvent<number>).detail;
    notificar(
      `Ponto de renascer definido. A noite passa quando todos deitarem (${faltam === 1 ? 'falta 1' : `faltam ${faltam}`}).`,
    );
  });
  if (!nv) return;

  // mundo da nuvem: quem está, o código, a conexão e o diário que vai junto
  const voce = nv.bv.voce;
  const apelido = identidade().apelido || 'Você';
  painel.definirSala(nv.bv.sala, voce);
  // botão fixo de amigos: quantos estão no mundo e o mesmo cartão do convite
  const botaoAmigos = criarBotaoAmigos(raiz, () => {
    document.exitPointerLock?.();
    painel.abrir();
  });
  const atualizarLista = () => {
    const lista = [
      { id: voce, apelido },
      ...(cena.estado.outrosJogadores?.() ?? []).map((o) => ({ id: o.id, apelido: o.apelido })),
    ];
    painel.definirJogadores(lista);
    botaoAmigos.definir(lista.length);
  };
  atualizarLista();
  window.addEventListener('brumaluz:entrou', () => setTimeout(atualizarLista, 150));
  window.addEventListener('brumaluz:saiu', () => setTimeout(atualizarLista, 150));
  setInterval(atualizarLista, 1000);
  // códigos deste mundo nesta visita (o dono pode trocar): o mundo do aparelho é achado por eles
  const codigos = [nv.bv.sala.codigo];
  // parar de jogar com amigos: o mundo volta inteiro para o aparelho e abre aqui
  nv.conexao.aoDevolvido((dados) => {
    clearTimeout(prazoDevolver);
    const t = telaCarregando('Trazendo o mundo para o aparelho…');
    t.passo('Guardando no aparelho…', 0.8);
    void guardarDevolvido(op.repo, nv.bv.mundo, codigos, dados)
      .then((id) => {
        const u = new URL(location.href);
        u.search = '';
        u.searchParams.set('mundo', id);
        navegar(u.toString());
      })
      .catch(() =>
        t.erro(
          'Não deu para guardar o mundo no aparelho agora. Recarregue a página: o mundo continua guardado na nuvem por alguns minutos.',
        ),
      );
  });
  nv.conexao.aoSala((s) => {
    if (!codigos.includes(s.codigo)) codigos.push(s.codigo);
    painel.definirSala(s, voce);
    // o código mudou: o endereço da página e o mundo do aparelho acompanham
    const u = new URL(location.href);
    const antigo = u.searchParams.get('sala');
    if (antigo !== s.codigo) {
      u.searchParams.set('sala', s.codigo);
      history.replaceState(null, '', u.toString());
      // o mundo do aparelho que foi para a nuvem passa a abrir pelo código novo
      void op.repo.listar().then(async (ms) => {
        for (const m of ms)
          if (m.nuvem && antigo && normalizarCodigo(m.nuvem) === normalizarCodigo(antigo))
            await op.repo.marcarNuvem(m.id, s.codigo);
      });
    }
  });
  // o servidor recomeçou (nova versão): abre o mundo de novo, do jeito que ficou guardado
  nv.conexao.aoReaberta(() => {
    telaCarregando('Atualizando o mundo…');
    setTimeout(() => recarregar(), 300);
  });
  const aviso = criarAvisoConexao(raiz);
  // achar os amigos: seta na borda da tela para quem está longe
  criarSetasAmigos(raiz, {
    posicao: () => {
      const p = cena.estado.posicao;
      const r = cena.estado.rotacao;
      return p && r ? { x: p[0], z: p[2], yaw: r[1] } : null;
    },
    amigos: () => cena.estado.outrosJogadores?.() ?? [],
  });
  let caiu = false;
  nv.conexao.aoEstado((e, motivo) => {
    aviso.mostrar(e);
    if (e === 'reconectando') caiu = true;
    else if (e === 'conectado' && caiu) {
      caiu = false;
      cena.reconferir();
      notificar('Voltamos! A conexão está de pé de novo.');
    } else if (e === 'expulso') {
      telaCarregando('Você saiu deste mundo').erro(TEXTO_RECUSA.expulso);
    } else if (e === 'encerrada') {
      telaCarregando('O passeio acabou').erro(TEXTO_RECUSA.encerrada);
    } else if (e === 'substituido') {
      telaCarregando('Aberto em outro lugar').erro(TEXTO_RECUSA.substituido, true);
    } else if (e === 'recusado') {
      telaCarregando('Não deu para voltar').erro(TEXTO_RECUSA[motivo ?? 'erro']);
    }
  });
  // diário e mapa vão com o jogador para a nuvem
  const guardar = () => nv.conexao.pedir({ t: 'guardar', dados: cena.extrasDoCliente() });
  setInterval(guardar, 20_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') guardar();
  });
  // primeira vez no mundo que acabou de ir para a nuvem: o convite já aberto, com o mundo atrás
  // (só nesta entrada: recarregar a página não abre de novo)
  if (nv.novo) {
    const u = new URL(location.href);
    u.searchParams.delete('novo');
    history.replaceState(null, '', u.toString());
    const abrirQuandoPronto = () =>
      cena.estado.ready ? painel.abrirConvite() : setTimeout(abrirQuandoPronto, 150);
    abrirQuandoPronto();
  }
}

/**
 * Grava no aparelho o mundo que voltou da nuvem: no mesmo mundo de onde ele saiu (se este
 * aparelho o levou) ou num mundo novo com o nome e a semente dele. Devolve o id.
 */
export async function guardarDevolvido(
  repo: RepositorioMundos,
  mundo: { nome: string; semente: number; modo: MetaMundo['modo']; tema: string },
  codigos: string[],
  dados: DadosMundo,
): Promise<string> {
  // o código de agora e os anteriores (o dono pode ter trocado o código no meio)
  const conhecidos = new Set(codigos.map((c) => normalizarCodigo(c)).filter(Boolean));
  const lista = await repo.listar();
  let m = lista.find((x) => x.nuvem && conhecidos.has(normalizarCodigo(x.nuvem)));
  const bv = { mundo };
  if (!m) m = await repo.criar(bv.mundo.nome, bv.mundo.semente, bv.mundo.modo, bv.mundo.tema);
  await gravarConferido(repo, m.id, dados);
  await repo.desmarcarNuvem(m.id);
  return m.id;
}

/**
 * Grava o mundo devolvido e confere lendo de volta: só depois disso o código é esquecido e o
 * mundo abre (o servidor guarda o mundo uns minutos; recarregar tenta de novo).
 */
async function gravarConferido(
  repo: RepositorioMundos,
  id: string,
  dados: DadosMundo,
): Promise<void> {
  await repo.salvar(id, dados);
  const lido = await repo.carregar(id);
  const n = (e: DadosMundo['edicoes'] | undefined) => Object.keys(e ?? {}).length;
  if (n(lido.edicoes) !== n(dados.edicoes)) throw new Error('gravou pela metade');
}

/** Grava o mundo devolvido no mundo do aparelho que tinha este código e abre ele. */
async function abrirDevolvido(
  repo: RepositorioMundos,
  codigo: string,
  dados: DadosMundo,
): Promise<void> {
  const c = normalizarCodigo(codigo);
  const m = (await repo.listar()).find((x) => x.nuvem && normalizarCodigo(x.nuvem) === c);
  if (!m) throw new Error('sem mundo');
  await gravarConferido(repo, m.id, dados);
  await repo.desmarcarNuvem(m.id);
  abrirMundoDoAparelho(m.id);
}

/** O código não vale mais e um mundo do aparelho apontava para ele: desmarca e abre. */
async function soltarCodigoMorto(repo: RepositorioMundos, codigo: string): Promise<boolean> {
  const c = normalizarCodigo(codigo);
  const m = (await repo.listar()).find((x) => x.nuvem && normalizarCodigo(x.nuvem) === c);
  if (!m) return false;
  await repo.desmarcarNuvem(m.id);
  abrirMundoDoAparelho(m.id);
  return true;
}

function abrirMundoDoAparelho(id: string): void {
  const u = new URL(location.href);
  u.search = '';
  u.searchParams.set('mundo', id);
  navegar(u.toString());
}

/** O nome do personagem deste aparelho (para sugerir o apelido). */
function personagemDoAparelho(): string {
  try {
    const a = carregarAparencia(window.localStorage);
    return a.nome || rotuloDoModelo(a);
  } catch {
    return '';
  }
}

/** Apelido a usar: o escrito, o do aparelho ou o sugerido do tema (nunca "Jogador"). */
export function apelidoOuSugerido(escrito: string | undefined, tema?: string): string {
  return (
    limparApelido(escrito ?? '') ||
    identidade().apelido ||
    nomeSugerido(personagemDoAparelho(), tema)
  );
}

/** Sugestão para o campo "Seu nome" (o do aparelho ou o do tema). */
export function sugestaoDeApelido(tema?: string): string {
  return identidade().apelido || nomeSugerido(personagemDoAparelho(), tema);
}

/**
 * Mundo novo já com amigos (spec 011, T01): nasce direto na nuvem (sem passar pelo aparelho)
 * e a página entra nele com o convite aberto.
 */
export async function criarMundoComAmigos(
  repo: RepositorioMundos,
  meta: MetaMundo,
  apelido: string,
): Promise<void> {
  const nome = apelidoOuSugerido(apelido, meta.tema);
  definirApelido(nome);
  // o terreno é o do tema escolhido (não o do mundo aberto agora na página)
  const tema = temaExiste(meta.tema ?? '') ? obterTema(meta.tema!) : obterTema('bruma-e-luz');
  await subirParaNuvem(repo, meta, undefined, nome, tema.mundo);
}

/** Nome para os amigos: o do aparelho, ou pergunta no diálogo (já com a sugestão do tema). */
async function apelidoParaAmigos(tema?: string): Promise<string> {
  const ja = identidade().apelido;
  if (ja) return ja;
  const r = await perguntar({
    titulo: 'Seu nome para os amigos',
    texto: 'Ele aparece em cima do seu personagem.',
    campo: sugestaoDeApelido(tema),
    confirmar: 'Continuar',
  });
  if (r === null) throw new Error('cancelado');
  const apelido = apelidoOuSugerido(typeof r === 'string' ? r : '', tema);
  definirApelido(apelido);
  return apelido;
}

/**
 * Da lista de mundos (spec 011): um mundo do aparelho passa a ser com amigos. Vai para a nuvem
 * com tudo o que tem e abre já com o convite.
 */
export async function levarMundoParaAmigos(
  repo: RepositorioMundos,
  meta: MetaMundo,
): Promise<void> {
  const apelido = await apelidoParaAmigos(meta.tema);
  const dados = await repo.carregar(meta.id);
  const tema = temaExiste(meta.tema ?? '') ? obterTema(meta.tema!) : obterTema('bruma-e-luz');
  await subirParaNuvem(repo, meta, dados, apelido, tema.mundo);
}

/**
 * Da lista de mundos (spec 011): o dono traz o mundo com amigos de volta para o aparelho sem
 * precisar entrar nele. Conecta, confere que é o dono, pede o mundo e grava aqui.
 */
export async function pararMundoComAmigos(repo: RepositorioMundos, meta: MetaMundo): Promise<void> {
  if (!meta.nuvem) return;
  if (!navigator.onLine) throw new Error(TEXTO_RECUSA['sem-internet']);
  const codigo = meta.nuvem;
  const conexao = conexaoNuvem({
    url: urlServidor(),
    jogador: jogador(identidade().apelido),
    codigo,
  });
  const prazo = (ms: number) =>
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('servidor')), ms));
  const devolvido = new Promise<DadosMundo>((res) => conexao.aoDevolvido(res));
  try {
    const bv = await Promise.race([conexao.pronta, devolvido.then(() => null), prazo(15_000)]);
    if (bv && bv.sala.dono !== bv.voce) {
      conexao.encerrar();
      throw new Error('Só quem criou o mundo pode parar de jogar com amigos.');
    }
    if (bv) conexao.pedir({ t: 'dono', acao: 'devolver' });
    const dados = await Promise.race([devolvido, prazo(30_000)]);
    await guardarDevolvido(
      repo,
      {
        nome: meta.nome,
        semente: meta.semente,
        modo: meta.modo,
        tema: meta.tema ?? 'bruma-e-luz',
      },
      [codigo, ...(bv ? [bv.sala.codigo] : [])],
      dados,
    );
  } catch (e) {
    conexao.encerrar();
    // o código não vale mais: o mundo volta a ser só do aparelho (com o que tinha aqui)
    if (e instanceof Error && e.message === 'codigo') {
      await repo.desmarcarNuvem(meta.id);
      return;
    }
    if (e instanceof Error && !(e.message in TEXTO_RECUSA)) throw e;
    throw new Error(textoDoMotivo(e));
  }
}

/** Leva o mundo do aparelho para a nuvem e entra nele pelo código novo. */
async function levarParaNuvem(cena: Cena, op: OpcoesAmigos): Promise<void> {
  const m = op.mundo;
  if (!m) throw new Error('Abra um mundo primeiro.');
  const apelido = await apelidoParaAmigos(m.tema);
  await subirParaNuvem(op.repo, m, await cena.dadosAtuais(), apelido, estiloMundo());
}

/** Cria a sala na nuvem com este mundo (e os dados dele, se houver) e entra pelo código. */
async function subirParaNuvem(
  repo: RepositorioMundos,
  m: MetaMundo,
  dados: DadosMundo | undefined,
  apelido: string,
  estilo: EstiloMundo,
): Promise<void> {
  if (!navigator.onLine) throw new Error(TEXTO_RECUSA['sem-internet']);
  const conexao = conexaoNuvem({
    url: urlServidor(),
    jogador: jogador(apelido),
    criar: {
      nome: m.nome,
      semente: m.semente,
      tema: m.tema ?? 'bruma-e-luz',
      modo: m.modo,
      versaoMundo: m.versao ?? 1,
      estilo,
      ...(dados ? { dados } : {}),
    },
  });
  const prazo = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error('servidor')), 20_000),
  );
  try {
    const bv = await Promise.race([conexao.pronta, prazo]);
    await repo.marcarNuvem(m.id, bv.sala.codigo);
    conexao.encerrar();
    irParaSala(bv.sala.codigo, true);
  } catch (e) {
    conexao.encerrar();
    throw new Error(textoDoErro(e));
  }
}

export { irParaSala };
