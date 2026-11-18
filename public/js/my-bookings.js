Auth.require();

async function load() {
  const list = document.getElementById('list');
  try {
    const rows = pickList(await api('/bookings/mine'), 'bookings');
    if (!rows.length) { list.innerHTML = '<p class="empty">No bookings yet. <a href="events.html">Browse events</a></p>'; return; }
    list.innerHTML = `<table><thead><tr><th>Event</th><th>Tickets</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>` +
      rows.map(b => `<tr>
        <td>${esc(b.event_title || b.title || 'Event #' + b.event_id)}</td>
        <td>${esc(b.quantity)}</td>
        <td>${money(b.total_amount ?? b.total_price ?? b.total)}</td>
        <td><span class="tag ${esc(b.status)}">${esc(b.status)}</span></td>
        <td class="row">
          ${b.status === 'pending' ? `<button class="btn small" data-pay="${b.id}">Pay</button>` : ''}
          ${b.status !== 'cancelled' ? `<button class="btn small danger" data-cancel="${b.id}">Cancel</button>` : ''}
        </td></tr>`).join('') + '</tbody></table>';
  } catch (err) { showMsg('msg', err.message); }
}

document.getElementById('list').addEventListener('click', async e => {
  const pay = e.target.dataset.pay, cancel = e.target.dataset.cancel;
  clearMsg('msg');
  try {
    if (pay) { await api('/payments', 'POST', { booking_id: Number(pay) }); showMsg('msg', 'Payment successful.', 'success'); }
    if (cancel) {
      if (!confirm('Cancel this booking?')) return;
      await api('/bookings/' + cancel + '/cancel', 'PATCH');
      showMsg('msg', 'Booking cancelled.', 'success');
    }
    if (pay || cancel) load();
  } catch (err) { showMsg('msg', err.message); }
});
load();