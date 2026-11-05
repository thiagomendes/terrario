export interface EventosJogo {
  golpe: { x: number; y: number; z: number; bloco: number };
  quebra: { x: number; y: number; z: number; bloco: number };
  colocacao: { x: number; y: number; z: number; bloco: number };
  recusa: { motivo: string };
  slot: { indice: number };
}

export type NomeEvento = keyof EventosJogo;

export interface Barramento {
  ouvir<K extends NomeEvento>(nome: K, ouvinte: (dados: EventosJogo[K]) => void): () => void;
  emitir<K extends NomeEvento>(nome: K, dados: EventosJogo[K]): void;
}

export function criarBarramento(): Barramento {
  const ouvintes = new Map<NomeEvento, Set<(dados: never) => void>>();
  return {
    ouvir(nome, ouvinte) {
      let conjunto = ouvintes.get(nome);
      if (!conjunto) {
        conjunto = new Set();
        ouvintes.set(nome, conjunto);
      }
      const registrado = ouvinte as (dados: never) => void;
      conjunto.add(registrado);
      return () => {
        conjunto.delete(registrado);
      };
    },
    emitir(nome, dados) {
      const conjunto = ouvintes.get(nome);
      if (!conjunto) return;
      for (const ouvinte of [...conjunto]) {
        try {
          ouvinte(dados as never);
        } catch {
          // Um ouvinte com defeito não impede os demais.
        }
      }
    },
  };
}
