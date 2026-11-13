/**
 * Spec 029, etapa 1: a página escondida de medida do WebGPU (`?medir=webgpu`).
 *
 * Roda a cena mais pesada do jogo (o centro da Cidade Grande, com veículos e moradores, a
 * câmera girando devagar, semente fixa) no WebGL2 de hoje e no WebGPUEngine do mesmo Babylon,
 * e mostra os números lado a lado, em letra grande, para o dono tirar uma foto da tela.
 *
 * - Cada rodada é uma página nova (o motor nasce limpo); as medidas viajam no fragmento do
 *   endereço (#...), que nunca sai do aparelho. Nada é gravado nem enviado.
 * - Os efeitos escritos à mão em GLSL passam, no WebGPU, pela conversão automática do Babylon
 *   (glslang + twgsl, servidos de `/medir/`, baixados só aqui). O que não converter é
 *   desligado nos dois modos, para a comparação ficar justa, e aparece na lista.
 * - Este pedaço só é carregado com o `?medir=webgpu`: o jogo nunca o baixa.
 */
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import '@babylonjs/core/Engines/WebGPU/Extensions/index';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { Constants } from '@babylonjs/core/Engines/constants';
import { MaterialPluginManager } from '@babylonjs/core/Materials/materialPluginManager';
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Effect } from '@babylonjs/core/Materials/effect';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Logger } from '@babylonjs/core/Misc/logger';
import { criarCena } from '../render/cena';
import { PluginMundo } from '../render/materialMundo';
import { PluginBalanco } from '../render/balanco';
import { PluginPlastico } from '../render/formas';
import { ativarTema } from '../temas/ativar';
import { SEMENTE_PADRAO_MUNDO, type MetaMundo } from '../jogo/mundos';
import { criarGerenciadorConfig, CHAVE_CONFIG, type Qualidade } from '../jogo/config';
import { escalaBase, ESCALA_INICIO_TOQUE } from '../render/resolucao';
import { medirJanela, tamanhoDoCanvas } from '../ui/telaCheia';
import { liberarEngine, navegar, tirarCarregando } from '../pagina';
import {
  EFEITOS,
  codificar,
  decodificar,
  diferenca,
  ganhouClaro,
  novaSessao,
  proximaEtapa,
  resumir,
  situacaoDoEfeito,
  type Capacidade,
  type Efeito,
  type Etapa,
  type Resultado,
  type Rodada,
  type Sessao,
} from './estatistica';

const QUALIDADES: Qualidade[] = ['baixa', 'media', 'alta', 'ultra'];
/** Aquecimento depois de a cena ficar pronta e os pedaços pararem de chegar (s). */
const AQUECER_PADRAO = 5;
const SEGUNDOS_PADRAO = 25;
/** Volta da câmera: rad/s (uma volta em ~31 s). */
const GIRO = 0.2;
const PRAZO_ETAPA_MS = 240_000;

const NOMES: Record<Rodada, string> = {
  webgl2: 'WebGL2 (hoje)',
  webgpu: 'WebGPU',
  snapshot: 'WebGPU + snapshot',
};

interface Parametros {
  etapa: Etapa | null;
  segundos: number;
  aquecer: number;
  escala: number | null;
  qualidade: Qualidade;
  semWebgpu: boolean;
  /** Testes no contêiner: o WebGPU em modo de compatibilidade (sobre o OpenGL ES). */
  compat: boolean;
  /** Efeitos desligados de propósito nos dois modos (`&desligar=água,céu`), para isolar defeitos. */
  desligar: string[];
}

function lerParametros(): Parametros {
  const p = new URLSearchParams(location.search);
  const etapa = p.get('etapa');
  const qualidade = p.get('qualidade') as Qualidade | null;
  const escala = Number(p.get('escala'));
  return {
    etapa: (['conferir', 'webgl2', 'webgpu', 'snapshot'] as const).find((e) => e === etapa) ?? null,
    segundos: Math.min(60, Math.max(3, Number(p.get('segundos')) || SEGUNDOS_PADRAO)),
    aquecer: Math.min(30, Math.max(1, Number(p.get('aquecer')) || AQUECER_PADRAO)),
    escala: escala > 0 ? escala : null,
    qualidade: qualidade && QUALIDADES.includes(qualidade) ? qualidade : 'alta',
    // testes: finge um aparelho sem WebGPU
    semWebgpu: p.get('semwebgpu') === '1',
    compat: p.get('compat') === '1',
    desligar: (p.get('desligar') ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter((x) => DESLIGAVEIS.includes(x)),
  };
}

// ------------------------------------------------------------------ o aparelho tem WebGPU?

interface GpuNavegador {
  requestAdapter(o?: unknown): Promise<{
    info?: Record<string, string>;
    requestAdapterInfo?: () => Promise<Record<string, string>>;
  } | null>;
}

/** O pedido de placa (com `&compat=1`, o modo de compatibilidade dos testes no contêiner). */
const pedidoPlaca = (compat: boolean) => (compat ? { compatibilityMode: true } : {});

async function verCapacidade(semWebgpu: boolean, compat: boolean): Promise<Capacidade> {
  if (semWebgpu) return { webgpu: false, motivo: 'desligado para teste (semwebgpu=1)' };
  const gpu = (navigator as unknown as { gpu?: GpuNavegador }).gpu;
  if (!gpu) return { webgpu: false, motivo: 'este navegador não tem WebGPU (navigator.gpu)' };
  try {
    const adaptador = await Promise.race([
      gpu.requestAdapter(pedidoPlaca(compat)),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    if (!adaptador) return { webgpu: false, motivo: 'o navegador não entregou placa de vídeo' };
    let info: Record<string, string> | undefined = adaptador.info;
    if (!info && adaptador.requestAdapterInfo)
      info = await adaptador.requestAdapterInfo().catch(() => undefined);
    const partes = info
      ? [info.vendor, info.architecture, info.device, info.description].filter((x) => x)
      : [];
    const nome = partes.join(' · ') || undefined;
    return {
      webgpu: true,
      adaptador: compat ? `compatibilidade${nome ? ` · ${nome}` : ''}` : nome,
    };
  } catch (e) {
    return { webgpu: false, motivo: `pedir a placa falhou: ${texto(e)}` };
  }
}

const texto = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 160);

// ------------------------------------------------------------------------- estilo e telas

const CSS = `
.medida{position:fixed;inset:0;overflow:auto;background:#10263b;color:#fff;
  font:20px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;padding:18px 16px 40px;
  box-sizing:border-box;-webkit-user-select:text;user-select:text;z-index:10}
.medida h1{font-size:30px;margin:0 0 6px}
.medida .sub{opacity:.8;font-size:16px;margin:0 0 14px}
.medida .cap{font-size:24px;font-weight:700;padding:12px 14px;border-radius:14px;margin:0 0 14px}
.medida .sim{background:#1f7a46}.medida .nao{background:#8a3b2a}
.medida .cartoes{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 14px}
.medida .cartao{background:#1c3c5a;border-radius:16px;padding:12px 14px}
.medida .cartao h2{font-size:20px;margin:0 0 4px}
.medida .fps{font-size:52px;font-weight:800;line-height:1.05}
.medida .fps small{font-size:18px;font-weight:600;opacity:.8}
.medida .linha{font-size:18px;margin-top:4px}
.medida .falhou{color:#ffb4a2;font-weight:700}
.medida .ganho{font-size:26px;font-weight:800;padding:10px 14px;border-radius:14px;background:#2c4f72;margin:0 0 14px}
.medida .rotulo{font-size:14px;opacity:.75}
.medida ul{margin:4px 0 14px;padding-left:22px;font-size:17px}
.medida button{font:inherit;font-size:26px;font-weight:800;padding:16px 26px;border-radius:18px;
  border:0;background:#ffd34d;color:#10263b;min-width:240px;margin:6px 0 14px}
.medida-marca{position:fixed;left:10px;top:10px;z-index:10;background:rgba(0,0,0,.55);color:#fff;
  font:700 20px/1.2 system-ui,sans-serif;padding:8px 12px;border-radius:12px;pointer-events:none}
`;

function estilo(): void {
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classe?: string,
  conteudo?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (conteudo !== undefined) e.textContent = conteudo;
  return e;
}

function infoAparelho(s: Sessao): string {
  const dpr = window.devicePixelRatio || 1;
  return (
    `Tela ${window.innerWidth}×${window.innerHeight} (densidade ${Math.round(dpr * 100) / 100}) · ` +
    `nitidez ${s.escala} · qualidade ${s.qualidade} · ${s.segundos} s por rodada`
  );
}

function linhaCapacidade(cap: Capacidade): HTMLElement {
  return cap.webgpu
    ? el('p', 'cap sim', `✔ Este aparelho tem WebGPU${cap.adaptador ? ` (${cap.adaptador})` : ''}`)
    : el('p', 'cap nao', `✘ Sem WebGPU: ${cap.motivo ?? 'não disponível'}. Mede só o WebGL2.`);
}

/** Tela inicial: se tem WebGPU e o botão de começar. */
async function telaInicio(app: HTMLElement, p: Parametros): Promise<void> {
  const raiz = el('div', 'medida');
  raiz.dataset.tela = 'inicio';
  raiz.append(el('h1', undefined, 'Medida WebGPU'), el('p', 'sub', 'Conferindo o aparelho…'));
  app.appendChild(raiz);
  tirarCarregando();
  const cap = await verCapacidade(p.semWebgpu, p.compat);
  const toque = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  // a nitidez com que o jogo começa (no celular, o degrau de início; nada de ajuste sozinho)
  const base = escalaBase(window.innerWidth, window.devicePixelRatio || 1, toque);
  const escala = p.escala ?? (toque && base < 1 ? Math.max(base, ESCALA_INICIO_TOQUE) : base);
  const s = novaSessao(cap, escala, p.qualidade, p.segundos);
  s.desligados = [...p.desligar];
  raiz.replaceChildren(
    el('h1', undefined, 'Medida WebGPU'),
    el('p', 'sub', infoAparelho(s)),
    linhaCapacidade(cap),
    el(
      'p',
      undefined,
      cap.webgpu
        ? 'A mesma cena da Cidade Grande roda no modo de hoje (WebGL2), depois no WebGPU e no WebGPU com snapshot. Leva uns 3 minutos. Não mexa na tela; no fim aparece o resultado para tirar uma foto.'
        : 'A cena da Cidade Grande roda no modo de hoje (WebGL2). Leva cerca de 1 minuto.',
    ),
  );
  const botao = el('button', undefined, 'Começar a medida');
  botao.dataset.comecar = '';
  botao.addEventListener('click', () => irPara(s, proximaEtapa(cap, null)));
  raiz.appendChild(botao);
  raiz.appendChild(
    el('p', 'rotulo', 'As medidas ficam só neste aparelho: nada é gravado nem enviado.'),
  );
}

/** Vai para a etapa (página nova) ou para o resultado. */
function irPara(s: Sessao, etapa: Etapa | null): void {
  const u = new URL(location.href);
  u.searchParams.set('medir', 'webgpu');
  u.searchParams.set('escala', String(s.escala));
  if (etapa) u.searchParams.set('etapa', etapa);
  else u.searchParams.set('etapa', 'fim');
  s.andando = undefined;
  u.hash = codificar(s);
  navegar(u.toString());
}

function cartao(nome: string, r: Resultado | undefined, rotulo?: string): HTMLElement {
  const c = el('div', 'cartao');
  c.append(el('h2', undefined, nome));
  if (rotulo) c.append(el('div', 'rotulo', rotulo));
  if (!r) {
    c.append(el('div', 'linha', 'não rodou'));
    return c;
  }
  if (!r.ok) {
    c.dataset.falhou = '';
    c.append(el('div', 'linha falhou', `Falhou: ${r.erro ?? '?'}`));
    return c;
  }
  if (r.errosMotor)
    c.append(
      el('div', 'linha falhou', `${r.errosMotor} erros da placa: quadros podem ter sido perdidos`),
    );
  const fps = el('div', 'fps', String(r.fps));
  fps.append(el('small', undefined, ' quadros/s'));
  c.append(
    fps,
    el('div', 'linha', `Tempo por quadro: ${r.medianaMs} ms (mediana)`),
    el('div', 'linha', `Pior 5%: ${r.p95Ms} ms`),
    el(
      'div',
      'linha',
      r.cpuMs !== undefined
        ? `Processador: ${r.cpuMs} ms por quadro (mediana ${r.cpuMedianaMs})`
        : 'Processador: sem medida',
    ),
    el(
      'div',
      'rotulo',
      `${r.quadros} quadros em ${r.segundos} s · ${r.ativas ?? '?'} malhas` +
        (r.recomecos !== undefined ? ` · ${r.recomecos} regravações` : '') +
        (r.errosMotor ? ` · ${r.errosMotor} erros do motor` : '') +
        (r.placa ? ` · ${r.placa}` : ''),
    ),
  );
  return c;
}

const SITUACAO: Record<ReturnType<typeof situacaoDoEfeito>, string> = {
  convertido: 'converteu e roda no WebGPU',
  desligado: 'NÃO converteu: desligado nos dois modos',
  ausente: 'não apareceu na cena medida',
  fora: 'fora desta cena (tem motor WebGL próprio ou só liga no modo foto)',
};

function telaResultado(app: HTMLElement, s: Sessao): void {
  const raiz = el('div', 'medida');
  raiz.dataset.tela = 'resultado';
  const gl = s.res.webgl2;
  const gpu = s.res.webgpu;
  raiz.append(
    el('h1', undefined, 'Medida WebGPU: resultado'),
    el('p', 'sub', infoAparelho(s)),
    linhaCapacidade(s.cap),
  );
  const q = gl?.ok && gpu?.ok ? diferenca(gl.fps, gpu.fps) : null;
  const c = gl?.ok && gpu?.ok ? diferenca(gl.cpuMs, gpu.cpuMs) : null;
  if (q !== null || c !== null) {
    const claro = ganhouClaro(gl, gpu);
    const sinal = (v: number) => (v > 0 ? `+${v}` : String(v));
    raiz.append(
      el(
        'div',
        'ganho',
        `WebGPU: ${q !== null ? `${sinal(q)}% quadros` : ''}${q !== null && c !== null ? ', ' : ''}` +
          `${c !== null ? `${sinal(c)}% processador` : ''}` +
          (claro ? ' · ganhou claro (15%+)' : ' · sem ganho claro'),
      ),
    );
  }
  const cartoes = el('div', 'cartoes');
  cartoes.append(cartao(NOMES.webgl2, gl));
  if (s.cap.webgpu) {
    cartoes.append(cartao(NOMES.webgpu, gpu));
    cartoes.append(cartao(NOMES.snapshot, s.res.snapshot, 'experimental, à parte'));
  }
  raiz.append(cartoes);
  if (s.cap.webgpu) {
    raiz.append(el('div', 'rotulo', 'Efeitos escritos à mão (GLSL) no WebGPU:'));
    const ul = el('ul');
    for (const e of EFEITOS) {
      const sit = situacaoDoEfeito(s, e);
      const li = el(
        'li',
        undefined,
        `${e}: ${sit === 'desligado' && !s.errosEfeito[e] ? 'desligado de propósito nos dois modos' : SITUACAO[sit]}`,
      );
      li.dataset.efeito = e;
      li.dataset.situacao = situacaoDoEfeito(s, e);
      ul.append(li);
    }
    for (const [nome, erro] of Object.entries(s.errosEfeito))
      if (!(EFEITOS as readonly string[]).includes(nome))
        ul.append(
          el(
            'li',
            'falhou',
            `${nome}: shader do Babylon falhou no WebGPU` +
              (s.desligados.includes(nome) ? ', desligado nos dois modos' : '') +
              ` (${erro.slice(0, 90)})`,
          ),
        );
    for (const e of EFEITOS)
      if (s.errosEfeito[e])
        ul.append(el('li', 'rotulo', `${e}: ${s.errosEfeito[e].slice(0, 140)}`));
    raiz.append(ul);
  }
  raiz.append(
    el(
      'p',
      'rotulo',
      'Tire uma foto desta tela e mande. Os números ficam só aqui; recarregar a página mostra o mesmo resultado.',
    ),
  );
  const botao = el('button', undefined, 'Medir de novo');
  botao.addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.delete('etapa');
    u.hash = '';
    navegar(u.toString());
  });
  raiz.append(botao);
  app.appendChild(raiz);
  raiz.dataset.pronto = '';
  tirarCarregando();
}

// ------------------------------------------------------------ efeitos: conversão e desligar

/**
 * O que a página sabe desligar nos dois modos: os efeitos à mão e, do Babylon, as partículas e
 * o brilho (GlowLayer).
 */
const DESLIGAVEIS: readonly string[] = [...EFEITOS, 'partículas', 'brilho'];

/** Os plugins de material do jogo (GLSL): no WebGPU, o material deles vai por GLSL convertido. */
const PLUGINS: Record<string, Efeito> = {
  Mundo: 'materialMundo',
  Balanco: 'balanço',
  Plastico: 'formas',
};
const SHADERS: Record<string, Efeito> = { agua: 'água', ceu: 'céu', horizonte: 'horizonte' };
/** Shaders do próprio Babylon no brilho e no pós-processo da cena (WGSL dele no WebGPU). */
const BRILHO = /^(glowMap|glowBlur)/i;
const POS =
  /^(kernelBlur|imageProcessing|fxaa|extractHighlights|bloom|depthOfField|circleOfConfusion|chromaticAberration|grain|sharpen|pass|convolution|blur)/i;

/**
 * Os materiais que recebem um plugin do jogo passam a usar GLSL (convertido pelo glslang +
 * twgsl). Sem isso o Babylon escolheria o WGSL dele e o código GLSL do plugin quebraria.
 * Os outros materiais seguem no WGSL do Babylon.
 */
function forcarGlslNosPlugins(): void {
  const proto = MaterialPluginManager.prototype as unknown as {
    _addPlugin(this: { _material: Material }, p: MaterialPluginBase): boolean;
  };
  const original = proto._addPlugin;
  proto._addPlugin = function (plugin) {
    if (PLUGINS[plugin.name]) {
      const m = this._material as unknown as {
        _forceGLSL: boolean;
        _shaderLanguage: number;
        _createUniformBuffer(): void;
      };
      if (m._shaderLanguage !== 0) {
        m._forceGLSL = true;
        m._shaderLanguage = 0;
        m._createUniformBuffer();
      }
    }
    return original.call(this, plugin);
  };
}

function nomeDoShader(ef: Effect): string {
  const n = ef.name as unknown;
  if (typeof n === 'string') return n;
  const o = n as { vertex?: string; fragment?: string; vertexElement?: string };
  return String(o?.vertex ?? o?.fragment ?? o?.vertexElement ?? '?');
}

/** De que efeitos do jogo é este shader (pelo nome e pelas marcas dos plugins). */
function efeitosDoShader(ef: Effect): string[] {
  const nome = nomeDoShader(ef);
  const d = String(ef.defines ?? '');
  const out: string[] = [];
  for (const [k, e] of Object.entries(SHADERS)) if (nome === k) out.push(e);
  if (/#define MUNDO\b/.test(d)) out.push('materialMundo');
  if (/#define BALANCO\b/.test(d)) out.push('balanço');
  if (/#define PLASTICO\b/.test(d)) out.push('formas');
  if (!out.length && BRILHO.test(nome)) out.push('brilho');
  if (!out.length && POS.test(nome)) out.push('pós-processos');
  if (!out.length && /^particles/i.test(nome)) out.push('partículas');
  if (!out.length) out.push(`outro: ${nome}`);
  return out;
}

interface ModuloGpu {
  getCompilationInfo?(): Promise<{
    messages: readonly { type: string; message: string; lineNum: number }[];
  }>;
}

/**
 * Vigia cada shader criado no motor: anota o que converteu e o que falhou. A conversão pode
 * "dar certo" no Babylon e o WGSL sair inválido na placa (o erro só aparece no dispositivo, sem
 * o Babylon saber): por isso cada módulo é conferido com getCompilationInfo e o erro volta ao
 * efeito dono dele.
 */
function vigiarShaders(motor: WebGPUEngine, conv: Set<string>, erros: Map<string, string>): void {
  const vistos: Effect[] = [];
  const anotar = (efeitos: string[], msg: string) => {
    for (const e of efeitos) if (!erros.has(e)) erros.set(e, msg.slice(0, 200));
  };
  const m = motor as unknown as {
    createEffect: (...a: unknown[]) => Effect;
    _preparePipelineContext: (...a: unknown[]) => Promise<void>;
  };
  const criar = m.createEffect.bind(motor);
  m.createEffect = (...a: unknown[]) => {
    const ef = criar(...a);
    try {
      if (!vistos.includes(ef)) vistos.push(ef);
      ef.onErrorObservable.add(() =>
        anotar(efeitosDoShader(ef), ef.getCompilationError() || 'erro sem detalhe'),
      );
      ef.executeWhenCompiled(() => {
        for (const e of efeitosDoShader(ef)) if (!e.startsWith('outro:')) conv.add(e);
      });
    } catch {
      // vigiar é de boa-fé
    }
    return ef;
  };
  const preparar = m._preparePipelineContext.bind(motor);
  m._preparePipelineContext = (...a: unknown[]) => {
    const ctx = a[0] as { stages?: Record<string, { module?: ModuloGpu }> };
    const defines = String(a[7] ?? '');
    const pronto = a[10] as () => void;
    a[10] = () => {
      try {
        for (const [estagio, st] of Object.entries(ctx.stages ?? {}))
          st.module
            ?.getCompilationInfo?.()
            .then((info) => {
              const erro = info.messages.find((x) => x.type === 'error');
              if (!erro) return;
              const ef = vistos.find(
                (x) => (x as unknown as { _pipelineContext?: unknown })._pipelineContext === ctx,
              );
              const efeitos = ef
                ? efeitosDoShader(ef)
                : efeitosDoShader({ name: '?', defines } as unknown as Effect);
              const nome = ef ? nomeDoShader(ef) : '?';
              anotar(
                efeitos,
                `${nome}, ${estagio === 'vertexStage' ? 'vértice' : 'fragmento'}: ${erro.message}`,
              );
            })
            .catch(() => undefined);
      } catch {
        // conferir é de boa-fé
      }
      pronto();
    };
    return preparar(...a);
  };
}

/**
 * Desliga os plugins de material pedidos antes de a cena montar (igual nos dois modos): o
 * plugin fica, mas sem código, sem uniformes e sem marcas (o material sai como o padrão).
 */
function desligarPlugins(lista: readonly string[]): void {
  const classes: [Efeito, { prototype: object }][] = [
    ['materialMundo', PluginMundo],
    ['balanço', PluginBalanco],
    ['formas', PluginPlastico],
  ];
  const base = MaterialPluginBase.prototype as unknown as Record<string, unknown>;
  for (const [efeito, classe] of classes) {
    if (!lista.includes(efeito)) continue;
    const proto = classe.prototype as Record<string, unknown>;
    for (const m of [
      'getCustomCode',
      'getUniforms',
      'bindForSubMesh',
      'prepareDefines',
      'getAttributes',
    ])
      proto[m] = base[m];
  }
}

/** Desliga os shaders e o pós-processo pedidos (igual nos dois modos). De tempos em tempos. */
function desligarEfeitos(scene: Scene, lista: readonly string[]): void {
  if (!lista.length) return;
  const shaders = Object.entries(SHADERS)
    .filter(([, e]) => lista.includes(e))
    .map(([n]) => n);
  if (shaders.length)
    for (const malha of scene.meshes as AbstractMesh[]) {
      const mat = malha.material as unknown as {
        getClassName(): string;
        shaderPath?: unknown;
      } | null;
      if (mat?.getClassName() !== 'ShaderMaterial') continue;
      const sp = mat.shaderPath as { vertex?: string } | string | undefined;
      const nome = typeof sp === 'string' ? sp : sp?.vertex;
      if (nome && shaders.includes(nome)) malha.isVisible = false;
    }
  if (lista.includes('partículas')) scene.particlesEnabled = false;
  if (lista.includes('brilho')) for (const l of scene.effectLayers) l.isEnabled = false;
  if (lista.includes('pós-processos')) {
    scene.postProcessesEnabled = false;
    for (const l of scene.effectLayers) l.isEnabled = false;
  }
}

// ---------------------------------------------------------------------------- uma rodada

async function esperar(cond: () => boolean, prazoMs: number, passoMs = 200): Promise<boolean> {
  const fim = performance.now() + prazoMs;
  while (performance.now() < fim) {
    if (cond()) return true;
    await new Promise((r) => setTimeout(r, passoMs));
  }
  return cond();
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** O motor WebGPU com o conversor servido daqui mesmo (nada de outro site). */
async function criarWebGPU(canvas: HTMLCanvasElement, compat: boolean): Promise<WebGPUEngine> {
  const url = (f: string) => new URL(`/medir/${f}`, location.href).href;
  const glslangOptions = { jsPath: url('glslang.js'), wasmPath: url('glslang.wasm') };
  const twgslOptions = { jsPath: url('twgsl.js'), wasmPath: url('twgsl.wasm') };
  const motor = new WebGPUEngine(canvas, {
    antialias: false,
    stencil: true,
    adaptToDeviceRatio: false,
    glslangOptions,
    twgslOptions,
    // o pedido vai direto ao requestAdapter do navegador
    ...(pedidoPlaca(compat) as object),
  });
  await motor.initAsync(glslangOptions, twgslOptions);
  return motor;
}

async function rodar(app: HTMLElement, etapa: Etapa, s: Sessao, p: Parametros): Promise<void> {
  // marca a etapa começada: se a página cair (memória), a volta para cá conta como falha
  s.andando = etapa;
  history.replaceState(null, '', `${location.pathname}${location.search}#${codificar(s)}`);
  const marca = el('div', 'medida-marca', 'Preparando…');
  document.body.appendChild(marca);
  const total = s.cap.webgpu ? 4 : 1;
  const numero =
    (s.cap.webgpu ? ['conferir', 'webgl2', 'webgpu', 'snapshot'] : ['webgl2']).indexOf(etapa) + 1;
  const titulo = etapa === 'conferir' ? 'conferindo os efeitos no WebGPU' : NOMES[etapa];
  const mostrar = (t: string) => {
    marca.textContent = `Medida ${numero} de ${total}: ${titulo} · ${t}`;
  };
  mostrar('abrindo');

  let errosPagina = 0;
  let medindoAgora = false;
  let avisados = 0;
  window.addEventListener('error', () => errosPagina++);
  window.addEventListener('unhandledrejection', () => errosPagina++);
  let errosAntes = Logger.errorsCount;

  const canvas = document.createElement('canvas');
  canvas.id = 'cena';
  Object.assign(canvas.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    display: 'block',
    outline: 'none',
  });
  const ajustar = () => {
    const { largura, altura } = tamanhoDoCanvas(medirJanela());
    canvas.style.width = `${largura}px`;
    canvas.style.height = `${altura}px`;
  };
  ajustar();
  window.addEventListener('resize', ajustar);
  app.appendChild(canvas);
  tirarCarregando();

  const gpu = etapa !== 'webgl2';
  let motor: WebGPUEngine | undefined;
  const conv = new Set<string>();
  const erros = new Map<string, string>();
  if (gpu) {
    try {
      forcarGlslNosPlugins();
      motor = await criarWebGPU(canvas, p.compat);
      vigiarShaders(motor, conv, erros);
      (motor as unknown as { _device?: EventTarget })._device?.addEventListener(
        'uncapturederror',
        (ev) => {
          errosPagina++;
          // testes: os primeiros erros da placa durante a medida, para saber de onde vêm
          if (medindoAgora && avisados++ < 5)
            console.warn(
              '[medida] erro da placa:',
              String((ev as unknown as { error?: { message?: string } }).error?.message).slice(
                0,
                400,
              ),
            );
        },
      );
    } catch (e) {
      return terminar(s, etapa, { ok: false, erro: `o WebGPU não abriu: ${texto(e)}` });
    }
  }

  desligarPlugins(s.desligados);
  // o mundo da medida: só na memória (sem repositório, nada é salvo)
  ativarTema('cidade-grande');
  const mundo: MetaMundo = {
    id: 'medida-webgpu',
    nome: 'Medida',
    semente: SEMENTE_PADRAO_MUNDO,
    modo: 'criativo',
    criadoEm: 0,
    jogadoEm: 0,
    tema: 'cidade-grande',
    versao: 2,
  };
  // configuração fixa, só na memória (a do aparelho fica como está)
  const memoria = new Map<string, string>([
    [CHAVE_CONFIG, JSON.stringify({ qualidade: s.qualidade, distancia: 3, mostrarFps: false })],
  ]);
  const config = criarGerenciadorConfig({
    getItem: (k) => memoria.get(k) ?? null,
    setItem: (k, v) => void memoria.set(k, v),
  });
  let cena: ReturnType<typeof criarCena>;
  try {
    cena = criarCena(canvas, undefined, { mundo, config, motor });
  } catch (e) {
    motor?.dispose();
    return terminar(s, etapa, { ok: false, erro: `a cena não montou: ${texto(e)}` });
  }
  const engine = cena.engine;
  const scene = cena.scene;
  const e = cena.estado;
  // desligados desde o começo (o que não converte nem chega a tentar desenhar)
  desligarEfeitos(scene, s.desligados);
  const religar = setInterval(() => desligarEfeitos(scene, s.desligados), 1000);

  const prazo = setTimeout(() => {
    liberarEngine(engine);
    terminar(s, etapa, { ok: false, erro: 'passou do prazo (4 min)' });
  }, PRAZO_ETAPA_MS);

  const pronta = await esperar(() => e.ready, 180_000);
  if (!pronta) {
    clearTimeout(prazo);
    liberarEngine(engine);
    return terminar(s, etapa, { ok: false, erro: 'a cena não ficou pronta' });
  }
  e.pausarDia = true;
  e.hora = 0.42;
  e.definirClima?.('limpo');
  const c = e.cidade?.();
  const yaw0 = c?.nascimento.olhar ?? 0;
  // voando sobre o cruzamento mais central, olhando ao longo das ruas: os prédios, os carros
  // e os moradores (a câmera não bate em parede ao girar)
  const pitch = -0.2;
  e.voar?.(true);
  if (c) {
    const mx = (c.plana.x0 + c.plana.x1) / 2;
    const mz = (c.plana.z0 + c.plana.z1) / 2;
    const meio = (r: { x0: number; z0: number; x1: number; z1: number }) => [
      (r.x0 + r.x1) / 2,
      (r.z0 + r.z1) / 2,
    ];
    const cruz = [...c.cruzamentos].sort((a, b) => {
      const [ax, az] = meio(a.caixa);
      const [bx, bz] = meio(b.caixa);
      return Math.hypot(ax - mx, az - mz) - Math.hypot(bx - mx, bz - mz);
    })[0];
    const [x, z] = cruz ? meio(cruz.caixa) : [c.nascimento.x, c.nascimento.z];
    e.teleportar?.(x, z, c.h + 6);
  }
  e.apontar?.(yaw0, pitch);

  // a câmera gira igual em toda rodada (o ângulo segue o relógio da rodada)
  let t0 = performance.now();
  // `&girar=0`: câmera parada (para separar defeito de desenho de rastro do giro)
  const giro = new URLSearchParams(location.search).get('girar') === '0' ? 0 : GIRO;
  engine.onBeginFrameObservable.add(() => {
    e.apontar?.(yaw0 + ((performance.now() - t0) / 1000) * giro, pitch);
  });

  // os pedaços do mundo param de chegar (3 s sem mudar, no máximo 60 s)
  mostrar('carregando o mundo');
  let antes = -1;
  let parado = 0;
  await esperar(
    () => {
      const n = e.chunksCarregados;
      parado = n === antes ? parado + 1 : 0;
      antes = n;
      return parado >= 6 && n > 4;
    },
    60_000,
    500,
  );

  if (etapa === 'conferir') {
    mostrar('conferindo');
    await pausa(4000);
    clearInterval(religar);
    clearTimeout(prazo);
    s.convertidos = [...conv].filter((e) => !erros.has(e));
    for (const [k, v] of erros) s.errosEfeito[k] = v;
    for (const k of erros.keys())
      if (DESLIGAVEIS.includes(k) && !s.desligados.includes(k)) s.desligados.push(k);
    liberarEngine(engine);
    return irPara(s, proximaEtapa(s.cap, etapa));
  }

  // snapshot (só WebGPU): grava o desenho e repete; regrava quando a cena muda
  let recomecos = 0;
  if (etapa === 'snapshot' && motor) {
    const m = motor;
    let assinatura = '';
    scene.onBeforeRenderObservable.add(() => {
      if (!m.snapshotRendering) return;
      const a = `${scene.meshes.length}:${scene.getActiveMeshes().length}`;
      if (a !== assinatura) {
        if (assinatura) {
          m.snapshotRenderingReset();
          recomecos++;
        }
        assinatura = a;
      }
    });
    // uma regravação errada não pode travar a rodada: refaz e segue
    const render = scene.render.bind(scene);
    scene.render = (u?: boolean, i?: boolean) => {
      try {
        render(u, i);
      } catch {
        m.snapshotRenderingReset();
        recomecos++;
      }
    };
  }

  // aquecimento girando, depois a medida
  t0 = performance.now();
  for (let i = p.aquecer; i > 0; i--) {
    mostrar(`aquecendo ${i} s`);
    await pausa(1000);
  }
  if (etapa === 'snapshot' && motor) {
    motor.snapshotRenderingMode = Constants.SNAPSHOTRENDERING_STANDARD;
    motor.snapshotRendering = true;
    await pausa(500);
    recomecos = 0;
  }
  const intervalos: number[] = [];
  const cpu: number[] = [];
  let inicioQuadro = 0;
  let ultimo = 0;
  let somaAtivas = 0;
  let medindo = true;
  const aoComecar = engine.onBeginFrameObservable.add(() => {
    const agora = performance.now();
    if (ultimo) intervalos.push(agora - ultimo);
    ultimo = agora;
    inicioQuadro = agora;
  });
  const aoTerminar = engine.onEndFrameObservable.add(() => {
    if (!inicioQuadro || !medindo) return;
    cpu.push(performance.now() - inicioQuadro);
    somaAtivas += scene.getActiveMeshes().length;
  });
  const comeco = performance.now();
  // os erros que contam são os da medida (os da carga do mundo não)
  errosAntes = Logger.errorsCount;
  errosPagina = 0;
  medindoAgora = true;
  const fimMedida = comeco + s.segundos * 1000;
  while (performance.now() < fimMedida) {
    mostrar(`medindo ${Math.ceil((fimMedida - performance.now()) / 1000)} s`);
    await pausa(1000);
  }
  medindo = false;
  const segundos = (ultimo - comeco) / 1000;
  engine.onBeginFrameObservable.remove(aoComecar);
  engine.onEndFrameObservable.remove(aoTerminar);
  clearInterval(religar);
  clearTimeout(prazo);
  const placa = gpu ? s.cap.adaptador : (engine as unknown as Engine).getGlInfo?.().renderer;
  const r: Resultado = {
    ok: true,
    ...resumir(intervalos, cpu, segundos),
    ativas: cpu.length ? Math.round(somaAtivas / cpu.length) : undefined,
    errosMotor: Logger.errorsCount - errosAntes + errosPagina,
    ...(etapa === 'snapshot' ? { recomecos } : {}),
    placa: placa || undefined,
  };
  if (r.quadros === 0) Object.assign(r, { ok: false, erro: 'nenhum quadro desenhado' });
  // testes de tela: um quadro desta rodada antes de soltar o motor
  (window as unknown as { __medidaQuadro?: string }).__medidaQuadro = etapa;
  const segurar = new URLSearchParams(location.search).get('segurar');
  if (segurar) await pausa(Math.min(20_000, Number(segurar) || 0));
  liberarEngine(engine);
  terminar(s, etapa, r);
}

let terminou = false;

/** Guarda o resultado da etapa e segue para a próxima que ainda não tem resultado. */
function terminar(s: Sessao, etapa: Etapa, r: Resultado): void {
  if (terminou) return;
  terminou = true;
  if (etapa !== 'conferir') s.res[etapa] = r;
  else if (!r.ok) {
    // sem a conferência o WebGPU nem abriu: as rodadas dele ficam com o mesmo motivo
    s.res.webgpu = r;
    s.res.snapshot = { ok: false, erro: 'o WebGPU falhou antes' };
  }
  // o WebGPU falhou: o snapshot (que depende dele) nem tenta
  if (etapa === 'webgpu' && !r.ok) s.res.snapshot = { ok: false, erro: 'o WebGPU falhou antes' };
  let prox = proximaEtapa(s.cap, etapa);
  while (prox && prox !== 'conferir' && s.res[prox]) prox = proximaEtapa(s.cap, prox);
  irPara(s, prox);
}

/** A entrada da página de medida (chamada pelo main.ts só com `?medir=webgpu`). */
export async function medirWebGPU(app: HTMLElement): Promise<void> {
  estilo();
  document.title = 'Terrário · medida WebGPU';
  const p = lerParametros();
  const s = decodificar(location.hash);
  const etapaUrl = new URLSearchParams(location.search).get('etapa');
  if (!s || (!p.etapa && etapaUrl !== 'fim')) return telaInicio(app, p);
  if (etapaUrl === 'fim' || !p.etapa) return telaResultado(app, s);
  // voltou a uma etapa já começada: a página caiu no meio (falta de memória?)
  if (s.andando === p.etapa)
    return terminar(s, p.etapa, { ok: false, erro: 'a página recarregou no meio (memória?)' });
  try {
    await rodar(app, p.etapa, s, p);
  } catch (e) {
    terminar(s, p.etapa, { ok: false, erro: texto(e) });
  }
}
