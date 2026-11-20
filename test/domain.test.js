import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isMine,matches,pointMapLinks,points,transition,validateOffer} from '../public/domain.js';
const resident={id:'n',role:'neighbor'},collector={id:'c',role:'collector'},other={id:'x',role:'collector'};
const offer={id:'o',owner_id:'n',collector_id:null,state:'available'};
test('filtra distrito y material de manera conjunta',()=>{
  assert.equal(points.filter(p=>matches(p,'Barranco','Vidrio')).length,1);
  assert.equal(points.filter(p=>matches(p,'Barranco','Papel')).length,0);
});
test('centra el mapa de OpenStreetMap en el punto seleccionado',()=>{
  const point=points.find(item=>item.slug==='surco');
  const {embed,page}=pointMapLinks(point);
  const map=new URL(embed);
  const [west,south,east,north]=map.searchParams.get('bbox').split(',').map(Number);
  assert.equal(map.origin,'https://www.openstreetmap.org');
  assert.equal(map.searchParams.get('marker'),`${point.latitude},${point.longitude}`);
  assert.ok(west<point.longitude && east>point.longitude && south<point.latitude && north>point.latitude);
  assert.match(page,/#map=14\//);
});
test('valida y normaliza una oferta',()=>{
  assert.deepEqual(validateOffer({material:'Metal',district:'Surco',kg:'2.5'}),{material:'Metal',district:'Surco',kg:2.5});
});
test('rechaza peso inválido y categorías fuera del catálogo',()=>{
  for(const kg of [-1,0,201,'a',2.501,Infinity]) assert.throws(()=>validateOffer({material:'Metal',district:'Surco',kg}));
  assert.throws(()=>validateOffer({material:'Otro',district:'Surco',kg:2}));
});
test('reserva y completa el retiro con el mismo recolector',()=>{
  const r=transition(offer,'reserve',collector);
  assert.equal(r.collector_id,'c');assert.equal(r.state,'reserved');
  assert.equal(transition(r,'collect',collector).state,'collected');
  assert.equal(offer.state,'available');
});
test('rechaza doble reserva y retiro por otro usuario',()=>{
  const r=transition(offer,'reserve',collector);
  assert.throws(()=>transition(r,'reserve',other));
  assert.throws(()=>transition(r,'collect',other));
  assert.throws(()=>transition(offer,'reserve',resident));
});
test('solo el propietario puede cancelar una oferta disponible',()=>{
  assert.equal(transition(offer,'cancel',resident).state,'cancelled');
  assert.throws(()=>transition(offer,'cancel',{id:'x',role:'neighbor'}));
  assert.throws(()=>transition(transition(offer,'reserve',collector),'cancel',resident));
});
test('el historial solo incluye al dueño o recolector',()=>{
  const r=transition(offer,'reserve',collector);
  assert.ok(isMine(r,'n'));assert.ok(isMine(r,'c'));assert.ok(!isMine(r,'x'));
});
