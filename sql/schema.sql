CREATE DATABASE IF NOT EXISTS campus_events;
USE campus_events;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'organizer', 'admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizer_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  venue VARCHAR(150),
  event_date DATETIME NOT NULL,
  capacity INT NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('draft', 'published', 'cancelled') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  qr_code VARCHAR(255) NOT NULL UNIQUE,
  is_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at TIMESTAMP NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);