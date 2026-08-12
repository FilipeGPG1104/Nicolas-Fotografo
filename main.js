/* ===== ANO NO RODAPÉ ===== */
document.getElementById('year').textContent = new Date().getFullYear();

/* ===== PORTFÓLIO ===== */
const works = [
  { src: 'assets/img/port1.jpeg', title:'Retrato — Luz de janela', data:'f/1.8 · 1/250 · ISO 200' },
  { src: 'assets/img/port2.jpeg', title:'Ensaio — Treino esportivo', data:'f/2.8 · 1/500 · ISO 400' },
  { src: 'assets/img/port3.jpeg', title:'Retrato editorial', data:'f/4 · 1/160 · ISO 100' },
  { src: 'assets/img/port4.jpeg', title:'Jogador — Perfil', data:'f/2 · 1/320 · ISO 800' },
  { src: 'assets/img/port5.jpeg', title:'Time — Taça', data:'f/1.4 · 1/200 · ISO 320' },
  { src: 'assets/img/port6.jpeg', title:'Retrato juvenil', data:'f/2.2 · 1/400 · ISO 160' },
  { src: 'assets/img/port8.jpeg', title:'Retrato — Close', data:'f/1.8 · 1/200 · ISO 200' },
];

const grid = document.getElementById('portfolio-grid');
works.forEach(w => {
  const div = document.createElement('div');
  div.className = 'grid-item';
  div.innerHTML = `
    <img src="${w.src}" alt="${w.title}" loading="lazy">
    <div class="exif">
      <div class="exif-title">${w.title}</div>
      <div class="exif-data mono">${w.data}</div>
    </div>`;
  grid.appendChild(div);
});

/* ===== AGENDA / WHATSAPP ===== */
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const dowNames = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
let viewDate = new Date();
viewDate.setDate(1);
let selectedDate = null;
let selectedSlot = null;

const calGrid = document.getElementById('cal-grid');
const calMonth = document.getElementById('cal-month');
const slotsEl = document.getElementById('slots');
const statusEl = document.getElementById('booking-status');
const submitBtn = document.getElementById('booking-submit');

// Número do WhatsApp do Nicolas: DDI + DDD + número, somente números.
const WHATSAPP_NUMERO = '5511999999999';

const allSlots = ['16:00','17:30','19:00','20:30','22:00'];

function isAvailable(date) {
  const day = date.getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Não permite datas passadas nem domingos.
  return date >= today && day !== 0;
}

function renderCalendar() {
  calGrid.innerHTML = '';
  calMonth.textContent = `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  dowNames.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    calGrid.appendChild(el);
  });

  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const today = new Date();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    calGrid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d;

    if (date.toDateString() === today.toDateString()) {
      cell.classList.add('today');
    }

    if (isAvailable(date)) {
      cell.classList.add('available');
      cell.addEventListener('click', () => selectDate(date, cell));
    }

    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
      cell.classList.add('selected');
    }

    calGrid.appendChild(cell);
  }
}

function selectDate(date, cell) {
  document.querySelectorAll('.cal-day.selected').forEach(c => c.classList.remove('selected'));
  cell.classList.add('selected');
  selectedDate = date;
  selectedSlot = null;
  renderSlots();
  updateStatus();
}

function renderSlots() {
  slotsEl.innerHTML = '';

  allSlots.forEach(s => {
    const el = document.createElement('div');
    el.className = 'slot';
    el.textContent = s;

    el.addEventListener('click', () => {
      document.querySelectorAll('.slot.selected').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      selectedSlot = s;
      updateStatus();
    });

    slotsEl.appendChild(el);
  });
}

function updateStatus() {
  if (selectedDate && selectedSlot) {
    const ds = selectedDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    statusEl.innerHTML = `Horário selecionado: <b>${ds} às ${selectedSlot}</b>`;
    submitBtn.disabled = false;
  } else if (selectedDate) {
    statusEl.textContent = 'Agora escolha um horário.';
    submitBtn.disabled = true;
  } else {
    statusEl.textContent = 'Selecione uma data disponível no calendário.';
    submitBtn.disabled = true;
  }
}

document.getElementById('cal-prev').addEventListener('click', () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  renderCalendar();
});

submitBtn.addEventListener('click', () => {
  const name = document.getElementById('fname').value.trim();
  const phone = document.getElementById('fphone').value.trim();
  const type = document.getElementById('ftype').value;
  const local = document.getElementById('flocal').value.trim();

  if (!name || !phone || !local) {
    statusEl.textContent = 'Preencha nome, WhatsApp e local antes de enviar.';
    return;
  }

  if (!selectedDate || !selectedSlot) {
    statusEl.textContent = 'Selecione uma data e um horário antes de enviar.';
    return;
  }

  const ds = selectedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const texto =
`Olá Nicolas! Gostaria de agendar uma sessão.

Nome: ${name}
WhatsApp: ${phone}
Tipo de sessão: ${type}
Local: ${local}
Data desejada: ${ds} às ${selectedSlot}`;

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
  window.open(whatsappUrl, '_blank', 'noopener');

  statusEl.textContent = 'Informações preparadas! O WhatsApp foi aberto para você enviar a solicitação.';
  submitBtn.textContent = 'Abrir WhatsApp novamente';
  submitBtn.disabled = false;
});

/* ===== INICIALIZAÇÃO ===== */
renderCalendar();
