/**
 * Database Models for Gabi Jyoti Yoga Website
 * 
 * This file creates and exports Mongoose models based on the schemas defined in db-schema.js.
 * These models are used throughout the application to interact with the database.
 */

const mongoose = require('mongoose');
const {
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
} = require('./db-schema');

// Create models from schemas
const User = mongoose.model('User', UserSchema);
const Membership = mongoose.model('Membership', MembershipSchema);
const ClassTemplate = mongoose.model('ClassTemplate', ClassTemplateSchema);
const ClassSchedule = mongoose.model('ClassSchedule', ClassScheduleSchema);
const ClassBooking = mongoose.model('ClassBooking', ClassBookingSchema);
const Workshop = mongoose.model('Workshop', WorkshopSchema);
const WorkshopRegistration = mongoose.model('WorkshopRegistration', WorkshopRegistrationSchema);
const PrivateSession = mongoose.model('PrivateSession', PrivateSessionSchema);
const InstructorAvailability = mongoose.model('InstructorAvailability', InstructorAvailabilitySchema);
const UnavailableDate = mongoose.model('UnavailableDate', UnavailableDateSchema);
const GalleryImage = mongoose.model('GalleryImage', GalleryImageSchema);
const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', NewsletterSubscriberSchema);

module.exports = {
    User,
    Membership,
    ClassTemplate,
    ClassSchedule,
    ClassBooking,
    Workshop,
    WorkshopRegistration,
    PrivateSession,
    InstructorAvailability,
    UnavailableDate,
    GalleryImage,
    NewsletterSubscriber
};
