/**
 * Armazém na Azure: blobs comprimidos no contêiner `mundos` e salas na tabela `salas`
 * do Storage Account. O acesso é pela identidade do próprio app (sem chave guardada).
 */
import { gzipSync, gunzipSync } from 'node:zlib';
import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import { TableClient } from '@azure/data-tables';
import { DefaultAzureCredential } from '@azure/identity';
import type { Armazem, JogadorGuardado, MundoGuardado, Sala } from './armazem';

export function armazemAzure(conta: string): Armazem {
  const credencial = new DefaultAzureCredential();
  const blobs: ContainerClient = new BlobServiceClient(
    `https://${conta}.blob.core.windows.net`,
    credencial,
  ).getContainerClient('mundos');
  const salas = new TableClient(`https://${conta}.table.core.windows.net`, 'salas', credencial);

  async function ler<T>(caminho: string): Promise<T | null> {
    try {
      const b = await blobs.getBlockBlobClient(caminho).downloadToBuffer();
      return JSON.parse(gunzipSync(b).toString('utf8')) as T;
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode === 404) return null;
      throw e;
    }
  }
  async function gravar(caminho: string, v: unknown): Promise<void> {
    const dados = gzipSync(Buffer.from(JSON.stringify(v), 'utf8'));
    await blobs.getBlockBlobClient(caminho).uploadData(dados, {
      blobHTTPHeaders: { blobContentType: 'application/json', blobContentEncoding: 'gzip' },
    });
  }

  return {
    async lerSala(codigo) {
      try {
        const e = await salas.getEntity<{ dados: string }>('sala', codigo);
        return JSON.parse(e.dados) as Sala;
      } catch (e) {
        if ((e as { statusCode?: number }).statusCode === 404) return null;
        throw e;
      }
    },
    async gravarSala(s) {
      await salas.upsertEntity(
        { partitionKey: 'sala', rowKey: s.codigo, dados: JSON.stringify(s) },
        'Replace',
      );
    },
    async apagarSala(codigo) {
      try {
        await salas.deleteEntity('sala', codigo);
      } catch (e) {
        if ((e as { statusCode?: number }).statusCode !== 404) throw e;
      }
    },
    lerMundo: (id) => ler<MundoGuardado>(`${id}/mundo.json.gz`),
    gravarMundo: (id, m) => gravar(`${id}/mundo.json.gz`, m),
    async lerRegioes(id) {
      const out: Record<string, Record<string, Array<[number, number]>>> = {};
      for await (const b of blobs.listBlobsFlat({ prefix: `${id}/regioes/` })) {
        const r = b.name.slice(`${id}/regioes/`.length).replace(/\.json\.gz$/, '');
        const v = await ler<Record<string, Array<[number, number]>>>(b.name);
        if (v) out[r] = v;
      }
      return out;
    },
    gravarRegiao: (id, r, e) => gravar(`${id}/regioes/${r}.json.gz`, e),
    lerJogador: (m, j) => ler<JogadorGuardado>(`${m}/jogadores/${j}.json.gz`),
    gravarJogador: (m, j, d) => gravar(`${m}/jogadores/${j}.json.gz`, d),
  };
}
