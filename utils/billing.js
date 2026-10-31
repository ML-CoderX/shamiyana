export function numberInput(value) {
  const text = String(value).trim();
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) ? Number(text) : NaN;
}

export function money(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1e10) throw new Error('invalid_amount');
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function billTotals(items, manual, discount, amount) {
  const subtotal = money(items.reduce((sum, item) => sum + money(item.quantity * item.unit_cost_snapshot), 0));
  const percent = manual ? 0 : numberInput(discount);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('invalid_discount');
  const discountAmount = money(subtotal * percent / 100);
  const finalAmount = manual ? money(numberInput(amount)) : money(subtotal - discountAmount);
  return { subtotal, percent, discountAmount, finalAmount };
}

export function validEventDate(value) {
  if (!value.trim()) return true;
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) return false;
  const [, d, m, y] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return y >= 1900 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
