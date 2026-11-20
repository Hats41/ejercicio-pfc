import {districts,materials,matches,points,pointMapLinks,statusLabel,isMine,transition} from './domain.js';
import {live,actorFor,session,authenticate,logout,listCollectionPoints,listOffers,publish,update,getProfile,chooseProfile} from './store.js';

const get=id=>document.getElementById(id);
function el(tag,text,cls) {
  const node=document.createElement(tag);
  if(text!==undefined) node.textContent=text;
  if(cls) node.className=cls;
  return node;
}
function options(select,values,first) {
  select.replaceChildren();
  if(first) select.append(new Option(first,''));
  for(const value of values) select.append(new Option(value));
  return select;
}
options(get('district'),districts,'Todos los distritos');
options(get('material'),materials,'Todos los materiales');
let view='points', offers=[], epoch=0, liveRole=null;
let directory=live?[]:points, selectedPoint, catalogStatus=live?'loading':'demo';
function actor() {
  const role=get('role').value;
  return live?{id:liveRole?session()?.user?.id:undefined,role:liveRole}:actorFor(role);
}
function message(text,error=false) {
  get('notice').textContent=text;
  get('notice').toggleAttribute('data-error',error);
}
function action(text,run,cls) {
  const btn=el('button',text,cls);btn.type='button';
  btn.onclick=async()=>{
    btn.disabled=true;
    try {await run();}
    catch(e){message(e.message,true);}
    finally {btn.disabled=false;}
  };
  return btn;
}
function label(text,input) {const l=el('label',text);l.append(input);return l;}
function fields(type,name) {const x=el('input');x.type=type;x.name=name;x.required=true;return x;}
function send(text) {const b=el('button',text,'primary');b.type='submit';return b;}
function authPanel() {
  const host=get('auth');host.replaceChildren();host.hidden=!live||view==='points';
  if(host.hidden)return;
  if(session()) {
    if(liveRole) host.append(el('p',liveRole==='neighbor'?'Perfil: Vecino':'Perfil: Recolector'));
    else host.append(el('p','Elige el perfil para esta cuenta.'),
      action('Soy vecino',async()=>{liveRole=await chooseProfile('neighbor');await refresh();}),
      action('Soy recolector',async()=>{liveRole=await chooseProfile('collector');await refresh();}));
    host.append(action('Cerrar sesión',async()=>{logout();liveRole=null;offers=[];render();message('Sesión cerrada.');}));
    return;
  }
  const form=el('form');const email=fields('email','email');email.autocomplete='email';
  const pass=fields('password','password');pass.autocomplete='current-password';pass.minLength=10;
  const signup=send('Crear cuenta');signup.value='signup';
  form.append(label('Correo',email),label('Contraseña (mínimo 10 caracteres)',pass),send('Iniciar sesión'),signup);
  form.onsubmit=async e=>{
    e.preventDefault();
    const register=e.submitter?.value==='signup';
    for(const button of form.querySelectorAll('button'))button.disabled=true;
    try {await authenticate(email.value.trim(),pass.value,register);if(!register)liveRole=await getProfile();await refresh();message(register?'Revisa tu correo para confirmar la cuenta.':'Sesión iniciada.');}
    catch(error){message(error.message,true);}
    finally {for(const button of form.querySelectorAll('button'))button.disabled=false;}
  };
  host.append(form);
}
function offerForm() {
  const host=get('create');host.replaceChildren();host.hidden=view!=='offers'||actor().role!=='neighbor'||!actor().id;
  if(host.hidden)return;
  const f=el('form'),material=options(el('select'),materials,'Elige material'),district=options(el('select'),districts,'Elige distrito'),kg=fields('number','kg');
  material.required=true;district.required=true;kg.min='0.1';kg.max='200';kg.step='0.1';
  const button=send('Publicar oferta');
  f.append(label('Material',material),label('Distrito',district),label('Peso aproximado (kg)',kg),button);
  f.onsubmit=async e=>{
    e.preventDefault();button.disabled=true;
    try {await publish({material:material.value,district:district.value,kg:kg.value},actor());await refresh();message('Oferta publicada.');}
    catch(error){message(error.message,true);}
    finally{button.disabled=false;}
  };
  host.append(el('h3','Publicar reciclables'),el('p','Indica el distrito. El formulario no solicita direcciones exactas.'),f);
}
function renderMap(results) {
  const point=view==='points'&&(results.find(item=>item.slug===selectedPoint)||results[0]);
  get('map').hidden=!point;
  get('directory').classList.toggle('has-map',Boolean(point));
  if(!point)return;
  selectedPoint=point.slug;
  const links=pointMapLinks(point), frame=get('map-frame');
  if(frame.src!==links.embed)frame.src=links.embed;
  get('map-title').textContent=point.district;
  get('map-note').textContent=point.is_demo===false?'Ubicación de acopio':'Ubicación aproximada de demostración. Verifica antes de ir.';
  get('map-link').href=links.page;
}
function render(rebuild=true) {
  const a=actor();
  get('title').textContent={points:'Puntos de acopio',offers:'Ofertas de reciclables',mine:'Mi actividad'}[view];
  document.querySelectorAll('nav button').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  get('mode').textContent=view==='points'?{
    live:'Catálogo en línea. Los puntos con etiqueta Demo son ilustrativos.',
    loading:'Cargando el catálogo de acopio…',
    fallback:'El catálogo en línea no está disponible. Mostramos cinco ejemplos locales.',
    demo:'Catálogo de demostración con ubicaciones aproximadas.',
  }[catalogStatus]:live?'Las ofertas de tu cuenta se guardan en línea.':'Modo demostración. Las ofertas se guardan en este navegador.';
  get('profile').firstChild.textContent=live?'Modo de uso ':'Perfil demo ';
  get('profile').hidden=live||view==='points';
  get('filters').hidden=view==='mine'||(view==='offers'&&!a.id);
  if(rebuild){authPanel();offerForm();}
  const cards=get('cards');cards.replaceChildren();
  const d=get('district').value,m=get('material').value;
  const results=view==='points'?directory.filter(p=>matches(p,d,m)):!a.id?[]:view==='mine'?offers.filter(o=>isMine(o,a.id)):offers.filter(o=>o.state==='available'&&matches(o,d,m));
  renderMap(results);
  get('clear-filters').hidden=!d&&!m;
  const showCount=view==='points'?catalogStatus!=='loading':Boolean(a.id);
  get('result-count').textContent=showCount?`${results.length} ${results.length===1?'resultado':'resultados'}`:'';
  for(const item of results){
    const card=el('article',undefined,'card');
    card.append(el('h3',view==='points'?item.name:item.material),el('p',item.district,'meta'));
    if(view==='points'){
      card.append(el('p',item.hours,'hours'));
      const tags=el('div',undefined,'tags');
      for(const value of item.materials)tags.append(el('span',value,'badge'));
      if(item.is_demo!==false)tags.append(el('span','Demo','badge demo-tag'));
      const mapButton=action('Ver en mapa',()=>{
        selectedPoint=item.slug;
        renderMap(results);
        for(const button of cards.querySelectorAll('[data-point]'))button.setAttribute('aria-pressed',String(button.dataset.point===selectedPoint));
        if(window.matchMedia('(max-width: 760px)').matches)get('map').scrollIntoView({block:'nearest'});
      },'map-trigger');
      mapButton.dataset.point=item.slug;
      mapButton.setAttribute('aria-label',`Ver ${item.district} en el mapa`);
      mapButton.setAttribute('aria-pressed',String(item.slug===selectedPoint));
      card.append(tags,mapButton);
    } else {
      card.append(el('p',`${item.kg} kg`),el('span',statusLabel[item.state],'badge'));
      for(const [change,name,success] of [['reserve','Reservar','Oferta reservada.'],['collect','Confirmar retiro','Retiro confirmado.'],['cancel','Retirar oferta','Oferta cancelada.']]){
        try {transition(item,change,a);} catch {continue;}
        card.append(action(name,async()=>{await update(item,change,a);await refresh();message(success);}));
      }
    }
    cards.append(card);
  }
  if(!results.length&&(view!=='points'||catalogStatus!=='loading'))cards.append(el('p',view!=='points'&&!a.id?'Inicia sesión para consultar ofertas y retiros.':view==='mine'?'Aún no tienes ofertas ni retiros.':'No hay resultados con estos filtros.','empty'));
}
async function refresh() {
  const requested=++epoch;
  try {const rows=await listOffers();if(requested!==epoch)return;offers=rows;render();}
  catch(error){if(requested!==epoch)return;offers=[];render();message(error.message,true);}
}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{
  view=b.dataset.view;message('');render();
  if(view!=='points')void refresh();
  get('title').focus();
  get('work').scrollIntoView();
};
get('role').onchange=()=>{message('');render();};
get('district').onchange=()=>render(false);
get('material').onchange=()=>render(false);
get('clear-filters').onclick=()=>{
  get('district').value='';
  get('material').value='';
  render(false);
  get('district').focus();
};
render();
if(live)listCollectionPoints().then(rows=>{directory=rows;catalogStatus='live';}).catch(()=>{directory=points;catalogStatus='fallback';}).then(()=>{if(view==='points')render(false);});
if(live&&session())getProfile().then(role=>{liveRole=role;if(view!=='points')void refresh();}).catch(error=>message(error.message,true));
