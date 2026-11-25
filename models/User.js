
const pool = require("../config/db");

// Create a new user
async function createUser({ name, email, passwordHash, role }) {
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    [name, email, passwordHash, role]
  );

  return {
    id: result.insertId,
    name,
    email,
    role
  };
}

// Find a user using their email
async function findByEmail(email) {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  return rows[0] || null;
}

// Get all registered users (without password hashes)
async function listUsers() {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, created_at
     FROM users
     ORDER BY created_at DESC`
  );

  return rows;
}

module.exports = {
  createUser,
  findByEmail,
  listUsers
};
