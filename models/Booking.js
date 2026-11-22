const pool = require("../config/db");
const crypto = require("crypto");

async function getBookingById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM bookings WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

async function listByUser(userId) {
  const [rows] = await pool.query(
    `SELECT b.*, e.title AS event_title, e.event_date, e.venue
     FROM bookings b
     JOIN events e ON b.event_id = e.id
     WHERE b.user_id = ?
     ORDER BY b.created_at DESC`,
    [userId]
  );
  return rows;
}

async function listAll() {
  const [rows] = await pool.query(
    `SELECT b.*,
            u.name AS student_name,
            u.email AS student_email,
            e.title AS event_title,
            e.event_date,
            e.venue
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN events e ON b.event_id = e.id
     ORDER BY b.created_at DESC`
  );
  return rows;
}

async function listByOrganizer(organizerId) {
  const [rows] = await pool.query(
    `SELECT b.*,
            u.name AS student_name,
            u.email AS student_email,
            e.title AS event_title,
            e.event_date,
            e.venue
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN events e ON b.event_id = e.id
     WHERE e.organizer_id = ?
     ORDER BY b.created_at DESC`,
    [organizerId]
  );
  return rows;
}

async function updateStatus(id, status) {
  await pool.query(
    "UPDATE bookings SET status = ? WHERE id = ?",
    [status, id]
  );
  return getBookingById(id);
}

async function insertBooking(
  connection,
  { userId, eventId, quantity, totalAmount }
) {
  const [result] = await connection.query(
    `INSERT INTO bookings
     (user_id, event_id, quantity, total_amount, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [userId, eventId, quantity, totalAmount]
  );
  return result.insertId;
}

async function createTickets(connection, bookingId, quantity) {
  const tickets = [];

  for (let i = 0; i < quantity; i++) {
    const ticketNumber = "CAMP-" + crypto.randomBytes(5).toString("hex").toUpperCase();

    await connection.query(
      `INSERT INTO tickets (booking_id, ticket_number, is_checked_in)
       VALUES (?, ?, 0)`,
      [bookingId, ticketNumber]
    );

    tickets.push(ticketNumber);
  }

  return tickets;
}

async function getTicketsByBooking(bookingId) {
  const [rows] = await pool.query(
    `SELECT id, booking_id, ticket_number, is_checked_in, checked_in_at
     FROM tickets
     WHERE booking_id = ?`,
    [bookingId]
  );
  return rows;
}

async function listTicketsByUser(userId) {
  const [rows] = await pool.query(
    `SELECT t.*, e.title AS event_title, e.event_date, e.venue
     FROM tickets t
     JOIN bookings b ON t.booking_id = b.id
     JOIN events e ON b.event_id = e.id
     WHERE b.user_id = ?
     ORDER BY t.id DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  getBookingById,
  listByUser,
  listAll,
  listByOrganizer,
  updateStatus,
  insertBooking,
  createTickets,
  getTicketsByBooking,
  listTicketsByUser
};
