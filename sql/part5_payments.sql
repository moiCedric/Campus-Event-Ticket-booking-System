-- Part 5: payments table.
-- Already created the database? Run this file once in MySQL Workbench.
USE campus_events;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('mock', 'mpesa') NOT NULL DEFAULT 'mock',
  reference VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('success', 'failed') NOT NULL DEFAULT 'success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
