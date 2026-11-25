
const pool = require("../config/db");

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

// Marks a booking as paid. Takes a connection so it can run inside a transaction.
// The "AND status = 'pending'" guard means a booking can never be paid twice.
async function markAsPaid(connection, id) {
  const [result] = await connection.query(
    "UPDATE bookings SET status = 'paid' WHERE id = ? AND status = 'pending'",
    [id]
  );
  return result.affectedRows === 1;
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

er, updateSt
