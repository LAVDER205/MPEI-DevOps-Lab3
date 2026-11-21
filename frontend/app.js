const day = document.querySelector('#day');
const notice = document.querySelector('#notice');
const retry = document.querySelector('#retry');
const zone = 'Europe/Moscow';
const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: zone, day: 'numeric', month: 'long', year: 'numeric'
});
const clock = new Intl.DateTimeFormat('ru-RU', {
  timeZone: zone, hour: '2-digit', minute: '2-digit'
});
const rubles = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0
});
const selected = new Map();
let catalog = [];

function overlap(a, b) {
  return Date.parse(a.starts_at) < Date.parse(b.ends_at)
    && Date.parse(b.starts_at) < Date.parse(a.ends_at);
}

function toggle(event) {
  notice.textContent = '';
  if (selected.has(event.id)) {
    selected.delete(event.id);
  } else {
    const conflict = [...selected.values()].find(other => overlap(event, other));
    if (conflict) {
      notice.textContent = 'Время пересекается с событием «' + conflict.title + '».';
      return;
    }
    selected.set(event.id, event);
  }
  render();
}

function row(event, inPlan) {
  const item = document.createElement('li');
  const title = document.createElement('strong');
  const details = document.createElement('p');
  const button = document.createElement('button');
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const endDay = dateFormat.format(start) === dateFormat.format(end)
    ? '' : ' (' + dateFormat.format(end) + ')';
  title.textContent = event.title;
  details.textContent = clock.format(start) + ' – ' + clock.format(end) + endDay
    + ' · ' + rubles.format(event.price_rub);
  button.textContent = inPlan ? 'Убрать' : selected.has(event.id) ? 'В плане' : 'Добавить';
  button.disabled = !inPlan && selected.has(event.id);
  button.onclick = () => toggle(event);
  item.append(title, details, button);
  return item;
}

function render() {
  const events = catalog.filter(event => dateFormat.format(new Date(event.starts_at)) === day.value);
  const plan = events.filter(event => selected.has(event.id));
  document.querySelector('#events').replaceChildren(...events.map(event => row(event, false)));
  document.querySelector('#plan').replaceChildren(...plan.map(event => row(event, true)));
  document.querySelector('#empty').hidden = plan.length > 0;
  document.querySelector('#total').textContent = rubles.format(
    plan.reduce((sum, event) => sum + event.price_rub, 0)
  );
}

async function load() {
  retry.hidden = true;
  notice.textContent = 'Загружаем афишу…';
  try {
    const events = [];
    for (let page = 1; ; page++) {
      const query = new URLSearchParams({ status: 'published', sort: 'starts_at', page_size: '100', page });
      const response = await fetch('/api/v1/events?' + query);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const { data, meta } = await response.json();
      events.push(...data);
      if (events.length >= meta.total || !data.length) break;
    }
    catalog = events;
    const dates = new Set(events.map(event => dateFormat.format(new Date(event.starts_at))));
    day.replaceChildren(...Array.from(dates, date => new Option(date, date)));
    day.disabled = !dates.size;
    notice.textContent = dates.size ? '' : 'В афише пока нет опубликованных событий.';
    render();
  } catch {
    notice.textContent = 'Не удалось загрузить афишу. Проверь подключение к API.';
    retry.hidden = false;
  }
}

day.onchange = () => { notice.textContent = ''; render(); };
retry.onclick = load;
load();
