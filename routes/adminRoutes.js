
const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("admin"));

router.get("/overview", adminController.overview);

router.get("/users", adminController.listUsers);
router.post("/users", adminController.createUser);
router.patch("/users/:id/role", adminController.updateUserRole);
router.delete("/users/:id", adminController.removeUser);

router.get("/events", adminController.listEvents);
router.get("/bookings", adminController.listBookings);

module.exports = router;

