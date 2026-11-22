
async function loadEvents() {
    const list = document.getElementById('list');
    const msg = document.getElementById('msg');

    try {
        clearMsg('msg');

        const search = document.getElementById('search').value;
        const category = document.getElementById('category').value;
        const venue = document.getElementById('venue').value;

        const params = new URLSearchParams();

        if (search) params.append('search', search);
        if (category) params.append('category', category);
        if (venue) params.append('venue', venue);

        const events = await api(`/events?${params.toString()}`);

        list.innerHTML = '';

        if (!events || events.length === 0) {
            list.innerHTML = '<p>No upcoming events found.</p>';
            return;
        }

        const user = Auth.user();

        events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'card';

            const bookingLink = user && user.role === 'student'
                ? `<a class="btn" href="book.html?id=${encodeURIComponent(event.id)}">Book Now</a>`
                : `<a class="btn" href="login.html">Login to book</a>`;

            card.innerHTML = `
                <h3>${esc(event.title)}</h3>
                <p>${esc(event.description || 'No description available')}</p>
                <p><strong>Category:</strong> ${esc(event.category || 'General')}</p>
                <p><strong>Venue:</strong> ${esc(event.venue || 'To be announced')}</p>
                <p><strong>Date:</strong> ${fmtDate(event.event_date)}</p>
                <p><strong>Ticket price:</strong> ${money(event.ticket_price)}</p>
                ${bookingLink}
            `;

            list.appendChild(card);
        });

    } catch (error) {
        showMsg('msg', error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const filters = document.getElementById('filters');

    filters.addEventListener('submit', event => {
        event.preventDefault();
        loadEvents();
    });

    loadEvents();
});


