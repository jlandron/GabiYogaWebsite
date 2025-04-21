/**
 * Data Access Layer for the Yoga Website
 * 
 * This file provides database operations for the SQLite database
 * using the db-config connection.
 */

const db = require('./db-config');
const bcrypt = require('bcryptjs');

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
      
      // Update user info
      await db.query(`
        UPDATE users
        SET 
          first_name = ?,
          last_name = ?,
          email = ?,
          phone = ?,
          updated_at = datetime('now')
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
        FROM bookings 
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
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payments 
        WHERE payment_date BETWEEN date('now', 'start of month') AND date('now', '+1 day')
        AND payment_type = 'membership'
      `);
      
      // Revenue from workshop registrations this month
      const workshopResult = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payments 
        WHERE payment_date BETWEEN date('now', 'start of month') AND date('now', '+1 day')
        AND payment_type = 'workshop'
      `);
      
      // Revenue from private sessions this month
      const sessionResult = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payments 
        WHERE payment_date BETWEEN date('now', 'start of month') AND date('now', '+1 day')
        AND payment_type = 'private_session'
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
        FROM bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN classes c ON b.class_id = c.class_id
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
        FROM bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN classes c ON b.class_id = c.class_id
        ORDER BY b.date DESC, c.start_time
      `);
      
      return bookings;
    } catch (error) {
      console.error('Error getting all bookings:', error);
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
      
      const result = await db.query(`
        INSERT INTO class_templates (
          name, 
          duration, 
          level, 
          default_instructor, 
          description,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
      
      await db.query(`
        UPDATE class_templates
        SET 
          name = ?,
          duration = ?,
          level = ?,
          default_instructor = ?,
          description = ?,
          updated_at = datetime('now')
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
        FROM classes
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
        FROM classes
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
          updated_at = datetime('now')
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
          updated_at = datetime('now')
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
      await db.query(`
        UPDATE workshop_registrations
        SET 
          attended = ?,
          updated_at = datetime('now')
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
      await db.query(`
        UPDATE workshop_registrations
        SET 
          payment_status = ?,
          updated_at = datetime('now')
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
   * Get all private sessions
   */
  getPrivateSessions: async () => {
    try {
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
      await db.query(`
        UPDATE private_sessions
        SET 
          status = ?,
          updated_at = datetime('now')
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
   * Login a user and return their details
   */
  loginUser: async (email, password) => {
    try {
      // Get user by email
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
      
      if (users.length === 0) {
        return null;
      }
      
      const user = users[0];
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return null;
      }
      
      // Return user data without password hash
      delete user.password_hash;
      return user;
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
      const { firstName, lastName, email, password } = userData;
      
      // Check if user exists
      const existingUsers = await db.query(`
        SELECT user_id FROM users WHERE email = ?
      `, [email]);
      
      if (existingUsers.length > 0) {
        throw new Error('Email already registered');
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      // Create user
      const result = await db.query(`
        INSERT INTO users (
          first_name,
          last_name,
          email,
          password_hash,
          role,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 'member', datetime('now'), datetime('now'))
      `, [firstName, lastName, email, passwordHash]);
      
      // Get created user
      const users = await db.query(`
        SELECT 
          user_id, 
          first_name, 
          last_name, 
          email, 
          role,
          profile_picture
        FROM users 
        WHERE user_id = ?
      `, [result.lastID]);
      
      return users[0];
    } catch (error) {
      console.error('Error registering user:', error);
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
          role,
          profile_picture
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
 * Retreat operations for retreat management
 */
const RetreatOperations = {
  /**
   * Get all retreats
   */
  getAllRetreats: async () => {
    try {
      const retreats = await db.query(`
        SELECT 
          r.retreat_id,
          r.title,
          r.subtitle,
          r.description,
          r.detailed_itinerary,
          r.accommodations,
          r.included_items,
          r.start_date,
          r.end_date,
          r.location,
          r.venue_name,
          r.price,
          r.member_price,
          r.early_bird_price,
          r.early_bird_deadline,
          r.deposit_amount,
          r.capacity,
          r.instructors,
          r.image_url,
          r.gallery_images,
          r.retreat_slug,
          r.active,
          r.featured,
          (SELECT COUNT(*) FROM retreat_registrations rr WHERE rr.retreat_id = r.retreat_id) as registration_count
        FROM retreats r
        ORDER BY r.start_date DESC
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
          r.retreat_id,
          r.title,
          r.subtitle,
          r.description,
          r.detailed_itinerary,
          r.accommodations,
          r.included_items,
          r.start_date,
          r.end_date,
          r.location,
          r.venue_name,
          r.price,
          r.member_price,
          r.early_bird_price,
          r.early_bird_deadline,
          r.deposit_amount,
          r.capacity,
          r.instructors,
          r.image_url,
          r.gallery_images,
          r.retreat_slug,
          r.active,
          r.featured,
          (SELECT COUNT(*) FROM retreat_registrations rr WHERE rr.retreat_id = r.retreat_id) as registration_count
        FROM retreats r
        WHERE r.start_date >= date('now')
        ORDER BY r.start_date
      `);
      
      return retreats;
    } catch (error) {
      console.error('Error getting upcoming retreats:', error);
      throw error;
    }
  },
  
  /**
   * Get published retreats for the public site
   */
  getPublishedRetreats: async () => {
    try {
      const retreats = await db.query(`
        SELECT 
          r.retreat_id,
          r.title,
          r.subtitle,
          r.description,
          r.detailed_itinerary,
          r.accommodations,
          r.included_items,
          r.start_date,
          r.end_date,
          r.location,
          r.venue_name,
          r.price,
          r.member_price,
          r.early_bird_price,
          r.early_bird_deadline,
          r.deposit_amount,
          r.capacity,
          r.instructors,
          r.image_url,
          r.gallery_images,
          r.retreat_slug,
          r.featured,
          (SELECT COUNT(*) FROM retreat_registrations rr WHERE rr.retreat_id = r.retreat_id) as registration_count
        FROM retreats r
        WHERE r.active = 1 AND r.start_date >= date('now')
        ORDER BY r.start_date
      `);
      
      return retreats;
    } catch (error) {
      console.error('Error getting published retreats:', error);
      throw error;
    }
  },
  
  /**
   * Get featured retreats for homepage
   */
  getFeaturedRetreats: async () => {
    try {
      const retreats = await db.query(`
        SELECT 
          r.retreat_id,
          r.title,
          r.subtitle,
          r.description,
          r.start_date,
          r.end_date,
          r.location,
          r.price,
          r.member_price,
          r.early_bird_price,
          r.early_bird_deadline,
          r.image_url,
          r.retreat_slug
        FROM retreats r
        WHERE r.featured = 1 AND r.active = 1 AND r.start_date >= date('now')
        ORDER BY r.start_date
        LIMIT 3
      `);
      
      return retreats;
    } catch (error) {
      console.error('Error getting featured retreats:', error);
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
          r.retreat_id,
          r.title,
          r.subtitle,
          r.description,
          r.detailed_itinerary,
          r.accommodations,
          r.included_items,
          r.start_date,
          r.end_date,
          r.location,
          r.venue_name,
          r.price,
          r.member_price,
          r.early_bird_price,
          r.early_bird_deadline,
          r.deposit_amount,
          r.capacity,
          r.instructors,
          r.image_url,
          r.gallery_images,
          r.retreat_slug,
          r.active,
          r.featured
        FROM retreats r
        WHERE r.retreat_id = ?
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
        subtitle,
        description,
        detailed_itinerary,
        accommodations,
        included_items,
        start_date,
        end_date,
        location,
        venue_name,
        price,
        member_price,
        early_bird_price,
        early_bird_deadline,
        deposit_amount,
        capacity,
        instructors,
        image_url,
        gallery_images,
        retreat_slug,
        active = false,
        featured = false
      } = retreatData;
      
      const result = await db.query(`
        INSERT INTO retreats (
          title,
          subtitle,
          description,
          detailed_itinerary,
          accommodations,
          included_items,
          start_date,
          end_date,
          location,
          venue_name,
          price,
          member_price,
          early_bird_price,
          early_bird_deadline,
          deposit_amount,
          capacity,
          instructors,
          image_url,
          gallery_images,
          retreat_slug,
          active,
          featured,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        title,
        subtitle,
        description,
        detailed_itinerary,
        accommodations,
        included_items,
        start_date,
        end_date,
        location,
        venue_name,
        price,
        member_price,
        early_bird_price,
        early_bird_deadline,
        deposit_amount,
        capacity,
        instructors,
        image_url,
        gallery_images,
        retreat_slug,
        active ? 1 : 0,
        featured ? 1 : 0
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
        subtitle,
        description,
        detailed_itinerary,
        accommodations,
        included_items,
        start_date,
        end_date,
        location,
        venue_name,
        price,
        member_price,
        early_bird_price,
        early_bird_deadline,
        deposit_amount,
        capacity,
        instructors,
        image_url,
        gallery_images,
        retreat_slug,
        active,
        featured
      } = retreatData;
      
      await db.query(`
        UPDATE retreats
        SET 
          title = ?,
          subtitle = ?,
          description = ?,
          detailed_itinerary = ?,
          accommodations = ?,
          included_items = ?,
          start_date = ?,
          end_date = ?,
          location = ?,
          venue_name = ?,
          price = ?,
          member_price = ?,
          early_bird_price = ?,
          early_bird_deadline = ?,
          deposit_amount = ?,
          capacity = ?,
          instructors = ?,
          image_url = ?,
          gallery_images = ?,
          retreat_slug = ?,
          active = ?,
          featured = ?,
          updated_at = datetime('now')
        WHERE retreat_id = ?
      `, [
        title,
        subtitle,
        description,
        detailed_itinerary,
        accommodations,
        included_items,
        start_date,
        end_date,
        location,
        venue_name,
        price,
        member_price,
        early_bird_price,
        early_bird_deadline,
        deposit_amount,
        capacity,
        instructors,
        image_url,
        gallery_images,
        retreat_slug,
        active ? 1 : 0,
        featured ? 1 : 0,
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
          u.first_name || ' ' || u.last_name as user_name,
          u.email,
          rr.registration_date,
          rr.payment_status,
          rr.payment_method,
          rr.amount_paid,
          rr.balance_due,
          rr.special_requests,
          rr.dietary_restrictions,
          rr.emergency_contact,
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
  },
  
  /**
   * Update retreat registration payment status
   */
  updateRegistrationPaymentStatus: async (registrationId, status, amountPaid, balanceDue) => {
    try {
      await db.query(`
        UPDATE retreat_registrations
        SET 
          payment_status = ?,
          amount_paid = ?,
          balance_due = ?,
          updated_at = datetime('now')
        WHERE registration_id = ?
      `, [status, amountPaid, balanceDue, registrationId]);
      
      // Get the updated registration
      const registrations = await db.query(`
        SELECT 
          rr.registration_id,
          u.first_name || ' ' || u.last_name as user_name,
          u.email,
          rr.registration_date,
          rr.payment_status,
          rr.payment_method,
          rr.amount_paid,
          rr.balance_due,
          rr.special_requests,
          rr.dietary_restrictions,
          rr.emergency_contact,
          rr.notes
        FROM retreat_registrations rr
        JOIN users u ON rr.user_id = u.user_id
        WHERE rr.registration_id = ?
      `, [registrationId]);
      
      return registrations.length > 0 ? registrations[0] : null;
    } catch (error) {
      console.error('Error updating registration payment status:', error);
      throw error;
    }
  },
  
  /**
   * Toggle retreat featured status
   */
  toggleRetreatFeatured: async (retreatId) => {
    try {
      const retreat = await RetreatOperations.getRetreatById(retreatId);
      if (!retreat) {
        return null;
      }
      
      const newFeaturedStatus = retreat.featured ? 0 : 1;
      
      await db.query(`
        UPDATE retreats
        SET 
          featured = ?,
          updated_at = datetime('now')
        WHERE retreat_id = ?
      `, [newFeaturedStatus, retreatId]);
      
      return await RetreatOperations.getRetreatById(retreatId);
    } catch (error) {
      console.error('Error toggling retreat featured status:', error);
      throw error;
    }
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

module.exports = {
  MemberOperations,
  BookingOperations,
  ClassOperations,
  WorkshopOperations,
  PrivateSessionOperations,
  AuthOperations,
  RetreatOperations,
  WebsiteSettingsOperations
};
