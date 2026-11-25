# Campus Event & Ticket Booking System

## Part 6: E-tickets & check-in

- `Ticket.generateForBooking(bookingId)` creates one ticket per seat, each with a unique QR code. Part 5 (Payment) should call it once a booking is paid.
- `GET /api/tickets/mine` (logged in): the user's own tickets.
- `POST /api/tickets/checkin` (organizer or admin): body `{ "qr_code": "..." }`. Rejects unknown or already-used tickets. Organizers can only check in tickets for their own events.