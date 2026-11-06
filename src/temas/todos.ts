/**
 * Registra todos os temas. Cada pacote fica em src/temas/<id>/ e exporta um construtor;
 * importar este arquivo deixa todos disponíveis em obterTema().
 */
import { registrarTema } from './index';
import { construirPlanetaVivo } from './planeta-vivo';
import { construirMataEncantada } from './mata-encantada';
import { construirDoceReino } from './doce-reino';
import { construirEraDosDinos } from './era-dos-dinos';
import { construirExploracaoLunar } from './exploracao-lunar';

registrarTema('planeta-vivo', construirPlanetaVivo);
registrarTema('mata-encantada', construirMataEncantada);
registrarTema('doce-reino', construirDoceReino);
registrarTema('era-dos-dinos', construirEraDosDinos);
registrarTema('exploracao-lunar', construirExploracaoLunar);
