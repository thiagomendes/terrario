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
import { normalizarCodigo } from './jogo/codigos';
import type { DadosMundo, MetaMundo, RepositorioMundos } from './jogo/mundos';
import { notificar } from './ui/interface';
import { perguntar } from './ui/dialogo';
import {
  CSS_AMIGOS,
  TEXTO_RECUSA,
  criarAvisoConexao,
  criarEntrarComCodigo,
  criarPainelAmigos,
} from './ui/amigos';
import type { MotivoRecusa } from './rede/protocolo';
import { CSS_SETAS, criarSetasAmigos } from './ui/setasAmigos';
import type { criarCena } from './render/cena';

type Cena = ReturnType<typeof criarCena>;

let estiloPronto = false;
function estilo(): void {
  if (estiloPronto) return;
  estiloPronto = true;
  const e = document.createElement('style');
  e.textContent =
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
    erro(t: string) {
      p.textContent = t;
      barra.remove();
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
  location.href = u.toString();
}

function irParaSala(codigo: string, novo = false): void {
  const u = new URL(location.href);
  u.search = '';
  u.searchParams.set('sala', codigo);
  if (novo) u.searchParams.set('novo', '1');
  location.href = u.toString();
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
      apelido: identidade().apelido,
      aoEntrar: async (_c, apelido) => {
        definirApelido(apelido);
        m.fechar();
        resolve(limparApelido(apelido));
      },
    });
    m.abrir(codigo);
  });
}

/** Entra no mundo da sala: devolve a conexão e o mundo, ou mostra o erro e para. */
export async function entrarNaSala(
  raiz: HTMLElement,
  codigo: string,
): Promise<{ conexao: ConexaoNuvem; bv: BemVindo; fecharTela: () => void } | null> {
  let apelido = identidade().apelido;
  if (!apelido) apelido = await pedirApelido(raiz, codigo);
  const tela = telaCarregando(`Entrando em ${codigo.split('-').join(' · ')}`);
  if (!navigator.onLine) {
    tela.erro(TEXTO_RECUSA['sem-internet']);
    return null;
  }
  tela.passo('Conectando ao servidor…', 0.2);
  const conexao = conexaoNuvem({ url: urlServidor(), jogador: jogador(apelido), codigo });
  // sem resposta em 15 s: o servidor não está lá
  const prazo = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error('servidor')), 15_000),
  );
  try {
    tela.passo('Acordando o mundo…', 0.5);
    const bv = await Promise.race([conexao.pronta, prazo]);
    tela.passo('Montando o terreno…', 0.85);
    return { conexao, bv, fecharTela: tela.fechar };
  } catch (e) {
    conexao.encerrar();
    tela.erro(textoDoErro(e));
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
        ...(g.diario ? { diario: g.diario } : {}),
        ...(g.marcadores ? { marcadores: g.marcadores } : {}),
      },
    },
  };
}

export interface OpcoesAmigos {
  repo: RepositorioMundos;
  /** Mundo do aparelho aberto agora (para levar para a nuvem). */
  mundo?: MetaMundo;
  /** Mundo da nuvem aberto agora. */
  nuvem?: { conexao: ConexaoNuvem; bv: BemVindo; novo: boolean };
}

/** Painel "Jogar com amigos", "Entrar com código", avisos e o diário que vai junto. */
export function ligarAmigos(raiz: HTMLElement, cena: Cena, op: OpcoesAmigos): void {
  estilo();
  const entrar = criarEntrarComCodigo(raiz, {
    apelido: identidade().apelido,
    aoEntrar: async (codigo, apelido) => {
      definirApelido(apelido);
      irParaSala(codigo);
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
        }
      : undefined,
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
  const atualizarLista = () =>
    painel.definirJogadores([
      { id: voce, apelido },
      ...(cena.estado.outrosJogadores?.() ?? []).map((o) => ({ id: o.id, apelido: o.apelido })),
    ]);
  atualizarLista();
  window.addEventListener('brumaluz:entrou', () => setTimeout(atualizarLista, 200));
  window.addEventListener('brumaluz:saiu', () => setTimeout(atualizarLista, 200));
  setInterval(atualizarLista, 3000);
  nv.conexao.aoSala((s) => {
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
    setTimeout(() => location.reload(), 300);
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
  // primeira vez no mundo que acabou de ir para a nuvem: o convite já aberto
  if (nv.novo) setTimeout(() => painel.abrir(), 600);
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
  await subirParaNuvem(repo, meta, undefined, nome);
}

/** Leva o mundo do aparelho para a nuvem e entra nele pelo código novo. */
async function levarParaNuvem(cena: Cena, op: OpcoesAmigos): Promise<void> {
  const m = op.mundo;
  if (!m) throw new Error('Abra um mundo primeiro.');
  let apelido = identidade().apelido;
  if (!apelido) {
    // diálogo de brinquedo (spec 012), já com o nome sugerido preenchido
    const r = await perguntar({
      titulo: 'Seu nome para os amigos',
      texto: 'Ele aparece em cima do seu personagem.',
      campo: sugestaoDeApelido(m.tema),
      confirmar: 'Continuar',
    });
    if (r === null) throw new Error('cancelado');
    apelido = apelidoOuSugerido(typeof r === 'string' ? r : '', m.tema);
    definirApelido(apelido);
  }
  await subirParaNuvem(op.repo, m, await cena.dadosAtuais(), apelido);
}

/** Cria a sala na nuvem com este mundo (e os dados dele, se houver) e entra pelo código. */
async function subirParaNuvem(
  repo: RepositorioMundos,
  m: MetaMundo,
  dados: DadosMundo | undefined,
  apelido: string,
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
      estilo: estiloMundo(),
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
