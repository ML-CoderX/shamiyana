import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// Escape all user-entered fields before placing them in printable markup.
export function buildBillHtml({ t, order, items, subtotal, discountLabel, finalAmount, shop }) {
  const rows = items.map((i) => `
    <tr>
      <td>${escapeHtml(i.material_name)}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">₹${i.unit_cost_snapshot.toFixed(2)}</td>
      <td style="text-align:right">₹${i.line_total.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, Roboto, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 22px; margin-bottom: 0; }
        .shop { color: #555; margin-bottom: 20px; }
        thead { display: table-header-group; } tr { page-break-inside: avoid; } td { overflow-wrap: anywhere; }
        table { table-layout: fixed; width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 8px; border-bottom: 1px solid #eee; font-size: 14px; }
        th { text-align: left; background: #f5f5f5; }
        .totals { margin-top: 16px; text-align: right; font-size: 14px; }
        .final { font-size: 18px; font-weight: 700; margin-top: 8px; }
        .footer { margin-top: 30px; text-align: center; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(shop.name || t('app_name'))}</h1>
      <div class="shop">${escapeHtml(shop.phone || '')} ${shop.address ? '• ' + escapeHtml(shop.address) : ''}</div>

      <div><strong>${t('bill_title')} #${order.id}</strong></div>
      <div>${t('customer_name')}: ${escapeHtml(order.customer_name)}</div>
      ${order.customer_phone ? `<div>${t('customer_phone')}: ${escapeHtml(order.customer_phone)}</div>` : ''}
      ${order.event_date ? `<div>${t('event_date')}: ${escapeHtml(order.event_date)}</div>` : ''}
      ${order.venue ? `<div>${t('venue')}: ${escapeHtml(order.venue)}</div>` : ''}

      <table>
        <thead>
          <tr>
            <th>${t('item')}</th>
            <th style="text-align:center">${t('quantity')}</th>
            <th style="text-align:right">${t('rate')}</th>
            <th style="text-align:right">${t('amount')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals">
        <div>${t('subtotal')}: ₹${subtotal.toFixed(2)}</div>
        ${discountLabel ? `<div>${t('discount')}: ${escapeHtml(discountLabel)}</div>` : ''}
        <div class="final">${t('total')}: ₹${finalAmount.toFixed(2)}</div>
      </div>

      <div class="footer">${t('thank_you')}</div>
    </body>
  </html>
  `;
}

export async function shareBillPdf(html, filenameHint) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing_unavailable');
  const { uri } = await Print.printToFileAsync({ html });
  {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: filenameHint || 'Bill',
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}
