import {config} from './config.js';
import {validateOffer,transition} from './domain.js';

const demoKey='ciclo-local-demo-v1';
const liveKey='ciclo-local-session-v1';
export const live=Boolean(config.supabaseUrl && config.publishableKey);
const demoSeed=[{id:'initial',material:'Cartón',district:'Surco',kg:6,state:'available',owner_id:'demo-external',collector_id:null}];
export function actorFor(role) {
  return {id:role==='neighbor'?'demo-neighbor':'demo-collector',role};
}
export function session() {
  try { return JSON.parse(sessionStorage.getItem(liveKey)); } catch { return null; }
}
export function logout() { sessionStorage.removeItem(liveKey); }
async function request(path,{method='GET',body,token,prefer}={}) {
  const headers={apikey:config.publishableKey,'Content-Type':'application/json'};
  if(token) headers.Authorization='Bearer '+token;
  if(prefer) headers.Prefer=prefer;
  const res=await fetch(config.supabaseUrl+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  if(!res.ok) {
    if(res.status===401 && token) logout();
    throw new Error(res.status===401 ? 'Revisa tus credenciales o vuelve a iniciar sesión.' : 'La operación no se pudo completar. Comprueba tus permisos y el estado de la oferta.');
  }
  const content=await res.text();
  return content?JSON.parse(content):null;
}
export async function authenticate(email,password,signup) {
  if(signup) {
    await request('/auth/v1/signup',{method:'POST',body:{email,password}});
    return null;
  }
  const result=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
  sessionStorage.setItem(liveKey,JSON.stringify({access_token:result.access_token,user:result.user}));
  return result.user;
}
export async function getProfile() {
  if(!session())return null;
  return request('/rest/v1/rpc/my_profile',{method:'POST',token:session().access_token,body:{}});
}
export async function chooseProfile(role) {
  return request('/rest/v1/rpc/choose_profile',{method:'POST',token:session()?.access_token,body:{p_role:role}});
}
function localOffers() {
  try { const data=JSON.parse(localStorage.getItem(demoKey));return Array.isArray(data)?data:demoSeed; }
  catch {return demoSeed;}
}
export async function listOffers() {
  if(!live) return localOffers();
  const current=session();
  if(!current) return [];
  return request('/rest/v1/offers_public?select=*&order=created_at.desc',{token:current.access_token});
}
export async function publish(input,actor) {
  const body=validateOffer(input);
  if (actor.role!=='neighbor') throw new Error('Cambia al perfil vecino para publicar.');
  if(live) return request('/rest/v1/rpc/publish_offer',{method:'POST',token:session()?.access_token,body:{p_material:body.material,p_district:body.district,p_kg:body.kg}});
  const offer={...body,id:crypto.randomUUID(),state:'available',owner_id:actor.id,collector_id:null};
  localStorage.setItem(demoKey,JSON.stringify([offer,...localOffers()]));
}
export async function update(offer,action,actor) {
  const changed=transition(offer,action,actor);
  if(live) return request('/rest/v1/rpc/change_offer',{method:'POST',token:session()?.access_token,body:{p_offer:offer.id,p_action:action}});
  localStorage.setItem(demoKey,JSON.stringify(localOffers().map(o=>o.id===offer.id?changed:o)));
}
