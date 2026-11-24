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

module.exports = { generateForBooking };