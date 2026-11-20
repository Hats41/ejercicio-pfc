import {afterAccessHref} from './access-navigation.js';
import {authenticate, chooseProfile, getProfile, live, logout, session} from './store.js';

const get = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const destination = afterAccessHref(params.get('next'));
const email = get('email');
const password = get('password');
const formPanel = get('access-form-panel');
const profilePanel = get('access-profile');
const choices = get('profile-choices');
const accessCard = document.querySelector('.access-card');
let registering = params.get('modo') === 'registro';

function notify(text, error = false) {
  const notice = get('access-notice');
  notice.textContent = text;
  notice.toggleAttribute('data-error', error);
}

function showForm() {
  formPanel.hidden = false;
  profilePanel.hidden = true;
  accessCard.setAttribute('aria-labelledby', 'access-title');
  get('access-title').textContent = registering ? 'Crea tu cuenta' : 'Inicia sesión';
  get('access-intro').textContent = registering
    ? 'Regístrate con tu correo para publicar materiales o coordinar retiros.'
    : 'Consulta tus ofertas y retiros con tu cuenta de Ciclo Local.';
  get('access-submit').textContent = registering ? 'Crear cuenta' : 'Iniciar sesión';
  get('mode-prompt').textContent = registering ? '¿Ya tienes una cuenta?' : '¿Primera vez en Ciclo Local?';
  get('access-toggle').textContent = registering ? 'Iniciar sesión' : 'Crear cuenta';
  password.minLength = registering ? 10 : 0;
  password.autocomplete = registering ? 'new-password' : 'current-password';
  password.toggleAttribute('aria-describedby', registering);
  if (registering) password.setAttribute('aria-describedby', 'password-hint');
  get('password-hint').hidden = !registering;
}

function showProfile(role) {
  formPanel.hidden = true;
  profilePanel.hidden = false;
  accessCard.setAttribute('aria-labelledby', 'profile-title');
  choices.hidden = Boolean(role);
  get('profile-continue').hidden = !role;
  get('profile-title').textContent = role ? 'Tu cuenta' : 'Elige tu perfil';
  get('profile-intro').textContent = role
    ? `Perfil: ${role === 'neighbor' ? 'vecino' : 'recolector'}.`
    : 'Esta elección queda asociada a tu cuenta.';
}

async function openSession(redirectIfReady = false) {
  const role = await getProfile();
  if (role && redirectIfReady) {
    location.replace(destination);
    return;
  }
  showProfile(role);
  notify('');
}

get('profile-continue').href = destination;
get('demo-continue').href = destination;
get('access-toggle').onclick = () => {
  registering = !registering;
  password.value = '';
  notify('');
  showForm();
  email.focus();
};
get('password-toggle').onclick = event => {
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-pressed', String(visible));
  event.currentTarget.textContent = visible ? 'Ocultar' : 'Mostrar';
};
get('access-form').onsubmit = async event => {
  event.preventDefault();
  const submit = get('access-submit');
  const toggle = get('access-toggle');
  submit.disabled = toggle.disabled = true;
  notify('Comprobando tu cuenta…');
  try {
    const user = await authenticate(email.value.trim(), password.value, registering);
    password.value = '';
    if (user) await openSession(true);
    else {
      registering = false;
      showForm();
      notify('Si el correo puede registrarse, recibirás un enlace de confirmación. Regresa aquí para iniciar sesión.');
    }
  } catch (error) {
    notify(error.message, true);
  } finally {
    submit.disabled = toggle.disabled = false;
  }
};
for (const button of choices.querySelectorAll('button')) {
  button.onclick = async () => {
    for (const option of choices.querySelectorAll('button')) option.disabled = true;
    try {
      await chooseProfile(button.dataset.role);
      location.replace(destination);
    } catch (error) {
      if (!session()) showForm();
      notify(error.message, true);
    } finally {
      for (const option of choices.querySelectorAll('button')) option.disabled = false;
    }
  };
}
get('access-logout').onclick = () => {
  logout();
  registering = false;
  showForm();
  notify('Sesión cerrada.');
};

if (!live) {
  accessCard.removeAttribute('aria-labelledby');
  get('access-demo').hidden = false;
  notify('');
} else if (session()) {
  openSession().catch(error => {
    showForm();
    notify(error.message, true);
  });
} else {
  showForm();
  notify('');
}
