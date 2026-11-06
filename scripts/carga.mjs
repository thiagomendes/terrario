// Teste de carga do servidor (spec 010, critério 6): robôs jogando em várias salas.
// Uso: node scripts/carga.mjs <url ws> <salas> <robôs por sala> <segundos> [origem]
// Cada robô anda mandando a posição 20 vezes por segundo e quebra ou põe um bloco a
// cada 2 s; mede quadros por segundo e tráfego recebido; no fim lê /saude.
import WebSocket from 'ws';

const [
  url = 'ws://127.0.0.1:8080/jogo',
  nSalas = '4',
  porSala = '2',
  segundos = '60',
  origem = 'http://localhost',
] = process.argv.slice(2);
const SALAS = Number(nSalas);
const POR_SALA = Number(porSala);
const DURACAO = Number(segundos) * 1000;
const estilo = { arvores: {}, estrutura: 'ruina', crateras: false };

function robo(nome, sala) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers: { Origin: origem }, perMessageDeflate: true });
    const r = { nome, quadros: 0, bytes: 0, codigo: null, inicio: 0, pos: null, erros: 0 };
    let seq = 0;
    let id = 0;
    let t = 0;
    const enviar = (c) =>
      ws.readyState === ws.OPEN && ws.send(JSON.stringify({ ...c, seq: ++seq }));
    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          t: 'entrar',
          versao: 1,
          jogador: {
            id: nome,
            chave: `chave-de-carga-${nome}-0123456789`,
            apelido: nome,
            aparencia: {},
          },
          ...(sala.codigo
            ? { codigo: sala.codigo }
            : {
                criar: {
                  nome: `Carga ${nome}`,
                  semente: 1000 + sala.n,
                  tema: 'bruma-e-luz',
                  modo: 'criativo',
                  versaoMundo: 2,
                  estilo,
                },
              }),
        }),
      );
    });
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      r.bytes += d.length;
      if (m.t === 'bemvindo') {
        r.codigo = m.sala.codigo;
        sala.codigo ??= m.sala.codigo;
        r.pos = m.pos;
        r.inicio = Date.now();
        sala.pronta?.();
        const relogio = setInterval(() => {
          t += 0.05;
          const x = r.pos.x + Math.sin(t / 3) * 6;
          const z = r.pos.z + Math.cos(t / 3) * 6;
          enviar({
            t: 'jogador',
            x,
            y: r.pos.y,
            z,
            yaw: t,
            pitch: 0,
            olhos: r.pos.y + 1.62,
            noChao: true,
            voando: false,
            vel: 2,
            correndo: false,
            submerso: false,
            quedas: [],
            pulos: 0,
            golpes: 0,
            slot: 0,
            raio: 3,
          });
          if (Math.round(t * 20) % 40 === 0) {
            const bx = Math.floor(x) + 1;
            const bz = Math.floor(z);
            const by = Math.floor(r.pos.y) + 1;
            enviar({ t: 'colocar', id: ++id, x: bx, y: by, z: bz, bloco: 7, meta: 0, slot: 0 });
            enviar({ t: 'quebrar', id: ++id, x: bx, y: by, z: bz, slot: 0 });
          }
        }, 50);
        setTimeout(() => {
          clearInterval(relogio);
          ws.close();
          const s = (Date.now() - r.inicio) / 1000;
          resolve({
            ...r,
            quadrosPorSegundo: r.quadros / s,
            kbPorSegundo: r.bytes / s / 1024,
            fioKbPorSegundo: (ws._socket?.bytesRead ?? 0) / s / 1024,
          });
        }, DURACAO);
      } else if (m.t === 'quadro') r.quadros++;
      else if (m.t === 'recusado') {
        r.erros++;
        resolve({ ...r, recusado: m.motivo });
      }
    });
    ws.on('error', (e) => {
      r.erros++;
      resolve({ ...r, erro: String(e) });
    });
  });
}

const salas = Array.from({ length: SALAS }, (_, n) => ({ n, codigo: null, pronta: null }));
const robos = [];
for (const sala of salas) {
  // o primeiro cria; os outros entram pelo código quando ela estiver pronta
  const primeiro = robo(`robo-${sala.n}-0`, sala);
  await new Promise((res) => (sala.pronta = res));
  robos.push(primeiro);
  for (let k = 1; k < POR_SALA; k++) robos.push(robo(`robo-${sala.n}-${k}`, sala));
}
const res = await Promise.all(robos);
const media = (f) => res.reduce((a, r) => a + f(r), 0) / res.length;
console.log(`${res.length} robôs em ${SALAS} salas por ${segundos} s`);
console.log(`quadros por segundo (média): ${media((r) => r.quadrosPorSegundo).toFixed(1)}`);
console.log(
  `tráfego por jogador (média): ${media((r) => r.kbPorSegundo).toFixed(1)} KB/s · máximo ${Math.max(...res.map((r) => r.kbPorSegundo)).toFixed(1)} KB/s`,
);
console.log(
  `no fio, com compressão (média): ${media((r) => r.fioKbPorSegundo).toFixed(1)} KB/s · máximo ${Math.max(...res.map((r) => r.fioKbPorSegundo)).toFixed(1)} KB/s`,
);
console.log(`com erro ou recusa: ${res.filter((r) => r.erros).length}`);
const saude = url.replace(/^ws/, 'http').replace(/\/jogo$/, '/saude');
try {
  console.log('servidor:', await (await fetch(saude)).text());
} catch (e) {
  console.log('saúde indisponível:', String(e));
}
