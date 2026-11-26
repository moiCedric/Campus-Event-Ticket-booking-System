const crypto = require("crypto");
const pool = require("../config/db");

// One ticket per seat, each with a unique QR code
async function generateForBooking(bookingId) {
  const [existing] = await pool.query(
    "SELECT * FROM tickets WHERE booking_id = ?",
    [bookingId]
  );
  if (existing.length > 0) return existing; // never create duplicates

  const [bookings] = await pool.query(
    "SELECT quantity FROM bookings WHERE id = ?",
    [bookingId]
  );
  if (bookings.length === 0) throw new Error("Booking not found");

  for (let i = 0; i < bookings[0].quantity; i++) {
    const qrCode = "TKT-" + crypto.randomUUID();
    await pool.query(
      "INSERT INTO tickets (booking_id, qr_code) VALUES (?, ?)",
      [bookingId, qrCode]
    );
  }

  const [created] = await pool.query(
    "SELECT * FROM tickets WHERE booking_id = ?",
    [bookingId]
  );
  return created;
}

// A student's own tickets, with event details
async function getTicketsByUser(userId) {
  const [rows] = await pool.query(
    `SELECT t.id, t.qr_code, t.is_checked_in, t.checked_in_at,
            b.id AS booking_id, e.title, e.venue, e.event_date
     FROM tickets t
     JOIN bookings b ON t.booking_id = b.id
     JOIN events e ON b.event_id = e.id
     WHERE b.user_id = ?
     ORDER BY e.event_date`,
    [userId]
  );
  return rows;
}

// One ticket by QR code, with the organizer of its event
async function getTicketByQr(qrCode) {
  const [rows] = await pool.query(
    `SELECT t.*, e.organizer_id
     FROM tickets t
     JOIN bookings b ON t.booking_id = b.id
     JOIN events e ON b.event_id = e.id
     WHERE t.qr_code = ?`,
    [qrCode]
  );
  return rows[0] || null;
}

// Only succeeds if the ticket is not yet used, so a 2nd scan fails
async function markCheckedIn(qrCode) {
  const [result] = await pool.query(
    `UPDATE tickets
     SET is_checked_in = TRUE, checked_in_at = NOW()
     WHERE qr_code = ? AND is_checked_in = FALSE`,
    [qrCode]
  );
  return result.affectedRows === 1;
}
// Who organizes this event (null if the event does not exist)
async function getEventOrganizerId(eventId) {
  const [rows] = await pool.query(
    "SELECT organizer_id FROM events WHERE id = ?",
    [eventId]
  );
  return rows[0] ? rows[0].organizer_id : null;
}

// Every ticket for an event, with the attendee, for the door list
async function getTicketsByEvent(eventId) {
  const [rows] = await pool.query(
    `SELECT t.id, t.qr_code, t.is_checked_in, t.checked_in_at,
            b.id AS booking_id, u.name AS attendee_name, u.email AS attendee_email
     FROM tickets t
     JOIN bookings b ON t.booking_id = b.id
     JOIN users u ON b.user_id = u.id
     WHERE b.event_id = ?
     ORDER BY t.id`,
    [eventId]
  );
  return rows;
}
 module.exports = {
  generateForBooking,
  getTicketsByUser,
  getTicketByQr,
  markCheckedIn,
};