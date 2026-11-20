import {config} from './config.js';
import {points,validateOffer,transition} from './domain.js';

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
  let res;
  try {
    res=await fetch(config.supabaseUrl+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  } catch {
    throw new Error('No pudimos conectar con Ciclo Local. Revisa tu conexión y vuelve a intentarlo.');
  }
  if(!res.ok) {
    if(res.status===401 && token) {
      logout();
      throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    }
    if(path.startsWith('/auth/')) {
      const data=await res.json().catch(()=>null);
      if(data?.error_code==='email_not_confirmed')throw new Error('Confirma tu correo antes de iniciar sesión.');
      if(res.status===429)throw new Error('Hay demasiados intentos. Espera un momento y vuelve a intentarlo.');
      if(path.startsWith('/auth/v1/token')&&res.status<500)throw new Error('No pudimos iniciar sesión. Revisa tu correo y contraseña.');
      throw new Error('No pudimos completar el acceso. Inténtalo nuevamente.');
    }
    throw new Error('La operación no se pudo completar. Comprueba tus permisos y el estado de la oferta.');
  }
  const content=await res.text();
  return content?JSON.parse(content):null;
}
export async function authenticate(email,password,signup) {
  const path=signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password';
  const result=await request(path,{method:'POST',body:{email,password}});
  if(!result?.access_token || !result.user)return null;
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
export async function listCollectionPoints() {
  if(!live)return points;
  const columns='slug,name,district,hours,latitude,longitude,is_demo,collection_point_materials(material)';
  const rows=await request(`/rest/v1/collection_points?select=${columns}&order=district.asc`);
  return rows.map(({collection_point_materials: rows, ...point})=>({
    ...point,materials:rows.map(({material})=>material),
  }));
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
