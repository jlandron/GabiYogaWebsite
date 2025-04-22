/**
 * Combined Database Seed for Yoga Website
 * 
 * This file seeds the SQLite database with sample data for development purposes,
 * combining the original seed data and additional data.
 */

const db = require('./db-config');
const bcrypt = require('bcryptjs');
const { resetDatabase, createSchema } = require('./schema-updated');

/**
 * Generate a slug from a title
 */
const generateSlug = (title) => {
  return title.toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Seed database with sample data
 */
const seedDatabase = async () => {
  try {
    console.log('Seeding database with sample data...');
    
    // Create admin user
    const adminSalt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('admin123', adminSalt);
    
    await db.query(`
      INSERT INTO users (
        first_name, 
        last_name, 
        email, 
        password_hash, 
        role, 
        phone,
        created_at, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, ['Gabi', 'Jyoti', 'admin@gabijyotiyoga.com', adminHash, 'admin', '555-987-6543']);
    
    // Create sample members
    const memberSalt = await bcrypt.genSalt(10);
    const memberHash = await bcrypt.hash('password123', memberSalt);
    
    const members = [
      ['Sarah', 'Johnson', 'sarah@example.com', memberHash, 'member', '555-123-4567', '123 Yoga St', 'San Diego', 'CA', '92101'],
      ['Michael', 'Chen', 'michael@example.com', memberHash, 'member', '555-234-5678', '456 Flow Ave', 'San Diego', 'CA', '92102'],
      ['Alicia', 'Roberts', 'alicia@example.com', memberHash, 'member', '555-345-6789', '789 Om Rd', 'San Diego', 'CA', '92103'],
      ['David', 'Park', 'david@example.com', memberHash, 'member', '555-456-7890', '101 Namaste Ln', 'San Diego', 'CA', '92104'],
      ['Emma', 'Stevens', 'emma@example.com', memberHash, 'member', '555-567-8901', '202 Asana Way', 'San Diego', 'CA', '92105'],
      ['James', 'Wilson', 'james@example.com', memberHash, 'member', '555-678-9012', '303 Pranayama Pl', 'San Diego', 'CA', '92106'],
      ['Lisa', 'Thompson', 'lisa@example.com', memberHash, 'member', '555-789-0123', '404 Chakra St', 'San Diego', 'CA', '92107']
    ];
    
    for (const member of members) {
      await db.query(`
        INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          password_hash, 
          role, 
          phone,
          address,
          city,
          state,
          zip,
          active,
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now', '-' || ? || ' days'), datetime('now'))
      `, [...member, Math.floor(Math.random() * 90) + 10]); // Random registration date within the last 100 days
    }
    
    // Create sample memberships
    const users = await db.query(`SELECT user_id FROM users WHERE role = 'member'`);
    const membershipTypes = [
      { type: 'Monthly Unlimited', end_date: 'date("now", "+30 days")', classes_remaining: null, price: 120 },
      { type: 'Annual Membership', end_date: 'date("now", "+365 days")', classes_remaining: null, price: 1200 },
      { type: '10-Class Pack', end_date: null, classes_remaining: 10, price: 150 },
      { type: '20-Class Pack', end_date: null, classes_remaining: 20, price: 280 }
    ];
    
    for (const user of users) {
      // Random membership type
      const membership = membershipTypes[Math.floor(Math.random() * membershipTypes.length)];
      
      await db.query(`
        INSERT INTO memberships (
          user_id,
          membership_type,
          start_date,
          end_date,
          classes_remaining,
          auto_renew,
          status,
          price,
          payment_method,
          created_at,
          updated_at
        ) VALUES (?, ?, date('now', '-10 days'), ${membership.end_date}, ?, ?, 'Active', ?, ?, datetime('now'), datetime('now'))
      `, [
        user.user_id, 
        membership.type, 
        membership.classes_remaining, 
        Math.random() > 0.5 ? 1 : 0,
        membership.price,
        Math.random() > 0.7 ? 'Credit Card' : 'Cash'
      ]);
    }
    
    // Create class templates (original templates)
    const classTemplates = [
      { name: 'Rise & Shine Vinyasa', duration: 60, level: 'All Levels', instructor: 'Gabi Jyoti', description: 'Wake up with an energizing flow focused on building heat and setting intentions for your day.' },
      { name: 'Gentle Hatha', duration: 75, level: 'Beginner', instructor: 'Gabi Jyoti', description: 'A slow-paced class focusing on basic postures and alignment. Perfect for beginners or anyone seeking a gentle practice.' },
      { name: 'Power Yoga', duration: 60, level: 'Intermediate/Advanced', instructor: 'Gabi Jyoti', description: 'A vigorous, fitness-based approach to vinyasa-style yoga with emphasis on strength and flexibility.' },
      { name: 'Restorative', duration: 75, level: 'All Levels', instructor: 'Gabi Jyoti', description: 'Deeply relaxing practice using props to support the body. Focuses on releasing tension and restoring energy.' },
      { name: 'Lunch Break Flow', duration: 45, level: 'All Levels', instructor: 'Gabi Jyoti', description: 'A quick mid-day reset to boost energy and clear the mind. Efficient sequencing for busy schedules.' }
    ];
    
    // Additional class templates from add-more-test-data.js
    const additionalClassTemplates = [
      { name: 'Yin Yoga', duration: 75, level: 'All Levels', instructor: 'Gabi Jyoti', description: 'A slow-paced style of yoga with poses that are held for longer periods of time. Great for increasing flexibility and relaxation.' },
      { name: 'Yoga for Strength', duration: 60, level: 'Intermediate', instructor: 'Gabi Jyoti', description: 'Build strength and stability through longer holds and challenging sequences.' },
      { name: 'Mindful Flow', duration: 60, level: 'All Levels', instructor: 'Gabi Jyoti', description: 'A mindful vinyasa practice connecting breath with movement, with focus on presence and awareness.' }
    ];
    
    // Combine class templates
    const allClassTemplates = [...classTemplates, ...additionalClassTemplates];
    
    for (const template of allClassTemplates) {
      await db.query(`
        INSERT INTO class_templates (
          name,
          duration,
          level,
          default_instructor,
          description,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [template.name, template.duration, template.level, template.instructor, template.description]);
    }
    
    // Get template IDs
    const templates = await db.query(`SELECT template_id, name FROM class_templates`);
    const templateMap = {};
    templates.forEach(t => templateMap[t.name] = t.template_id);
    
    // Create weekly schedule (original schedule)
    const weeklySchedule = [
      // Monday
      { day: 1, template: 'Rise & Shine Vinyasa', start_time: '07:00', capacity: 20 },
      { day: 1, template: 'Lunch Break Flow', start_time: '12:00', capacity: 15 },
      { day: 1, template: 'Power Yoga', start_time: '18:00', capacity: 20 },
      { day: 1, template: 'Restorative', start_time: '19:30', capacity: 15 },
      
      // Tuesday
      { day: 2, template: 'Gentle Hatha', start_time: '09:30', capacity: 20 },
      { day: 2, template: 'Power Yoga', start_time: '17:30', capacity: 20 },
      
      // Wednesday
      { day: 3, template: 'Rise & Shine Vinyasa', start_time: '07:00', capacity: 20 },
      { day: 3, template: 'Lunch Break Flow', start_time: '12:00', capacity: 15 },
      { day: 3, template: 'Gentle Hatha', start_time: '18:00', capacity: 20 },
      
      // Thursday
      { day: 4, template: 'Power Yoga', start_time: '09:30', capacity: 20 },
      { day: 4, template: 'Restorative', start_time: '19:00', capacity: 15 },
      
      // Friday
      { day: 5, template: 'Rise & Shine Vinyasa', start_time: '07:00', capacity: 20 },
      { day: 5, template: 'Lunch Break Flow', start_time: '12:00', capacity: 15 },
      { day: 5, template: 'Power Yoga', start_time: '17:30', capacity: 20 },
      
      // Saturday
      { day: 6, template: 'Rise & Shine Vinyasa', start_time: '09:00', capacity: 25 },
      { day: 6, template: 'Gentle Hatha', start_time: '10:30', capacity: 25 },
      { day: 6, template: 'Power Yoga', start_time: '12:00', capacity: 25 },
      
      // Sunday
      { day: 0, template: 'Gentle Hatha', start_time: '10:00', capacity: 25 },
      { day: 0, template: 'Restorative', start_time: '17:00', capacity: 20 }
    ];
    
    // Additional classes from add-more-test-data.js
    const additionalClasses = [
      // Add Yin Yoga on Tuesday evenings
      { day: 2, template: 'Yin Yoga', start_time: '19:00', capacity: 20 },
      // Add Yoga for Strength on Thursday mornings
      { day: 4, template: 'Yoga for Strength', start_time: '08:00', capacity: 18 },
      // Add Mindful Flow on Friday evenings
      { day: 5, template: 'Mindful Flow', start_time: '19:00', capacity: 20 },
      // Add Yin Yoga on Sunday afternoons
      { day: 0, template: 'Yin Yoga', start_time: '15:30', capacity: 20 }
    ];
    
    // Combine all classes
    const allClasses = [...weeklySchedule, ...additionalClasses];
    
    for (const classItem of allClasses) {
      const template = templates.find(t => t.name === classItem.template);
      if (!template) continue;
      
      const templateDetails = allClassTemplates.find(t => t.name === classItem.template);
      
      await db.query(`
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `, [
        template.template_id,
        templateDetails.name,
        classItem.day,
        classItem.start_time,
        templateDetails.duration,
        templateDetails.instructor,
        templateDetails.level,
        classItem.capacity,
        templateDetails.description
      ]);
    }
    
    // Get classes
    const classes = await db.query(`SELECT class_id, day_of_week, name FROM classes`);
    
    // Create sample bookings
    // First, get the next 14 days with their day of week
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dateStr = date.toISOString().substring(0, 10); // YYYY-MM-DD
      
      dates.push({ date: dateStr, dayOfWeek });
    }
    
    // For each user and each day, randomly book some classes
    for (const user of users) {
      const bookedClasses = new Set(); // Track classes booked by this user to avoid duplicates
      
      // Book 3-7 random classes for each user
      const bookingsCount = Math.floor(Math.random() * 5) + 3;
      
      for (let i = 0; i < bookingsCount; i++) {
        // Get random date
        const dateInfo = dates[Math.floor(Math.random() * dates.length)];
        
        // Find classes that match this day of week
        const matchingClasses = classes.filter(c => c.day_of_week === dateInfo.dayOfWeek);
        if (matchingClasses.length === 0) continue;
        
        // Pick a random class from matching classes
        const randomClass = matchingClasses[Math.floor(Math.random() * matchingClasses.length)];
        
        // Create unique identifier for this booking to avoid duplicates
        const bookingId = `${user.user_id}-${randomClass.class_id}-${dateInfo.date}`;
        
        // Skip if already booked
        if (bookedClasses.has(bookingId)) continue;
        bookedClasses.add(bookingId);
        
        // Random status (mostly confirmed)
        const statuses = ['Confirmed', 'Confirmed', 'Confirmed', 'Confirmed', 'Cancelled'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const bookingDateHoursAgo = Math.floor(Math.random() * 72) + 1; // Random booking time in the last 72 hours
        
        // Insert booking
        await db.query(`
          INSERT INTO bookings (
            user_id,
            class_id,
            date,
            status,
            booking_date,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, datetime('now', '-' || ? || ' hours'), datetime('now', '-' || ? || ' hours'), datetime('now'))
        `, [
          user.user_id,
          randomClass.class_id,
          dateInfo.date,
          status,
          bookingDateHoursAgo,
          bookingDateHoursAgo
        ]);
      }
    }
    
    // Create sample workshops
    const workshops = [
      {
        title: 'Inversions & Arm Balances',
        description: 'Learn the foundations of inversions and arm balances in this playful workshop. We\'ll break down the key poses step by step and work on building strength and confidence.',
        date: 'date("now", "+25 days")',
        start_time: '14:00',
        end_time: '16:30',
        instructor: 'Gabi Jyoti',
        capacity: 20,
        price: 45,
        member_price: 40,
        early_bird_price: 35,
        early_bird_deadline: 'date("now", "+15 days")',
        location: 'Main Studio',
        workshop_slug: 'inversions-arm-balances'
      },
      {
        title: 'Yoga Philosophy & Meditation',
        description: 'Explore the philosophical roots of yoga and learn practical meditation techniques. This workshop combines theory and practice for a deeper understanding of yoga beyond asana.',
        date: 'date("now", "+50 days")',
        start_time: '10:00',
        end_time: '13:00',
        instructor: 'Gabi Jyoti & Dr. Anand Sharma',
        capacity: 25,
        price: 55,
        member_price: 49,
        early_bird_price: 45,
        early_bird_deadline: 'date("now", "+40 days")',
        location: 'Meditation Room',
        workshop_slug: 'yoga-philosophy-meditation'
      },
      {
        title: 'Pranayama & Breathwork',
        description: 'Unlock the power of your breath! Learn traditional pranayama techniques and modern breathwork methods to enhance your practice, reduce stress, and increase vitality.',
        date: 'date("now", "+93 days")',
        start_time: '18:30',
        end_time: '20:30',
        instructor: 'Gabi Jyoti',
        capacity: 15,
        price: 40,
        member_price: 36,
        early_bird_price: 32,
        early_bird_deadline: 'date("now", "+83 days")',
        location: 'Main Studio',
        workshop_slug: 'pranayama-breathwork'
      },
      {
        title: 'Yoga for Back Health',
        description: 'Learn therapeutic yoga poses and techniques specifically designed to relieve back pain and promote spinal health.',
        date: 'date("now", "+112 days")',
        start_time: '13:00',
        end_time: '16:00',
        instructor: 'Gabi Jyoti & Dr. Lisa Chen',
        capacity: 20,
        price: 60,
        member_price: 54,
        early_bird_price: 50,
        early_bird_deadline: 'date("now", "+102 days")',
        location: 'Healing Arts Room',
        workshop_slug: 'yoga-back-health'
      }
    ];
    
    for (const workshop of workshops) {
      await db.query(`
        INSERT INTO workshops (
          title,
          description,
          date,
          start_time,
          end_time,
          instructor,
          capacity,
          price,
          member_price,
          early_bird_price,
          early_bird_deadline,
          location,
          workshop_slug,
          active,
          created_at,
          updated_at
        ) VALUES (?, ?, ${workshop.date}, ?, ?, ?, ?, ?, ?, ?, ${workshop.early_bird_deadline}, ?, ?, 1, datetime('now'), datetime('now'))
      `, [
        workshop.title,
        workshop.description,
        workshop.start_time,
        workshop.end_time,
        workshop.instructor,
        workshop.capacity,
        workshop.price,
        workshop.member_price,
        workshop.early_bird_price,
        workshop.location,
        workshop.workshop_slug
      ]);
    }
    
    // Register some users for workshops
    const workshopRecords = await db.query(`SELECT workshop_id, price, member_price, early_bird_price FROM workshops`);
    
    for (const workshop of workshopRecords) {
      // Register 5-8 random users
      const registrationCount = Math.floor(Math.random() * 4) + 5;
      const randomUsers = [...users].sort(() => 0.5 - Math.random()).slice(0, registrationCount);
      
      for (const user of randomUsers) {
        // Random price (some early bird, some member price, some regular)
        let price;
        const rand = Math.random();
        if (rand < 0.33 && workshop.early_bird_price) {
          price = workshop.early_bird_price;
        } else if (rand < 0.66 && workshop.member_price) {
          price = workshop.member_price;
        } else {
          price = workshop.price;
        }
        
        const daysAgo = Math.floor(Math.random() * 14) + 1; // Registered 1-14 days ago
        
        await db.query(`
          INSERT INTO workshop_registrations (
            user_id,
            workshop_id,
            registration_date,
            payment_status,
            payment_method,
            amount_paid,
            created_at,
            updated_at
          ) VALUES (?, ?, datetime('now', '-' || ? || ' days'), 'Paid', 'Credit Card', ?, datetime('now', '-' || ? || ' days'), datetime('now'))
        `, [
          user.user_id,
          workshop.workshop_id,
          daysAgo,
          price,
          daysAgo
        ]);
      }
    }
    
    // Create sample private sessions
    const focuses = ['Alignment & Technique', 'Beginners Introduction', 'Therapeutic Practice', 'Advanced Poses', 'Meditation & Mindfulness'];
    const packageTypes = ['Single Session', '3-Session Package', '5-Session Package'];
    const statuses = ['Confirmed', 'Pending', 'Completed'];
    
    // Next 10 days
    const sessionDates = [];
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      sessionDates.push(date.toISOString().substring(0, 10)); // YYYY-MM-DD
    }
    
    // Create private sessions for random users (original + additional)
    const randomSessionUsers = [...users].sort(() => 0.5 - Math.random()).slice(0, 6); // 6 users for private sessions
    
    for (const user of randomSessionUsers) {
      // Random date and time
      const date = sessionDates[Math.floor(Math.random() * sessionDates.length)];
      const hours = [9, 10, 11, 13, 14, 15, 16];
      const hour = hours[Math.floor(Math.random() * hours.length)];
      const start_time = `${hour < 10 ? '0' + hour : hour}:00`;
      
      // Random focus, package type and status
      const focus = focuses[Math.floor(Math.random() * focuses.length)];
      const packageType = packageTypes[Math.floor(Math.random() * packageTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Price based on package
      let price = 80; // Default for single session
      if (packageType === '3-Session Package') price = 225 / 3; // $75 per session 
      if (packageType === '5-Session Package') price = 350 / 5; // $70 per session
      
      await db.query(`
        INSERT INTO private_sessions (
          user_id,
          date,
          start_time,
          duration,
          focus,
          package_type,
          price,
          location,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 60, ?, ?, ?, 'Main Studio', ?, datetime('now', '-' || ? || ' days'), datetime('now'))
      `, [
        user.user_id,
        date,
        start_time,
        focus,
        packageType,
        price,
        status,
        Math.floor(Math.random() * 7) + 1 // Created 1-7 days ago
      ]);
    }
    
    // Instructor availability
    const availableDays = [
      { day: 1, start: '13:00', end: '17:00' }, // Monday
      { day: 3, start: '10:00', end: '14:00' }, // Wednesday
      { day: 6, start: '11:00', end: '16:00' }  // Saturday
    ];
    
    for (const day of availableDays) {
      await db.query(`
        INSERT INTO instructor_availability (
          day_of_week,
          available,
          start_time,
          end_time,
          created_at,
          updated_at
        ) VALUES (?, 1, ?, ?, datetime('now'), datetime('now'))
      `, [day.day, day.start, day.end]);
    }
    
    // Instructor unavailability
    const unavailableDates = [
      { 
        date: 'date("now", "+10 days")', 
        end_date: 'date("now", "+12 days")', 
        reason: 'Out of town workshop' 
      },
      { 
        date: 'date("now", "+35 days")', 
        end_date: null, 
        reason: 'Doctor appointment' 
      }
    ];
    
    for (const unavailable of unavailableDates) {
      await db.query(`
        INSERT INTO unavailable_dates (
          date,
          end_date,
          reason,
          created_at,
          updated_at
        ) VALUES (${unavailable.date}, ${unavailable.end_date || 'NULL'}, ?, datetime('now'), datetime('now'))
      `, [unavailable.reason]);
    }
    
    // Sample payments
    // Create membership payments
    for (const user of users) {
      await db.query(`
        INSERT INTO payments (
          user_id,
          amount,
          payment_date,
          payment_method,
          payment_reference,
          payment_type,
          related_id,
          created_at,
          updated_at
        ) VALUES (?, ?, date('now', '-10 days'), ?, ?, 'membership', ?, datetime('now'), datetime('now'))
      `, [
        user.user_id,
        Math.random() > 0.5 ? 129 : 99,
        Math.random() > 0.7 ? 'Credit Card' : 'Cash',
        `ref-${Math.floor(Math.random() * 10000)}`,
        user.user_id
      ]);
    }
    
    // Create workshop payments
    const workshopRegistrations = await db.query(`
      SELECT wr.registration_id, wr.user_id, wr.amount_paid
      FROM workshop_registrations wr
    `);
    
    for (const registration of workshopRegistrations) {
      await db.query(`
        INSERT INTO payments (
          user_id,
          amount,
          payment_date,
          payment_method,
          payment_reference,
          payment_type,
          related_id,
          created_at,
          updated_at
        ) VALUES (?, ?, date('now', '-' || ? || ' days'), 'Credit Card', ?, 'workshop', ?, datetime('now'), datetime('now'))
      `, [
        registration.user_id,
        registration.amount_paid,
        Math.floor(Math.random() * 14) + 1, // 1-14 days ago
        `ws-${Math.floor(Math.random() * 10000)}`,
        registration.registration_id
      ]);
    }
    
    // Create private session payments
    const sessions = await db.query(`
      SELECT session_id, user_id, price
      FROM private_sessions
      WHERE status = 'Completed'
    `);
    
    for (const session of sessions) {
      await db.query(`
        INSERT INTO payments (
          user_id,
          amount,
          payment_date,
          payment_method,
          payment_reference,
          payment_type,
          related_id,
          created_at,
          updated_at
        ) VALUES (?, ?, date('now', '-' || ? || ' days'), ?, ?, 'private_session', ?, datetime('now'), datetime('now'))
      `, [
        session.user_id,
        session.price,
        Math.floor(Math.random() * 5) + 1, // 1-5 days ago
        Math.random() > 0.5 ? 'Credit Card' : 'Cash',
        `ps-${Math.floor(Math.random() * 10000)}`,
        session.session_id
      ]);
    }
    
    // Create sample retreats
    const retreats = [
      {
        title: 'Mountain Serenity Retreat',
        subtitle: 'Yoga in the Mountains',
        description: 'Escape to the majestic Blue Ridge Mountains for 5 days of yoga, meditation, hiking, and self-discovery.',
        detailed_itinerary: 'Day 1: Arrival and welcome\nDay 2: Morning yoga, afternoon hike\nDay 3: Meditation workshop, yoga\nDay 4: Sunrise yoga, free time, evening ceremony\nDay 5: Closing practice, departure',
        accommodations: 'Luxury cabins with private bathroom, shared kitchen facilities.',
        included_items: 'All yoga sessions, guided meditation, 3 vegetarian meals per day, accommodation, hiking guides.',
        start_date: 'date("now", "+60 days")',
        end_date: 'date("now", "+65 days")',
        location: 'Blue Ridge Mountains',
        venue_name: 'Mountain View Lodge',
        price: 1200,
        member_price: 1080,
        early_bird_price: 999,
        early_bird_deadline: 'date("now", "+30 days")',
        deposit_amount: 300,
        capacity: 20,
        instructors: 'Gabi Jyoti',
        image_url: 'images/DSC02638.JPG',
        gallery_images: '["images/DSC02638.JPG", "images/DSC02646.JPG", "images/DSC02659.JPG"]',
        retreat_slug: 'mountain-serenity-retreat-2025',
        active: 1,
        featured: 1
      },
      {
        title: 'Coastal Bliss Retreat',
        subtitle: 'Beachside Yoga Experience',
        description: 'Immerse yourself in a week of beachside yoga, Caribbean sunshine, and Mayan cultural experiences.',
        detailed_itinerary: 'Day 1: Arrival and welcome ceremony\nDays 2-6: Daily yoga, meditation, cultural excursions\nDay 7: Final practice and departure',
        accommodations: 'Beachfront eco-cabanas with private bathroom, ocean views.',
        included_items: 'All yoga sessions, meditation workshops, 3 meals per day, accommodation, excursions, airport transfers.',
        start_date: 'date("now", "+90 days")',
        end_date: 'date("now", "+97 days")',
        location: 'Tulum, Mexico',
        venue_name: 'Beachside Yoga Resort',
        price: 1800,
        member_price: 1620,
        early_bird_price: 1550,
        early_bird_deadline: 'date("now", "+60 days")',
        deposit_amount: 500,
        capacity: 15,
        instructors: 'Gabi Jyoti',
        image_url: 'images/DSC02646.JPG',
        gallery_images: '["images/DSC02646.JPG", "images/DSC02638.JPG", "images/DSC02661~3.JPG"]',
        retreat_slug: 'coastal-bliss-retreat-2025',
        active: 1,
        featured: 1
      },
      {
        title: 'Desert Renewal Retreat',
        subtitle: 'Healing in the Heart of Sedona',
        description: 'Experience the magical healing energy of Sedona\'s red rocks with daily yoga, meditation, and vortex hikes.',
        detailed_itinerary: 'Day 1: Arrival and opening ceremony\nDay 2: Morning yoga, vortex hike\nDay 3: Sound healing and meditation\nDay 4: Desert yoga and stargazing\nDay 5: Closing ceremony and departure',
        accommodations: 'Private and shared rooms in a beautiful retreat center with stunning views.',
        included_items: 'All yoga sessions, guided hikes, meditation workshops, 3 vegetarian meals daily, accommodation.',
        start_date: 'date("now", "+120 days")',
        end_date: 'date("now", "+125 days")',
        location: 'Sedona, Arizona',
        venue_name: 'Red Rock Retreat Center',
        price: 1400,
        member_price: 1260,
        early_bird_price: 1199,
        early_bird_deadline: 'date("now", "+90 days")',
        deposit_amount: 350,
        capacity: 18,
        instructors: 'Gabi Jyoti',
        image_url: 'images/DSC02661~3.JPG',
        gallery_images: '["images/DSC02661~3.JPG", "images/DSC02638.JPG", "images/DSC02646.JPG"]',
        retreat_slug: 'desert-renewal-retreat-2025',
        active: 1,
        featured: 1
      }
    ];
    
    for (const retreat of retreats) {
      await db.query(`
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
        ) VALUES (?, ?, ?, ?, ?, ?, ${retreat.start_date}, ${retreat.end_date}, ?, ?, ?, ?, ?, ${retreat.early_bird_deadline}, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        retreat.title,
        retreat.subtitle,
        retreat.description,
        retreat.detailed_itinerary,
        retreat.accommodations,
        retreat.included_items,
        retreat.location,
        retreat.venue_name,
        retreat.price,
        retreat.member_price,
        retreat.early_bird_price,
        retreat.deposit_amount,
        retreat.capacity,
        retreat.instructors,
        retreat.image_url,
        retreat.gallery_images,
        retreat.retreat_slug,
        retreat.active ? 1 : 0,
        retreat.featured ? 1 : 0
      ]);
    }
    
    // Create data for admin user to display in customer dashboard view
    // Get admin user ID
    const adminResponse = await db.query(`SELECT user_id FROM users WHERE role = 'admin' LIMIT 1`);
    const adminId = adminResponse[0].user_id;
    
    // Create admin memberships
    await db.query(`
      INSERT INTO memberships (
        user_id,
        membership_type,
        start_date,
        end_date,
        classes_remaining,
        auto_renew,
        status,
        price,
        payment_method,
        created_at,
        updated_at
      ) VALUES (?, ?, date('now', '-30 days'), date('now', '+335 days'), NULL, 1, 'Active', 1200, 'Credit Card', datetime('now', '-30 days'), datetime('now'))
    `, [adminId, 'Annual Membership']);
    
    await db.query(`
      INSERT INTO memberships (
        user_id,
        membership_type,
        start_date,
        end_date,
        classes_remaining,
        auto_renew,
        status,
        price,
        payment_method,
        created_at,
        updated_at
      ) VALUES (?, ?, date('now', '-15 days'), NULL, 8, 0, 'Active', 150, 'Credit Card', datetime('now', '-15 days'), datetime('now'))
    `, [adminId, '10-Class Pack']);
    
    // Create admin bookings
    for (let i = 0; i < 5; i++) {
      // Get random future date within next 7 days
      const futureDay = Math.floor(Math.random() * 7) + 1;
      const date = new Date();
      date.setDate(date.getDate() + futureDay);
      const dateStr = date.toISOString().substring(0, 10); // YYYY-MM-DD
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Find a class for this day
      const matchingClasses = classes.filter(c => c.day_of_week === dayOfWeek);
      if (matchingClasses.length > 0) {
        const randomClass = matchingClasses[Math.floor(Math.random() * matchingClasses.length)];
        
        // Create booking
        await db.query(`
          INSERT INTO bookings (
            user_id,
            class_id,
            date,
            status,
            booking_date,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, 'Confirmed', datetime('now', '-1 day'), datetime('now', '-1 day'), datetime('now'))
        `, [adminId, randomClass.class_id, dateStr]);
      }
    }
    
    // Create admin private sessions
    const adminSessionFocuses = ['Flexibility Training', 'Meditation Techniques', 'Advanced Inversions'];
    
    for (let i = 0; i < 3; i++) {
      // Random future date
      const futureDay = Math.floor(Math.random() * 14) + 1;
      const date = new Date();
      date.setDate(date.getDate() + futureDay);
      const dateStr = date.toISOString().substring(0, 10); // YYYY-MM-DD
      
      // Random time
      const hour = 10 + i * 2; // 10:00, 12:00, 14:00
      const start_time = `${hour}:00`;
      
      // Create session
      await db.query(`
        INSERT INTO private_sessions (
          user_id,
          date,
          start_time,
          duration,
          focus,
          package_type,
          price,
          location,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 60, ?, '3-Session Package', 75, 'Main Studio', 'Confirmed', datetime('now', '-5 days'), datetime('now'))
      `, [adminId, dateStr, start_time, adminSessionFocuses[i]]);
    }
    
    // Register admin for a workshop
    const workshopForAdmin = await db.query(`SELECT workshop_id, member_price FROM workshops WHERE date > date('now') ORDER BY date ASC LIMIT 1`);
    if (workshopForAdmin.length > 0) {
      await db.query(`
        INSERT INTO workshop_registrations (
          user_id,
          workshop_id,
          registration_date,
          payment_status,
          payment_method,
          amount_paid,
          created_at,
          updated_at
        ) VALUES (?, ?, datetime('now', '-3 days'), 'Paid', 'Credit Card', ?, datetime('now', '-3 days'), datetime('now'))
      `, [adminId, workshopForAdmin[0].workshop_id, workshopForAdmin[0].member_price]);
      
      // Payment for the workshop
      await db.query(`
        INSERT INTO payments (
          user_id,
          amount,
          payment_date,
          payment_method,
          payment_reference,
          payment_type,
          related_id,
          created_at,
          updated_at
        ) VALUES (?, ?, date('now', '-3 days'), 'Credit Card', ?, 'workshop', ?, datetime('now', '-3 days'), datetime('now'))
      `, [adminId, workshopForAdmin[0].member_price, `ws-admin-${Date.now()}`, workshopForAdmin[0].workshop_id]);
    }
    
    // Add admin payments
    await db.query(`
      INSERT INTO payments (
        user_id,
        amount,
        payment_date,
        payment_method,
        payment_reference,
        payment_type,
        related_id,
        created_at,
        updated_at
      ) VALUES (?, 1200, date('now', '-30 days'), 'Credit Card', ?, 'membership', ?, datetime('now', '-30 days'), datetime('now'))
    `, [adminId, `mem-admin-annual-${Date.now()}`, adminId]);
    
    await db.query(`
      INSERT INTO payments (
        user_id,
        amount,
        payment_date,
        payment_method,
        payment_reference,
        payment_type,
        related_id,
        created_at,
        updated_at
      ) VALUES (?, 150, date('now', '-15 days'), 'Credit Card', ?, 'membership', ?, datetime('now', '-15 days'), datetime('now'))
    `, [adminId, `mem-admin-classpack-${Date.now()}`, adminId]);
    
    await db.query(`
      INSERT INTO payments (
        user_id,
        amount,
        payment_date,
        payment_method,
        payment_reference,
        payment_type,
        related_id,
        created_at,
        updated_at
      ) VALUES (?, 225, date('now', '-5 days'), 'Credit Card', ?, 'private_session', ?, datetime('now', '-5 days'), datetime('now'))
    `, [adminId, `ps-admin-package-${Date.now()}`, adminId]);

    // Create newsletter subscribers
    const subscriberEmails = [
      'yoga.fan@example.com',
      'mindful@example.com',
      'wellness.seeker@example.com',
      'zen.master@example.com',
      'breathe.deep@example.com',
      'namaste@example.com',
      'peace.love@example.com',
      'flow.state@example.com'
    ];
    
    for (const email of subscriberEmails) {
      await db.query(`
        INSERT INTO newsletter_subscribers (
          email,
          active,
          subscribe_date,
          created_at,
          updated_at
        ) VALUES (?, 1, date('now', '-' || ? || ' days'), datetime('now'), datetime('now'))
      `, [
        email,
        Math.floor(Math.random() * 60) + 1 // Subscribed 1-60 days ago
      ]);
    }
    
    // Gallery Images - Using BLOB storage
    // We'll implement a separate migration script for actual image data
    // Here we just create placeholder entries that will be populated by the migration script
    const galleryImagePaths = [
      { 
        title: 'Yoga Class', 
        description: 'Group class in session', 
        path: 'images/DSC02638.JPG', 
        alt_text: 'Students practicing yoga in a group class setting',
        display_order: 1,
        is_profile_photo: 0
      },
      { 
        title: 'Yoga Pose', 
        description: 'Demonstrating proper alignment', 
        path: 'images/DSC02646.JPG', 
        alt_text: 'Instructor demonstrating a yoga pose with proper alignment',
        display_order: 2,
        is_profile_photo: 0
      },
      { 
        title: 'Studio Space', 
        description: 'Our beautiful yoga studio', 
        path: 'images/DSC02659.JPG', 
        alt_text: 'Interior of the yoga studio with natural light',
        display_order: 3,
        is_profile_photo: 1  // This will be the profile photo
      },
      { 
        title: 'Group Practice', 
        description: 'Students practicing together', 
        path: 'images/IMG_5737.HEIC', 
        alt_text: 'Group of yoga students practicing together',
        display_order: 4,
        is_profile_photo: 0
      },
      { 
        title: 'Meditation Session', 
        description: 'Guided meditation class', 
        path: 'images/IMG_5740.HEIC', 
        alt_text: 'Students in meditation pose during a guided session',
        display_order: 5,
        is_profile_photo: 0
      },
      { 
        title: 'Yoga Retreat', 
        description: 'From our last mountain retreat', 
        path: 'images/IMG_5742.HEIC', 
        alt_text: 'Yoga practice during the mountain retreat',
        display_order: 6,
        is_profile_photo: 0
      }
    ];
    
    // Add empty entries for the gallery images
    // These will be populated with image data by the migration script
    for (const image of galleryImagePaths) {
      await db.query(`
        INSERT INTO gallery_images (
          title,
          description,
          alt_text,
          is_profile_photo,
          display_order,
          active,
          created_at,
          updated_at,
          mime_type,
          size
        ) VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'), 'image/jpeg', 0)
      `, [
        image.title,
        image.description,
        image.alt_text,
        image.is_profile_photo,
        image.display_order
      ]);
    }
    
    // Note: the actual image data will be populated by running the migrate-gallery.js script
    console.log('Gallery image entries created. Run migrate-gallery.js to import actual image data.');
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

/**
 * Reset and seed the database (development only)
 */
const resetAndSeedDatabase = async () => {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('This operation is only allowed in development environment');
  }
  
  try {
    await db.checkConnection();
    await resetDatabase();
    await createSchema();
    await seedDatabase();
    console.log('Database reset and seeded successfully');
  } catch (error) {
    console.error('Error resetting and seeding database:', error);
    throw error;
  } finally {
    await db.closeConnection();
  }
};

// If called directly, reset and seed the database
if (require.main === module) {
  process.env.NODE_ENV = 'development';
  
  console.log('Starting database reset and seed...');
  resetAndSeedDatabase()
    .then(() => {
      console.log('Database reset and seed completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error during database reset and seed:', err);
      process.exit(1);
    });
} else {
  // Export functions for use in other modules
  module.exports = {
    seedDatabase,
    resetAndSeedDatabase
  };
}
