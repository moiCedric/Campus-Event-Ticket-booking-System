
const pool = require("../config/db");

async function createEvent(organizerId, data) {
  const {
    title,
    description,
    category,
    venue,
    event_date,
    capacity,
    ticket_price
  } = data;

  const [result] = await pool.query(
    `INSERT INTO events
     (organizer_id, title, description, category, venue,
      event_date, capacity, ticket_price, approval_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      organizerId,
      title,
      description || null,
      category || null,
      venue || null,
      event_date,
      capacity,
      ticket_price || 0
    ]
  );

  return getEventById(result.insertId);
}

async function getEventById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM events WHERE id = ?",
    [id]
  );

  return rows[0] || null;
}

async function listEvents({
  category,
  venue,
  search,
  onlyPublished = true
} = {}) {
  const conditions = [];
  const params = [];

  if (onlyPublished) {
    conditions.push("status = 'published'");
    conditions.push("approval_status = 'approved'");
  }

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  if (venue) {
    conditions.push("venue = ?");
    params.push(venue);
  }

  if (search) {
    conditions.push("(title LIKE ? OR description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await pool.query(
    `SELECT * FROM events ${where} ORDER BY event_date ASC`,
    params
  );

  return rows;
}

async function listByOrganizer(organizerId) {
  const [rows] = await pool.query(
    `SELECT * FROM events
     WHERE organizer_id = ?
     ORDER BY created_at DESC`,
    [organizerId]
  );

  return rows;
}

async function updateEvent(id, data) {
  const fields = [
    "title",
    "description",
    "category",
    "venue",
    "event_date",
    "capacity",
    "ticket_price",
    "status"
  ];

  const updates = [];
  const params = [];

  for (const field of fields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (updates.length === 0) {
    return getEventById(id);
  }

  params.push(id);

  await pool.query(
    `UPDATE events SET ${updates.join(", ")} WHERE id = ?`,
    params
  );

  return getEventById(id);
}

module.exports = {
  createEvent,
  getEventById,
  listEvents,
  listByOrganizer,
  updateEvent
};
