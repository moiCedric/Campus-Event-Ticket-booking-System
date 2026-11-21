
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char];
    });
}

function getArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.events)) return data.events;
    if (Array.isArray(data?.bookings)) return data.bookings;
    if (Array.isArray(data?.users)) return data.users;
    return [];
}

function formatDate(value) {
    if (!value) return "Not specified";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return date.toLocaleString();
}

function formatMoney(value) {
    const amount = Number(value || 0);

    return "KES " + amount.toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showDashboardMessage(message, isError = true) {
    const element = document.getElementById("msg");

    if (!element) return;

    element.textContent = message;
    element.style.display = "block";
    element.style.color = isError ? "#b91c1c" : "#15803d";
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function statusTag(status) {
    const value = String(status || "unknown");

    return `<span class="tag">${escapeHTML(value)}</span>`;
}

// ADMIN DASHBOARD
async function loadAdminDashboard() {
    try {
        const [overviewData, usersData, eventsData, bookingsData] =
            await Promise.all([
                api("/admin/overview"),
                api("/admin/users"),
                api("/admin/events"),
                api("/admin/bookings")
            ]);

        const users = getArray(usersData);
        const events = getArray(eventsData);
        const bookings = getArray(bookingsData);

        const overview = overviewData?.data || overviewData || {};

        setText(
            "totalUsers",
            overview.users ?? overview.totalUsers ?? users.length
        );

        setText(
            "totalEvents",
            overview.events ?? overview.totalEvents ?? events.length
        );

        setText(
            "totalBookings",
            overview.bookings ?? overview.totalBookings ?? bookings.length
        );

        setText(
            "totalTickets",
            overview.tickets ?? overview.totalTickets ?? "N/A"
        );

        const usersTable = document.getElementById("usersTable");

        usersTable.innerHTML = users.length
            ? users.map(user => `
                <tr>
                    <td>${escapeHTML(user.id)}</td>
                    <td>${escapeHTML(user.name)}</td>
                    <td>${escapeHTML(user.email)}</td>
                    <td>${statusTag(user.role)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4">No users found.</td></tr>`;

        const eventsTable = document.getElementById("eventsTable");

        eventsTable.innerHTML = events.length
            ? events.map(event => `
                <tr>
                    <td>${escapeHTML(event.title)}</td>
                    <td>${escapeHTML(event.venue)}</td>
                    <td>${formatDate(event.event_date)}</td>
                    <td>${statusTag(event.status)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4">No events found.</td></tr>`;

        const bookingsTable = document.getElementById("bookingsTable");

        bookingsTable.innerHTML = bookings.length
            ? bookings.map(booking => `
                <tr>
                    <td>${escapeHTML(booking.id)}</td>
                    <td>${escapeHTML(
                        booking.user_name || booking.student_name || "Student"
                    )}</td>
                    <td>${escapeHTML(
                        booking.event_title || "Event"
                    )}</td>
                    <td>${escapeHTML(booking.quantity)}</td>
                    <td>${formatMoney(booking.total_amount)}</td>
                    <td>${statusTag(booking.status)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="6">No bookings found.</td></tr>`;

    } catch (error) {
        console.error("Admin dashboard error:", error);
        showDashboardMessage(error.message);
    }
}

// ORGANIZER DASHBOARD
async function loadOrganizerDashboard() {
    try {
        const [eventsData, bookingsData] = await Promise.all([
            api("/organizer/events"),
            api("/organizer/bookings")
        ]);

        const events = getArray(eventsData);
        const bookings = getArray(bookingsData);

        setText("myEventsCount", events.length);
        setText("myBookingsCount", bookings.length);

        const eventsTable =
            document.getElementById("organizerEventsTable");

        eventsTable.innerHTML = events.length
            ? events.map(event => `
                <tr>
                    <td>${escapeHTML(event.title)}</td>
                    <td>${escapeHTML(event.venue)}</td>
                    <td>${formatDate(event.event_date)}</td>
                    <td>${escapeHTML(event.capacity)}</td>
                    <td>${formatMoney(event.ticket_price)}</td>
                    <td>${statusTag(event.status)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="6">You have not created any events yet.</td></tr>`;

        const bookingsTable =
            document.getElementById("organizerBookingsTable");

        bookingsTable.innerHTML = bookings.length
            ? bookings.map(booking => `
                <tr>
                    <td>${escapeHTML(booking.id)}</td>
                    <td>${escapeHTML(
                        booking.user_name || booking.student_name || "Student"
                    )}</td>
                    <td>${escapeHTML(booking.event_title || "Event")}</td>
                    <td>${escapeHTML(booking.quantity)}</td>
                    <td>${formatMoney(booking.total_amount)}</td>
                    <td>${statusTag(booking.status)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="6">No bookings for your events yet.</td></tr>`;

    } catch (error) {
        console.error("Organizer dashboard error:", error);
        showDashboardMessage(error.message);
    }
}

// STUDENT DASHBOARD
async function loadStudentDashboard() {
    try {
        const [eventsData, bookingsData] = await Promise.all([
            api("/events"),
            api("/bookings/mine")
        ]);

        const events = getArray(eventsData);
        const bookings = getArray(bookingsData);

        setText("availableEventsCount", events.length);
        setText("studentBookingsCount", bookings.length);

        const eventContainer =
            document.getElementById("studentEvents");

        eventContainer.innerHTML = events.length
            ? events.slice(0, 6).map(event => `
                <div class="card">
                    <h3>${escapeHTML(event.title)}</h3>

                    <p>${escapeHTML(event.description || "")}</p>

                    <p>
                        <strong>Venue:</strong>
                        ${escapeHTML(event.venue)}
                    </p>

                    <p>
                        <strong>Date:</strong>
                        ${formatDate(event.event_date)}
                    </p>

                    <p>
                        <strong>Ticket price:</strong>
                        ${formatMoney(event.ticket_price)}
                    </p>

                    <a href="book.html?id=${encodeURIComponent(event.id)}">
                        Book Tickets
                    </a>
                </div>
            `).join("")
            : `<p>No published events are currently available.</p>`;

        const bookingsTable =
            document.getElementById("studentBookingsTable");

        bookingsTable.innerHTML = bookings.length
            ? bookings.map(booking => `
                <tr>
                    <td>${escapeHTML(booking.id)}</td>
                    <td>${escapeHTML(booking.event_title || "Event")}</td>
                    <td>${formatDate(booking.event_date)}</td>
                    <td>${escapeHTML(booking.quantity)}</td>
                    <td>${formatMoney(booking.total_amount)}</td>
                    <td>${statusTag(booking.status)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="6">You have not made any bookings yet.</td></tr>`;

    } catch (error) {
        console.error("Student dashboard error:", error);
        showDashboardMessage(error.message);
    }
}

// DETERMINE WHICH DASHBOARD TO LOAD
document.addEventListener("DOMContentLoaded", function () {
    const dashboard = document.body.dataset.dashboard;

    if (dashboard === "admin") {
        Auth.require(["admin"]);
        loadAdminDashboard();
    }

    if (dashboard === "organizer") {
        Auth.require(["organizer"]);
        loadOrganizerDashboard();
    }

    if (dashboard === "student") {
        Auth.require(["student"]);
        loadStudentDashboard();
    }
});
