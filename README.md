# Campus Event & Ticket Booking System

## Part 6: E-tickets & check-in

- `Ticket.generateForBooking(bookingId)` creates one ticket per seat, each with a unique QR code. Part 5 (Payment) should call it once a booking is paid.
- `GET /api/tickets/mine` (logged in): the user's own tickets.
- `POST /api/tickets/checkin` (organizer or admin): body `{ "qr_code": "..." }`. Rejects unknown or already-used tickets. Organizers can only check in tickets for their own events.
- `GET /api/tickets/event/:eventId` (organizer or admin): every ticket for an event with attendee names and a checked-in count. Organizers only see their own events.

### Testing Part 6
Start the server, then run `node --test scripts/ticketFlow.test.js`. It needs the `organizer@test.com` and `student@test.com` accounts and one published event.