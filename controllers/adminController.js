
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Event = require("../models/Event");
const Booking = require("../models/Booking");

// ADMIN OVERVIEW
async function overview(req, res) {
  try {
    const [users] = await pool.query(
      "SELECT COUNT(*) AS total FROM users"
    );

    const [events] = await pool.query(
      "SELECT COUNT(*) AS total FROM events"
    );

    const [bookings] = await pool.query(
      "SELECT COUNT(*) AS total FROM bookings"
    );

    const [tickets] = await pool.query(
      "SELECT COUNT(*) AS total FROM tickets"
    );

    res.json({
      users: users[0].total,
      events: events[0].total,
      bookings: bookings[0].total,
      tickets: tickets[0].total
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Could not load admin overview"
    });
  }
}

// GENERATE ADMIN REPORT
async function generateReport(req, res) {
  try {
    const [users] = await pool.query(
      "SELECT COUNT(*) AS total FROM users"
    );

    const [userRoles] = await pool.query(
      `SELECT role, COUNT(*) AS total
       FROM users
       GROUP BY role`
    );

    const [events] = await pool.query(
      "SELECT COUNT(*) AS total FROM events"
    );

    const [bookings] = await pool.query(
      "SELECT COUNT(*) AS total FROM bookings"
    );

    const [tickets] = await pool.query(
      "SELECT COUNT(*) AS total FROM tickets"
    );

    res.json({
      reportTitle: "Campus Events System Report",
      generatedAt: new Date(),
      summary: {
        totalUsers: users[0].total,
        totalEvents: events[0].total,
        totalBookings: bookings[0].total,
        totalTickets: tickets[0].total
      },
      usersByRole: userRoles
    });

  } catch (err) {
    console.error("Generate report error:", err);
    res.status(500).json({
      error: "Could not generate report"
    });
  }
}

// LIST ALL USERS
async function listUsers(req, res) {
  try {
    res.json(await User.listUsers());

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Could not fetch users"
    });
  }
}

// CREATE USER
async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: "Name, email, password and role are required"
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return res.status(400).json({
        error: "Name and email cannot be empty"
      });
    }

    if (!["student", "organizer"].includes(role)) {
      return res.status(400).json({
        error: "Role must be student or organizer"
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long"
      });
    }

    const existing = await User.findByEmail(cleanEmail);

    if (existing) {
      return res.status(409).json({
        error: "An account with this email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.createUser({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role
    });

    res.status(201).json({
      message: "User created successfully",
      user
    });

  } catch (err) {
    console.error("Admin create user error:", err);
    res.status(500).json({
      error: "Could not create user"
    });
  }
}

// UPDATE USER ROLE
async function updateUserRole(req, res) {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        error: "Invalid user ID"
      });
    }

    if (!["student", "organizer", "admin"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role"
      });
    }

    if (userId === Number(req.user.id)) {
      return res.status(400).json({
        error: "You cannot change your own administrator role"
      });
    }

    const affectedRows = await User.updateUserRole(userId, role);

    if (affectedRows === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    res.json({
      message: "User role updated successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Could not update user role"
    });
  }
}

// REMOVE USER
async function removeUser(req, res) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        error: "Invalid user ID"
      });
    }

    if (userId === Number(req.user.id)) {
      return res.status(400).json({
        error: "You cannot delete your own administrator account"
      });
    }

    const [users] = await pool.query(
      "SELECT id, name, role FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const [events] = await pool.query(
      "SELECT COUNT(*) AS total FROM events WHERE organizer_id = ?",
      [userId]
    );

    const [bookings] = await pool.query(
      "SELECT COUNT(*) AS total FROM bookings WHERE user_id = ?",
      [userId]
    );

    if (Number(events[0].total) > 0) {
      return res.status(409).json({
        error: "This user cannot be deleted because they have existing events."
      });
    }

    if (Number(bookings[0].total) > 0) {
      return res.status(409).json({
        error: "This user cannot be deleted because they have existing bookings."
      });
    }

    await pool.query(
      "DELETE FROM users WHERE id = ?",
      [userId]
    );

    res.json({
      message: "User removed successfully"
    });

  } catch (err) {
    console.error("Admin remove user error:", err);
    res.status(500).json({
      error: "Could not remove user"
    });
  }
}

// LIST ALL EVENTS
async function listEvents(req, res) {
  try {
    res.json(await Event.listEvents({
      onlyPublished: false
    }));

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Could not fetch events"
    });
  }
}

// LIST EVENTS WAITING FOR ADMIN APPROVAL
async function listPendingEvents(req, res) {
  try {
    const [events] = await pool.query(
      `SELECT events.*, users.name AS organizer_name,
              users.email AS organizer_email
       FROM events
       LEFT JOIN users ON events.organizer_id = users.id
       WHERE events.approval_status = 'pending'
       ORDER BY events.created_at DESC`
    );

    res.json(events);

  } catch (err) {
    console.error("List pending events error:", err);
    res.status(500).json({
      error: "Could not fetch pending events"
    });
  }
}

// APPROVE EVENT
async function approveEvent(req, res) {
  try {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        error: "Invalid event ID"
      });
    }

    const [result] = await pool.query(
      `UPDATE events
       SET approval_status = 'approved'
       WHERE id = ?
       AND approval_status = 'pending'`,
      [eventId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Pending event not found or already reviewed"
      });
    }

    res.json({
      message: "Event approved successfully"
    });

  } catch (err) {
    console.error("Approve event error:", err);
    res.status(500).json({
      error: "Could not approve event"
    });
  }
}

// REJECT EVENT
async function rejectEvent(req, res) {
  try {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        error: "Invalid event ID"
      });
    }

    const [result] = await pool.query(
      `UPDATE events
       SET approval_status = 'rejected'
       WHERE id = ?
       AND approval_status = 'pending'`,
      [eventId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Pending event not found or already reviewed"
      });
    }

    res.json({
      message: "Event rejected successfully"
    });

  } catch (err) {
    console.error("Reject event error:", err);
    res.status(500).json({
      error: "Could not reject event"
    });
  }
}

// LIST ALL BOOKINGS
async function listBookings(req, res) {
  try {
    res.json(await Booking.listAll());

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Could not fetch bookings"
    });
  }
}

module.exports = {
  overview,
  generateReport,
  listUsers,
  createUser,
  updateUserRole,
  removeUser,
  listEvents,
  listPendingEvents,
  approveEvent,
  rejectEvent,
  listBookings
};
