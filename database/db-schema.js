/**
 * Database Schema for Gabi Jyoti Yoga Website
 * 
 * This file defines the MongoDB schema for the application.
 * It can be used with both local MongoDB and AWS DocumentDB.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * User Schema - Members of the yoga studio
 */
const UserSchema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Hashed password, might be null for OAuth users
    phone: String,
    profilePicture: String,
    memberSince: { type: Date, default: Date.now },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: String, // For Google OAuth users
    bio: String,
    healthNotes: String, // Any health issues or modifications needed
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Membership Schema - Tracks user memberships
 */
const MembershipSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
        type: String, 
        required: true, 
        enum: ['Monthly Unlimited', 'Annual Membership', 'Class Pack', 'Drop-In']
    },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date }, // For fixed-term memberships
    autoRenew: { type: Boolean, default: false },
    status: { 
        type: String, 
        required: true,
        enum: ['Active', 'Expired', 'Cancelled', 'Pending'],
        default: 'Active'
    },
    price: { type: Number, required: true },
    payment: {
        method: { type: String, enum: ['Credit Card', 'PayPal', 'Cash', 'Other'] },
        cardLastFour: String, // Last 4 digits of card if applicable
        reference: String // Payment reference/transaction ID
    },
    classesRemaining: { type: Number }, // For class packs
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Class Template Schema - Reusable class templates
 */
const ClassTemplateSchema = new Schema({
    name: { type: String, required: true },
    description: String,
    duration: { type: Number, required: true }, // In minutes
    level: { 
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
        default: 'All Levels'
    },
    defaultInstructor: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Class Schedule Schema - Individual class instances
 */
const ClassScheduleSchema = new Schema({
    template: { type: Schema.Types.ObjectId, ref: 'ClassTemplate' },
    name: { type: String, required: true }, // Can be different from template
    description: String,
    dayOfWeek: { 
        type: Number, 
        required: true, 
        min: 0, 
        max: 6 // 0 = Sunday, 1 = Monday, etc.
    },
    startTime: { type: String, required: true }, // Format: "HH:MM" in 24-hour format
    duration: { type: Number, required: true }, // In minutes
    instructor: { type: String, required: true },
    capacity: { type: Number, required: true },
    level: { 
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
        default: 'All Levels'
    },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Class Booking Schema - Member bookings for classes
 */
const ClassBookingSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classSchedule: { type: Schema.Types.ObjectId, ref: 'ClassSchedule', required: true },
    date: { type: Date, required: true }, // Specific date of the class
    status: { 
        type: String, 
        required: true,
        enum: ['Confirmed', 'Pending', 'Cancelled', 'Attended', 'No-Show'],
        default: 'Confirmed'
    },
    bookingDate: { type: Date, default: Date.now }, // When the booking was made
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Workshop Schema - Special events and workshops
 */
const WorkshopSchema = new Schema({
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // Format: "HH:MM" in 24-hour format
    endTime: { type: String, required: true }, // Format: "HH:MM" in 24-hour format
    price: { type: Number, required: true },
    memberPrice: { type: Number }, // Discounted price for members
    capacity: { type: Number, required: true },
    instructor: { type: String, required: true },
    location: String,
    imageUrl: String,
    workshopId: { type: String, required: true, unique: true }, // ID used in frontend
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Workshop Registration Schema - Member registrations for workshops
 */
const WorkshopRegistrationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workshop: { type: Schema.Types.ObjectId, ref: 'Workshop', required: true },
    registrationDate: { type: Date, default: Date.now },
    paymentStatus: { 
        type: String, 
        required: true,
        enum: ['Paid', 'Pending', 'Refunded'],
        default: 'Pending'
    },
    payment: {
        method: { type: String, enum: ['Credit Card', 'PayPal', 'Cash', 'At Studio', 'Other'] },
        cardLastFour: String, // Last 4 digits of card if applicable
        reference: String // Payment reference/transaction ID
    },
    amountPaid: { type: Number },
    attended: { type: Boolean, default: false },
    notes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Private Session Schema - For one-on-one sessions
 */
const PrivateSessionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // Format: "HH:MM" in 24-hour format
    duration: { type: Number, required: true }, // In minutes
    focus: { 
        type: String,
        enum: [
            'Beginners Introduction',
            'Alignment & Technique',
            'Improving Flexibility',
            'Building Strength',
            'Meditation & Breathwork',
            'Prenatal Yoga',
            'Therapeutic Practice',
            'Custom Focus'
        ],
        required: true
    },
    customFocusDetails: String, // If focus is 'Custom Focus'
    packageType: { 
        type: String,
        enum: ['Single Session', '3-Session Package', '5-Session Package'],
        required: true
    },
    sessionNumber: { type: Number, default: 1 }, // For tracking sessions in a package
    price: { type: Number },
    status: { 
        type: String, 
        required: true,
        enum: ['Confirmed', 'Pending', 'Cancelled', 'Completed'],
        default: 'Pending'
    },
    notes: String, // Admin notes about the session
    clientNotes: String, // Notes from the client about their needs
    paymentStatus: { 
        type: String, 
        required: true,
        enum: ['Paid', 'Pending', 'Refunded'],
        default: 'Pending'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Instructor Availability Schema - For managing instructor availability
 */
const InstructorAvailabilitySchema = new Schema({
    dayOfWeek: { 
        type: Number, 
        required: true, 
        min: 0, 
        max: 6 // 0 = Sunday, 1 = Monday, etc.
    },
    available: { type: Boolean, default: true },
    startTime: { type: String }, // Format: "HH:MM" in 24-hour format
    endTime: { type: String }, // Format: "HH:MM" in 24-hour format
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Unavailable Date Schema - For specific dates when instructor is unavailable
 */
const UnavailableDateSchema = new Schema({
    date: { type: Date, required: true },
    endDate: { type: Date }, // For multi-day unavailability
    reason: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Gallery Image Schema - For the website gallery
 */
const GalleryImageSchema = new Schema({
    title: String,
    description: String,
    imageUrl: { type: String, required: true },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * Newsletter Subscriber Schema - For the newsletter signup
 */
const NewsletterSubscriberSchema = new Schema({
    email: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    subscribeDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = {
    UserSchema,
    MembershipSchema,
    ClassTemplateSchema,
    ClassScheduleSchema,
    ClassBookingSchema,
    WorkshopSchema,
    WorkshopRegistrationSchema,
    PrivateSessionSchema,
    InstructorAvailabilitySchema,
    UnavailableDateSchema,
    GalleryImageSchema,
    NewsletterSubscriberSchema
};
