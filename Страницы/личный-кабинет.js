const view = document.body.dataset.view;
const currentPage = 'Текущие заказы.html';
const historyPage = 'История заказов.html';
const products = {
  north: { name: 'Кукла Мирэя «Северное сияние», 41 см', price: 4190 },
  sea: { name: 'Кукла Мирэя «Кристальное море», 41 см', price: 4490 },
  valley: { name: 'Кукла Мирэя «Долина гейзеров», 41 см', price: 4290 },
  alice: { name: 'Кукла Алиса, 55 см', price: 2490 },
};
const orders = [
  { id: 26, date: '13.11.2026', state: 'pending', items: [['north', 1], ['sea', 1]], delivery: 350 },
  { id: 25, date: '12.11.2026', state: 'shipping', items: [['valley', 1], ['alice', 1]], delivery: 350 },
  { id: 24, date: '09.11.2026', state: 'canceled', items: [['sea', 1]], delivery: 350, closed: '09.11.2026' },
  { id: 21, date: '05.11.2026', state: 'completed', items: [['north', 1], ['alice', 2]], delivery: 350, closed: '08.11.2026' },
  { id: 19, date: '01.11.2026', state: 'completed', items: [['valley', 1]], delivery: 350, closed: '04.11.2026' },
];
const orderStates = {
  pending: { order: 'Принят, ожидается оплата', payment: 'Не оплачено', delivery: 'Ожидает обработки' },
  shipping: { order: 'Передан в доставку', payment: 'Оплачено', delivery: 'В пути' },
  canceled: { order: 'Заказ отменён', payment: 'Не оплачено', delivery: 'Отгрузка отменена' },
  completed: { order: 'Заказ выполнен', payment: 'Оплачено', delivery: 'Получен покупателем' },
};
const rubles = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
});
const money = amount => rubles.format(amount);
const active = order => order.state === 'pending' || order.state === 'shipping';
const subtotal = order => order.items.reduce((sum, [id, quantity]) => sum + products[id].price * quantity, 0);
const total = order => subtotal(order) + order.delivery;
const orderLink = order => `Детали заказа.html?order=${order.id}`;
const list = document.querySelector('#orders');
const showFilled = document.querySelector('#show-filled');
const showEmpty = document.querySelector('#show-empty');
const filters = [...document.querySelectorAll('[data-filter]')];
let isEmpty = false;
let filter = 'all';

function orderSummary(order) {
  const quantity = order.items.reduce((sum, [, count]) => sum + count, 0);
  return `${quantity} ${quantity === 1 ? 'товар' : 'товара'} на сумму ${money(total(order))}`;
}

function action(label, type, order, primary = false) {
  return `<button class="button${primary ? ' button--primary' : ''}" type="button" data-order-action="${type}" data-order="${order.id}">${label}</button>`;
}

function heading(order, collapsible = false) {
  const label = `Заказ №${order.id} от ${order.date}`;
  const title = collapsible ? `<strong>${label}</strong>` : `<h2>${label}</h2>`;
  const wrapper = collapsible ? 'span' : 'div';
  const status = orderStates[order.state].order;
  return `<${wrapper} class="order-heading">
    <${wrapper}>${title}<span class="muted">${orderSummary(order)}</span></${wrapper}>
    <span class="order-status">${status}${order.closed ? ' ' + order.closed : ''}</span>
  </${wrapper}>`;
}

function productRows(order) {
  return `<ul class="products">${order.items.map(([id, quantity]) => `<li class="product">
    <span class="product-photo" aria-hidden="true">Фото</span>
    <strong>${products[id].name}</strong>
    <span>${quantity} шт.</span>
    <strong>${money(products[id].price * quantity)}</strong>
  </li>`).join('')}</ul>`;
}

function payment(order, title = 'Оплата') {
  const awaitingPayment = order.state === 'pending';
  return `<section class="block">
    <h3>${title}</h3>
    <p><strong>${orderStates[order.state].payment}</strong></p>
    <p>Счёт №${order.id}/1 от ${order.date} · Банковская карта</p>
    <p class="muted">${awaitingPayment ? 'Сумма к оплате' : 'Сумма по счёту'} — ${money(total(order))}</p>
    ${awaitingPayment ? `<div class="actions sub-actions">
      ${action('Сменить способ оплаты', 'change-payment', order)}
      ${action('Оплатить', 'pay', order, true)}
    </div>` : ''}
  </section>`;
}

function shipment(order, full = false) {
  const status = orderStates[order.state].delivery;
  return `<section class="block">
    <h3>${full ? 'Параметры отгрузки' : 'Доставка'}</h3>
    ${full ? `<dl class="values">
      <div><dt>Способ доставки</dt><dd>В пункт выдачи</dd></div>
      <div><dt>Адрес пункта выдачи</dt><dd>Киров, ул. Ленина, 15</dd></div>
      <div><dt>Текущий статус</dt><dd>${status}</dd></div>
    </dl>
    <details class="shipping-more"><summary>Показать сведения об отгрузке</summary>
      <p>Отгрузка №${order.id}/2</p>
      <p>Стоимость доставки — ${money(order.delivery)}</p>
    </details>` : `<p><strong>${status}</strong></p>
    <p>Отгрузка №${order.id}/2</p><p class="muted">Доставка в пункт выдачи · Киров</p>`}
  </section>`;
}

function currentCard(order) {
  return `<article class="panel stack">
    ${heading(order)}
    ${payment(order)}
    ${shipment(order)}
    <a href="${orderLink(order)}">Подробнее о заказе</a>
    <div class="actions spread">
      ${action('Повторить заказ', 'repeat', order)}
      ${action('Запросить отмену', 'cancel', order)}
    </div>
  </article>`;
}

function historyCard(order, index) {
  return `<details class="history-item"${index === 0 ? ' open' : ''}>
    <summary>${heading(order, true)}</summary>
    <div class="history-body stack">
      ${productRows(order)}
      <div class="actions spread">
        <a href="${orderLink(order)}">Подробнее о заказе</a>
        ${action('Повторить заказ', 'repeat', order)}
      </div>
    </div>
  </details>`;
}

function renderOrders() {
  const isCurrent = view === 'current';
  const visible = orders.filter(order => isCurrent ? active(order) :
    !active(order) && (filter === 'all' || order.state === 'canceled'));
  showFilled.setAttribute('aria-pressed', !isEmpty);
  showEmpty.setAttribute('aria-pressed', isEmpty);
  filters.forEach(button => button.setAttribute('aria-pressed', button.dataset.filter === filter));

  if (isEmpty || visible.length === 0) {
    const label = isCurrent ? 'Нет текущих заказов' : filter === 'canceled' ?
      'Нет отменённых заказов' : 'История заказов пока пуста';
    list.innerHTML = `<section class="panel stack empty">
      <h2>${label}</h2>
      <p>${isCurrent ? 'Новые заказы появятся здесь после оформления.' : 'Здесь появятся заказы после завершения или отмены.'}</p>
      <button class="button button--primary" type="button" disabled>В каталог</button>
    </section>`;
    return;
  }
  list.innerHTML = visible.map(isCurrent ? currentCard : historyCard).join('');
}

function renderDetails() {
  const id = Number(new URLSearchParams(location.search).get('order') || orders[0].id);
  const order = orders.find(item => item.id === id);
  const panel = document.querySelector('#order-details');
  if (!order) {
    panel.innerHTML = `<h2>Заказ не найден</h2><a href="${currentPage}">К текущим заказам</a>`;
    return;
  }
  const returnPage = active(order) ? currentPage : historyPage;
  const links = document.querySelectorAll('.account-nav a');
  links.forEach(link => link.removeAttribute('aria-current'));
  [...links].find(link => link.getAttribute('href') === returnPage).setAttribute('aria-current', 'location');
  panel.innerHTML = `
    ${heading(order)}
    <section class="block">
      <h3>Информация о заказе</h3>
      <dl class="values">
        <div><dt>Получатель</dt><dd>Анна Иванова</dd></div>
        <div><dt>Тип покупателя</dt><dd>Физическое лицо</dd></div>
        <div><dt>Телефон</dt><dd>+7 (900) 000-00-00</dd></div>
        <div><dt>Электронная почта</dt><dd>anna@example.com</dd></div>
        <div><dt>Город</dt><dd>Киров</dd></div>
        <div><dt>Индекс</dt><dd>610000</dd></div>
      </dl>
    </section>
    ${payment(order, 'Параметры оплаты')}
    ${shipment(order, true)}
    <section class="block">
      <h3>Состав заказа</h3>
      ${productRows(order)}
      <dl class="totals">
        <div><dt>Товары</dt><dd>${money(subtotal(order))}</dd></div>
        <div><dt>Доставка</dt><dd>${money(order.delivery)}</dd></div>
        <div><dt>Итого</dt><dd>${money(total(order))}</dd></div>
      </dl>
    </section>
    <div class="actions spread">
      ${action('Повторить заказ', 'repeat', order)}
      ${action('Обратиться по заказу', 'support', order)}
      ${active(order) ? action('Запросить отмену', 'cancel', order) : ''}
    </div>
    <a href="${returnPage}">${active(order) ? 'К текущим заказам' : 'К истории заказов'}</a>`;
}

const dialog = document.querySelector('#order-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogDescription = document.querySelector('#dialog-description');
const dialogMessage = document.querySelector('#dialog-message');
const dialogForm = document.querySelector('#order-action-form');
const dialogSubmit = document.querySelector('#dialog-submit');
const dialogClose = document.querySelector('#dialog-close');

function showAction(type, id) {
  const order = orders.find(item => item.id === id);
  const demoActions = {
    pay: ['Оплата заказа', 'Здесь покупатель перейдёт к оплате выбранным способом.'],
    repeat: ['Повторить заказ', 'Доступные товары будут добавлены в корзину по актуальным ценам.'],
    logout: ['Выход из кабинета', 'Здесь покупатель завершит сеанс и вернётся на страницу входа.'],
    cancel: ['Запрос на отмену', 'Менеджер получит запрос и сообщит результат.'],
    'change-payment': ['Смена способа оплаты', 'Укажите, как хотите оплатить заказ. Менеджер обработает запрос.'],
    support: ['Обращение по заказу', 'Опишите, что нужно изменить, отменить или вернуть.'],
  };
  const [title, description] = demoActions[type];
  const request = ['cancel', 'change-payment', 'support'].includes(type);
  dialogTitle.textContent = order ? `${title} №${order.id}` : title;
  dialogDescription.textContent = description;
  dialogForm.reset();
  dialogMessage.hidden = !request;
  dialogMessage.querySelector('textarea').required = type !== 'cancel' && request;
  dialogSubmit.hidden = !request;
  dialogSubmit.textContent = 'Отправить запрос';
  dialog.showModal();
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-order-action]');
  if (button) showAction(button.dataset.orderAction, Number(button.dataset.order));
});
dialogClose.addEventListener('click', () => dialog.close());
dialogForm.addEventListener('submit', event => {
  event.preventDefault();
  if (dialogSubmit.hidden) return;
  dialogDescription.textContent = 'В этом прототипе показано подтверждение отправки запроса менеджеру.';
  dialogForm.reset();
  dialogMessage.hidden = true;
  dialogMessage.querySelector('textarea').required = false;
  dialogSubmit.hidden = true;
  dialogClose.focus();
});

if (list) {
  showFilled.addEventListener('click', () => { isEmpty = false; renderOrders(); });
  showEmpty.addEventListener('click', () => { isEmpty = true; renderOrders(); });
  filters.forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    renderOrders();
  }));
  renderOrders();
}

if (view === 'details') renderDetails();

if (view === 'profile') {
  const form = document.querySelector('#profile-form');
  const status = document.querySelector('#profile-feedback');
  const password = form.elements.namedItem('password');
  const confirmation = form.elements.namedItem('confirmation');

  form.addEventListener('input', () => {
    confirmation.setCustomValidity('');
    status.textContent = '';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    confirmation.setCustomValidity(password.value === confirmation.value ? '' : 'Пароли должны совпадать.');
    if (!form.reportValidity()) return;
    for (const input of form.querySelectorAll('input:not([type="password"])')) {
      input.defaultValue = input.value;
    }
    password.value = '';
    confirmation.value = '';
    status.textContent = 'Данные сохранены в прототипе.';
  });
  form.addEventListener('reset', () => {
    confirmation.setCustomValidity('');
    status.textContent = 'Изменения сброшены.';
  });
}
