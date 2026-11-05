import { criarCena } from './render/cena';

const app = document.getElementById('app');

if (app) {
  const canvas = document.createElement('canvas');
  canvas.id = 'cena';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.display = 'block';
  canvas.style.outline = 'none';
  app.appendChild(canvas);
  const titulo = document.createElement('h1');
  titulo.textContent = 'Brumaluz';
  titulo.style.position = 'fixed';
  titulo.style.top = '12px';
  titulo.style.left = '16px';
  titulo.style.margin = '0';
  titulo.style.font = '600 20px system-ui, sans-serif';
  titulo.style.color = '#f4d9a8';
  titulo.style.textShadow = '0 1px 4px #1b1230';
  titulo.style.pointerEvents = 'none';
  app.appendChild(titulo);
  criarCena(canvas);
}
