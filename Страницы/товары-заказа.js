const orderProducts = [
  { name: 'Кукла Мирэя «Северное сияние», 41 см', sku: 'В4501', price: 4190 },
  { name: 'Кукла Мирэя «Долина гейзеров», 41 см', sku: 'В4502', price: 4290 },
  { name: 'Кукла Мирэя «Кристальное море», 41 см', sku: 'В4503', price: 4490 },
];

const orderMoney = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
});

function readOrderQuantities(search) {
  const params = new URLSearchParams(search);
  const quantities = new Map();
  for (const { sku } of orderProducts) {
    const quantity = params.has('cart') ? Number(params.get(sku)) : 1;
    if (Number.isSafeInteger(quantity) && quantity > 0) quantities.set(sku, quantity);
  }
  return quantities;
}

function orderCartQuery(quantities) {
  const params = new URLSearchParams({ cart: '1' });
  for (const [sku, quantity] of quantities) params.set(sku, quantity);
  return params;
}
