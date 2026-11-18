Auth.require(['student', 'organizer', 'admin']);
const eventId = new URLSearchParams(location.search).get('id');
let ev = null, booking = null;

async function init() {
  if (!eventId) { document.getElementById('event').innerHTML = '<p class="empty">No event selected. <a href="events.html">Browse events</a></p>'; return; }
  try {
    ev = pickOne(await api('/events/' + encodeURIComponent(eventId)), 'event');
    document.getElementById('event').innerHTML = `
      <span class="tag">${esc(ev.category || 'General')}</span>
      <h1>${esc(ev.title)}</h1>
      <p class="sub">${esc(fmtDate(ev.event_date))} at ${esc(ev.venue || 'TBA')}</p>
      <p>${esc(ev.description || '')}</p>
      <p><strong>${Number(ev.ticket_price) ? money(ev.ticket_price) + ' per ticket' : 'Free'}</strong></p>`;
    document.getElementById('bookBox').style.display = 'block';
    updateTotal();
  } catch (err) { document.getElementById('event').innerHTML = `<p class="msg show error">${esc(err.message)}</p>`; }
}

function updateTotal() {
  const q = Number(document.getElementById('qty').value) || 0;
  document.getElementById('total').textContent = 'Total: ' + money(q * Number(ev.ticket_price || 0));
}
document.getElementById('qty').addEventListener('input', () => ev && updateTotal());

document.getElementById('bookBtn').addEventListener('click', async () => {
  clearMsg('msg');
  const btn = document.getElementById('bookBtn');
  btn.disabled = true;
  try {
    const data = await api('/bookings', 'POST', {
      event_id: Number(eventId),
      quantity: Number(document.getElementById('qty').value)
    });
    booking = pickOne(data, 'booking');
    document.getElementById('bookBox').style.display = 'none';
    document.getElementById('payBox').style.display = 'block';
    document.getElementById('payInfo').textContent =
      `${booking.quantity || document.getElementById('qty').value} ticket(s) reserved. Status: ${booking.status || 'pending'}. Complete payment to get your e-tickets.`;
  } catch (err) { showMsg('msg', err.message); }
  btn.disabled = false;
});

document.getElementById('payBtn').addEventListener('click', async () => {
  clearMsg('msg2');
  const btn = document.getElementById('payBtn');
  btn.disabled = true;
  try {
    await api('/payments', 'POST', { booking_id: booking.id });
    showMsg('msg2', 'Payment successful. Opening your tickets...', 'success');
    setTimeout(() => (location.href = 'tickets.html'), 1200);
  } catch (err) { showMsg('msg2', err.message); btn.disabled = false; }
});

init();