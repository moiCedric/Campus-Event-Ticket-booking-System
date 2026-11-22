
const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

// All admin routes require authentication and admin privileges
router.use(requireAuth, requireRole("admin"));

// Admin overview
router.get("/overview", adminController.overview);

// User management
router.get("/users", adminController.listUsers);
router.patch("/users/:id/role", adminController.updateUserRole);

// System records
router.get("/events", adminController.listEvents);
router.get("/bookings", adminController.listBookings);

module.exports = router;

