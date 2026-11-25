const crypto = require("crypto");

// Takes a connection (not the pool) so it can run inside the same
// transaction that marks the booking as paid.
async function createPayment(connection, { bookingId, amount, method }) {
  const reference = "MOCK-" + crypto.randomUUID();
  const [result] = await connection.query(
    `INSERT INTO payments (booking_id, amount, method, reference, status)
     VALUES (?, ?, ?, ?, 'success')`,
    [bookingId, amount, method, reference]
  );
  return { id: result.insertId, reference };
}

module.exports = { createPayment };
