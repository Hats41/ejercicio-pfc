export const materials = ['Papel','Cartón','Plástico','Vidrio','Metal','Electrónicos'];
export const districts = ['Barranco','La Molina','Lima Cercado','Miraflores','Surco'];
export const points = [
  { name:'Acopio demostrativo · Barranco', district:'Barranco', materials:['Vidrio','Metal'], hours:'Lun–vie · 09:00–16:00' },
  { name:'Acopio demostrativo · La Molina', district:'La Molina', materials:['Papel','Cartón','Plástico'], hours:'Mar–sáb · 09:00–17:00' },
  { name:'Acopio demostrativo · Lima Cercado', district:'Lima Cercado', materials:['Cartón','Metal','Electrónicos'], hours:'Lun–sáb · 08:00–13:00' },
  { name:'Acopio demostrativo · Miraflores', district:'Miraflores', materials:['Papel','Cartón','Plástico','Vidrio'], hours:'Lun–vie · 10:00–17:00' },
  { name:'Acopio demostrativo · Surco', district:'Surco', materials:['Plástico','Metal'], hours:'Sáb–dom · 08:00–12:00' },
];
export const statusLabel = { available:'Disponible', reserved:'Reservada', collected:'Recogida', cancelled:'Cancelada' };
export function matches(item,district,material) {
  return (!district || item.district===district) && (!material || (item.materials ?? [item.material]).includes(material));
}
export function validateOffer(record) {
  const {material,district}=record;
  const kg=Number(record.kg);
  if (!materials.includes(material) || !districts.includes(district)) throw new Error('Elige un material y distrito válidos.');
  if (!Number.isFinite(kg) || kg<0.1 || kg>200 || Math.abs(kg*10-Math.round(kg*10))>1e-7) {
    throw new Error('Indica un peso de 0.1 a 200 kg, con hasta un decimal.');
  }
  return {material,district,kg};
}
export function transition(offer,action,actor) {
  if (action==='reserve' && actor.role==='collector' && offer.state==='available' && offer.owner_id!==actor.id) {
    return {...offer,state:'reserved',collector_id:actor.id};
  }
  if (action==='collect' && actor.role==='collector' && offer.state==='reserved' && offer.collector_id===actor.id) {
    return {...offer,state:'collected'};
  }
  if (action==='cancel' && actor.role==='neighbor' && offer.state==='available' && offer.owner_id===actor.id) {
    return {...offer,state:'cancelled'};
  }
  throw new Error('No puedes realizar esta acción para la oferta actual.');
}
export const isMine = (offer,actorId) => offer.owner_id===actorId || offer.collector_id===actorId;
