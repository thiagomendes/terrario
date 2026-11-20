/**
 * Registra todos os temas. Cada pacote fica em src/temas/<id>/ e exporta um construtor;
 * importar este arquivo deixa todos disponíveis em obterTema() (a ordem dos cartões fica em
 * `index.ts`).
 */
import { registrarTema } from './index';
import { construirDoceReino } from './doce-reino';
import { construirExploracaoLunar } from './exploracao-lunar';
import { construirRanchoAlegre } from './rancho-alegre';
import { construirCidadeGrande } from './cidade-grande';
import { construirVilaNeon } from './vila-neon';

registrarTema('vila-neon', construirVilaNeon);
registrarTema('cidade-grande', construirCidadeGrande);
registrarTema('rancho-alegre', construirRanchoAlegre);
registrarTema('doce-reino', construirDoceReino);
registrarTema('exploracao-lunar', construirExploracaoLunar);
