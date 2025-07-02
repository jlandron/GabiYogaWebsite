#!/usr/bin/env node

/**
 * Seed Development Data Script
 * Populates DynamoDB with test data for blog posts and settings
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS
AWS.config.update({
  region: 'us-east-1',
  credentials: new AWS.SharedIniFileCredentials({ profile: 'gabi' })
});

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Configuration
const STAGE = 'dev';
const TABLE_PREFIX = 'GabiYoga';

// Table names
const BLOG_POSTS_TABLE = `${TABLE_PREFIX}-${STAGE}-BlogPosts`;
const SETTINGS_TABLE = `${TABLE_PREFIX}-${STAGE}-Settings`;
const USERS_TABLE = `${TABLE_PREFIX}-${STAGE}-Users`;

console.log('🌱 Seeding Development Data');
console.log('=' .repeat(50));
console.log(`Blog Posts Table: ${BLOG_POSTS_TABLE}`);
console.log(`Settings Table: ${SETTINGS_TABLE}`);
console.log(`Users Table: ${USERS_TABLE}`);
console.log('');

// Generate hashed passwords
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

const passwords = {
  admin: bcrypt.hashSync('admin123', SALT_ROUNDS),
  student: bcrypt.hashSync('student123', SALT_ROUNDS),
  member: bcrypt.hashSync('member123', SALT_ROUNDS)
};

/**
 * Sample users data
 */
const users = [
  {
    id: uuidv4(),
    email: 'admin@gabi.yoga',
    firstName: 'Gabi',
    lastName: 'Admin',
    role: 'admin',
    hashedPassword: passwords.admin,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    lastLogin: '2025-06-30T15:30:00Z',
    status: 'active',
    preferences: {
      notifications: {
        email: true,
        sms: false
      },
      theme: 'light'
    },
    bookingHistory: [
      {
        classId: 'class123',
        className: 'Vinyasa Flow',
        date: '2025-06-28',
        time: '09:00',
        status: 'completed'
      },
      {
        classId: 'class456',
        className: 'Yin Yoga',
        date: '2025-06-30',
        time: '17:00',
        status: 'upcoming'
      }
    ]
  },
  {
    id: uuidv4(),
    email: 'student@example.com',
    firstName: 'Sarah',
    lastName: 'Student',
    role: 'user',
    hashedPassword: passwords.student,
    createdAt: '2025-06-15T00:00:00Z',
    updatedAt: '2025-06-15T00:00:00Z',
    lastLogin: '2025-06-29T10:15:00Z',
    status: 'active',
    preferences: {
      notifications: {
        email: true,
        sms: true
      },
      theme: 'dark'
    },
    bookingHistory: [
      {
        classId: 'class789',
        className: 'Beginner Yoga',
        date: '2025-06-25',
        time: '18:00',
        status: 'completed'
      },
      {
        classId: 'class101',
        className: 'Meditation',
        date: '2025-07-02',
        time: '08:00',
        status: 'upcoming'
      }
    ]
  },
  {
    id: uuidv4(),
    email: 'member@example.com',
    firstName: 'Mike',
    lastName: 'Member',
    role: 'user',
    hashedPassword: passwords.member,
    createdAt: '2025-06-20T00:00:00Z',
    updatedAt: '2025-06-20T00:00:00Z',
    lastLogin: '2025-06-30T09:45:00Z',
    status: 'active',
    preferences: {
      notifications: {
        email: true,
        sms: false
      },
      theme: 'light'
    },
    bookingHistory: [
      {
        classId: 'class202',
        className: 'Power Yoga',
        date: '2025-06-29',
        time: '07:00',
        status: 'completed'
      },
      {
        classId: 'class303',
        className: 'Restorative Yoga',
        date: '2025-07-01',
        time: '19:00',
        status: 'upcoming'
      }
    ]
  }
];

/**
 * Sample blog posts data
 */
const blogPosts = [
  {
    id: uuidv4(),
    title: 'Welcome to Your Journey: Finding Peace Through Yoga',
    slug: 'welcome-to-your-journey-finding-peace-through-yoga',
    content: `
      <h2>Welcome to Our Yoga Community</h2>
      <p>I'm thrilled to welcome you to our yoga community! Whether you're a complete beginner or have been practicing for years, this space is designed to support your journey toward inner peace, physical wellness, and spiritual growth.</p>
      
      <h3>What Makes Our Practice Special</h3>
      <p>Our approach to yoga combines traditional asanas with modern mindfulness techniques. We believe that yoga is not just about physical postures—it's about creating a deeper connection with yourself and finding balance in your daily life.</p>
      
      <h3>What to Expect</h3>
      <ul>
        <li><strong>Beginner-Friendly Classes:</strong> We start with the basics and build up gradually</li>
        <li><strong>Personalized Attention:</strong> Small class sizes ensure individual guidance</li>
        <li><strong>Holistic Approach:</strong> We integrate breathwork, meditation, and mindfulness</li>
        <li><strong>Community Support:</strong> Connect with like-minded individuals on their wellness journey</li>
      </ul>
      
      <h3>Your First Class</h3>
      <p>Nervous about your first class? That's completely normal! Here are a few tips to help you feel prepared:</p>
      <ul>
        <li>Arrive 10-15 minutes early to get settled</li>
        <li>Bring a water bottle and towel</li>
        <li>Wear comfortable, stretchy clothing</li>
        <li>Don't eat a heavy meal 2 hours before class</li>
        <li>Most importantly, listen to your body and go at your own pace</li>
      </ul>
      
      <p>Remember, yoga is a practice, not a performance. Every day is different, and that's perfectly okay. I'm here to guide and support you every step of the way.</p>
      
      <p>Namaste,<br>Gabi</p>
    `,
    excerpt: 'Welcome to our yoga community! Whether you\'re a beginner or experienced practitioner, discover what makes our practice special and what to expect in your first class.',
    coverImage: '/images/blog/welcome-yoga-journey.jpg',
    category: 'Beginner',
    tags: ['welcome', 'beginner', 'yoga basics', 'community'],
    status: 'published',
    publishedAt: '2025-06-25T10:00:00Z',
    createdAt: '2025-06-25T09:30:00Z',
    updatedAt: '2025-06-25T10:00:00Z',
    author: {
      id: 'gabi-yoga-admin',
      firstName: 'Gabi',
      lastName: 'Yoga'
    }
  },
  {
    id: uuidv4(),
    title: 'The Art of Breathing: Pranayama for Beginners',
    slug: 'the-art-of-breathing-pranayama-for-beginners',
    content: `
      <h2>Discovering the Power of Conscious Breathing</h2>
      <p>In our fast-paced world, we often forget one of the most fundamental aspects of life: our breath. Pranayama, the ancient practice of breath control, offers us a powerful tool for managing stress, improving focus, and deepening our yoga practice.</p>
      
      <h3>What is Pranayama?</h3>
      <p>Pranayama comes from two Sanskrit words: "prana" (life force energy) and "yama" (restraint or control). It's the practice of conscious breathing that helps us harness and direct our vital energy.</p>
      
      <h3>Simple Techniques to Get Started</h3>
      
      <h4>1. Three-Part Breath (Dirga Pranayama)</h4>
      <p>This foundational technique helps you become aware of your breath and creates a sense of calm.</p>
      <ul>
        <li>Lie down comfortably or sit with a straight spine</li>
        <li>Place one hand on your chest, one on your belly</li>
        <li>Breathe into your belly, then ribcage, then chest</li>
        <li>Exhale slowly, reversing the order</li>
        <li>Practice for 5-10 minutes daily</li>
      </ul>
      
      <h4>2. Ocean Breath (Ujjayi Pranayama)</h4>
      <p>This technique creates a soothing sound that helps maintain focus during practice.</p>
      <ul>
        <li>Breathe in and out through your nose</li>
        <li>Slightly constrict your throat</li>
        <li>Create a gentle "ocean" sound</li>
        <li>Maintain steady, even breaths</li>
      </ul>
      
      <h3>Benefits of Regular Practice</h3>
      <ul>
        <li>Reduces stress and anxiety</li>
        <li>Improves concentration and mental clarity</li>
        <li>Enhances sleep quality</li>
        <li>Boosts immune system</li>
        <li>Increases energy levels</li>
      </ul>
      
      <h3>Starting Your Practice</h3>
      <p>Begin with just 5 minutes a day. The key is consistency rather than duration. As you become more comfortable, you can gradually increase the time.</p>
      
      <p>Remember, the breath is always with you. Whenever you feel stressed or overwhelmed, return to your breath. It's your anchor in the storm.</p>
    `,
    excerpt: 'Discover the ancient art of pranayama and learn simple breathing techniques that can transform your yoga practice and daily life.',
    coverImage: '/images/blog/pranayama-breathing.jpg',
    category: 'Breathwork',
    tags: ['pranayama', 'breathing', 'meditation', 'wellness'],
    status: 'published',
    publishedAt: '2025-06-22T14:30:00Z',
    createdAt: '2025-06-22T14:00:00Z',
    updatedAt: '2025-06-22T14:30:00Z',
    author: {
      id: 'gabi-yoga-admin',
      firstName: 'Gabi',
      lastName: 'Yoga'
    }
  },
  {
    id: uuidv4(),
    title: 'Creating Your Home Practice: Essential Tips and Setup',
    slug: 'creating-your-home-practice-essential-tips-and-setup',
    content: `
      <h2>Building a Sustainable Home Yoga Practice</h2>
      <p>While attending classes is wonderful, developing a personal home practice is where the real transformation happens. Here's how to create a sacred space and establish a routine that works for you.</p>
      
      <h3>Setting Up Your Space</h3>
      <p>You don't need a large room or expensive equipment. A small, quiet corner can become your sanctuary.</p>
      
      <h4>Essential Equipment:</h4>
      <ul>
        <li><strong>Yoga Mat:</strong> Invest in a good quality, non-slip mat</li>
        <li><strong>Blocks:</strong> Great for modifications and support</li>
        <li><strong>Strap:</strong> Helps with flexibility and binding poses</li>
        <li><strong>Blanket:</strong> For warmth during relaxation</li>
        <li><strong>Bolster or Pillow:</strong> For restorative poses</li>
      </ul>
      
      <h3>Creating the Right Atmosphere</h3>
      <ul>
        <li>Choose a quiet, clean space</li>
        <li>Ensure good ventilation</li>
        <li>Remove distractions (phones, TV)</li>
        <li>Add elements that inspire you: candles, plants, or meaningful objects</li>
        <li>Consider soft lighting</li>
      </ul>
      
      <h3>Establishing Your Routine</h3>
      
      <h4>Start Small and Build:</h4>
      <ul>
        <li>Begin with 10-15 minutes daily</li>
        <li>Choose the same time each day</li>
        <li>Start with simple sequences</li>
        <li>Focus on consistency over perfection</li>
      </ul>
      
      <h4>Sample 15-Minute Morning Routine:</h4>
      <ol>
        <li>Child's Pose (2 minutes)</li>
        <li>Cat-Cow Stretches (2 minutes)</li>
        <li>Sun Salutation A (5 minutes)</li>
        <li>Standing Forward Fold (2 minutes)</li>
        <li>Seated Meditation (4 minutes)</li>
      </ol>
      
      <h3>Staying Motivated</h3>
      <ul>
        <li>Set realistic goals</li>
        <li>Track your practice with a journal</li>
        <li>Be patient with yourself</li>
        <li>Celebrate small wins</li>
        <li>Join online communities for support</li>
      </ul>
      
      <h3>Common Challenges and Solutions</h3>
      
      <h4>Challenge: "I don't have time"</h4>
      <p><strong>Solution:</strong> Even 5 minutes counts. Practice morning sun salutations or evening stretches.</p>
      
      <h4>Challenge: "I get distracted"</h4>
      <p><strong>Solution:</strong> Turn off devices, use calming music, and commit to your practice time as sacred.</p>
      
      <h4>Challenge: "I don't know what to do"</h4>
      <p><strong>Solution:</strong> Start with simple sequences, use online resources, or follow along with videos.</p>
      
      <p>Remember, your home practice is your personal journey. There's no right or wrong way—only what works for you. Trust yourself and enjoy the process.</p>
    `,
    excerpt: 'Learn how to create a dedicated yoga space at home and establish a sustainable daily practice that fits your lifestyle.',
    coverImage: '/images/blog/home-yoga-practice.jpg',
    category: 'Practice Tips',
    tags: ['home practice', 'yoga setup', 'routine', 'lifestyle'],
    status: 'published',
    publishedAt: '2025-06-20T16:15:00Z',
    createdAt: '2025-06-20T15:45:00Z',
    updatedAt: '2025-06-20T16:15:00Z',
    author: {
      id: 'gabi-yoga-admin',
      firstName: 'Gabi',
      lastName: 'Yoga'
    }
  },
  {
    id: uuidv4(),
    title: 'Mindful Movement: Connecting Body and Mind Through Yoga',
    slug: 'mindful-movement-connecting-body-and-mind-through-yoga',
    content: `
      <h2>The Dance Between Body and Mind</h2>
      <p>True yoga practice goes beyond physical postures. It's about creating a mindful connection between your body, breath, and awareness. This integration is what transforms simple stretching into a profound spiritual practice.</p>
      
      <h3>What is Mindful Movement?</h3>
      <p>Mindful movement is the practice of being fully present in your body as you move. It involves:</p>
      <ul>
        <li>Paying attention to physical sensations</li>
        <li>Coordinating movement with breath</li>
        <li>Observing thoughts without judgment</li>
        <li>Staying present in the moment</li>
      </ul>
      
      <h3>The Science Behind It</h3>
      <p>Research shows that mindful movement practices like yoga can:</p>
      <ul>
        <li>Reduce cortisol levels (stress hormone)</li>
        <li>Increase GABA production (calming neurotransmitter)</li>
        <li>Improve proprioception (body awareness)</li>
        <li>Enhance neuroplasticity (brain's ability to change)</li>
        <li>Strengthen the mind-body connection</li>
      </ul>
      
      <h3>Practical Techniques</h3>
      
      <h4>Body Scanning</h4>
      <p>Before and during practice, take time to scan your body:</p>
      <ul>
        <li>Start from the top of your head</li>
        <li>Notice any tension, pain, or sensations</li>
        <li>Breathe into areas of tightness</li>
        <li>Avoid judging what you find</li>
      </ul>
      
      <h4>Breath Awareness</h4>
      <p>Use your breath as an anchor:</p>
      <ul>
        <li>Match movement to breath rhythm</li>
        <li>Inhale to expand or lift</li>
        <li>Exhale to fold or release</li>
        <li>Pause when breath becomes forced</li>
      </ul>
      
      <h4>Intention Setting</h4>
      <p>Begin each practice by setting an intention:</p>
      <ul>
        <li>What do you want to cultivate?</li>
        <li>How do you want to feel?</li>
        <li>What do you need today?</li>
        <li>Return to this intention throughout practice</li>
      </ul>
      
      <h3>Common Obstacles</h3>
      
      <h4>Mental Chatter</h4>
      <p>When your mind wanders (and it will!), gently return attention to your breath or body sensations. This is the practice, not a failure.</p>
      
      <h4>Physical Discomfort</h4>
      <p>Learn to distinguish between beneficial challenge and harmful pain. Always honor your body's signals.</p>
      
      <h4>Expectation</h4>
      <p>Let go of how you think practice "should" look. Each day brings different energy and needs.</p>
      
      <h3>Integrating Mindfulness Off the Mat</h3>
      <p>The real magic happens when you bring this awareness into daily life:</p>
      <ul>
        <li>Notice how you sit, walk, and move throughout the day</li>
        <li>Take conscious breaths during stressful moments</li>
        <li>Practice body scanning while waiting in line</li>
        <li>Eat mindfully, tasting each bite</li>
      </ul>
      
      <p>Remember, mindful movement is a practice, not a destination. Be patient with yourself as you develop this beautiful connection between body and mind.</p>
    `,
    excerpt: 'Explore the deeper aspects of yoga by learning to connect body and mind through mindful movement practices.',
    coverImage: '/images/blog/mindful-movement.jpg',
    category: 'Mindfulness',
    tags: ['mindfulness', 'body awareness', 'meditation', 'mind-body connection'],
    status: 'published',
    publishedAt: '2025-06-18T11:20:00Z',
    createdAt: '2025-06-18T10:50:00Z',
    updatedAt: '2025-06-18T11:20:00Z',
    author: {
      id: 'gabi-yoga-admin',
      firstName: 'Gabi',
      lastName: 'Yoga'
    }
  }
];

/**
 * Sample settings data
 */
const settings = [
  {
    id: 'about_biography',
    
    value: `Welcome to my yoga journey! I'm Gabi, a certified yoga instructor passionate about helping others discover the transformative power of mindful movement.

My journey with yoga began over a decade ago during a challenging period in my life. What started as a search for physical fitness became a profound path of self-discovery and healing. Through consistent practice, I found not just physical strength and flexibility, but also mental clarity, emotional balance, and a deeper connection to my authentic self.

Today, I'm dedicated to creating a welcoming space where students of all levels can explore yoga safely and joyfully. My teaching philosophy centers on the belief that yoga is for every body – regardless of age, experience, or physical ability. I encourage students to listen to their bodies, honor their limitations, and celebrate their unique journey.

Whether you're looking to improve flexibility, build strength, reduce stress, or deepen your spiritual practice, I'm here to guide and support you every step of the way. Together, we'll explore the beautiful union of breath, movement, and mindfulness that makes yoga such a powerful tool for transformation.`,
    description: 'Biography content for the About Me section',
    category: 'content',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'about_certifications',
    
    value: JSON.stringify([
      {
        title: 'RYT 500 - Registered Yoga Teacher',
        organization: 'Yoga Alliance',
        year: '2022',
        description: '500-hour comprehensive yoga teacher training covering anatomy, philosophy, and teaching methodology'
      },
      {
        title: 'Trauma-Informed Yoga Certification',
        organization: 'Center for Trauma & Embodiment',
        year: '2023',
        description: 'Specialized training in creating safe, supportive yoga environments for trauma survivors'
      },
      {
        title: 'Prenatal Yoga Certification',
        organization: 'Prenatal Yoga Center',
        year: '2023',
        description: 'Specialized training in yoga practices for expecting mothers'
      },
      {
        title: 'Yin Yoga Teacher Training',
        organization: 'Yin Yoga Institute',
        year: '2021',
        description: '50-hour intensive training in the practice and teaching of Yin Yoga'
      },
      {
        title: 'Mindfulness-Based Stress Reduction (MBSR)',
        organization: 'University of Massachusetts Medical School',
        year: '2020',
        description: '8-week program in mindfulness meditation and stress reduction techniques'
      }
    ]),
    description: 'Certifications and training for the About Me section',
    category: 'content',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'about_profile_image',
    
    value: '/images/profile/gabi-yoga-profile.jpg',
    description: 'S3 path to profile photo for About Me section',
    category: 'content',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'site_title',
    
    value: 'Gabi Yoga - Find Your Inner Peace',
    description: 'Main website title',
    category: 'general',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'site_description',
    
    value: 'Join Gabi Yoga for transformative yoga classes, workshops, retreats and private sessions. Discover inner peace and wellness through mindful practice.',
    description: 'Website meta description',
    category: 'general',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'contact_email',
    
    value: 'hello@gabi.yoga',
    description: 'Main contact email address',
    category: 'contact',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'contact_phone',
    
    value: '+1 (555) 123-4567',
    description: 'Main contact phone number',
    category: 'contact',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'social_instagram',
    
    value: 'https://instagram.com/gabi.yoga',
    description: 'Instagram profile URL',
    category: 'social',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'social_facebook',
    
    value: 'https://facebook.com/gabi.yoga',
    description: 'Facebook page URL',
    category: 'social',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'hero_title',
    
    value: 'Find Your Inner Peace Through Yoga',
    description: 'Hero section main title',
    category: 'homepage',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'hero_subtitle',
    
    value: 'Join our welcoming community for transformative yoga classes, workshops, and retreats designed to nurture your body, mind, and spirit.',
    description: 'Hero section subtitle',
    category: 'homepage',
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  }
];

/**
 * Seed blog posts
 */
async function seedBlogPosts() {
  console.log('📝 Seeding blog posts...');
  
  try {
    for (const post of blogPosts) {
      await dynamoDb.put({
        TableName: BLOG_POSTS_TABLE,
        Item: post
      }).promise();
      
      console.log(`   ✅ Added: "${post.title}"`);
    }
    
    console.log(`   📝 ${blogPosts.length} blog posts added successfully!\n`);
  } catch (error) {
    console.error('   ❌ Error seeding blog posts:', error.message);
    throw error;
  }
}

/**
 * Seed settings
 */
async function seedSettings() {
  console.log('⚙️  Seeding settings...');
  
  try {
    for (const setting of settings) {
      await dynamoDb.put({
        TableName: SETTINGS_TABLE,
        Item: setting
      }).promise();
      
      console.log(`   ✅ Added: "${setting.key}"`);
    }
    
    console.log(`   ⚙️  ${settings.length} settings added successfully!\n`);
  } catch (error) {
    console.error('   ❌ Error seeding settings:', error.message);
    throw error;
  }
}

/**
 * Seed users
 */
async function seedUsers() {
  console.log('👥 Seeding users...');
  
  try {
    for (const user of users) {
      await dynamoDb.put({
        TableName: USERS_TABLE,
        Item: user
      }).promise();
      
      console.log(`   ✅ Added: "${user.firstName} ${user.lastName} (${user.role})"`);
    }
    
    console.log(`   👥 ${users.length} users added successfully!\n`);
  } catch (error) {
    console.error('   ❌ Error seeding users:', error.message);
    throw error;
  }
}

/**
 * Main seeding function
 */
async function main() {
  try {
    console.log('🚀 Starting data seeding process...\n');
    
    // Seed all data
    await seedUsers();
    await seedBlogPosts();
    await seedSettings();
    
    console.log('🎉 Data seeding completed successfully!');
    console.log('');
    console.log('🔗 Test your APIs:');
    console.log('   Blog List: curl https://j5enu5t3ik.execute-api.us-east-1.amazonaws.com/dev/blog');
    console.log('   Settings: curl https://j5enu5t3ik.execute-api.us-east-1.amazonaws.com/dev/admin/settings');
    console.log('   Users: curl https://j5enu5t3ik.execute-api.us-east-1.amazonaws.com/dev/admin/users');
    console.log('');
    console.log('🔑 Test User Credentials:');
    console.log('   Admin:');
    console.log('     Email: admin@gabi.yoga');
    console.log('     Password: admin123');
    console.log('');
    console.log('   Student:');
    console.log('     Email: student@example.com');
    console.log('     Password: student123');
    console.log('');
    console.log('   Member:');
    console.log('     Email: member@example.com');
    console.log('     Password: member123');
    console.log('');
    
  } catch (error) {
    console.error('💥 Seeding failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   • Check your AWS credentials');
    console.error('   • Verify table names exist');
    console.error('   • Check DynamoDB permissions');
    console.error('');
    process.exit(1);
  }
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n⚠️  Seeding interrupted by user');
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, seedUsers, seedBlogPosts, seedSettings };
