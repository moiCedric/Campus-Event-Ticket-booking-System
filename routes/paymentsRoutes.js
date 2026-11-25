const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { requireAuth } = require("../middleware/auth");

router.post("/", requireAuth, paymentController.pay);

module.exports = router;
