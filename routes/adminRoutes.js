
const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

// All administrator routes require authentication and admin role
router.use(requireAuth, requireRole("admin"));

// Dashboard overview
router.get("/overview", adminController.overview);

// User management
router.get("/users", adminController.listUsers);
router.post("/users", adminController.createUser);
router.patch("/users/:id/role", adminController.updateUserRole);
router.delete("/users/:id", adminController.removeUser);

// Event and booking records
router.get("/events", adminController.listEvents);
router.get("/bookings", adminController.listBookings);

// Generate reports
router.get("/reports", adminController.generateReport);

module.exports = router;

