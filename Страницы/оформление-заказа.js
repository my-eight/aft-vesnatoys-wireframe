const quantities = readOrderQuantities(location.search);
const cartHref = 'Корзина.html?' + orderCartQuery(quantities);
document.querySelector('#cart-crumb').href = cartHref;
document.querySelector('#edit-cart').href = cartHref;
document.querySelector('#empty-cart-link').href = cartHref;

if (quantities.size === 0) {
  document.querySelector('#checkout-layout').hidden = true;
  document.querySelector('#empty-order').hidden = false;
} else {
  initializeCheckout();
}

function initializeCheckout() {
  const form = document.querySelector('#order-form');
  const steps = [...form.querySelectorAll('.step')];
  const completed = new Set();
  const list = document.querySelector('#order-items');
  const rowTemplate = document.querySelector('#order-row');
  const deliveryMethods = {
    self: { name: 'Самовывоз', description: 'Заберите заказ со склада фабрики в Кирове.', amount: 0, timing: '1–2 дня до готовности', pointLabel: 'Склад фабрики' },
    cdek: { name: 'СДЭК', description: 'Заберите заказ в выбранном пункте выдачи СДЭК.', amount: 350, timing: '2–4 дня', pointLabel: 'Пункт выдачи СДЭК' },
    yandex: { name: 'Яндекс Доставка', description: 'Заберите заказ в выбранном пункте выдачи Яндекс Доставки.', amount: 550, timing: '1–3 дня', pointLabel: 'Пункт выдачи Яндекс Доставки' },
    '5post': { name: '5Post', description: 'Заберите заказ в выбранном пункте выдачи 5Post.', amount: 300, timing: '2–4 дня', pointLabel: 'Пункт выдачи 5Post' },
    post: { name: 'Почта России', description: 'Заберите заказ в выбранном почтовом отделении.', amount: 450, timing: '4–7 дней', pointLabel: 'Отделение Почты России' },
  };
  const paymentNames = { card: 'Банковской картой онлайн', invoice: 'По счёту' };
  const indexes = { Киров: '610000', Москва: '101000' };
  const locationSelect = form.elements.location;
  const city = form.elements.city;
  const postalCode = form.elements['postal-code'];
  const pickupPoint = form.elements['pickup-point'];
  const pickupWidget = document.querySelector('#pickup-widget');
  const pickupMarkers = document.querySelector('#pickup-markers');
  const pickupPopup = document.querySelector('#pickup-popup');
  const choosePickupPoint = document.querySelector('#choose-pickup-point');
  const pickupSelection = document.querySelector('#pickup-selection');
  let points = [];
  let previewPoint = null;
  const deliveryInfo = document.querySelector('#delivery-info');
  const addressFields = document.querySelector('#address-fields');
  const companyFields = document.querySelector('#company-fields');
  const invoiceOption = document.querySelector('#invoice-option');
  const submit = form.querySelector('[type="submit"]');
  const format = value => orderMoney.format(value);
  const fieldValue = name => form.elements[name].value.trim();
  const destination = () => locationSelect.value === 'other' ? fieldValue('city') : locationSelect.value;
  const delivery = () => deliveryMethods[fieldValue('delivery')];
  let subtotal = 0;
  let activeStep = 0;

  for (const { name, sku, price } of orderProducts) {
    const quantity = quantities.get(sku);
    if (!quantity) continue;
    const row = rowTemplate.content.cloneNode(true);
    const amount = quantity * price;
    row.querySelector('[data-field="name"]').textContent = name;
    row.querySelector('[data-field="sku"]').textContent = 'Артикул ' + sku;
    row.querySelector('[data-field="quantity"]').textContent = quantity + ' шт.';
    row.querySelector('[data-field="price"]').textContent = format(amount);
    list.append(row);
    subtotal += amount;
  }
  document.querySelector('#subtotal').textContent = format(subtotal);

  function setFieldAvailability(wrapper, control, visible) {
    wrapper.hidden = !visible;
    control.disabled = !visible;
  }

  function refreshPickup() {
    const method = delivery();
    const cityName = destination();
    const previous = pickupPoint.value;
    const options = [new Option('Выберите место получения', '')];
    points = [];
    previewPoint = null;
    pickupPopup.hidden = true;
    pickupMarkers.replaceChildren();
    pickupWidget.hidden = !method || !cityName;
    if (method && cityName) {
      const warehouse = fieldValue('delivery') === 'self';
      const mapCity = warehouse ? 'Киров' : cityName;
      points = warehouse
        ? [{ name: 'Склад фабрики «Весна»', address: 'Киров, ул. Ленина, 15', hours: 'Пн–Пт 09:00–18:00 · Сб–Вс выходной', x: 63, y: 29 }]
        : [
          { name: method.pointLabel + ' № 1', address: mapCity + ', ул. Ленина, 15', hours: 'Ежедневно 09:00–21:00', x: 24, y: 26 },
          { name: method.pointLabel + ' № 2', address: mapCity + ', ул. Мира, 8', hours: 'Пн–Сб 10:00–20:00 · Вс 10:00–18:00', x: 58, y: 18 },
          { name: method.pointLabel + ' № 3', address: mapCity + ', ул. Садовая, 24', hours: 'Ежедневно 10:00–22:00', x: 84, y: 34 },
        ];
      document.querySelector('#pickup-widget-title').textContent = warehouse ? 'Самовывоз со склада' : 'Пункты получения · ' + method.name;
      document.querySelector('#pickup-widget-note').textContent = warehouse
        ? 'Нажмите на маркер склада, чтобы увидеть адрес и график работы. Адрес и график демонстрационные.'
        : 'Нажмите на маркер, чтобы посмотреть и выбрать пункт. Карта, адреса и графики демонстрационные. На сайте здесь будет официальный виджет службы «' + method.name + '».';
      document.querySelector('#pickup-map-city').textContent = mapCity;
      document.querySelector('#pickup-label').textContent = method.pointLabel + ' *';
      for (const [index, point] of points.entries()) {
        options.push(new Option(point.name + ' — ' + point.address, point.address));
        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = 'pickup-marker';
        marker.style.setProperty('--x', point.x + '%');
        marker.style.setProperty('--y', point.y + '%');
        marker.setAttribute('aria-label', point.name + ', ' + point.address);
        marker.setAttribute('aria-controls', 'pickup-popup');
        marker.setAttribute('aria-expanded', 'false');
        marker.dataset.index = index;
        const label = document.createElement('span');
        label.textContent = warehouse ? 'С' : index + 1;
        marker.append(label);
        marker.addEventListener('click', () => showPoint(point));
        pickupMarkers.append(marker);
      }
    }
    pickupPoint.replaceChildren(...options);
    if (options.some(option => option.value === previous)) pickupPoint.value = previous;
    setFieldAvailability(document.querySelector('#pickup-field'), pickupPoint, Boolean(method?.pointLabel));
    refreshSelectedPoint();
  }

  function showPoint(point) {
    previewPoint = point;
    pickupPopup.hidden = false;
    document.querySelector('#pickup-point-name').textContent = point.name;
    document.querySelector('#pickup-point-address').textContent = point.address;
    document.querySelector('#pickup-point-hours').textContent = 'График работы · ' + point.hours;
    refreshSelectedPoint();
  }

  function refreshSelectedPoint() {
    const selected = points.find(point => point.address === pickupPoint.value);
    pickupSelection.textContent = selected
      ? 'Выбрано · ' + selected.name + ' · ' + selected.address + ' · ' + selected.hours
      : 'Место получения ещё не выбрано. Выберите пункт на карте или в списке ниже.';
    for (const marker of pickupMarkers.children) {
      const point = points[marker.dataset.index];
      marker.setAttribute('aria-expanded', String(!pickupPopup.hidden && point === previewPoint));
      marker.setAttribute('aria-pressed', String(point === selected));
    }
    choosePickupPoint.textContent = previewPoint && previewPoint === selected ? 'Выбрано' : 'Выбрать этот пункт';
  }

  choosePickupPoint.addEventListener('click', () => {
    if (!previewPoint) return;
    pickupPoint.value = previewPoint.address;
    pickupPoint.dispatchEvent(new Event('change', { bubbles: true }));
  });
  document.querySelector('#close-pickup-popup').addEventListener('click', () => {
    pickupPopup.hidden = true;
    refreshSelectedPoint();
    const marker = [...pickupMarkers.children].find(item => points[item.dataset.index] === previewPoint);
    marker?.focus();
  });
  pickupPoint.addEventListener('change', () => {
    const selected = points.find(point => point.address === pickupPoint.value);
    if (selected) showPoint(selected);
    else {
      previewPoint = null;
      pickupPopup.hidden = true;
      refreshSelectedPoint();
    }
  });

  function invalidateDelivery() {
    completed.delete(2);
    refreshPickup();
    openStep(activeStep, false);
  }

  function refreshDelivery() {
    const method = delivery();
    deliveryInfo.hidden = !method;
    if (method) {
      document.querySelector('#delivery-name').textContent = method.name;
      document.querySelector('#delivery-description').textContent = method.description;
      document.querySelector('#delivery-rate').textContent = format(method.amount) + ' · ' + method.timing;
    }
    setFieldAvailability(addressFields, addressFields, Boolean(method?.needsAddress));
    document.querySelector('#delivery-total').textContent = method ? format(method.amount) : 'Не выбрана';
    document.querySelector('#total').textContent = format(subtotal + (method?.amount ?? 0));
  }

  function refreshPayment() {
    const isCompany = fieldValue('payer') === 'company';
    const invoice = invoiceOption.querySelector('input');
    setFieldAvailability(companyFields, companyFields, isCompany);
    setFieldAvailability(invoiceOption, invoice, isCompany);
    if (!isCompany && invoice.checked) form.elements.payment.value = 'card';
    document.querySelector('#payment-info').textContent = fieldValue('payment') === 'invoice'
      ? 'Реквизиты для оплаты будут указаны в счёте.'
      : 'Оплата после подтверждения заказа.';
  }

  function summaryFor(index) {
    if (index === 1) {
      const payer = fieldValue('payer') === 'company' ? 'Юридическое лицо' : 'Физическое лицо';
      return [payer, destination(), fieldValue('postal-code')].join(' · ');
    }
    if (index === 2) {
      const method = delivery();
      const point = points.find(item => item.address === pickupPoint.value);
      return [method.name, format(method.amount), point?.name, point?.address, point?.hours].filter(Boolean).join(' · ');
    }
    if (index === 3) return paymentNames[fieldValue('payment')];
    return fieldValue('recipient');
  }

  function openStep(index, moveFocus = true) {
    activeStep = index;
    steps.forEach((step, stepIndex) => {
      const active = stepIndex === activeStep;
      const done = completed.has(stepIndex);
      const content = step.querySelector('.step-content');
      const summary = step.querySelector('.step-summary');
      const edit = step.querySelector('[data-edit]');
      const number = step.querySelector('.step-number');
      step.classList.toggle('active', active);
      number.textContent = done && !active ? '✓' : stepIndex + 1;
      content.hidden = stepIndex !== 0 && !active;
      if (stepIndex === 0) content.classList.toggle('items-reviewed', !active);
      if (edit) edit.hidden = !done || active;
      if (summary) {
        summary.hidden = active || !done;
        if (done) summary.textContent = summaryFor(stepIndex);
      }
    });
    if (moveFocus) steps[index].querySelector('h2').focus();
  }

  function firstInvalid(container) {
    return [...container.querySelectorAll('input, select, textarea')]
      .find(control => control.willValidate && !control.validity.valid);
  }

  locationSelect.addEventListener('change', () => {
    setFieldAvailability(document.querySelector('#city-field'), city, locationSelect.value === 'other');
    postalCode.value = indexes[locationSelect.value] ?? '';
    invalidateDelivery();
  });
  city.addEventListener('input', () => {
    invalidateDelivery();
  });
  form.addEventListener('change', event => {
    const { name } = event.target;
    if (name === 'delivery') {
      pickupPoint.value = '';
      invalidateDelivery();
      refreshDelivery();
    }
    if (name === 'payer' || name === 'payment') refreshPayment();
  });

  steps.forEach((step, index) => {
    step.querySelector('[data-next]')?.addEventListener('click', () => {
      const invalid = firstInvalid(step);
      if (invalid) {
        invalid.reportValidity();
        return;
      }
      completed.add(index);
      openStep(index + 1);
    });
    step.querySelector('[data-back]')?.addEventListener('click', () => openStep(index - 1));
    step.querySelector('[data-edit]')?.addEventListener('click', () => openStep(index));
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const [index, step] of steps.entries()) {
      const invalid = firstInvalid(step);
      if (invalid) {
        openStep(index);
        invalid.reportValidity();
        return;
      }
    }
    if (!form.elements.consent.reportValidity()) return;
    location.href = 'Подтверждение заказа.html';
  });

  refreshPickup();
  refreshDelivery();
  refreshPayment();
  openStep(0, false);
  submit.disabled = false;
}
