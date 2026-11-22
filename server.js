
require("dotenv").config();
const express = require("express");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const organizerRoutes = require("./routes/organizerRoutes");

const app = express();

// Middleware
app.use(express.json());

// Serve frontend files from public folder
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/organizer", organizerRoutes);

// API homepage
app.get("/", (req, res) => {
    res.json({
        message: "Campus Event & Ticket Booking API is running"
    });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

