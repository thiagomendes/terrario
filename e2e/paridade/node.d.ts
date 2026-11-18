// Tipos mínimos do Node usados pelo gravador de paridade (o projeto não instala @types/node).
declare module 'node:fs' {
  export function existsSync(caminho: string): boolean;
  export function readFileSync(caminho: string, codificacao: 'utf8' | 'base64'): string;
  /** Spec 032: a folha de fotos lê a pasta das fotos. */
  export function readdirSync(caminho: string): string[];
  export function writeFileSync(caminho: string, dados: string): void;
  export function mkdirSync(caminho: string, opcoes?: { recursive?: boolean }): void;
}
