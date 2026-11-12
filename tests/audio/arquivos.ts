import * as fs from 'node:fs';

// o projeto não instala os tipos do Node nos testes (e2e/paridade/node.d.ts declara só o texto)
const ler = fs.readFileSync as unknown as (caminho: string) => Uint8Array;

/** Os bytes de um arquivo do repositório. */
export function lerBytes(caminho: string): Uint8Array {
  return ler(caminho);
}

/** Uma cópia própria dos bytes (um ArrayBuffer só deles). */
export function lerArrayBuffer(caminho: string): ArrayBuffer {
  const b = ler(caminho);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

export function lerTexto(caminho: string): string {
  return fs.readFileSync(caminho, 'utf8');
}
