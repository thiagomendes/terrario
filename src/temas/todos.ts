/**
 * Registra todos os temas. Cada pacote fica em src/temas/<id>/ e exporta um construtor;
 * importar este arquivo deixa todos disponíveis em obterTema().
 */
import { registrarTema } from './index';
import { construirBrumaELuz } from './bruma-e-luz';
import { construirPlanetaVivo } from './planeta-vivo';
import { construirMataEncantada } from './mata-encantada';
import { construirDoceReino } from './doce-reino';
import { construirEraDosDinos } from './era-dos-dinos';
import { construirExploracaoLunar } from './exploracao-lunar';
import { construirRanchoAlegre } from './rancho-alegre';
import { construirCidadeGrande } from './cidade-grande';
import { construirVilaNeon } from './vila-neon';

registrarTema('vila-neon', construirVilaNeon);
registrarTema('cidade-grande', construirCidadeGrande);
registrarTema('rancho-alegre', construirRanchoAlegre);
registrarTema('doce-reino', construirDoceReino);
registrarTema('exploracao-lunar', construirExploracaoLunar);
// spec 034: os quatro que saem (até a T04 tirar)
registrarTema('bruma-e-luz', construirBrumaELuz);
registrarTema('planeta-vivo', construirPlanetaVivo);
registrarTema('mata-encantada', construirMataEncantada);
registrarTema('era-dos-dinos', construirEraDosDinos);
