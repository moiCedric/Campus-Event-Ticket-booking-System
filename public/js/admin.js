Auth.require(['admin']);
(async () => {
  try {
    const s = await api('/admin/stats');
    const cards = [
      ['Users', s.total_users ?? s.users],
      ['Events', s.total_events ?? s.events],
      ['Tickets sold', s.tickets_sold ?? s.total_tickets],
      ['Revenue', money(s.revenue ?? s.total_revenue)]
    ];
    document.getElementById('stats').innerHTML = cards.map(([l, n]) =>
      `<div class="card stat"><div class="num">${esc(n ?? 0)}</div><div class="lbl">${l}</div></div>`).join('');
    const per = s.tickets_per_event || s.per_event || [];
    document.getElementById('perEvent').innerHTML = per.length
      ? '<table><thead><tr><th>Event</th><th>Tickets sold</th></tr></thead><tbody>' +
        per.map(r => `<tr><td>${esc(r.title || r.event_title || r.name)}</td><td>${esc(r.tickets_sold ?? r.sold ?? r.count)}</td></tr>`).join('') + '</tbody></table>'
      : '<p class="empty">No ticket sales yet.</p>';
  } catch (err) { showMsg('msg', err.message); }
})()