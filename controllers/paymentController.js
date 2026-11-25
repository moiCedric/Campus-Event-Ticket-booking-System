const crypto = require("crypto");
const db = require("../config/db");

// Safe load for Part 6 (Ticket model) so Part 5 works before and after Part 6 merges
let Ticket = null;
try {
  Ticket = require("../models/Ticket");
} catch (err) {
  if (err.code !== "MODULE_NOT_FOUND") {
    throw err;
  }
}

const ALLOWED_METHODS = ["mock", "mpesa"];

// Does all the database work inside one transaction.
// Returns { error: { status, message } } or { booking, reference }.
async function markBookingPaid({ userId, bookingId, amount, method, reference }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Lock the booking row so it cannot be paid twice at the same time
    const [rows] = await connection.query(
      "SELECT * FROM bookings WHERE id = ? FOR UPDATE",
      [bookingId]
    );
    const booking = rows[0];

    if (!booking) {
      await connection.rollback();
      return { error: { status: 404, message: "Booking not found." } };
    }
    if (booking.user_id !== userId) {
      await connection.rollback();
      return {
        error: { status: 403, message: "This booking does not belong to you." },
      };
    }
    if (booking.status !== "pending") {
      await connection.rollback();
      return {
        error: {
          status: 409,
          message: `Booking is already ${booking.status}, only pending bookings can be paid.`,
        },
      };
    }
    if (Number(amount) !== Number(booking.total_amount)) {
      await connection.rollback();
      return {
        error: {
          status: 400,
          message: `Amount must be ${booking.total_amount}.`,
        },
      };
    }

    // Record the payment (skipped quietly if the payments table does not exist yet)
    try {
      await connection.query(
        `INSERT INTO payments (booking_id, amount, method, reference, status)
         VALUES (?, ?, ?, ?, 'success')`,
        [bookingId, amount, method, reference]
      );
    } catch (err) {
      if (err.code !== "ER_NO_SUCH_TABLE") {
        throw err;
      }
    }

    await connection.query("UPDATE bookings SET status = 'paid' WHERE id = ?", [
      bookingId,
    ]);

    await connection.commit();
    return { booking, reference };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release(); // the connection is free before tickets are created
  }
}

/**
 * POST /api/payments
 * Pays a pending booking (mock payment), marks it as paid,
 * then generates the tickets (Part 6).
 */
async function createPayment(req, res) {
  try {
    const { booking_id, amount, payment_method, transaction_ref } = req.body;

    if (!booking_id || amount === undefined || !payment_method) {
      return res.status(400).json({
        error: "booking_id, amount, and payment_method are required.",
      });
    }
    if (!ALLOWED_METHODS.includes(payment_method)) {
      return res.status(400).json({
        error: "payment_method must be 'mock' or 'mpesa'.",
      });
    }

    const reference = transaction_ref || "MOCK-" + crypto.randomUUID();

    const result = await markBookingPaid({
      userId: req.user.id, // CHECK: use req.user.userId if your token uses that
      bookingId: booking_id,
      amount,
      method: payment_method,
      reference,
    });

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    // AFTER commit and release, outside the transaction
    let ticketsCreated = 0;
    if (Ticket) {
      try {
        const tickets = await Ticket.generateForBooking(booking_id);
        ticketsCreated = tickets.length;
      } catch (err) {
        console.error("Ticket generation failed:", err);
      }
    }

    return res.json({
      message: "Payment successful",
      booking_id,
      reference: result.reference,
      tickets_created: ticketsCreated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Payment failed." });
  }
}

module.exports = { createPayment, pay: createPayment };
