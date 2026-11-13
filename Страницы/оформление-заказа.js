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
    self: { name: 'Самовывоз', description: 'Заберите заказ со склада фабрики в Кирове.', amount: 0, timing: '1–2 дня до готовности' },
    cdek: { name: 'СДЭК', description: 'Заберите заказ в выбранном пункте выдачи СДЭК.', amount: 350, timing: '2–4 дня', pointLabel: 'Пункт выдачи СДЭК' },
    yandex: { name: 'Яндекс Доставка', description: 'Курьер привезёт заказ по указанному адресу.', amount: 550, timing: '1–3 дня', needsAddress: true },
    '5post': { name: '5Post', description: 'Заберите заказ в выбранном пункте выдачи 5Post.', amount: 300, timing: '2–4 дня', pointLabel: 'Пункт выдачи 5Post' },
    post: { name: 'Почта России', description: 'Заказ поступит в отделение, которое обслуживает указанный адрес.', amount: 450, timing: '4–7 дней', needsAddress: true },
  };
  const paymentNames = { card: 'Банковской картой онлайн', invoice: 'По счёту' };
  const indexes = { Киров: '610000', Москва: '101000' };
  const locationSelect = form.elements.location;
  const city = form.elements.city;
  const postalCode = form.elements['postal-code'];
  const pickupPoint = form.elements['pickup-point'];
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
    if (method?.pointLabel && cityName) {
      document.querySelector('#pickup-label').textContent = method.pointLabel + ' *';
      for (const street of ['ул. Ленина, 15', 'ул. Мира, 8']) {
        options.push(new Option(cityName + ', ' + street));
      }
    }
    pickupPoint.replaceChildren(...options);
    if (options.some(option => option.value === previous)) pickupPoint.value = previous;
    setFieldAvailability(document.querySelector('#pickup-field'), pickupPoint, Boolean(method?.pointLabel));
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
      return [method.name, format(method.amount), fieldValue('pickup-point')].filter(Boolean).join(' · ');
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
    refreshPickup();
    if (pickupPoint.required && !pickupPoint.disabled && !pickupPoint.value) completed.delete(2);
  });
  city.addEventListener('input', () => {
    refreshPickup();
    if (!pickupPoint.disabled && !pickupPoint.value) completed.delete(2);
  });
  form.addEventListener('change', event => {
    const { name } = event.target;
    if (name === 'delivery') {
      pickupPoint.value = '';
      refreshPickup();
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

  refreshDelivery();
  refreshPayment();
  openStep(0, false);
  submit.disabled = false;
}
