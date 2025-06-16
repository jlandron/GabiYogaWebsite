/**
 * Data Access Layer for the Yoga Website
 * 
 * This file provides database operations for the SQLite database
 * using the db-config connection.
 */

const db = require('./db-config');
const bcrypt = require('bcryptjs');
const { getDatetimeFunction } = require('../utils/db-helper');

/**
 * Member operations for user management
 */
const MemberOperations = {
  /**
   * Count active members
   */
  countActiveMembers: async () => {
    try {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM users 
        LEFT JOIN memberships ON users.user_id = memberships.user_id 
        WHERE users.role = 'member' 
        AND (memberships.end_date IS NULL OR memberships.end_date > date('now') 
          OR memberships.classes_remaining > 0)
      `);
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting active members:', error);
      throw error;
    }
  },
  
  /**
   * Get all members with their membership information
   */
  getAllMembers: async () => {
    try {
      // Get all users with role 'member'
      const members = await db.query(`
        SELECT user_id, first_name, last_name, email, phone, created_at as member_since 
        FROM users 
        WHERE role = 'member'
        ORDER BY created_at DESC
      `);
      
      // Get membership info for each member
      for (const member of members) {
        const memberships = await db.query(`
          SELECT 
            membership_id,
            membership_type as type,
            start_date,
            end_date,
            classes_remaining,
            auto_renew
          FROM memberships
          WHERE user_id = ? AND (end_date IS NULL OR end_date > date('now') OR classes_remaining > 0)
          ORDER BY start_date DESC
          LIMIT 1
        `, [member.user_id]);
        
        if (memberships.length > 0) {
          member.membership = memberships[0];
        }
      }
      
      return members;
    } catch (error) {
      console.error('Error getting all members:', error);
      throw error;
    }
  },
  
  /**
   * Get member by ID with membership info
   */
  getMemberById: async (userId) => {
    try {
      // Get user with role 'member'
      const members = await db.query(`
        SELECT user_id, first_name, last_name, email, phone, created_at as member_since 
        FROM users 
        WHERE user_id = ? AND role = 'member'
      `, [userId]);
      
      if (members.length === 0) {
        return null;
      }
      
      const member = members[0];
      
      // Get membership info
      const memberships = await db.query(`
        SELECT 
          membership_id,
          membership_type as type,
          start_date,
          end_date,
          classes_remaining,
          auto_renew
        FROM memberships
        WHERE user_id = ? 
        ORDER BY start_date DESC
      `, [userId]);
      
      member.memberships = memberships;
      
      // Get attendance history
      const attendance = await db.query(`
        SELECT 
          b.booking_id,
          c.name as class_name,
          b.date,
          c.start_time,
          b.status
        FROM bookings b
        JOIN classes c ON b.class_id = c.class_id
        WHERE b.user_id = ?
        ORDER BY b.date DESC, c.start_time DESC
      `, [userId]);
      
      member.attendance = attendance;
      
      return member;
    } catch (error) {
      console.error('Error getting member by ID:', error);
      throw error;
    }
  },
  
  /**
   * Update member information
   */
  updateMember: async (userId, memberData) => {
    try {
      const { first_name, last_name, email, phone } = memberData;
      const datetimeFunc = getDatetimeFunction();
      
      // Update user info
      await db.query(`
        UPDATE users
        SET 
          first_name = ?,
          last_name = ?,
          email = ?,
          phone = ?,
          updated_at = ${datetimeFunc}
        WHERE user_id = ? AND role = 'member'
      `, [first_name, last_name, email, phone, userId]);
      
      // Get updated member info
      return await MemberOperations.getMemberById(userId);
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }
};

/**
 * Booking operations for class and workshop registrations
 */
const BookingOperations = {
  /**
   * Count weekly bookings
   */
  countWeeklyBookings: async () => {
    try {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM class_bookings 
        WHERE date BETWEEN date('now', '-7 days') AND date('now', '+7 days')
        AND status != 'Cancelled'
      `);
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting weekly bookings:', error);
      throw error;
    }
  },
  
  /**
   * Calculate monthly revenue
   */
  calculateMonthlyRevenue: async () => {
    try {
      // Revenue from memberships purchased this month
      const membershipResult = await db.query(`
        SELECT COALESCE(SUM(price), 0) as total 
        FROM memberships 
        WHERE created_at >= date('now', 'start of month') AND created_at <= date('now')
      `);
      
      // Revenue from workshop registrations this month
      const workshopResult = await db.query(`
        SELECT COALESCE(SUM(amount_paid), 0) as total 
        FROM workshop_registrations 
        WHERE registration_date >= date('now', 'start of month') AND registration_date <= date('now')
        AND payment_status = 'Paid'
      `);
      
      // Revenue from private sessions this month
      const sessionResult = await db.query(`
        SELECT COALESCE(SUM(price), 0) as total 
        FROM private_sessions 
        WHERE created_at >= date('now', 'start of month') AND created_at <= date('now')
        AND payment_status = 'Paid'
      `);
      
      const membershipRevenue = membershipResult[0]?.total || 0;
      const workshopRevenue = workshopResult[0]?.total || 0;
      const sessionRevenue = sessionResult[0]?.total || 0;
      
      return membershipRevenue + workshopRevenue + sessionRevenue;
    } catch (error) {
      console.error('Error calculating monthly revenue:', error);
      throw error;
    }
  },
  
  /**
   * Get recent bookings
   */
  getRecentBookings: async () => {
    try {
      const bookings = await db.query(`
        SELECT 
          b.booking_id,
          u.first_name || ' ' || u.last_name as user_name,
          c.name as class_name,
          b.date,
          c.start_time,
          b.status
        FROM class_bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN class_schedules c ON b.class_id = c.class_id
        WHERE b.date >= date('now', '-3 days')
        ORDER BY b.date, c.start_time
        LIMIT 10
      `);
      
      return bookings;
    } catch (error) {
      console.error('Error getting recent bookings:', error);
      throw error;
    }
  },
  
  /**
   * Get all bookings
   */
  getAllBookings: async () => {
    try {
      const bookings = await db.query(`
        SELECT 
          b.booking_id,
          u.first_name || ' ' || u.last_name as user_name,
          c.name as class_name,
          b.date,
          c.start_time,
          b.status,
          b.created_at
        FROM class_bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN class_schedules c ON b.class_id = c.class_id
        ORDER BY b.date DESC, c.start_time
      `);
      
      return bookings;
    } catch (error) {
      console.error('Error getting all bookings:', error);
      throw error;
    }
  },
  
  /**
   * Create a class booking
   */
  createClassBooking: async (bookingData) => {
    try {
      const { user_id, class_id, date, payment_method, status = 'Confirmed' } = bookingData;
      const datetimeFunc = getDatetimeFunction();
      
      // Check if user already has a booking for this class on this date
      const existingBookings = await db.query(`
        SELECT booking_id FROM bookings 
        WHERE user_id = ? AND class_id = ? AND date = ?
      `, [user_id, class_id, date]);
      
      if (existingBookings.length > 0) {
        throw new Error('User already has a booking for this class on this date');
      }
      
      // Create the booking
      const result = await db.query(`
        INSERT INTO bookings (
          user_id, 
          class_id, 
          date, 
          status, 
          booking_date,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ${datetimeFunc}, ${datetimeFunc}, ${datetimeFunc})
      `, [user_id, class_id, date, status]);
      
      // Get the created booking details
      const bookings = await db.query(`
        SELECT 
          b.booking_id,
          b.user_id,
          b.class_id,
          b.date,
          b.status,
          b.booking_date,
          b.created_at,
          c.name as class_name,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email
        FROM bookings b
        JOIN classes c ON b.class_id = c.class_id
        JOIN users u ON b.user_id = u.user_id
        WHERE b.booking_id = ?
      `, [result.lastID]);
      
      return bookings.length > 0 ? bookings[0] : null;
    } catch (error) {
      console.error('Error creating class booking:', error);
      throw error;
    }
  },
  
  /**
   * Get user's bookings
   */
  getUserBookings: async (userId) => {
    try {
      const bookings = await db.query(`
        SELECT 
          b.booking_id,
          b.class_id,
          b.date,
          b.status,
          b.booking_date,
          b.created_at,
          c.name as class_name,
          c.start_time,
          c.duration,
          c.instructor,
          c.level
        FROM bookings b
        JOIN classes c ON b.class_id = c.class_id
        WHERE b.user_id = ?
        AND b.status != 'Cancelled'
        ORDER BY b.date DESC, c.start_time
      `, [userId]);
      
      return bookings;
    } catch (error) {
      console.error('Error getting user bookings:', error);
      throw error;
    }
  },
  
  /**
   * Cancel a booking
   */
  cancelBooking: async (bookingId, userId = null) => {
    try {
      const datetimeFunc = getDatetimeFunction();
      
      // If userId is provided, verify the booking belongs to the user
      let whereClause = 'booking_id = ?';
      let params = [bookingId];
      
      if (userId) {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }
      
      const result = await db.query(`
        UPDATE bookings 
        SET status = 'Cancelled', updated_at = ${datetimeFunc}
        WHERE ${whereClause}
      `, params);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }
};

/**
 * Class operations for schedule management
 */
const ClassOperations = {
  /**
   * Get all class templates
   */
  getClassTemplates: async () => {
    try {
      const templates = await db.query(`
        SELECT 
          template_id,
          name,
          duration,
          level,
          default_instructor,
          description
        FROM class_templates
        ORDER BY name
      `);
      
      return templates;
    } catch (error) {
      console.error('Error getting class templates:', error);
      throw error;
    }
  },
  
  /**
   * Get class template by ID
   */
  getClassTemplateById: async (templateId) => {
    try {
      const templates = await db.query(`
        SELECT 
          template_id,
          name,
          duration,
          level,
          default_instructor,
          description
        FROM class_templates
        WHERE template_id = ?
      `, [templateId]);
      
      return templates.length > 0 ? templates[0] : null;
    } catch (error) {
      console.error('Error getting class template by ID:', error);
      throw error;
    }
  },
  
  /**
   * Create a new class template
   */
  createClassTemplate: async (templateData) => {
    try {
      const { name, duration, level, default_instructor, description } = templateData;
      const datetimeFunc = getDatetimeFunction();
      
      const result = await db.query(`
        INSERT INTO class_templates (
          name, 
          duration, 
          level, 
          default_instructor, 
          description,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ${datetimeFunc}, ${datetimeFunc})
      `, [name, duration, level, default_instructor, description]);
      
      return await ClassOperations.getClassTemplateById(result.lastID);
    } catch (error) {
      console.error('Error creating class template:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing class template
   */
  updateClassTemplate: async (templateId, templateData) => {
    try {
      const { name, duration, level, default_instructor, description } = templateData;
      const datetimeFunc = getDatetimeFunction();
      
      await db.query(`
        UPDATE class_templates
        SET 
          name = ?,
          duration = ?,
          level = ?,
          default_instructor = ?,
          description = ?,
          updated_at = ${datetimeFunc}
        WHERE template_id = ?
      `, [name, duration, level, default_instructor, description, templateId]);
      
      return await ClassOperations.getClassTemplateById(templateId);
    } catch (error) {
      console.error('Error updating class template:', error);
      throw error;
    }
  },
  
  /**
   * Delete a class template
   */
  deleteClassTemplate: async (templateId) => {
    try {
      // Check if template exists
      const template = await ClassOperations.getClassTemplateById(templateId);
      if (!template) {
        return false;
      }
      
      // Delete the template
      await db.query(`DELETE FROM class_templates WHERE template_id = ?`, [templateId]);
      
      return true;
    } catch (error) {
      console.error('Error deleting class template:', error);
      throw error;
    }
  },
  
  /**
   * Get all classes
   */
  getClasses: async () => {
    try {
      const classes = await db.query(`
        SELECT 
          class_id,
          template_id,
          name,
          day_of_week,
          start_time,
          duration,
          instructor,
          level,
          capacity,
          description,
          active
        FROM class_schedules
        ORDER BY day_of_week, start_time
      `);
      
      return classes;
    } catch (error) {
      console.error('Error getting classes:', error);
      throw error;
    }
  },
  
  /**
   * Get class by ID
   */
  getClassById: async (classId) => {
    try {
      const classes = await db.query(`
        SELECT 
          class_id,
          template_id,
          name,
          day_of_week,
          start_time,
          duration,
          instructor,
          level,
          capacity,
          description,
          active
        FROM class_schedules
        WHERE class_id = ?
      `, [classId]);
      
      return classes.length > 0 ? classes[0] : null;
    } catch (error) {
      console.error('Error getting class by ID:', error);
      throw error;
    }
  },
  
  /**
   * Create a new class
   */
  createClass: async (classData) => {
    try {
      const { 
        template_id, 
        name, 
        day_of_week, 
        start_time, 
        duration, 
        instructor, 
        level,
        capacity,
        description,
        active = true 
      } = classData;
      
      const datetimeFunc = getDatetimeFunction();
      
      const result = await db.query(`
        INSERT INTO classes (
          template_id,
          name, 
          day_of_week, 
          start_time, 
          duration, 
          instructor, 
          level,
          capacity,
          description,
          active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${datetimeFunc}, ${datetimeFunc})
      `, [template_id, name, day_of_week, start_time, duration, instructor, level, capacity, description, active ? 1 : 0]);
      
      return await ClassOperations.getClassById(result.lastID);
    } catch (error) {
      console.error('Error creating class:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing class
   */
  updateClass: async (classId, classData) => {
    try {
      const { 
        template_id, 
        name, 
        day_of_week, 
        start_time, 
        duration, 
        instructor, 
        level,
        capacity,
        description,
        active 
      } = classData;
      
      const datetimeFunc = getDatetimeFunction();
      
      await db.query(`
        UPDATE classes
        SET 
          template_id = ?,
          name = ?,
          day_of_week = ?,
          start_time = ?,
          duration = ?,
          instructor = ?,
          level = ?,
          capacity = ?,
          description = ?,
          active = ?,
          updated_at = ${datetimeFunc}
        WHERE class_id = ?
      `, [
        template_id, 
        name, 
        day_of_week, 
        start_time, 
        duration, 
        instructor, 
        level,
        capacity,
        description,
        active ? 1 : 0,
        classId
      ]);
      
      return await ClassOperations.getClassById(classId);
    } catch (error) {
      console.error('Error updating class:', error);
      throw error;
    }
  },
  
  /**
   * Delete a class
   */
  deleteClass: async (classId) => {
    try {
      // Check if class exists
      const classInfo = await ClassOperations.getClassById(classId);
      if (!classInfo) {
        return false;
      }
      
      // Delete the class
      await db.query(`DELETE FROM classes WHERE class_id = ?`, [classId]);
      
      return true;
    } catch (error) {
      console.error('Error deleting class:', error);
      throw error;
    }
  },
  
  /**
   * Get bookings for a specific class on a specific date
   */
  getBookingsForClassAndDate: async (classId, date) => {
    try {
      const bookings = await db.query(`
        SELECT 
          booking_id,
          user_id,
          class_id,
          date,
          status,
          booking_date,
          created_at
        FROM bookings
        WHERE class_id = ? AND date = ?
        AND status IN ('Confirmed', 'Attended')
        ORDER BY created_at
      `, [classId, date]);
      
      return bookings;
    } catch (error) {
      console.error('Error getting bookings for class and date:', error);
      throw error;
    }
  },
  
  /**
   * Get user by ID
   */
  getUserById: async (userId) => {
    try {
      const users = await db.query(`
        SELECT 
          user_id,
          first_name,
          last_name,
          email,
          phone,
          role
        FROM users
        WHERE user_id = ?
      `, [userId]);
      
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }
};

/**
 * Workshop operations for workshop management
 */
const WorkshopOperations = {
  /**
   * Get all workshops
   */
  getAllWorkshops: async () => {
    try {
      const workshops = await db.query(`
        SELECT 
          w.workshop_id,
          w.title,
          w.description,
          w.date,
          w.start_time,
          w.end_time,
          w.instructor,
          w.capacity,
          w.price,
          w.member_price,
          w.location,
          w.image_url,
          w.workshop_slug,
          w.active,
          (SELECT COUNT(*) FROM workshop_registrations wr WHERE wr.workshop_id = w.workshop_id) as registration_count
        FROM workshops w
        ORDER BY w.date DESC, w.start_time
      `);
      
      return workshops;
    } catch (error) {
      console.error('Error getting all workshops:', error);
      throw error;
    }
  },
  
  /**
   * Get upcoming workshops
   */
  getUpcomingWorkshops: async () => {
    try {
      const workshops = await db.query(`
        SELECT 
          w.workshop_id,
          w.title,
          w.description,
          w.date,
          w.start_time,
          w.end_time,
          w.instructor,
          w.capacity,
          w.price,
          w.member_price,
          w.location,
          w.image_url,
          w.workshop_slug,
          w.active,
          (SELECT COUNT(*) FROM workshop_registrations wr WHERE wr.workshop_id = w.workshop_id) as registration_count
        FROM workshops w
        WHERE w.date >= date('now')
        ORDER BY w.date, w.start_time
        LIMIT 10
      `);
      
      return workshops;
    } catch (error) {
      console.error('Error getting upcoming workshops:', error);
      throw error;
    }
  },
  
  /**
   * Get workshop by ID
   */
  getWorkshopById: async (workshopId) => {
    try {
      const workshops = await db.query(`
        SELECT 
          w.workshop_id,
          w.title,
          w.description,
          w.date,
          w.start_time,
          w.end_time,
          w.instructor,
          w.capacity,
          w.price,
          w.member_price,
          w.location,
          w.image_url,
          w.workshop_slug,
          w.active
        FROM workshops w
        WHERE w.workshop_id = ?
      `, [workshopId]);
      
      return workshops.length > 0 ? workshops[0] : null;
    } catch (error) {
      console.error('Error getting workshop by ID:', error);
      throw error;
    }
  },
  
  /**
   * Create a new workshop
   */
  createWorkshop: async (workshopData) => {
    try {
      const {
        title,
        description,
        date,
        start_time,
        end_time,
        price,
        member_price,
        capacity,
        instructor,
        location,
        image_url,
        workshop_slug,
        active = false
      } = workshopData;
      
      const datetimeFunc = getDatetimeFunction();
      
      const result = await db.query(`
        INSERT INTO workshops (
          title,
          description,
          date,
          start_time,
          end_time,
          price,
          member_price,
          capacity,
          instructor,
          location,
          image_url,
          workshop_slug,
          active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${datetimeFunc}, ${datetimeFunc})
      `, [
        title,
        description,
        date,
        start_time,
        end_time,
        price,
        member_price,
        capacity,
        instructor,
        location,
        image_url,
        workshop_slug,
        active ? 1 : 0
      ]);
      
      return await WorkshopOperations.getWorkshopById(result.lastID);
    } catch (error) {
      console.error('Error creating workshop:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing workshop
   */
  updateWorkshop: async (workshopId, workshopData) => {
    try {
      // Check if workshop exists
      const workshop = await WorkshopOperations.getWorkshopById(workshopId);
      if (!workshop) {
        return null;
      }
      
      const {
        title,
        description,
        date,
        start_time,
        end_time,
        price,
        member_price,
        capacity,
        instructor,
        location,
        image_url,
        workshop_slug,
        active
      } = workshopData;
      
      const datetimeFunc = getDatetimeFunction();
      
      await db.query(`
        UPDATE workshops
        SET 
          title = ?,
          description = ?,
          date = ?,
          start_time = ?,
          end_time = ?,
          price = ?,
          member_price = ?,
          capacity = ?,
          instructor = ?,
          location = ?,
          image_url = ?,
          workshop_slug = ?,
          active = ?,
          updated_at = ${datetimeFunc}
        WHERE workshop_id = ?
      `, [
        title,
        description,
        date,
        start_time,
        end_time,
        price,
        member_price,
        capacity,
        instructor,
        location,
        image_url,
        workshop_slug,
        active ? 1 : 0,
        workshopId
      ]);
      
      return await WorkshopOperations.getWorkshopById(workshopId);
    } catch (error) {
      console.error('Error updating workshop:', error);
      throw error;
    }
  },
  
  /**
   * Delete a workshop
   */
  deleteWorkshop: async (workshopId) => {
    try {
      // Check if workshop exists
      const workshop = await WorkshopOperations.getWorkshopById(workshopId);
      if (!workshop) {
        return false;
      }
      
      // Delete the workshop
      await db.query(`DELETE FROM workshops WHERE workshop_id = ?`, [workshopId]);
      
      return true;
    } catch (error) {
      console.error('Error deleting workshop:', error);
      throw error;
    }
  },
  
  /**
   * Get workshop registrations
   */
  getWorkshopRegistrations: async (workshopId) => {
    try {
      const registrations = await db.query(`
        SELECT 
          wr.registration_id,
          u.first_name || ' ' || u.last_name as user_name,
          u.email,
          wr.registration_date,
          wr.payment_status,
          wr.payment_method,
          wr.amount_paid,
          wr.attended,
          wr.notes
        FROM workshop_registrations wr
        JOIN users u ON wr.user_id = u.user_id
        WHERE wr.workshop_id = ?
        ORDER BY wr.registration_date DESC
      `, [workshopId]);
      
      return registrations;
    } catch (error) {
      console.error('Error getting workshop registrations:', error);
      throw error;
    }
  },
  
  /**
   * Update registration attendance status
   */
  updateRegistrationAttendance: async (registrationId, attended) => {
    try {
      const datetimeFunc = getDatetimeFunction();
      
      await db.query(`
        UPDATE workshop_registrations
        SET 
          attended = ?,
          updated_at = ${datetimeFunc}
        WHERE registration_id = ?
      `, [attended ? 1 : 0, registrationId]);
      
      // Get the updated registration
      const registrations = await db.query(`
        SELECT 
          wr.registration_id,
          u.first_name || ' ' || u.last_name as user_name,
          u.email,
          wr.registration_date,
          wr.payment_status,
          wr.payment_method,
          wr.amount_paid,
          wr.attended,
          wr.notes
        FROM workshop_registrations wr
        JOIN users u ON wr.user_id = u.user_id
        WHERE wr.registration_id = ?
      `, [registrationId]);
      
      return registrations.length > 0 ? registrations[0] : null;
    } catch (error) {
      console.error('Error updating registration attendance:', error);
      throw error;
    }
  },
  
  /**
   * Update registration payment status
   */
  updateRegistrationPaymentStatus: async (registrationId, status) => {
    try {
      const datetimeFunc = getDatetimeFunction();
      
      await db.query(`
        UPDATE workshop_registrations
        SET 
          payment_status = ?,
          updated_at = ${datetimeFunc}
        WHERE registration_id = ?
      `, [status, registrationId]);
      
      // Get the updated registration
      const registrations = await db.query(`
        SELECT 
          wr.registration_id,
          u.first_name || ' ' || u.last_name as user_name,
          u.email,
          wr.registration_date,
          wr.payment_status,
          wr.payment_method,
          wr.amount_paid,
          wr.attended,
          wr.notes
        FROM workshop_registrations wr
        JOIN users u ON wr.user_id = u.user_id
        WHERE wr.registration_id = ?
      `, [registrationId]);
      
      return registrations.length > 0 ? registrations[0] : null;
    } catch (error) {
      console.error('Error updating registration payment status:', error);
      throw error;
    }
  }
};

/**
 * Retreat operations for managing retreats
 */
const RetreatOperations = {
  /**
   * Get all retreats
   */
  getAllRetreats: async () => {
    try {
      const retreats = await db.query(`
        SELECT 
          retreat_id,
          title,
          description,
          location,
          start_date,
          end_date,
          price,
          capacity,
          image_url,
          active
        FROM retreats
        ORDER BY start_date DESC
      `);
      
      return retreats;
    } catch (error) {
      console.error('Error getting all retreats:', error);
      throw error;
    }
  },
  
  /**
   * Get upcoming retreats
   */
  getUpcomingRetreats: async () => {
    try {
      const retreats = await db.query(`
        SELECT 
          retreat_id,
          title,
          description,
          location,
          start_date,
          end_date,
          price,
          capacity,
          image_url,
          active,
          (SELECT COUNT(*) FROM retreat_registrations WHERE retreat_id = r.retreat_id) as registration_count
        FROM retreats r
        WHERE start_date >= date('now')
        AND active = 1
        ORDER BY start_date
        LIMIT 10
      `);
      
      return retreats;
    } catch (error) {
      console.error('Error getting upcoming retreats:', error);
      throw error;
    }
  },
  
  /**
   * Get featured retreats for homepage
   */
  getFeaturedRetreats: async () => {
    try {
      // Get upcoming retreats that are active and limit to 3 for featured display
      const retreats = await db.query(`
        SELECT 
          retreat_id,
          title,
          description,
          location,
          start_date,
          end_date,
          price,
          capacity,
          image_url,
          active
        FROM retreats
        WHERE start_date >= date('now')
        AND active = 1
        ORDER BY start_date
        LIMIT 3
      `);
      
      return retreats;
    } catch (error) {
      console.error('Error getting featured retreats:', error);
      throw error;
    }
  },
  
  /**
   * Get published retreats (all active retreats)
   */
  getPublishedRetreats: async () => {
    try {
      const retreats = await db.query(`
        SELECT 
          retreat_id,
          title,
          description,
          location,
          start_date,
          end_date,
          price,
          capacity,
          image_url,
          active
        FROM retreats
        WHERE active = 1
        ORDER BY start_date DESC
      `);
      
      return retreats;
    } catch (error) {
      console.error('Error getting published retreats:', error);
      throw error;
    }
  },
  
  /**
   * Get retreat by ID
   */
  getRetreatById: async (retreatId) => {
    try {
      const retreats = await db.query(`
        SELECT 
          retreat_id,
          title,
          description,
          location,
          start_date,
          end_date,
          price,
          capacity,
          image_url,
          active
        FROM retreats
        WHERE retreat_id = ?
      `, [retreatId]);
      
      return retreats.length > 0 ? retreats[0] : null;
    } catch (error) {
      console.error('Error getting retreat by ID:', error);
      throw error;
    }
  },
  
  /**
   * Create a new retreat
   */
  createRetreat: async (retreatData) => {
    try {
      const {
        title,
        description,
        location,
        start_date,
        end_date,
        price,
        capacity,
        image_url,
        active = false
      } = retreatData;
      
      const datetimeFunc = getDatetimeFunction();
      
      const result = await db.query(`
        INSERT INTO retreats (
          title,
          description,
          location,
          start_date,
          end_date,
          price,
          capacity,
          image_url,
          active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${datetimeFunc}, ${datetimeFunc})
      `, [
        title,
        description,
        location,
        start_date,
        end_date,
        price,
        capacity,
        image_url,
        active ? 1 : 0
      ]);
      
      return await RetreatOperations.getRetreatById(result.lastID);
    } catch (error) {
      console.error('Error creating retreat:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing retreat
   */
  updateRetreat: async (retreatId, retreatData) => {
    try {
      // Check if retreat exists
      const retreat = await RetreatOperations.getRetreatById(retreatId);
      if (!retreat) {
        return null;
      }
      
      const {
        title,
        description,
        location,
        start_date,
        end_date,
        price,
        capacity,
        image_url,
        active
      } = retreatData;
      
      const datetimeFunc = getDatetimeFunction();
      
      await db.query(`
        UPDATE retreats
        SET 
          title = ?,
          description = ?,
          location = ?,
          start_date = ?,
          end_date = ?,
          price = ?,
          capacity = ?,
          image_url = ?,
          active = ?,
          updated_at = ${datetimeFunc}
        WHERE retreat_id = ?
      `, [
        title,
        description,
        location,
        start_date,
        end_date,
        price,
        capacity,
        image_url,
        active ? 1 : 0,
        retreatId
      ]);
      
      return await RetreatOperations.getRetreatById(retreatId);
    } catch (error) {
      console.error('Error updating retreat:', error);
      throw error;
    }
  },
  
  /**
   * Delete a retreat
   */
  deleteRetreat: async (retreatId) => {
    try {
      // Check if retreat exists
      const retreat = await RetreatOperations.getRetreatById(retreatId);
      if (!retreat) {
        return false;
      }
      
      // Delete the retreat
      await db.query(`DELETE FROM retreats WHERE retreat_id = ?`, [retreatId]);
      
      return true;
    } catch (error) {
      console.error('Error deleting retreat:', error);
      throw error;
    }
  },
  
  /**
   * Get retreat registrations
   */
  getRetreatRegistrations: async (retreatId) => {
    try {
      const registrations = await db.query(`
        SELECT 
          rr.registration_id,
          u.user_id,
          u.first_name || ' ' || u.last_name as user_name,
          u.email,
          rr.registration_date,
          rr.payment_status,
          rr.deposit_amount,
          rr.total_amount,
          rr.notes
        FROM retreat_registrations rr
        JOIN users u ON rr.user_id = u.user_id
        WHERE rr.retreat_id = ?
        ORDER BY rr.registration_date DESC
      `, [retreatId]);
      
      return registrations;
    } catch (error) {
      console.error('Error getting retreat registrations:', error);
      throw error;
    }
  }
};

/**
 * Private Session operations for managing private sessions
 */
const PrivateSessionOperations = {
  /**
   * Count upcoming sessions
   */
  countUpcomingSessions: async () => {
    try {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM private_sessions 
        WHERE date >= date('now')
        AND status != 'Cancelled'
      `);
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting upcoming sessions:', error);
      throw error;
    }
  },
  
  /**
   * Save instructor availability settings
   */
  saveAvailabilitySettings: async (settings) => {
    try {
      const { available_days, blocked_dates } = settings;
      
      // Convert to JSON strings for storage
      const availableDaysJson = JSON.stringify(available_days || []);
      const blockedDatesJson = JSON.stringify(blocked_dates || []);
      
      // Check if settings already exist
      const existingSettings = await db.query(`
        SELECT id FROM instructor_availability WHERE id = 1
      `);
      
      const datetimeFunc = getDatetimeFunction();
      
      if (existingSettings.length > 0) {
        // Update existing settings
        await db.query(`
          UPDATE instructor_availability
          SET 
            available_days = ?, 
            blocked_dates = ?,
            updated_at = ${datetimeFunc}
          WHERE id = 1
        `, [availableDaysJson, blockedDatesJson]);
      } else {
        // Insert new settings
        await db.query(`
          INSERT INTO instructor_availability (id, available_days, blocked_dates, created_at, updated_at)
          VALUES (1, ?, ?, ${datetimeFunc}, ${datetimeFunc})
        `, [availableDaysJson, blockedDatesJson]);
      }
      
      return {
        available_days,
        blocked_dates
      };
    } catch (error) {
      console.error('Error saving availability settings:', error);
      throw error;
    }
  },
  
  /**
   * Get all private sessions
   */
  getPrivateSessions: async () => {
    try {
      const sessions = await db.query(`
        SELECT 
          ps.session_id,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          ps.date,
          ps.start_time,
          ps.duration,
          ps.focus,
          ps.notes,
          ps.status
        FROM private_sessions ps
        JOIN users u ON ps.user_id = u.user_id
        WHERE ps.date >= date('now', '-7 days')
        ORDER BY ps.date, ps.start_time
      `);
      
      return sessions;
    } catch (error) {
      console.error('Error getting private sessions:', error);
      throw error;
    }
  },
  
  /**
   * Update private session status
   */
  updateSessionStatus: async (sessionId, status) => {
    try {
      const datetimeFunc = getDatetimeFunction();
      
      await db.query(`
        UPDATE private_sessions
        SET 
          status = ?,
          updated_at = ${datetimeFunc}
        WHERE session_id = ?
      `, [status, sessionId]);
      
      // Get the updated session
      const sessions = await db.query(`
        SELECT 
          ps.session_id,
          u.first_name || ' ' || u.last_name as user_name,
          ps.date,
          ps.start_time,
          ps.duration,
          ps.focus,
          ps.notes,
          ps.status
        FROM private_sessions ps
        JOIN users u ON ps.user_id = u.user_id
        WHERE ps.session_id = ?
      `, [sessionId]);
      
      return sessions.length > 0 ? sessions[0] : null;
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
  }
};

/**
 * Authentication operations for user login and registration
 */
const AuthOperations = {
  /**
   * Create a password reset token
   * @param {string} email - The user's email
   * @returns {Object} - Reset token info with token, expiry and user details
   */
  createPasswordResetToken: async (email) => {
    try {
      // Find user by email
      const user = await AuthOperations.findUserByEmail(email);
      if (!user) {
        return null;
      }
      
      // Generate a random token - 32 characters of hex
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(16).toString('hex');
      
      // Set expiry to 1 hour from now
      const now = new Date();
      const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      const expiryString = expiry.toISOString().slice(0, 19).replace('T', ' ');
      
      // Hash the token for storage
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      // Store token in the database
      // First check if user already has a token
      const existingToken = await db.query(`
        SELECT id FROM password_reset_tokens
        WHERE user_id = ?
      `, [user.user_id]);
      
      // Get the appropriate datetime function based on database type
      const datetimeFunc = getDatetimeFunction();
      
      if (existingToken.length > 0) {
        // Update existing token
        await db.query(`
          UPDATE password_reset_tokens
          SET token_hash = ?, expires_at = ?, updated_at = ${datetimeFunc}
          WHERE user_id = ?
        `, [tokenHash, expiryString, user.user_id]);
      } else {
        // Create new token entry
        await db.query(`
          INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at, updated_at)
          VALUES (?, ?, ?, ${datetimeFunc}, ${datetimeFunc})
        `, [user.user_id, tokenHash, expiryString]);
      }
      
      // Return token info
      return {
        token: resetToken,
        expiry: expiry,
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      };
    } catch (error) {
      console.error('Error creating password reset token:', error);
      throw error;
    }
  },
  
  /**
   * Verify a password reset token
   * @param {string} token - The reset token to verify
   * @param {string} email - The user's email
   * @returns {Object|null} - User info if token is valid, null otherwise
   */
  verifyPasswordResetToken: async (token, email) => {
    try {
      // Find user by email
      const user = await AuthOperations.findUserByEmail(email);
      if (!user) {
        return null;
      }
      
      // Hash the token for comparison
      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Get token from database
      const tokens = await db.query(`
        SELECT * FROM password_reset_tokens
        WHERE user_id = ? AND token_hash = ?
      `, [user.user_id, tokenHash]);
      
      if (tokens.length === 0) {
        return null;
      }
      
      const storedToken = tokens[0];
      
      // Check if token has expired
      const expiryDate = new Date(storedToken.expires_at);
      const now = new Date();
      
      if (now > expiryDate) {
        // Token has expired
        return null;
      }
      
      // Token is valid - return user info
      return {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      };
    } catch (error) {
      console.error('Error verifying password reset token:', error);
      throw error;
    }
  },
  
  /**
   * Reset user password using a valid token
   * @param {string} token - The reset token
   * @param {string} email - The user's email
   * @param {string} newPassword - The new password
   * @returns {boolean} - True if password was reset successfully
   */
  resetPassword: async (token, email, newPassword) => {
    try {
      // Verify token first
      const user = await AuthOperations.verifyPasswordResetToken(token, email);
      if (!user) {
        return false;
      }
      
      // Validate password
      if (!newPassword || newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      
      // Update password
      await db.query(`
        UPDATE users
        SET password_hash = ?, updated_at = ${getDatetimeFunction()}
        WHERE user_id = ?
      `, [passwordHash, user.userId]);
      
      // Delete the used token
      await db.query(`
        DELETE FROM password_reset_tokens
        WHERE user_id = ?
      `, [user.userId]);
      
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },
  
  /**
   * Find user by email
   */
  findUserByEmail: async (email) => {
    try {
      const users = await db.query(`
        SELECT 
          user_id, 
          first_name, 
          last_name, 
          email, 
          password_hash, 
          role,
          profile_picture
        FROM users 
        WHERE email = ?
      `, [email]);
      
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  },
  
  /**
   * Find user by ID
   */
  findUserById: async (userId) => {
    try {
      const users = await db.query(`
        SELECT 
          user_id, 
          first_name, 
          last_name, 
          email, 
          phone,
          role,
          profile_picture
        FROM users 
        WHERE user_id = ?
      `, [userId]);
      
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  },
  
  /**
   * Verify user password
   */
  verifyPassword: async (password, passwordHash) => {
    try {
      return await bcrypt.compare(password, passwordHash);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  },
  
  /**
   * Create new user
   */
  createUser: async (userData) => {
    try {
      const { firstName, lastName, email, password } = userData;
      
      // Verify input data
      if (!firstName || !lastName || !email || !password) {
        throw new Error('All fields are required');
      }
      
      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }
      
      // Check password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      // MySQL-compatible timestamp format
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // Create user with SQL that works for both SQLite and MySQL
      const result = await db.query(`
        INSERT INTO users (
          first_name,
          last_name,
          email,
          password_hash,
          role,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 'member', ?, ?)
      `, [firstName, lastName, email, passwordHash, timestamp, timestamp]);
      
      // Wait before trying to fetch the user to ensure database consistency
      const userId = result.lastID;
      if (!userId) {
        throw new Error('User creation failed: No user ID returned');
      }
      
      // Get created user
      const user = await AuthOperations.findUserById(userId);
      if (!user) {
        throw new Error('User creation succeeded but user could not be retrieved');
      }
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Enhance error with more useful information
      if (error.code === 'ER_DUP_ENTRY' || error.message.includes('UNIQUE constraint failed')) {
        error.message = 'Email is already registered';
      } else if (error.code === 'ER_DATA_TOO_LONG') {
        error.message = 'One or more fields exceed maximum length';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
        error.message = 'Database connection failed';
      }
      
      throw error;
    }
  },
  
  /**
   * Login a user and return their details
   */
  loginUser: async (email, password) => {
    try {
      // Get user by email
      const user = await AuthOperations.findUserByEmail(email);
      
      if (!user) {
        return null;
      }
      
      // Verify password
      const isPasswordValid = await AuthOperations.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return null;
      }
      
      // Return user data without password hash
      const userCopy = {...user};
      delete userCopy.password_hash;
      return userCopy;
    } catch (error) {
      console.error('Error logging in user:', error);
      throw error;
    }
  },
  
  /**
   * Register a new user
   */
  registerUser: async (userData) => {
    try {
      // Check if user exists
      const existingUser = await AuthOperations.findUserByEmail(userData.email);
      
      if (existingUser) {
        throw new Error('Email already registered');
      }
      
      // Create user
      return await AuthOperations.createUser(userData);
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },
  
  /**
   * Get user by ID
   */
  getUserById: async (userId) => {
    return await AuthOperations.findUserById(userId);
  }
};

/**
 * Website Settings operations for managing global site settings
 */
const WebsiteSettingsOperations = {
  /**
   * Get website settings
   * If no settings exist, returns default settings
   */
  getSettings: async () => {
    try {
      const settings = await db.query(`
        SELECT settings_json
        FROM website_settings
        WHERE id = 1
      `);
      
      if (settings.length > 0) {
        return JSON.parse(settings[0].settings_json);
      } else {
        // Return default settings
        return {
          about: {
            name: "Gabi Jyoti",
            subtitle: "RYT 500 Certified Yoga Instructor",
            bio: "Welcome to Gabi Jyoti Yoga! I've been practicing yoga for over 10 years and teaching for 5. My journey began when I was seeking balance in my hectic life, and yoga provided the perfect sanctuary.\n\nI specialize in Vinyasa, Hatha, and Restorative yoga practices. My teaching philosophy centers around making yoga accessible to practitioners of all levels while honoring its traditional roots.\n\nThrough my classes, I aim to create a supportive environment where you can explore the transformative power of yoga, connecting breath with movement and finding peace within.",
            profilePhoto: "images/DSC02659.JPG"
          },
          certifications: [
            "RYT 500 - Yoga Alliance",
            "Meditation Instructor Certification",
            "Pre-natal Yoga Certification"
          ],
          sectionToggles: {
            // Classes & Offerings
            groupClasses: true,
            privateLessons: true,
            workshops: true,
            retreats: true,
            
            // Other Sections
            retreatsSection: true,
            scheduleSection: true,
            membershipSection: true,
            gallerySection: true
          },
          contactInfo: {
            address: "123 Yoga Street, Mindful City, CA 94000",
            phone: "(555) 123-4567",
            email: "info@gabijyoti.yoga",
            socialMedia: {
              facebook: "https://facebook.com/gabijyotiyoga",
              instagram: "https://instagram.com/gabijyotiyoga",
              youtube: "https://youtube.com/gabijyotiyoga"
            }
          }
        };
      }
    } catch (error) {
      console.error('Error getting website settings:', error);
      throw error;
    }
  },
  
  /**
   * Save website settings
   */
  saveSettings: async (settingsData) => {
    try {
      const settingsJson = JSON.stringify(settingsData);
      const now = new Date().toISOString();
      
      // Check if settings already exist
      const existingSettings = await db.query(`
        SELECT id FROM website_settings WHERE id = 1
      `);
      
      if (existingSettings.length > 0) {
        // Update existing settings
        await db.query(`
          UPDATE website_settings
          SET settings_json = ?, updated_at = ?
          WHERE id = 1
        `, [settingsJson, now]);
      } else {
        // Insert new settings
        await db.query(`
          INSERT INTO website_settings (id, settings_json, created_at, updated_at)
          VALUES (1, ?, ?, ?)
        `, [settingsJson, now, now]);
      }
      
      return settingsData;
    } catch (error) {
      console.error('Error saving website settings:', error);
      throw error;
    }
  }
};

/**
 * Newsletter Subscription operations
 */
const NewsletterOperations = {
  /**
   * Subscribe to newsletter
   */
  subscribe: async (email) => {
    try {
      // Check if email already exists
      const existing = await db.query(`
        SELECT subscriber_id FROM newsletter_subscribers 
        WHERE email = ?
      `, [email]);
      
      if (existing.length > 0) {
        // Update existing subscription to active if it was inactive
        const datetimeFunc = getDatetimeFunction();
        await db.query(`
          UPDATE newsletter_subscribers 
          SET active = 1, updated_at = ${datetimeFunc}
          WHERE email = ?
        `, [email]);
        return { isNew: false, email };
      }
      
      // Create new subscription
      const datetimeFunc = getDatetimeFunction();
      await db.query(`
        INSERT INTO newsletter_subscribers (email, active, subscribe_date, created_at, updated_at)
        VALUES (?, 1, ${datetimeFunc}, ${datetimeFunc}, ${datetimeFunc})
      `, [email]);
      
      return { isNew: true, email };
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      throw error;
    }
  },
  
  /**
   * Get all newsletter subscribers
   */
  getAllSubscribers: async () => {
    try {
      const subscribers = await db.query(`
        SELECT 
          subscriber_id,
          email,
          active,
          subscribe_date,
          created_at
        FROM newsletter_subscribers
        WHERE active = 1
        ORDER BY subscribe_date DESC
      `);
      
      return subscribers;
    } catch (error) {
      console.error('Error getting newsletter subscribers:', error);
      throw error;
    }
  },
  
  /**
   * Get newsletter subscribers with pagination and search
   */
  getNewsletterSubscribers: async ({ limit = 10, offset = 0, search = '' }) => {
    try {
      let query = `
        SELECT 
          subscriber_id,
          email,
          active,
          subscribe_date,
          created_at
        FROM newsletter_subscribers
      `;
      
      const queryParams = [];
      
      if (search) {
        query += ` WHERE email LIKE ?`;
        queryParams.push(`%${search}%`);
      }
      
      query += ` ORDER BY subscribe_date DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
      
      const subscribers = await db.query(query, queryParams);
      return subscribers;
    } catch (error) {
      console.error('Error getting newsletter subscribers with pagination:', error);
      throw error;
    }
  },
  
  /**
   * Get newsletter subscribers count for pagination
   */
  getNewsletterSubscribersCount: async (search = '') => {
    try {
      let query = `SELECT COUNT(*) as count FROM newsletter_subscribers`;
      const queryParams = [];
      
      if (search) {
        query += ` WHERE email LIKE ?`;
        queryParams.push(`%${search}%`);
      }
      
      const result = await db.query(query, queryParams);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting newsletter subscribers count:', error);
      throw error;
    }
  },
  
  /**
   * Update subscriber status (activate/deactivate)
   */
  updateSubscriberStatus: async (subscriberId, active) => {
    try {
      const datetimeFunc = getDatetimeFunction();
      await db.query(`
        UPDATE newsletter_subscribers 
        SET active = ?, updated_at = ${datetimeFunc}
        WHERE subscriber_id = ?
      `, [active ? 1 : 0, subscriberId]);
      
      return true;
    } catch (error) {
      console.error('Error updating subscriber status:', error);
      throw error;
    }
  },
  
  /**
   * Unsubscribe from newsletter
   */
  unsubscribe: async (email) => {
    try {
      const datetimeFunc = getDatetimeFunction();
      await db.query(`
        UPDATE newsletter_subscribers 
        SET active = 0, updated_at = ${datetimeFunc}
        WHERE email = ?
      `, [email]);
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from newsletter:', error);
      throw error;
    }
  }
};

/**
 * Contact Form operations
 */
const ContactOperations = {
  /**
   * Save contact form submission
   */
  saveContactSubmission: async (contactData) => {
    try {
      const { name, email, subject, message } = contactData;
      const datetimeFunc = getDatetimeFunction();
      
      const result = await db.query(`
        INSERT INTO contact_submissions (name, email, subject, message, created_at, updated_at)
        VALUES (?, ?, ?, ?, ${datetimeFunc}, ${datetimeFunc})
      `, [name, email, subject, message]);
      
      return {
        submission_id: result.lastID,
        name,
        email,
        subject,
        message
      };
    } catch (error) {
      console.error('Error saving contact submission:', error);
      throw error;
    }
  },
  
  /**
   * Get all contact submissions
   */
  getAllContactSubmissions: async () => {
    try {
      const submissions = await db.query(`
        SELECT 
          submission_id,
          name,
          email,
          subject,
          message,
          status,
          created_at
        FROM contact_submissions
        ORDER BY created_at DESC
      `);
      
      return submissions;
    } catch (error) {
      console.error('Error getting contact submissions:', error);
      throw error;
    }
  },
  
  /**
   * Get contact submissions with pagination and search
   */
  getContactSubmissions: async ({ limit = 10, offset = 0, search = '' }) => {
    try {
      let query = `
        SELECT 
          submission_id,
          name,
          email,
          subject,
          message,
          status,
          created_at
        FROM contact_submissions
      `;
      
      const queryParams = [];
      
      if (search) {
        query += ` WHERE (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)`;
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
      
      const submissions = await db.query(query, queryParams);
      return submissions;
    } catch (error) {
      console.error('Error getting contact submissions with pagination:', error);
      throw error;
    }
  },
  
  /**
   * Get contact submissions count for pagination
   */
  getContactSubmissionsCount: async (search = '') => {
    try {
      let query = `SELECT COUNT(*) as count FROM contact_submissions`;
      const queryParams = [];
      
      if (search) {
        query += ` WHERE (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)`;
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      const result = await db.query(query, queryParams);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting contact submissions count:', error);
      throw error;
    }
  },
  
  /**
   * Get contact submission by ID
   */
  getContactSubmissionById: async (submissionId) => {
    try {
      const submissions = await db.query(`
        SELECT 
          submission_id,
          name,
          email,
          subject,
          message,
          status,
          created_at
        FROM contact_submissions
        WHERE submission_id = ?
      `, [submissionId]);
      
      return submissions.length > 0 ? submissions[0] : null;
    } catch (error) {
      console.error('Error getting contact submission by ID:', error);
      throw error;
    }
  },
  
  /**
   * Update contact submission status
   */
  updateContactSubmissionStatus: async (submissionId, status) => {
    try {
      const datetimeFunc = getDatetimeFunction();
      await db.query(`
        UPDATE contact_submissions 
        SET status = ?, updated_at = ${datetimeFunc}
        WHERE submission_id = ?
      `, [status, submissionId]);
      
      return true;
    } catch (error) {
      console.error('Error updating contact submission status:', error);
      throw error;
    }
  }
};

module.exports = {
  MemberOperations,
  BookingOperations,
  ClassOperations,
  WorkshopOperations,
  PrivateSessionOperations,
  AuthOperations,
  RetreatOperations,
  WebsiteSettingsOperations,
  NewsletterOperations,
  ContactOperations
};
