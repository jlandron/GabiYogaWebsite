-- Yoga Website Database Schema for MariaDB
-- This file defines the tables and relationships for the yoga website database

-- Drop tables if they exist to allow for clean re-creation
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS newsletter_subscribers;
DROP TABLE IF EXISTS gallery_images;
DROP TABLE IF EXISTS unavailable_dates;
DROP TABLE IF EXISTS instructor_availability;
DROP TABLE IF EXISTS private_sessions;
DROP TABLE IF EXISTS workshop_registrations;
DROP TABLE IF EXISTS workshops;
DROP TABLE IF EXISTS retreat_registrations;
DROP TABLE IF EXISTS retreats;
DROP TABLE IF EXISTS class_bookings;
DROP TABLE IF EXISTS class_schedules;
DROP TABLE IF EXISTS class_templates;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS=1;

-- Create tables

-- Users table - Members and administrators
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- NULL for OAuth users
    phone VARCHAR(20),
    profile_picture VARCHAR(255),
    member_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auth_provider ENUM('local', 'google') DEFAULT 'local',
    google_id VARCHAR(255),
    bio TEXT,
    health_notes TEXT,
    role ENUM('member', 'admin') DEFAULT 'member',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX (email),
    INDEX (google_id)
);

-- Memberships table - Tracks user memberships
CREATE TABLE memberships (
    membership_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('Monthly Unlimited', 'Annual Membership', 'Class Pack', 'Drop-In') NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NULL,
    auto_renew BOOLEAN DEFAULT FALSE,
    status ENUM('Active', 'Expired', 'Cancelled', 'Pending') DEFAULT 'Active',
    price DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('Credit Card', 'PayPal', 'Cash', 'Other'),
    card_last_four VARCHAR(4),
    payment_reference VARCHAR(255),
    classes_remaining INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (status)
);

-- Class Templates table - Reusable class templates
CREATE TABLE class_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration INT NOT NULL COMMENT 'Duration in minutes',
    level ENUM('Beginner', 'Intermediate', 'Advanced', 'All Levels') DEFAULT 'All Levels',
    default_instructor VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Class Schedules table - Individual class instances
CREATE TABLE class_schedules (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    day_of_week TINYINT NOT NULL COMMENT '0 = Sunday, 1 = Monday, etc.',
    start_time TIME NOT NULL,
    duration INT NOT NULL COMMENT 'Duration in minutes',
    instructor VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    level ENUM('Beginner', 'Intermediate', 'Advanced', 'All Levels') DEFAULT 'All Levels',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES class_templates(template_id) ON DELETE SET NULL,
    INDEX (day_of_week),
    INDEX (active)
);

-- Class Bookings table - Member bookings for classes
CREATE TABLE class_bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    class_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('Confirmed', 'Pending', 'Cancelled', 'Attended', 'No-Show') DEFAULT 'Confirmed',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES class_schedules(class_id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (class_id),
    INDEX (date),
    INDEX (status)
);

-- Workshops table - Special events and workshops
CREATE TABLE workshops (
    workshop_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    member_price DECIMAL(10, 2),
    capacity INT NOT NULL,
    instructor VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    image_url VARCHAR(255),
    workshop_slug VARCHAR(100) NOT NULL UNIQUE COMMENT 'URL-friendly ID used in frontend',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX (date),
    INDEX (active),
    INDEX (workshop_slug)
);

-- Workshop Registrations table - Member registrations for workshops
CREATE TABLE workshop_registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    workshop_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status ENUM('Paid', 'Pending', 'Refunded') DEFAULT 'Pending',
    payment_method ENUM('Credit Card', 'PayPal', 'Cash', 'At Studio', 'Other'),
    card_last_four VARCHAR(4),
    payment_reference VARCHAR(255),
    amount_paid DECIMAL(10, 2),
    attended BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (workshop_id) REFERENCES workshops(workshop_id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (workshop_id),
    INDEX (payment_status)
);

-- Private Sessions table - For one-on-one sessions
CREATE TABLE private_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration INT NOT NULL COMMENT 'Duration in minutes',
    focus ENUM(
        'Beginners Introduction',
        'Alignment & Technique',
        'Improving Flexibility',
        'Building Strength',
        'Meditation & Breathwork',
        'Prenatal Yoga',
        'Therapeutic Practice',
        'Custom Focus'
    ) NOT NULL,
    custom_focus_details TEXT,
    package_type ENUM('Single Session', '3-Session Package', '5-Session Package') NOT NULL,
    session_number INT DEFAULT 1,
    price DECIMAL(10, 2),
    status ENUM('Confirmed', 'Pending', 'Cancelled', 'Completed') DEFAULT 'Pending',
    notes TEXT,
    client_notes TEXT,
    payment_status ENUM('Paid', 'Pending', 'Refunded') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (date),
    INDEX (status)
);

-- Instructor Availability table - For managing instructor availability
CREATE TABLE instructor_availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    day_of_week TINYINT NOT NULL COMMENT '0 = Sunday, 1 = Monday, etc.',
    available BOOLEAN DEFAULT TRUE,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX (day_of_week)
);

-- Unavailable Dates table - For specific dates when instructor is unavailable
CREATE TABLE unavailable_dates (
    unavailable_id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    end_date DATE,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX (date)
);

-- Gallery Images table - For the website gallery
CREATE TABLE gallery_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100),
    description TEXT,
    image_url VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX (active),
    INDEX (display_order)
);

-- Retreats table - Yoga retreats and immersions
CREATE TABLE retreats (
    retreat_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(100),
    description TEXT,
    detailed_itinerary TEXT,
    accommodations TEXT,
    included_items TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location VARCHAR(100) NOT NULL,
    venue_name VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    member_price DECIMAL(10, 2),
    early_bird_price DECIMAL(10, 2),
    early_bird_deadline DATE,
    deposit_amount DECIMAL(10, 2),
    capacity INT NOT NULL,
    instructors VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),
    gallery_images TEXT COMMENT 'JSON array of image URLs',
    retreat_slug VARCHAR(100) NOT NULL UNIQUE COMMENT 'URL-friendly ID used in frontend',
    active BOOLEAN DEFAULT FALSE COMMENT 'When true, retreat is published to website',
    featured BOOLEAN DEFAULT FALSE COMMENT 'Featured on homepage',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX (start_date),
    INDEX (active),
    INDEX (featured),
    INDEX (retreat_slug)
);

-- Retreat Registrations table - Member registrations for retreats
CREATE TABLE retreat_registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    retreat_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status ENUM('Deposit Paid', 'Full Payment', 'Partial Payment', 'Pending', 'Refunded', 'Cancelled') DEFAULT 'Pending',
    payment_method ENUM('Credit Card', 'PayPal', 'Bank Transfer', 'Cash', 'Other'),
    card_last_four VARCHAR(4),
    payment_reference VARCHAR(255),
    amount_paid DECIMAL(10, 2),
    balance_due DECIMAL(10, 2),
    special_requests TEXT,
    dietary_restrictions TEXT,
    emergency_contact VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (retreat_id) REFERENCES retreats(retreat_id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (retreat_id),
    INDEX (payment_status)
);

-- Newsletter Subscriber table - For the newsletter signup
CREATE TABLE newsletter_subscribers (
    subscriber_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    subscribe_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX (email),
    INDEX (active)
);
