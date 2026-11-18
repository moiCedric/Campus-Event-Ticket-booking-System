Auth.require();
(async () => {
  const list = document.getElementById('list');
  try {
    const rows = pickList(await api('/tickets/mine'), 'tickets');
    if (!rows.length) { list.innerHTML = '<p class="empty" style="grid-column:1/-1">No tickets yet. Tickets appear after a booking is paid.</p>'; return; }
    list.innerHTML = rows.map(t => `
      <div class="card ticket">
        <h3 style="margin:0">${esc(t.event_title || t.title || 'Event #' + (t.event_id ?? ''))}</h3>
        <div style="color:#5d667a">${esc(fmtDate(t.event_date))} ${esc(t.venue || '')}</div>
        <div class="qr">${esc(t.qr_code)}</div>
        <div style="margin-top:8px"><span class="tag ${esc(t.status)}">${esc(t.status || 'valid')}</span></div>
      </div>`).join('');
  } catch (err) { showMsg('msg', err.message); }
})();