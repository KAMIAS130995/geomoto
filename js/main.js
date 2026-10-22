// GeoMoto — interacciones del sitio

// Los mensajes del sitio llegan al correo de GeoMoto a través de Web3Forms (web3forms.com).
// La clave de acceso se obtiene en web3forms.com con el correo de destino. Es pública por diseño:
// solo permite enviar mensajes a ese correo.
const EMAIL = 'geomoto.pe@gmail.com';
const WEB3FORMS_KEY = 'a7dccce7-6cdd-4acd-9179-05984e09c954';
const ENDPOINT = 'https://api.web3forms.com/submit';
const HAS_KEY = !WEB3FORMS_KEY.startsWith('PEGAR');

// Devuelve 'web' si el mensaje se envió directo, o 'mailto' si se abrió el correo del visitante
async function sendLead(subject, fields, botcheck = '') {
  // Mientras no haya clave de Web3Forms, se abre el programa de correo con el mensaje ya escrito
  if (!HAS_KEY) {
    const body = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n');
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return 'mailto';
  }
  // Si el cliente dejó su correo, "Responder" en Gmail le escribe directamente
  const replyTo = fields.Correo && fields.Correo.includes('@') ? { replyto: fields.Correo } : {};
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject, from_name: 'Sitio web GeoMoto', botcheck, ...replyTo, ...fields }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success !== true) throw new Error(json.message || 'Error al enviar');
  return 'web';
}

// Menú móvil
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');

function closeNav() {
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Abrir menú');
  nav.classList.remove('is-open');
}

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  if (open) return closeNav();
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Cerrar menú');
  nav.classList.add('is-open');
});

// Submenús desplegables
const menus = document.querySelectorAll('.has-menu');

function closeMenus(except) {
  menus.forEach((m) => {
    if (m === except) return;
    m.classList.remove('is-open');
    m.querySelector('.nav__link').setAttribute('aria-expanded', 'false');
  });
}

menus.forEach((menu) => {
  const btn = menu.querySelector('.nav__link');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
    closeMenus(menu);
  });
});

document.addEventListener('click', () => closeMenus());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenus(); closeNav(); } });

nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { closeMenus(); closeNav(); }));

// Carrusel principal
const slides = [...document.querySelectorAll('.slide')];
const dotsBox = document.querySelector('.hero__dots');
const pauseBtn = document.querySelector('.hero__pause');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let current = 0;
let timer = null;
let paused = reduceMotion;

const dots = slides.map((_, i) => {
  const dot = document.createElement('button');
  dot.setAttribute('aria-label', `Ir a la diapositiva ${i + 1}`);
  dot.addEventListener('click', () => { goTo(i); restart(); });
  dotsBox.appendChild(dot);
  return dot;
});

function goTo(i) {
  current = (i + slides.length) % slides.length;
  slides.forEach((s, k) => {
    s.classList.toggle('is-active', k === current);
    s.setAttribute('aria-hidden', String(k !== current));
  });
  dots.forEach((d, k) => d.classList.toggle('is-active', k === current));
}

function restart() {
  clearInterval(timer);
  if (!paused) timer = setInterval(() => goTo(current + 1), 6000);
}

document.querySelectorAll('.hero__arrow').forEach((btn) => {
  btn.addEventListener('click', () => { goTo(current + Number(btn.dataset.dir)); restart(); });
});

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.classList.toggle('is-paused', paused);
  pauseBtn.setAttribute('aria-label', paused ? 'Reanudar carrusel' : 'Pausar carrusel');
  restart();
});

pauseBtn.classList.toggle('is-paused', paused);
goTo(0);
restart();

// Pestañas de planes
const tabs = document.querySelectorAll('.tab');
const cards = document.querySelectorAll('.card');
const track = document.getElementById('cards');
const arrows = document.querySelectorAll('.cards-arrow');

function filterCards(cat) {
  tabs.forEach((t) => {
    const active = t.dataset.filter === cat;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', String(active));
  });
  cards.forEach((c) => { c.hidden = !c.dataset.cat.split(' ').includes(cat); });
  track.scrollLeft = 0;
  updateArrows();
}

function updateArrows() {
  const max = track.scrollWidth - track.clientWidth - 2;
  arrows[0].disabled = track.scrollLeft <= 2;
  arrows[1].disabled = track.scrollLeft >= max;
}

tabs.forEach((t) => t.addEventListener('click', () => filterCards(t.dataset.filter)));
arrows.forEach((a) => a.addEventListener('click', () => {
  track.scrollBy({ left: Number(a.dataset.dir) * track.clientWidth * 0.9 });
}));
track.addEventListener('scroll', updateArrows, { passive: true });
window.addEventListener('resize', updateArrows);

// Enlaces que abren una pestaña concreta (por ejemplo, "Motokares")
document.querySelectorAll('[data-filter-link]').forEach((link) => {
  link.addEventListener('click', () => filterCards(link.dataset.filterLink));
});

filterCards('destacado');

// Formulario de contacto: los campos cambian según el motivo, se validan y se envían al correo
const form = document.getElementById('form-contacto');
const formCard = form.closest('.form-card');
const formDone = formCard.querySelector('.form-done');
const formStatus = form.querySelector('.form__status');
const submitBtn = form.querySelector('[type="submit"]');
const consent = form.querySelector('.consent');
const consentError = document.getElementById('e-consent');
const mensaje = form.elements.mensaje;
const mensajeCount = document.getElementById('c-mensaje');

const MENSAJE_TEXTOS = {
  cotizar: { label: '¿Algo más que debamos saber?', placeholder: 'Cuéntanos tu consulta', required: false },
  falla: { label: 'Describe la falla', placeholder: 'Qué pasó, desde cuándo y el kilometraje aproximado', required: true },
  concesionario: { label: '¿Qué solución te interesa?', placeholder: 'Programa de garantía extendida, fidelización, marketing, asesoría en riesgos o capacitaciones', required: false },
};

const onlyDigits = (v) => v.replace(/\D/g, '');

// Reglas de cada campo: devuelve true si el valor es válido
const RULES = {
  nombre: (v) => v.trim().length >= 2,
  ciudad: (v) => v.trim().length >= 2,
  telefono: (v) => /^9\d{8}$/.test(onlyDigits(v)),
  correo: (v) => isEmail(v.trim()),
  empresa: (v) => v.trim().length >= 2,
  mensaje: (v) => v.trim().length >= 5,
};

function isActive(input) {
  return !input.closest('[hidden]');
}

function validateField(input) {
  const rule = RULES[input.name];
  if (!rule || !isActive(input)) return true;
  const field = input.closest('.field');
  const empty = !input.value.trim();
  const ok = empty ? !input.required : rule(input.value);
  field.classList.toggle('is-invalid', !ok);
  field.classList.toggle('is-valid', ok && !empty);
  input.setAttribute('aria-invalid', String(!ok));
  return ok;
}

function validateConsent() {
  const ok = form.elements.consentimiento.checked;
  consent.classList.toggle('is-invalid', !ok);
  consentError.classList.toggle('is-visible', !ok);
  return ok;
}

function setMotivo(motivo) {
  form.querySelectorAll('[data-for]').forEach((el) => {
    el.hidden = !el.dataset.for.split(' ').includes(motivo);
  });
  form.elements.empresa.required = motivo === 'concesionario';
  const t = MENSAJE_TEXTOS[motivo];
  mensaje.required = t.required;
  mensaje.placeholder = t.placeholder;
  form.querySelector('[data-label-mensaje]').textContent = t.label;
  form.querySelector('[data-opt-mensaje]').textContent = t.required ? '*' : 'Opcional';
  form.querySelector('[data-opt-mensaje]').className = t.required ? 'req' : 'opt';
  // Al cambiar de motivo, los errores de campos que ya no aplican o que pasaron a ser opcionales se limpian
  form.querySelectorAll('.field.is-invalid').forEach((f) => {
    const input = f.querySelector('input, textarea');
    if (!isActive(input) || (!input.value && !input.required)) f.classList.remove('is-invalid');
  });
}

form.querySelectorAll('input[name="motivo"]').forEach((r) => {
  r.addEventListener('change', () => setMotivo(r.value));
});

// Valida al salir del campo; mientras se corrige un error, revalida al escribir
form.querySelectorAll('input[name], textarea').forEach((input) => {
  if (!RULES[input.name]) return;
  input.addEventListener('blur', () => { if (input.value || input.required) validateField(input); });
  input.addEventListener('input', () => {
    if (input.closest('.field').classList.contains('is-invalid')) validateField(input);
  });
});

// Celular: solo números, agrupados de a tres (987 654 321)
form.elements.telefono.addEventListener('input', (e) => {
  const d = onlyDigits(e.target.value).slice(0, 9);
  e.target.value = d.replace(/(\d{3})(?=\d)/g, '$1 ');
});

mensaje.addEventListener('input', () => { mensajeCount.textContent = `${mensaje.value.length}/500`; });
form.elements.consentimiento.addEventListener('change', () => {
  if (consent.classList.contains('is-invalid')) validateConsent();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (data._honey) return;

  const inputs = [...form.querySelectorAll('input[name], textarea')].filter((i) => RULES[i.name]);
  const invalid = inputs.filter((i) => !validateField(i));
  const consentOk = validateConsent();
  if (invalid.length || !consentOk) {
    (invalid[0] || form.elements.consentimiento).focus();
    return;
  }

  const motivo = data.motivo;
  const celular = `+51 ${data.telefono}`;
  submitBtn.classList.add('is-loading');
  submitBtn.querySelector('.btn__label').textContent = 'Enviando…';
  formStatus.className = 'form__status';
  formStatus.textContent = '';

  try {
    const via = await sendLead(`Web GeoMoto: ${MOTIVOS[motivo]} (${data.nombre.trim()})`, {
      Origen: 'Formulario de contacto',
      Motivo: MOTIVOS[motivo],
      Nombre: data.nombre.trim(),
      Ciudad: data.ciudad.trim(),
      Celular: celular,
      Correo: data.correo.trim() || '—',
      ...(motivo === 'concesionario'
        ? { Empresa: data.empresa.trim() }
        : { Vehículo: data.vehiculo, Modelo: data.modelo.trim() || '—' }),
      Mensaje: data.mensaje.trim() || '—',
    });
    formDone.querySelector('[data-done-nombre]').textContent = data.nombre.trim().split(' ')[0];
    formDone.querySelector('[data-done-tel]').textContent = celular;
    formDone.querySelector('[data-done-title]').textContent = via === 'mailto' ? '¡Ya casi está!' : '¡Solicitud enviada!';
    formDone.querySelector('[data-done-mail]').hidden = via !== 'mailto';
    form.hidden = true;
    formDone.hidden = false;
    formDone.focus();
    form.reset();
    form.querySelectorAll('.is-valid').forEach((f) => f.classList.remove('is-valid'));
    mensajeCount.textContent = '0/500';
    setMotivo('cotizar');
  } catch {
    formStatus.classList.add('is-error');
    formStatus.textContent = `No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos a ${EMAIL}.`;
  } finally {
    submitBtn.classList.remove('is-loading');
    submitBtn.querySelector('.btn__label').textContent = 'Enviar solicitud';
  }
});

formDone.querySelector('[data-done-again]').addEventListener('click', () => {
  formDone.hidden = true;
  form.hidden = false;
  form.elements.nombre.focus();
});

// El botón flotante del chat se aparta mientras el formulario está en pantalla
const contactSection = document.getElementById('contacto');
new IntersectionObserver(([entry]) => {
  document.querySelector('.assist').classList.toggle('is-quiet', entry.isIntersecting);
}, { threshold: 0.25 }).observe(contactSection);

// Asistente de chat: hace preguntas, recoge los datos y los envía al correo
const assist = document.querySelector('.assist');
const assistBtn = assist.querySelector('.assist__btn');
const chat = document.getElementById('chat');
const chatLog = chat.querySelector('.chat__log');
const chatOptions = chat.querySelector('.chat__options');
const chatForm = chat.querySelector('.chat__input');
const chatInput = chatForm.querySelector('input');
const chatSend = chatForm.querySelector('button');

const MOTIVOS = {
  cotizar: 'Cotizar mi garantía',
  falla: 'Reportar una falla',
  transferencia: 'Transferir mi garantía',
  servicios: 'GPS, repuestos o mantenimiento',
  concesionario: 'Soy empresa o concesionario',
  otra: 'Otra consulta',
};

const isPhone = (v) => /^\+?[\d\s]{9,15}$/.test(v) && v.replace(/\D/g, '').length >= 9;
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Preguntas comunes y preguntas según el motivo
const COMUNES = [
  { key: 'Nombre', ask: '¿Cuál es tu nombre?', type: 'text' },
  { key: 'Celular', ask: '¿A qué número de celular te podemos llamar?', type: 'tel', check: isPhone, error: 'Escribe un número de al menos 9 dígitos, por ejemplo 987654321.' },
  { key: 'Correo', ask: '¿Tu correo electrónico? Es opcional.', type: 'email', optional: true, check: isEmail, error: 'Ese correo no parece válido. Revísalo o toca «Omitir».' },
  { key: 'Ciudad', ask: '¿En qué ciudad estás?', type: 'text' },
];

const POR_MOTIVO = {
  cotizar: [
    { key: 'Vehículo', ask: '¿Tu Honda es moto o motokar?', options: ['Moto', 'Motokar'] },
    { key: 'Modelo', ask: '¿Qué modelo es? Si no lo sabes, toca «Omitir».', type: 'text', optional: true },
  ],
  falla: [
    { key: 'Modelo', ask: '¿Qué modelo de Honda tienes?', type: 'text' },
    { key: 'Falla', ask: 'Cuéntanos qué falla tiene y desde cuándo.', type: 'text' },
  ],
  transferencia: [
    { key: 'Modelo', ask: '¿Qué modelo de Honda vendiste o compraste?', type: 'text' },
    { key: 'Fecha de venta', ask: '¿En qué fecha fue la venta?', type: 'text' },
  ],
  servicios: [
    { key: 'Servicio', ask: '¿Qué servicio te interesa?', options: ['Rastreo GPS', 'Accesorios y repuestos', 'Mantenimiento'] },
    { key: 'Vehículo', ask: '¿Tu Honda es moto o motokar?', options: ['Moto', 'Motokar'] },
    { key: 'Consulta', ask: '¿Algo más que debamos saber? Es opcional.', type: 'text', optional: true },
  ],
  concesionario: [
    { key: 'Empresa', ask: '¿Cómo se llama tu empresa o concesionario?', type: 'text' },
    { key: 'Servicio', ask: '¿Qué solución te interesa?', options: ['Programa de garantía extendida', 'Fidelización y lealtad', 'Consultoría de marketing', 'Asesoría en riesgos', 'Capacitaciones'] },
  ],
  otra: [
    { key: 'Consulta', ask: 'Escribe tu consulta.', type: 'text' },
  ],
};

const AVISOS = {
  falla: 'Recuerda: la falla debe reportarse dentro de los 3 días calendario. Ten a la mano tu boleta, fotos del odómetro, DNI y la evidencia de tus mantenimientos.',
  transferencia: 'Recuerda: la transferencia debe avisarse dentro de los 7 días calendario de la venta.',
};

let state = null;

function addMsg(text, who = 'bot') {
  const el = document.createElement('div');
  el.className = `msg msg--${who}`;
  el.textContent = text;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
  return el;
}

function botSay(text) {
  return new Promise((resolve) => {
    const typing = addMsg('Escribiendo…', 'bot');
    typing.classList.add('msg--typing');
    setTimeout(() => {
      typing.classList.remove('msg--typing');
      typing.textContent = text;
      chatLog.scrollTop = chatLog.scrollHeight;
      resolve();
    }, reduceMotion ? 0 : 450);
  });
}

function setOptions(list) {
  chatOptions.innerHTML = '';
  list.forEach(({ label, onClick }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', onClick);
    chatOptions.appendChild(b);
  });
}

function setInput(enabled, type = 'text') {
  chatInput.disabled = !enabled;
  chatSend.disabled = !enabled;
  chatInput.type = type;
  chatInput.value = '';
  if (enabled) chatInput.focus();
}

async function startChat(motivo, servicio) {
  chatLog.innerHTML = '';
  state = { motivo: null, steps: [], i: 0, data: {} };
  setOptions([]);
  setInput(false);
  await botSay('¡Hola! Soy el asistente de GeoMoto. Te ayudo con la Garantía Extendida para tu moto o motokar Honda.');
  if (motivo && MOTIVOS[motivo]) return chooseMotivo(motivo, servicio);
  await botSay('¿En qué te podemos ayudar?');
  setOptions(Object.entries(MOTIVOS).map(([k, label]) => ({ label, onClick: () => chooseMotivo(k) })));
}

async function chooseMotivo(motivo, servicio) {
  setOptions([]);
  addMsg(servicio || MOTIVOS[motivo], 'user');
  state.motivo = motivo;
  state.steps = [...COMUNES, ...POR_MOTIVO[motivo]];
  // Si se llegó desde un botón de un servicio concreto, esa pregunta ya está respondida
  if (servicio) {
    state.data.Servicio = servicio;
    state.steps = state.steps.filter((s) => s.key !== 'Servicio');
  }
  if (AVISOS[motivo]) await botSay(AVISOS[motivo]);
  await botSay('Te haré unas preguntas cortas para que un asesor te contacte.');
  askStep();
}

async function askStep() {
  const step = state.steps[state.i];
  if (!step) return showSummary();
  await botSay(step.ask);
  const opts = (step.options || []).map((o) => ({ label: o, onClick: () => answer(o) }));
  if (step.optional) opts.push({ label: 'Omitir', onClick: () => answer('') });
  setOptions(opts);
  setInput(!step.options, step.type);
}

async function answer(value) {
  const step = state.steps[state.i];
  const v = value.trim();
  if (!v && !step.optional) return;
  addMsg(v || 'Omitir', 'user');
  if (v && step.check && !step.check(v)) {
    await botSay(step.error);
    setInput(!step.options, step.type);
    return;
  }
  state.data[step.key] = v || '—';
  state.i += 1;
  setOptions([]);
  setInput(false);
  askStep();
}

async function showSummary() {
  const resumen = Object.entries(state.data).map(([k, v]) => `${k}: ${v}`).join('\n');
  await botSay(`Revisa tus datos:\n${resumen}`);
  setOptions([
    { label: 'Enviar', onClick: submitChat },
    { label: 'Empezar de nuevo', onClick: () => startChat() },
  ]);
}

async function submitChat() {
  setOptions([]);
  addMsg('Enviar', 'user');
  await botSay(HAS_KEY ? 'Enviando tus datos…' : 'Abriendo tu correo con la solicitud lista…');
  try {
    const via = await sendLead(`Web GeoMoto: ${MOTIVOS[state.motivo]} (${state.data.Nombre})`, {
      Origen: 'Chat del sitio web',
      Motivo: MOTIVOS[state.motivo],
      ...state.data,
    });
    if (via === 'mailto') {
      await botSay(`Se abrió tu correo con la solicitud para ${EMAIL}: solo presiona «Enviar». Un asesor de GeoMoto te contactará pronto.`);
      setOptions([
        { label: 'Abrir el correo otra vez', onClick: submitChat },
        { label: 'Nueva consulta', onClick: () => startChat() },
      ]);
      return;
    }
    await botSay('¡Listo! Recibimos tus datos. Un asesor de GeoMoto te contactará pronto.');
    setOptions([{ label: 'Nueva consulta', onClick: () => startChat() }]);
  } catch {
    await botSay(`No pudimos enviar tus datos. Inténtalo de nuevo o escríbenos a ${EMAIL}.`);
    setOptions([
      { label: 'Reintentar', onClick: submitChat },
      { label: 'Escribir un correo', onClick: () => { location.href = `mailto:${EMAIL}`; } },
    ]);
  }
}

function openChat(motivo, servicio) {
  chat.hidden = false;
  assist.classList.add('is-open');
  assistBtn.setAttribute('aria-expanded', 'true');
  assistBtn.setAttribute('aria-label', 'Cerrar chat de ayuda');
  if (!state || motivo) startChat(motivo, servicio);
}

function closeChat() {
  chat.hidden = true;
  assist.classList.remove('is-open');
  assistBtn.setAttribute('aria-expanded', 'false');
  assistBtn.setAttribute('aria-label', 'Abrir chat de ayuda');
  assistBtn.focus();
}

assistBtn.addEventListener('click', () => (chat.hidden ? openChat() : closeChat()));
chat.querySelector('.chat__close').addEventListener('click', closeChat);
chat.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeChat(); });
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!chatInput.disabled) answer(chatInput.value);
});

// Botones y enlaces del sitio que abren el chat con un motivo ya elegido
document.querySelectorAll('[data-chat]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    openChat(el.dataset.chat, el.dataset.servicio);
  });
});

document.getElementById('year').textContent = new Date().getFullYear();
