
let selectedEvent = null;

async function loadBookingEvent() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    const details = document.getElementById('eventDetails');
    const form = document.getElementById('bookingForm');

    try {
        const user = Auth.user();

        if (!user || user.role !== 'student' || !Auth.token()) {
            window.location.href = 'login.html';
            return;
        }

        if (!eventId) {
            throw new Error('No event was selected.');
        }

        selectedEvent = await api(`/events/${eventId}`);

        details.innerHTML = `
            <h2>${esc(selectedEvent.title)}</h2>
            <p>${esc(selectedEvent.description || 'No description available')}</p>
            <p><strong>Venue:</strong> ${esc(selectedEvent.venue || 'To be announced')}</p>
            <p><strong>Date:</strong> ${fmtDate(selectedEvent.event_date)}</p>
            <p><strong>Price per ticket:</strong> ${money(selectedEvent.ticket_price)}</p>
        `;

        form.style.display = 'block';
        updateTotal();

    } catch (error) {
        showMsg('msg', error.message);
        form.style.display = 'none';
    }
}

function updateTotal() {
    if (!selectedEvent) return;

    const quantity = Number(document.getElementById('quantity').value);
    const total = quantity * Number(selectedEvent.ticket_price);

    document.getElementById('total').textContent =
        `Total: ${money(total)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('bookingForm');
    const quantity = document.getElementById('quantity');

    if (!form || !quantity) {
        console.error('Booking form or quantity field is missing.');
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');

    form.style.display = 'none';

    quantity.addEventListener('input', updateTotal);

    form.addEventListener('submit', async event => {
        event.preventDefault();

        clearMsg('msg');

        if (!selectedEvent) {
            showMsg('msg', 'Event details have not loaded yet.');
            return;
        }

        const qty = Number(quantity.value);

        if (!Number.isInteger(qty) || qty < 1) {
            showMsg('msg', 'Please enter a valid ticket quantity.');
            return;
        }

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';

            const result = await api('/bookings', 'POST', {
                event_id: selectedEvent.id,
                quantity: qty
            });

            showMsg(
                'msg',
                `Booking successful! Your booking ID is ${result.id}.`,
                'success'
            );

            submitButton.textContent = 'Booking Confirmed';

        } catch (error) {
            showMsg('msg', error.message);

            submitButton.disabled = false;
            submitButton.textContent = 'Confirm Booking';
        }
    });

    loadBookingEvent();
});

