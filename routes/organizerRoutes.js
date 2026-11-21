
const express = require("express");
const router = express.Router();

const organizerController = require("../controllers/organizerController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("organizer"));

router.get("/events", organizerController.listMyEvents);
router.get("/bookings", organizerController.listMyBookings);

module.exports = router;
