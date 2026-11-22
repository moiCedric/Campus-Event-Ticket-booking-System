
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

    // Prevent administrator from deleting their own account
    if (userId === Number(req.user.id)) {
      return res.status(400).json({
        error: "You cannot delete your own administrator account"
      });
    }

    // Check whether the user exists
    const [users] = await pool.query(
      "SELECT id, name, role FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    // Check whether the user has organised any events
    const [events] = await pool.query(
      "SELECT COUNT(*) AS total FROM events WHERE organizer_id = ?",
      [userId]
    );

    // Check whether the user has made any bookings
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

    // Delete only the user. Do not delete tickets or booking history.
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
  listUsers,
  createUser,
  updateUserRole,
  removeUser,
  listEvents,
  listBookings
};

