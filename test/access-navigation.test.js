import test from 'node:test';
import assert from 'node:assert/strict';
import {accessHref, afterAccessHref, sectionFromHash, sectionHash} from '../public/access-navigation.js';

test('la navegación conserva la sección al entrar a la cuenta', () => {
  assert.equal(accessHref('offers'), './acceso.html?next=offers');
  assert.equal(afterAccessHref('offers'), './#ofertas');
  assert.equal(sectionFromHash(sectionHash('mine')), 'mine');
});

test('un destino desconocido vuelve a la actividad del mismo sitio', () => {
  assert.equal(afterAccessHref('https://ejemplo.test'), './#actividad');
  assert.equal(accessHref('constructor'), './acceso.html');
  assert.equal(sectionHash('__proto__'), '#puntos');
  assert.equal(sectionFromHash('#otro'), 'points');
});
