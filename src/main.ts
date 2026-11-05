import { criarCena } from './render/cena';
import { criarHotbar } from './player/hotbar';
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
  const hotbar = criarHotbar();
  criarInterface(app, hotbar);
  criarCena(canvas, hotbar);
}
