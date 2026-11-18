const me = Auth.require(['organizer', 'admin']);

document.getElementById('form').addEventListener('submit', async e => {
  e.preventDefault();
  clearMsg('msg');
  const v = id => document.getElementById(id).value;
  try {
    const created = await api('/events', 'POST', {
      title: v('title').trim(), description: v('description').trim(),
      category: v('category').trim(), venue: v('venue').trim(),
      event_date: v('event_date').replace('T', ' ') + ':00',
      capacity: Number(v('capacity')), ticket_price: Number(v('ticket_price'))
    });
    const ev = pickOne(created, 'event');
    showMsg('msg', 'Event created as a draft.', 'success');
    if (ev && ev.id) {
      const b = document.createElement('button');
      b.className = 'btn small'; b.style.marginLeft = '12px'; b.textContent = 'Publish now';
      b.onclick = async () => {
        try { await api('/events/' + ev.id, 'PATCH', { status: 'published' }); showMsg('msg', 'Event published. Students can now book.', 'success'); loadMine(); }
        catch (err) { showMsg('msg', err.message); }
      };
      document.getElementById('msg').appendChild(b);
    }
    e.target.reset();
    loadMine();
  } catch (err) { showMsg('msg', err.message); }
});

async function loadMine() {
  const box = document.getElementById('mine');
  try {
    const all = pickList(await api('/events'), 'events');
    const mine = all.filter(ev => me && (me.role === 'admin' || ev.organizer_id === me.id));
    box.innerHTML = mine.length
      ? '<table><thead><tr><th>Title</th><th>Date</th><th>Status</th></tr></thead><tbody>' +
        mine.map(ev => `<tr><td>${esc(ev.title)}</td><td>${esc(fmtDate(ev.event_date))}</td>
        <td><span class="tag ${esc(ev.status)}">${esc(ev.status)}</span></td></tr>`).join('') + '</tbody></table>'
      : '<p class="empty">Your published events will appear here.</p>';
  } catch (err) { box.innerHTML = `<p class="msg show error">${esc(err.message)}</p>`; }
}
loadMine();