const pool = require("../config/db");

// Looks up everything the message needs about a booking.
async function getBookingDetails(bookingId) {
  const [rows] = await pool.query(
    `SELECT b.id, b.quantity, b.total_amount, b.status,
            u.name AS user_name, u.email AS user_email,
            e.title AS event_title, e.venue, e.event_date
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN events e ON b.event_id = e.id
     WHERE b.id = ?`,
    [bookingId]
  );
  return rows[0] || null;
}

function formatDate(d) {
  return new Date(d).toLocaleString("en-KE", { dateStyle: "full", timeStyle: "short" });
}

// Builds the confirmation text (kept separate so it is easy to test or swap for email later).
function buildConfirmation(b) {
  return [
    "=== BOOKING CONFIRMATION ===",
    `To:      ${b.user_name} <${b.user_email}>`,
    `Booking: #${b.id}`,
    `Event:   ${b.event_title}`,
    `Venue:   ${b.venue || "TBA"}`,
    `When:    ${formatDate(b.event_date)}`,
    `Tickets: ${b.quantity}`,
    `Paid:    KES ${Number(b.total_amount).toFixed(2)}`,
    "Thank you! Your e-tickets are available under My Tickets.",
    "============================",
  ].join("\n");
}

function buildReminder(b) {
  return [
    "=== EVENT REMINDER ===",
    `To:    ${b.user_name} <${b.user_email}>`,
    `Don't forget: ${b.event_title} at ${b.venue || "TBA"}`,
    `When:  ${formatDate(b.event_date)}`,
    `You have ${b.quantity} ticket(s) (booking #${b.id}).`,
    "======================",
  ].join("\n");
}

// Part 5 (Payment) calls this after a booking is set to paid.
// It never throws, so a notification problem cannot break a successful payment.
async function sendBookingConfirmation(bookingId) {
  try {
    const b = await getBookingDetails(bookingId);
    if (!b) return console.warn(`[notify] booking ${bookingId} not found`);
    if (b.status !== "paid") return console.warn(`[notify] booking ${bookingId} is not paid, no confirmation sent`);
    console.log(buildConfirmation(b));
  } catch (err) {
    console.error("[notify] could not send confirmation:", err.message);
  }
}

async function sendEventReminder(bookingId) {
  try {
    const b = await getBookingDetails(bookingId);
    if (!b || b.status !== "paid") return;
    console.log(buildReminder(b));
  } catch (err) {
    console.error("[notify] could not send reminder:", err.message);
  }
}

// Optional: reminds every paid booking for events happening in the next 24 hours.
async function sendRemindersForUpcomingEvents() {
  const [rows] = await pool.query(
    `SELECT b.id FROM bookings b JOIN events e ON b.event_id = e.id
     WHERE b.status = 'paid' AND e.event_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 DAY)`
  );
  for (const r of rows) await sendEventReminder(r.id);
  return rows.length;
}

module.exports = { sendBookingConfirmation, sendEventReminder, sendRemindersForUpcomingEvents };