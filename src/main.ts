import { criarCena } from './render/cena';
import { criarInterface } from './ui/interface';

const app = document.getElementById('app');

if (app) {
  const canvas = document.createElement('canvas');
  canvas.id = 'cena';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.display = 'block';
  canvas.style.outline = 'none';
  app.appendChild(canvas);
  criarInterface(app);
  criarCena(canvas);
}
