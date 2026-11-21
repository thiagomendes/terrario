import { existsSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { temasDisponiveis } from '../../src/temas';

/**
 * Spec 034 (T09): todo tema que se escolhe tem a prévia do cartão (public/temas/<id>.jpg; o
 * fundo da tela de entrar no mundo de um amigo usa a mesma imagem), e não sobra prévia de tema
 * que saiu. As prévias saem de e2e/capturas-temas.spec.ts ("prévia do cartão").
 */
describe('prévias dos cartões de tema', () => {
  it('todo tema tem public/temas/<id>.jpg, e só eles', () => {
    const ids = temasDisponiveis();
    // spec 027: a Noite das Fantasias é o sexto
    expect(ids.length).toBe(6);
    for (const id of ids) {
      const arquivo = `public/temas/${id}.jpg`;
      expect(existsSync(arquivo), arquivo).toBe(true);
      expect(statSync(arquivo).size, arquivo).toBeGreaterThan(10_000);
    }
    const sobrando = readdirSync('public/temas')
      .filter((a) => a.endsWith('.jpg'))
      .map((a) => a.replace(/\.jpg$/, ''))
      .filter((id) => !(ids as string[]).includes(id));
    expect(sobrando).toEqual([]);
  });
});
