// ==========================================================
// TESTS DE LA LOGIQUE D'AFFILIATION — sans rien installer :
//     node src/affiliation.test.js
// ==========================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOUTIQUE,
  FORMULES,
  commission,
  construireLien,
  extraireCode,
  formaterMontant,
  messagePartage
} from './affiliation.js';

test('un code seul est accepté, espaces autour ignorés', () => {
  assert.deepEqual(extraireCode('VC4F5GGT'), { code: 'VC4F5GGT' });
  assert.deepEqual(extraireCode('  VC4F5GGT \n'), { code: 'VC4F5GGT' });
});

test('un lien complet donne le code, pour les deux formules', () => {
  assert.deepEqual(extraireCode('https://soudoboutik-ebook.mychariow.shop/prd_s877x4vl?chw_affiliate=VC4F5GGT'), { code: 'VC4F5GGT' });
  assert.deepEqual(extraireCode('https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1?chw_affiliate=VC4F5GGT'), { code: 'VC4F5GGT' });
  // le paramètre peut ne pas être le premier
  assert.deepEqual(extraireCode('https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1?utm=x&chw_affiliate=VC4F5GGT'), { code: 'VC4F5GGT' });
});

test('un lien noyé dans une phrase est retrouvé', () => {
  const phrase = 'Voici mon lien : https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1?chw_affiliate=VC4F5GGT merci';
  assert.deepEqual(extraireCode(phrase), { code: 'VC4F5GGT' });
});

test('le lien court de Chariow est reconnu et expliqué : il ne contient pas le code', () => {
  assert.deepEqual(extraireCode('https://chariow.ly/VT967U2QJW'), { raison: 'lien-court' });
  assert.deepEqual(extraireCode('https://chariow.ly/VT967U2QJW/checkout'), { raison: 'lien-court' });
});

test('un lien sans code est signalé', () => {
  assert.deepEqual(extraireCode('https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1'), { raison: 'sans-code' });
});

test('vide ou invalide : aucun code', () => {
  assert.deepEqual(extraireCode(''), {});
  assert.deepEqual(extraireCode('   '), {});
  assert.deepEqual(extraireCode(undefined), {});
  for (const mauvais of ['ab', 'VC4F 5GGT', '<script>alert(1)</script>', 'VC4F5GGT.', 'mon code : VC4F5GGT']) {
    const r = extraireCode(mauvais);
    assert.equal(r.code, undefined, `code accepté à tort : ${mauvais}`);
    assert.equal(r.raison, 'invalide');
  }
  assert.equal(extraireCode('https://x.example/?chw_affiliate=VC4F<b>').code, undefined);
});

test('SÉCURITÉ : un domaine étranger ne change jamais le lien construit', () => {
  const r = extraireCode('https://evil.example/prd_x?chw_affiliate=ABC123');
  assert.deepEqual(r, { code: 'ABC123' });
  const lien = construireLien(r.code, FORMULES[0].id);
  assert.ok(lien.startsWith(BOUTIQUE));
  assert.ok(!lien.includes('evil'));
});

test('construireLien : forme exacte observée sur les vrais liens', () => {
  assert.equal(construireLien('VC4F5GGT', 'prd_6duiuhl1'), 'https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1?chw_affiliate=VC4F5GGT');
  assert.equal(construireLien('VC4F5GGT', 'prd_s877x4vl'), 'https://soudoboutik-ebook.mychariow.shop/prd_s877x4vl?chw_affiliate=VC4F5GGT');
  assert.ok(construireLien('A-B_c1', 'prd_6duiuhl1').endsWith('?chw_affiliate=A-B_c1'));
});

test('commission et montants', () => {
  assert.equal(commission(3000), 900);
  assert.equal(commission(5000), 1500);
  assert.equal(commission(3000, 10), 300);
  assert.equal(formaterMontant(999), '999');
  assert.equal(formaterMontant(3000), '3 000');
  assert.equal(formaterMontant(1500), '1 500');
  assert.equal(formaterMontant(1234567), '1 234 567');
});

test('le message de partage donne le lien et le prix, sans promettre de gain', () => {
  for (const formule of FORMULES) {
    const lien = construireLien('VC4F5GGT', formule.id);
    const message = messagePartage(formule, lien);
    assert.ok(message.includes(lien));
    assert.ok(message.includes(formule.libelle));
    assert.ok(message.includes(`${formaterMontant(formule.prix)} FCFA`));
    assert.ok(!/commission|gagn|revenu|argent/i.test(message), `promesse de gain : ${message}`);
  }
});