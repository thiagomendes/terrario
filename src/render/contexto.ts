import { paginaLiberada, recarregar } from '../pagina';

/**
 * O navegador tirou o contexto WebGL (memória apertada no celular, placa de vídeo reiniciada):
 * em vez da tela parada, um aviso; o Babylon reconstrói tudo quando o contexto volta. Se não
 * voltar em alguns segundos, o botão "Tentar de novo" salva e recarrega.
 */
export function ligarContextoPerdido(
  canvas: HTMLCanvasElement,
  salvar: () => Promise<unknown>,
  prazo = 6000,
): void {
  let aviso: HTMLDivElement | null = null;
  let espera: ReturnType<typeof setTimeout> | undefined;
  const tirar = () => {
    clearTimeout(espera);
    aviso?.remove();
    aviso = null;
  };
  canvas.addEventListener('webglcontextlost', () => {
    // quem soltou foi o próprio jogo, saindo da página
    if (paginaLiberada()) return;
    tirar();
    const a = document.createElement('div');
    a.setAttribute('data-contexto-perdido', '');
    a.setAttribute('role', 'status');
    a.style.cssText =
      'position:fixed;inset:0;z-index:900;display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;background:rgba(143,202,245,.92);color:#1f3b57;font:700 1.2rem system-ui,sans-serif;text-align:center;padding:16px';
    const t = document.createElement('p');
    t.textContent = 'A tela deu uma piscada… arrumando o mundo';
    a.appendChild(t);
    document.body.appendChild(a);
    aviso = a;
    espera = setTimeout(() => {
      t.textContent = 'O mundo não voltou sozinho';
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Tentar de novo';
      b.style.cssText =
        'min-height:56px;padding:0 28px;border:0;border-radius:18px;background:#ffb43b;color:#3a2406;font:inherit;font-size:1.3rem;box-shadow:0 5px 0 #c97f12';
      b.addEventListener('click', () => {
        b.disabled = true;
        void salvar()
          .catch(() => undefined)
          .finally(() => recarregar());
      });
      a.appendChild(b);
    }, prazo);
  });
  canvas.addEventListener('webglcontextrestored', () => tirar());
}
