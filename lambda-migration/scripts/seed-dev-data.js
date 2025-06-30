#!/usr/bin/env node

/**
 * Seed Development Data Script
 * Populates DynamoDB tables with dummy data for testing
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configuration
const REGION = 'us-east-1';
const STAGE = 'dev';

// Initialize AWS
AWS.config.update({ 
  region: REGION,
  credentials: new AWS.SharedIniFileCredentials({profile: 'gabi'})
});
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Table names (these should match your CDK stack outputs)
const TABLES = {
  BLOG_POSTS: `GabiYoga-${STAGE}-BlogPosts`,
  GALLERY: `GabiYoga-${STAGE}-Gallery`,
  CLASSES: `GabiYoga-${STAGE}-Classes`,
  USERS: `GabiYoga-${STAGE}-Users`,
  BOOKINGS: `GabiYoga-${STAGE}-Bookings`
};

console.log('🌱 Seeding Development Data');
console.log('='.repeat(40));
console.log(`Stage: ${STAGE}`);
console.log(`Region: ${REGION}`);
console.log('Tables:', TABLES);
console.log('');

/**
 * Helper function to put items with retry
 */
async function putItem(tableName, item) {
  try {
    await dynamoDb.put({
      TableName: tableName,
      Item: item
    }).promise();
    return true;
  } catch (error) {
    console.error(`Error putting item to ${tableName}:`, error.message);
    return false;
  }
}

/**
 * Helper function to batch write items
 */
async function batchWriteItems(tableName, items) {
  const batchSize = 25; // DynamoDB batch write limit
  const batches = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  let successCount = 0;
  let errorCount = 0;

  for (const batch of batches) {
    try {
      const putRequests = batch.map(item => ({
        PutRequest: { Item: item }
      }));

      await dynamoDb.batchWrite({
        RequestItems: {
          [tableName]: putRequests
        }
      }).promise();

      successCount += batch.length;
      console.log(`   ✅ Batch written: ${batch.length} items`);
    } catch (error) {
      errorCount += batch.length;
      console.error(`   ❌ Batch failed: ${error.message}`);
    }
  }

  return { successCount, errorCount };
}

/**
 * Seed blog posts
 */
async function seedBlogPosts() {
  console.log('📝 Seeding Blog Posts...');
  
  const blogPosts = [
    {
      id: uuidv4(),
      title: 'Welcome to Your Yoga Journey',
      slug: 'welcome-to-your-yoga-journey',
      content: `
        <h2>Finding Your Path to Inner Peace</h2>
        <p>Welcome to our yoga community! Whether you're a complete beginner or an experienced practitioner, yoga offers something beautiful for everyone. In this post, we'll explore the fundamentals of starting your yoga practice and what you can expect on this transformative journey.</p>
        
        <h3>What is Yoga?</h3>
        <p>Yoga is much more than physical exercise. It's a holistic practice that unites the mind, body, and spirit. The word "yoga" comes from the Sanskrit root "yuj," meaning to unite or join. Through breath, movement, and meditation, we cultivate awareness and find balance in our daily lives.</p>
        
        <h3>Benefits of Regular Practice</h3>
        <ul>
          <li>Improved flexibility and strength</li>
          <li>Better stress management</li>
          <li>Enhanced mental clarity</li>
          <li>Deeper sleep quality</li>
          <li>Greater emotional balance</li>
        </ul>
        
        <p>Remember, yoga is a personal journey. Be patient with yourself and celebrate small victories along the way.</p>
      `,
      excerpt: 'Discover the transformative power of yoga and begin your journey to inner peace, strength, and mindfulness.',
      category: 'Getting Started',
      tags: ['beginner', 'introduction', 'mindfulness', 'wellness'],
      status: 'published',
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      author: {
        id: 'gabi-admin',
        firstName: 'Gabi',
        lastName: 'Yoga'
      },
      coverImage: '/images/blog/welcome-yoga-journey.jpg'
    },
    {
      id: uuidv4(),
      title: 'The Art of Mindful Breathing',
      slug: 'art-of-mindful-breathing',
      content: `
        <h2>Pranayama: The Foundation of Yoga</h2>
        <p>Breath is life. In yoga, we call the practice of conscious breathing "pranayama." This ancient technique is one of the most powerful tools we have for managing stress, increasing energy, and connecting with our inner wisdom.</p>
        
        <h3>Simple Breathing Techniques to Try</h3>
        <h4>1. Three-Part Breath (Dirga Pranayama)</h4>
        <p>This fundamental breathing technique helps calm the nervous system and increase lung capacity.</p>
        
        <h4>2. Alternate Nostril Breathing (Nadi Shodhana)</h4>
        <p>A balancing breath that harmonizes the left and right hemispheres of the brain.</p>
        
        <h4>3. Cooling Breath (Sheetali)</h4>
        <p>Perfect for hot days or when you need to cool down both physically and mentally.</p>
        
        <p>Start with just 5 minutes a day and gradually increase as you become more comfortable with these practices.</p>
      `,
      excerpt: 'Learn powerful breathing techniques that can transform your yoga practice and daily life.',
      category: 'Pranayama',
      tags: ['breathing', 'pranayama', 'meditation', 'technique'],
      status: 'published',
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      author: {
        id: 'gabi-admin',
        firstName: 'Gabi',
        lastName: 'Yoga'
      },
      coverImage: '/images/blog/mindful-breathing.jpg'
    },
    {
      id: uuidv4(),
      title: 'Building Strength Through Yoga',
      slug: 'building-strength-through-yoga',
      content: `
        <h2>Yoga: More Than Just Flexibility</h2>
        <p>Many people think yoga is only about flexibility, but it's also an incredible way to build functional strength. Unlike traditional weight training, yoga builds strength while improving flexibility, balance, and coordination simultaneously.</p>
        
        <h3>Key Strength-Building Poses</h3>
        <ul>
          <li><strong>Plank Pose:</strong> Core and upper body strength</li>
          <li><strong>Warrior III:</strong> Balance and leg strength</li>
          <li><strong>Chair Pose:</strong> Lower body power</li>
          <li><strong>Crow Pose:</strong> Arm and core integration</li>
          <li><strong>Boat Pose:</strong> Deep core activation</li>
        </ul>
        
        <h3>Progressive Practice</h3>
        <p>The beauty of yoga strength training is its progressive nature. As you practice regularly, you'll notice increased stability, better posture, and a strong, resilient body that serves you in all activities.</p>
      `,
      excerpt: 'Discover how yoga builds functional strength while improving flexibility and balance.',
      category: 'Strength',
      tags: ['strength', 'poses', 'fitness', 'practice'],
      status: 'published',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      author: {
        id: 'gabi-admin',
        firstName: 'Gabi',
        lastName: 'Yoga'
      },
      coverImage: '/images/blog/yoga-strength.jpg'
    },
    {
      id: uuidv4(),
      title: 'Creating Your Home Practice Space',
      slug: 'creating-home-practice-space',
      content: `
        <h2>Your Sacred Space at Home</h2>
        <p>Creating a dedicated space for your yoga practice at home can significantly enhance your commitment to regular practice. You don't need a large room or expensive equipment—just a quiet corner where you can roll out your mat and connect with yourself.</p>
        
        <h3>Essential Elements</h3>
        <ul>
          <li><strong>Clean, Quiet Space:</strong> Even a corner of a room works perfectly</li>
          <li><strong>Good Ventilation:</strong> Fresh air helps with energy and focus</li>
          <li><strong>Minimal Distractions:</strong> Turn off devices and create boundaries</li>
          <li><strong>Natural Light:</strong> Practice near a window when possible</li>
        </ul>
        
        <h3>Basic Equipment</h3>
        <p>All you really need is a yoga mat, but these extras can enhance your practice:</p>
        <ul>
          <li>Yoga blocks for support and alignment</li>
          <li>A blanket for warmth during relaxation</li>
          <li>A bolster or pillow for restorative poses</li>
          <li>A strap for deeper stretches</li>
        </ul>
        
        <p>Remember: the most important element is your commitment to show up regularly, even if just for 10 minutes.</p>
      `,
      excerpt: 'Transform any space in your home into a peaceful sanctuary for your yoga practice.',
      category: 'Home Practice',
      tags: ['home-practice', 'space', 'equipment', 'setup'],
      status: 'published',
      publishedAt: new Date().toISOString(), // Today
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'gabi-admin',
        firstName: 'Gabi',
        lastName: 'Yoga'
      },
      coverImage: '/images/blog/home-practice-space.jpg'
    }
  ];

  const result = await batchWriteItems(TABLES.BLOG_POSTS, blogPosts);
  console.log(`   📊 Blog Posts: ${result.successCount} success, ${result.errorCount} errors\n`);
}

/**
 * Seed gallery images
 */
async function seedGallery() {
  console.log('🖼️  Seeding Gallery Images...');
  
  const galleryImages = [
    {
      id: uuidv4(),
      title: 'Sunrise Yoga Session',
      description: 'Beautiful sunrise yoga practice by the lake',
      imageUrl: '/images/gallery/sunrise-yoga.jpg',
      thumbnailUrl: '/images/gallery/thumbs/sunrise-yoga-thumb.jpg',
      altText: 'Peaceful sunrise yoga session by the lake',
      category: 'class',
      tags: ['sunrise', 'outdoor', 'peaceful', 'nature'],
      featured: true,
      displayOrder: 1,
      dimensions: { width: 1200, height: 800 },
      fileSize: 245000,
      status: 'active',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: uuidv4(),
      title: 'Vinyasa Flow Class',
      description: 'Dynamic vinyasa flow session in the main studio',
      imageUrl: '/images/gallery/vinyasa-flow.jpg',
      thumbnailUrl: '/images/gallery/thumbs/vinyasa-flow-thumb.jpg',
      altText: 'Students in vinyasa flow pose',
      category: 'class',
      tags: ['vinyasa', 'flow', 'dynamic', 'studio'],
      featured: true,
      displayOrder: 2,
      dimensions: { width: 1200, height: 800 },
      fileSize: 198000,
      status: 'active',
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: uuidv4(),
      title: 'Meditation Corner',
      description: 'Peaceful meditation space with crystals and candles',
      imageUrl: '/images/gallery/meditation-corner.jpg',
      thumbnailUrl: '/images/gallery/thumbs/meditation-corner-thumb.jpg',
      altText: 'Serene meditation corner with crystals',
      category: 'studio',
      tags: ['meditation', 'peaceful', 'crystals', 'candles'],
      featured: false,
      displayOrder: 3,
      dimensions: { width: 800, height: 600 },
      fileSize: 156000,
      status: 'active',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: uuidv4(),
      title: 'Retreat Group Photo',
      description: 'Happy participants at our weekend retreat',
      imageUrl: '/images/gallery/retreat-group.jpg',
      thumbnailUrl: '/images/gallery/thumbs/retreat-group-thumb.jpg',
      altText: 'Group of yoga retreat participants smiling',
      category: 'retreat',
      tags: ['retreat', 'group', 'community', 'happy'],
      featured: true,
      displayOrder: 4,
      dimensions: { width: 1400, height: 900 },
      fileSize: 312000,
      status: 'active',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: uuidv4(),
      title: 'Yin Yoga Props',
      description: 'Bolsters, blocks, and blankets ready for yin practice',
      imageUrl: '/images/gallery/yin-props.jpg',
      thumbnailUrl: '/images/gallery/thumbs/yin-props-thumb.jpg',
      altText: 'Yoga props arranged for yin yoga practice',
      category: 'studio',
      tags: ['yin', 'props', 'bolsters', 'blocks'],
      featured: false,
      displayOrder: 5,
      dimensions: { width: 1000, height: 750 },
      fileSize: 178000,
      status: 'active',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: uuidv4(),
      title: 'Workshop Demonstration',
      description: 'Advanced pose demonstration during workshop',
      imageUrl: '/images/gallery/workshop-demo.jpg',
      thumbnailUrl: '/images/gallery/thumbs/workshop-demo-thumb.jpg',
      altText: 'Instructor demonstrating advanced yoga pose',
      category: 'workshop',
      tags: ['workshop', 'demonstration', 'advanced', 'teaching'],
      featured: false,
      displayOrder: 6,
      dimensions: { width: 1200, height: 800 },
      fileSize: 223000,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const result = await batchWriteItems(TABLES.GALLERY, galleryImages);
  console.log(`   📊 Gallery Images: ${result.successCount} success, ${result.errorCount} errors\n`);
}

/**
 * Seed yoga classes
 */
async function seedClasses() {
  console.log('🧘 Seeding Yoga Classes...');
  
  const today = new Date();
  const classes = [];

  // Generate classes for the next 14 days
  for (let i = 0; i < 14; i++) {
    const classDate = new Date(today);
    classDate.setDate(today.getDate() + i);
    const dateString = classDate.toISOString().split('T')[0];

    // Morning class
    classes.push({
      id: uuidv4(),
      title: 'Morning Vinyasa Flow',
      description: 'Start your day with an energizing vinyasa flow sequence. Perfect for all levels.',
      instructor: 'Gabi',
      category: 'vinyasa',
      level: 'all-levels',
      duration: 60,
      price: 25,
      scheduleDate: dateString,
      startTime: '08:00',
      endTime: '09:00',
      location: 'Main Studio',
      maxParticipants: 20,
      requirements: ['Yoga mat', 'Water bottle'],
      whatToBring: ['Comfortable clothing', 'Towel if desired'],
      cancellationPolicy: 'Cancel up to 2 hours before class for full refund',
      status: 'active',
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
    });

    // Evening class (alternating types)
    const eveningClasses = [
      {
        title: 'Restorative Yoga',
        description: 'Gentle, relaxing practice using props to support deep relaxation.',
        category: 'restorative',
        level: 'beginner',
        duration: 75,
        price: 30,
        startTime: '18:30',
        endTime: '19:45'
      },
      {
        title: 'Yin Yoga',
        description: 'Passive poses held for 3-5 minutes to target deep connective tissues.',
        category: 'yin',
        level: 'all-levels',
        duration: 60,
        price: 25,
        startTime: '19:00',
        endTime: '20:00'
      },
      {
        title: 'Hatha Yoga',
        description: 'Gentle, slower-paced practice focusing on basic postures and breathing.',
        category: 'hatha',
        level: 'beginner',
        duration: 60,
        price: 25,
        startTime: '18:00',
        endTime: '19:00'
      }
    ];

    const eveningClass = eveningClasses[i % eveningClasses.length];
    classes.push({
      id: uuidv4(),
      ...eveningClass,
      instructor: 'Gabi',
      scheduleDate: dateString,
      location: 'Main Studio',
      maxParticipants: 15,
      requirements: ['Yoga mat'],
      whatToBring: ['Comfortable clothing', 'Blanket for final relaxation'],
      cancellationPolicy: 'Cancel up to 2 hours before class for full refund',
      status: 'active',
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
    });

    // Weekend special classes
    if (classDate.getDay() === 6) { // Saturday
      classes.push({
        id: uuidv4(),
        title: 'Saturday Morning Workshop',
        description: 'Deep dive into advanced poses and alignment principles. 2-hour intensive workshop.',
        instructor: 'Gabi',
        category: 'workshop',
        level: 'intermediate',
        duration: 120,
        price: 50,
        scheduleDate: dateString,
        startTime: '10:00',
        endTime: '12:00',
        location: 'Main Studio',
        maxParticipants: 12,
        requirements: ['Yoga mat', 'Yoga blocks', 'Yoga strap'],
        whatToBring: ['Journal and pen', 'Water bottle', 'Light snack'],
        cancellationPolicy: 'Cancel up to 24 hours before workshop for full refund',
        status: 'active',
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  }

  const result = await batchWriteItems(TABLES.CLASSES, classes);
  console.log(`   📊 Classes: ${result.successCount} success, ${result.errorCount} errors\n`);
}

/**
 * Main seeding function
 */
async function seedData() {
  try {
    console.log('🚀 Starting data seeding process...\n');

    await seedBlogPosts();
    await seedGallery();
    await seedClasses();

    console.log('✅ Data seeding completed successfully!');
    console.log('');
    console.log('🔗 Test your APIs:');
    console.log('   Blog: https://j5enu5t3ik.execute-api.us-east-1.amazonaws.com/dev/blog');
    console.log('   Gallery: https://j5enu5t3ik.execute-api.us-east-1.amazonaws.com/dev/gallery');
    console.log('   Classes: https://j5enu5t3ik.execute-api.us-east-1.amazonaws.com/dev/classes');
    console.log('');

  } catch (error) {
    console.error('💥 Data seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = { seedData };
