/* ===== SUPABASE =====
   A URL e a anon key não ficam mais escritas no código: são buscadas
   em /api/config (função serverless da Vercel), que por sua vez lê as
   variáveis de ambiente do projeto. Veja .env.example e GUIA-1-SUPABASE.md. */
let supabaseClient = null;

async function initSupabase(){
  const resp = await fetch('/api/config');
  if (!resp.ok) {
    throw new Error('Não foi possível carregar a configuração do Supabase (/api/config).');
  }
  const { supabaseUrl, supabaseAnonKey } = await resp.json();
  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
}

/* ===== ANO NO RODAPÉ ===== */
document.getElementById('year').textContent = new Date().getFullYear();

/* ===== PORTFÓLIO: use imagens locais em assets/img/ ===== */
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
works.forEach(w=>{
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

/* ===== AGENDA / CALENDÁRIO ===== */
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

const allSlots = ['16:00','17:30','19:00','20:30','22:00'];

// ⚠️ TROQUE pelo número real do Nicolas — DDI 55 + DDD + número, só dígitos.
// Exemplo: WhatsApp (11) 91234-5678 → '5511912345678'
const WHATSAPP_NUMERO = '5511999999999';

let horariosOcupados = new Set(); // "yyyy-mm-dd|hh:mm" dos horários já reservados

function isAvailable(date){
  const day = date.getDay();
  const today = new Date(); today.setHours(0,0,0,0);
  if (date < today) return false;
  if (day === 0) return false; // domingo fechado
  return true;
}

function dateKey(date){
  return date.toISOString().slice(0,10);
}

/* Busca no Supabase os agendamentos (pendente/confirmado) do mês visível,
   para não deixar o cliente escolher um horário já ocupado. */
async function carregarHorariosOcupados(){
  const inicio = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const fim = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0);

  const { data, error } = await supabaseClient
    .from('calendario')
    .select('data_agendamento, horario')
    .gte('data_agendamento', dateKey(inicio))
    .lte('data_agendamento', dateKey(fim))
    .in('status', ['pendente','confirmado']);

  horariosOcupados = new Set();
  if (!error && data) {
    data.forEach(row=>{
      horariosOcupados.add(`${row.data_agendamento}|${row.horario.slice(0,5)}`);
    });
  }
}

async function renderCalendar(){
  calGrid.innerHTML = '';
  calMonth.textContent = `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  dowNames.forEach(d=>{
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    calGrid.appendChild(el);
  });

  await carregarHorariosOcupados();

  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0).getDate();
  const today = new Date();

  for(let i=0;i<firstDay;i++){
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    calGrid.appendChild(empty);
  }

  for(let d=1; d<=daysInMonth; d++){
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d;

    if (date.toDateString() === today.toDateString()) cell.classList.add('today');

    if (isAvailable(date)){
      cell.classList.add('available');
      cell.addEventListener('click', ()=> selectDate(date, cell));
    }

    if (selectedDate && date.toDateString() === selectedDate.toDateString()){
      cell.classList.add('selected');
    }

    calGrid.appendChild(cell);
  }
}

function selectDate(date, cell){
  document.querySelectorAll('.cal-day.selected').forEach(c=>c.classList.remove('selected'));
  cell.classList.add('selected');
  selectedDate = date;
  selectedSlot = null;
  renderSlots();
  updateStatus();
}

function renderSlots(){
  slotsEl.innerHTML = '';
  const key = dateKey(selectedDate);
  allSlots.forEach(s=>{
    const ocupado = horariosOcupados.has(`${key}|${s}`);
    const el = document.createElement('div');
    el.className = 'slot' + (ocupado ? ' disabled' : '');
    el.textContent = ocupado ? `${s} (ocupado)` : s;
    if (!ocupado){
      el.addEventListener('click', ()=>{
        document.querySelectorAll('.slot.selected').forEach(x=>x.classList.remove('selected'));
        el.classList.add('selected');
        selectedSlot = s;
        updateStatus();
      });
    }
    slotsEl.appendChild(el);
  });
}

function updateStatus(){
  if (selectedDate && selectedSlot){
    const ds = selectedDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'long'});
    statusEl.innerHTML = `Horário selecionado: <b>${ds} às ${selectedSlot}</b>`;
    submitBtn.disabled = false;
  } else if (selectedDate){
    statusEl.textContent = 'Agora escolha um horário disponível.';
    submitBtn.disabled = true;
  } else {
    statusEl.textContent = 'Selecione uma data disponível no calendário.';
    submitBtn.disabled = true;
  }
}

document.getElementById('cal-prev').addEventListener('click', ()=>{
  viewDate.setMonth(viewDate.getMonth()-1);
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', ()=>{
  viewDate.setMonth(viewDate.getMonth()+1);
  renderCalendar();
});

submitBtn.addEventListener('click', async ()=>{
  const name = document.getElementById('fname').value.trim();
  const phone = document.getElementById('fphone').value.trim();
  const type = document.getElementById('ftype').value;
  const local = document.getElementById('flocal').value.trim();

  if (!name || !phone || !local){
    statusEl.textContent = 'Preencha nome, WhatsApp e local antes de enviar.';
    return;
  }
  if (!selectedDate || !selectedSlot){
    statusEl.textContent = 'Selecione uma data e um horário antes de enviar.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  try {
    // 1) Garante que o cliente existe (procura por telefone; se não existir, cria)
    let clienteId = null;
    const { data: clienteExistente } = await supabaseClient
      .from('clientes')
      .select('id')
      .eq('telefone', phone)
      .maybeSingle();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: novoCliente, error: erroCliente } = await supabaseClient
        .from('clientes')
        .insert({ nome: name, telefone: phone })
        .select('id')
        .single();
      if (erroCliente) throw erroCliente;
      clienteId = novoCliente.id;
    }

    // 2) Cria o agendamento
    const dataISO = dateKey(selectedDate);
    const { error: erroAgendamento } = await supabaseClient
      .from('calendario')
      .insert({
        cliente_id: clienteId,
        nome: name,
        telefone: phone,
        tiposessao: type,
        local: local,
        data_agendamento: dataISO,
        horario: selectedSlot,
        status: 'pendente'
      });

    if (erroAgendamento) {
      // 23505 = violação de UNIQUE (alguém marcou esse horário nos últimos segundos)
      if (erroAgendamento.code === '23505') {
        statusEl.textContent = 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro.';
        selectedSlot = null;
        await renderCalendar();
        renderSlots();
        return;
      }
      throw erroAgendamento;
    }

    // 3) Sucesso — abre o WhatsApp com os dados preenchidos
    const ds = selectedDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'});
    const texto = `Olá Nicolas! Gostaria de agendar uma sessão.\n\nNome: ${name}\nWhatsApp: ${phone}\nTipo de sessão: ${type}\nLocal: ${local}\nData desejada: ${ds} às ${selectedSlot}`;
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`, '_blank');

    statusEl.textContent = 'Pedido enviado! Em breve o Nicolas confirma por WhatsApp.';
    submitBtn.textContent = 'Enviado ✓';

    // A mensagem acima já contém tudo que o Nicolas precisa pra confirmar:
    // nome, telefone, tipo de sessão, local, data e horário.

  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Não foi possível enviar. Tente novamente em instantes.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar pedido de agendamento';
  }
});

/* ===== INICIALIZAÇÃO ===== */
(async function init(){
  try {
    await initSupabase();
    await renderCalendar();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Erro ao carregar a agenda. Recarregue a página em instantes.';
  }
})();
