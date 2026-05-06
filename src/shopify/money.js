export function formatMoney(amountStr, currencyCode = 'USD') {
  const amount = Number.parseFloat(String(amountStr));
  if (Number.isNaN(amount)) return '';

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amountStr}`;
  }
}
