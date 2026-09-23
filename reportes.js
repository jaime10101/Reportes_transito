/* ============================================================
   CONFIGURACIÓN — edita esto antes de publicar el formulario
   ============================================================ */
const CORREO_TRANSITO = "reportes@transito-tuciudad.gov.co"; // <-- cambia por el correo real de Tránsito

/* El envío usa FormSubmit (https://formsubmit.co), un servicio gratuito
   que reenvía formularios HTML a un correo sin necesidad de backend propio.
   La PRIMERA vez que llegue un reporte a un correo nuevo, FormSubmit le
   envía a ese correo un enlace de activación de un solo clic: alguien de
   Tránsito debe abrirlo una vez para que los siguientes reportes entren
   directo a la bandeja de entrada. */
const ENDPOINT = `https://formsubmit.co/ajax/${CORREO_TRANSITO}`;

/* ============================================================ */

const form = document.getElementById('report-form');
const steps = [...form.querySelectorAll('.step')];
const progressItems = [...document.querySelectorAll('.progress li')];
let current = 1;
let photoDataUrl = null;

function goTo(stepNum){
  steps.forEach(s => s.hidden = Number(s.dataset.step) !== stepNum);
  progressItems.forEach(li => {
    const n = Number(li.dataset.step);
    li.classList.toggle('on', n === stepNum);
    li.classList.toggle('done', n < stepNum);
  });
  current = stepNum;
  if (stepNum === 4) buildSummary();
  document.querySelector('.card').scrollIntoView({behavior:'smooth', block:'start'});
}

form.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', () => {
  if (!validateStep(current)) return;
  goTo(current + 1);
}));
form.querySelectorAll('[data-prev]').forEach(btn => btn.addEventListener('click', () => goTo(current - 1)));

function validateStep(step){
  if (step === 1) return !!document.getElementById('categoria').value;
  if (step === 2){
    const desc = document.getElementById('descripcion');
    const dir = document.getElementById('direccion');
    if (!desc.value.trim() || !dir.value.trim()){
      desc.reportValidity();
      dir.reportValidity();
      return false;
    }
    return true;
  }
  return true;
}

/* --- Paso 1: categoría --- */
const categoryCards = [...document.querySelectorAll('.category-card')];
categoryCards.forEach(card => card.addEventListener('click', () => {
  categoryCards.forEach(c => c.setAttribute('aria-checked','false'));
  card.setAttribute('aria-checked','true');
  document.getElementById('categoria').value = card.dataset.value === 'vehiculo'
    ? 'Vehículo mal estacionado'
    : 'Vendedor ambulante mal ubicado';
  document.querySelector('[data-next]').disabled = false;
}));

/* --- Paso 2: descripción y geolocalización --- */
const descInput = document.getElementById('descripcion');
const descCount = document.getElementById('desc-count');
descInput.addEventListener('input', () => descCount.textContent = descInput.value.length);

document.getElementById('geo-btn').addEventListener('click', () => {
  const status = document.getElementById('geo-status');
  if (!navigator.geolocation){
    status.textContent = 'Tu navegador no permite compartir ubicación.';
    return;
  }
  status.textContent = 'Buscando tu ubicación…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      document.getElementById('coordenadas').value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      status.textContent = `Ubicación agregada (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
    },
    () => { status.textContent = 'No pudimos acceder a tu ubicación. Puedes escribir la dirección igual.'; }
  );
});

/* --- Paso 3: foto --- */
const fotoInput = document.getElementById('foto');
const photoPreview = document.getElementById('photo-preview');
const photoLabel = document.getElementById('photo-label');
const photoRemoveBtn = document.getElementById('photo-remove');

fotoInput.addEventListener('change', () => {
  const file = fotoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    photoDataUrl = e.target.result;
    photoPreview.src = photoDataUrl;
    photoPreview.hidden = false;
    photoLabel.textContent = file.name;
    photoRemoveBtn.hidden = false;
  };
  reader.readAsDataURL(file);
});

photoRemoveBtn.addEventListener('click', () => {
  fotoInput.value = '';
  photoDataUrl = null;
  photoPreview.hidden = true;
  photoRemoveBtn.hidden = true;
  photoLabel.textContent = 'Toca para tomar o subir una foto';
});

/* --- Paso 4: resumen --- */
function buildSummary(){
  const summary = document.getElementById('summary');
  const rows = [
    ['Categoría', document.getElementById('categoria').value],
    ['Descripción', document.getElementById('descripcion').value],
    ['Dirección', document.getElementById('direccion').value],
    ['Coordenadas GPS', document.getElementById('coordenadas').value || 'No compartidas'],
  ];
  summary.innerHTML = rows.map(([k,v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('');
  if (photoDataUrl){
    summary.innerHTML += `<dt>Foto</dt>`;
    const img = document.createElement('img');
    img.src = photoDataUrl;
    img.alt = 'Foto del reporte';
    summary.appendChild(img);
  }
}
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* --- Envío --- */
form.addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando…';

  const data = new FormData();
  data.append('Categoría', document.getElementById('categoria').value);
  data.append('Descripción', document.getElementById('descripcion').value);
  data.append('Dirección', document.getElementById('direccion').value);
  data.append('Coordenadas GPS', document.getElementById('coordenadas').value || 'No compartidas');
  data.append('_subject', 'Nuevo reporte anónimo — Reporta a Tránsito');
  data.append('_template', 'table');
  data.append('_captcha', 'false');
  if (fotoInput.files[0]) data.append('Foto', fotoInput.files[0]);

  try{
    const res = await fetch(ENDPOINT, { method:'POST', body:data, headers:{ 'Accept':'application/json' } });
    if (!res.ok) throw new Error('Fallo el envío');
    showSuccess();
  }catch(err){
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar reporte';
    alert('No pudimos enviar el reporte. Revisa tu conexión e inténtalo de nuevo.');
  }
});

function showSuccess(){
  form.hidden = true;
  document.getElementById('success-screen').hidden = false;
}

document.getElementById('new-report-btn').addEventListener('click', () => {
  form.reset();
  categoryCards.forEach(c => c.setAttribute('aria-checked','false'));
  document.querySelector('[data-next]').disabled = true;
  photoDataUrl = null;
  photoPreview.hidden = true;
  photoRemoveBtn.hidden = true;
  photoLabel.textContent = 'Toca para tomar o subir una foto';
  descCount.textContent = '0';
  document.getElementById('geo-status').textContent = '';
  form.hidden = false;
  document.getElementById('success-screen').hidden = true;
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('submit-btn').textContent = 'Enviar reporte';
  goTo(1);
});