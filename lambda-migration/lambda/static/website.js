/**
 * Static Website Lambda Function
 * Serves the homepage and static assets for the yoga website
 */

const { createResponse } = require('./utils');

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  try {
    console.log('Static website request:', {
      requestId,
      path: event.path,
      httpMethod: event.httpMethod,
      headers: event.headers
    });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, '', {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
    }

    // Extract path from event
    const requestPath = event.path || event.pathParameters?.proxy || '/';
    
    // Serve homepage for root path
    if (requestPath === '/' || requestPath === '/index.html') {
      return serveHomepage();
    }
    
    // Serve static assets
    if (requestPath.startsWith('/css/') || 
        requestPath.startsWith('/js/') || 
        requestPath.startsWith('/images/') ||
        requestPath.startsWith('/fonts/')) {
      return serveStaticAsset(requestPath);
    }
    
    // 404 for other paths
    return createResponse(404, 'Page not found', {
      'Content-Type': 'text/plain'
    });

  } catch (error) {
    console.error('Static website error:', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return createResponse(500, 'Internal server error', {
      'Content-Type': 'text/plain'
    });
  }
};

/**
 * Serve the homepage with the actual yoga website content
 */
function serveHomepage() {
  const homepage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gabi Yoga - Find Your Inner Peace Through Yoga & Meditation</title>
    <meta name="description" content="Join Gabi Yoga for transformative yoga classes, workshops, retreats and private sessions. Discover inner peace and wellness through mindful practice.">
    <meta name="keywords" content="yoga, yoga classes, yoga studio, meditation, wellness, retreats, workshops, private yoga sessions, Gabi Yoga">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://gabi.yoga/">
    
    <!-- Favicon -->
    <link rel="apple-touch-icon" sizes="180x180" href="/images/favicon/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://gabi.yoga/">
    <meta property="og:title" content="Gabi Yoga - Find Your Inner Peace">
    <meta property="og:description" content="Join our community and transform your mind, body, and spirit through yoga and meditation.">
    <meta property="og:image" content="https://gabi.yoga/images/og-image.jpg">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://gabi.yoga/">
    <meta property="twitter:title" content="Gabi Yoga - Find Your Inner Peace">
    <meta property="twitter:description" content="Join our community and transform your mind, body, and spirit through yoga and meditation.">
    <meta property="twitter:image" content="https://gabi.yoga/images/twitter-image.jpg">
    
    <!-- Preload hero image from original site -->
    <link rel="preload" href="https://raw.githubusercontent.com/user/yoga-website/main/images/photo-1615729947596-a598e5de0ab3.jpeg" as="image" type="image/jpeg">
    
    <!-- Stylesheets -->
    <style>
        /* Embedded critical CSS for hero section */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
        }
        
        .hero {
            height: 100vh;
            background-image: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), 
                              url('https://images.unsplash.com/photo-1615729947596-a598e5de0ab3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80');
            background-size: cover;
            background-position: center;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: white;
        }
        
        .hero-content {
            max-width: 800px;
            padding: 2rem;
        }
        
        .hero h1 {
            font-size: 3.5rem;
            margin-bottom: 1rem;
            font-weight: 300;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            animation: fadeInUp 1s ease-out;
        }
        
        .hero p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
            animation: fadeInUp 1s ease-out 0.3s both;
        }
        
        .hero .btn {
            display: inline-block;
            padding: 1rem 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 30px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: fadeInUp 1s ease-out 0.6s both;
        }
        
        .hero .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .section {
            padding: 4rem 0;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        
        .section h2 {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 3rem;
            color: #333;
        }
        
        .gallery-section {
            background: #f8f9fa;
        }
        
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        
        .gallery-item {
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .gallery-item:hover {
            transform: translateY(-5px);
        }
        
        .gallery-item img {
            width: 100%;
            height: 250px;
            object-fit: cover;
        }
        
        .gallery-item-content {
            padding: 1.5rem;
            background: white;
        }
        
        .gallery-item h3 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
            color: #333;
        }
        
        .gallery-item p {
            color: #666;
            font-size: 0.9rem;
        }
        
        .loading {
            text-align: center;
            padding: 3rem;
            color: #666;
        }
        
        .api-status {
            background: #e8f5e8;
            padding: 1rem;
            border-radius: 8px;
            margin: 2rem 0;
            border-left: 4px solid #28a745;
        }
        
        .api-links {
            text-align: center;
            margin: 2rem 0;
        }
        
        .api-link {
            display: inline-block;
            margin: 0.5rem;
            padding: 0.5rem 1rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 20px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        
        .api-link:hover {
            background: #764ba2;
            transform: translateY(-2px);
        }
        
        footer {
            background: #333;
            color: white;
            text-align: center;
            padding: 2rem;
            margin-top: 4rem;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2.5rem;
            }
            
            .hero p {
                font-size: 1rem;
            }
            
            .gallery-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1>🧘‍♀️ Gabi Yoga</h1>
            <p>Find Your Inner Peace Through Yoga & Meditation</p>
            <a href="#gallery" class="btn">Explore Our Journey</a>
        </div>
    </section>

    <!-- API Status Section -->
    <section class="section">
        <div class="container">
            <div class="api-status">
                <strong>✅ Serverless Migration Complete!</strong> All APIs are now running on AWS Lambda
            </div>
            <div class="api-links">
                <a href="/blog" class="api-link">📝 Blog API</a>
                <a href="/gallery" class="api-link">🖼️ Gallery API</a>
                <a href="/classes" class="api-link">🧘 Classes API</a>
            </div>
        </div>
    </section>

    <!-- Gallery Section -->
    <section id="gallery" class="section gallery-section">
        <div class="container">
            <h2>Our Yoga Journey</h2>
            <div class="loading" id="gallery-loading">
                <p>🧘‍♀️ Loading beautiful moments...</p>
            </div>
            <div class="gallery-grid" id="gallery-grid" style="display: none;">
                <!-- Gallery items will be dynamically loaded here -->
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="container">
            <p>&copy; 2025 Gabi Yoga. Powered by AWS Lambda & Serverless Architecture</p>
            <p style="margin-top: 0.5rem; opacity: 0.7; font-size: 0.9rem;">
                🚀 Cost-effective • ⚡ Auto-scaling • 🔒 Secure
            </p>
        </div>
    </footer>

    <script>
        // Lambda API Configuration
        const API_BASE_URL = window.location.origin + '/dev';
        
        // Load gallery images from Lambda API
        async function loadGallery() {
            try {
                console.log('Loading gallery from:', API_BASE_URL + '/gallery');
                const response = await fetch(API_BASE_URL + '/gallery');
                const data = await response.json();
                
                const galleryGrid = document.getElementById('gallery-grid');
                const galleryLoading = document.getElementById('gallery-loading');
                
                if (data.success && data.images) {
                    // Clear loading state
                    galleryLoading.style.display = 'none';
                    galleryGrid.style.display = 'grid';
                    
                    // Use placeholder images for now since we don't have actual images uploaded
                    const placeholderImages = [
                        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
                        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
                        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
                        'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=400',
                        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
                        'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400'
                    ];
                    
                    // Render gallery items with placeholder images
                    galleryGrid.innerHTML = data.images.map((image, index) => \`
                        <div class="gallery-item">
                            <img src="\${placeholderImages[index % placeholderImages.length]}" alt="\${image.altText}" loading="lazy">
                            <div class="gallery-item-content">
                                <h3>\${image.title}</h3>
                                <p>\${image.description}</p>
                            </div>
                        </div>
                    \`).join('');
                    
                    console.log('✅ Loaded ' + data.images.length + ' gallery images');
                } else {
                    throw new Error('Invalid response format');
                }
            } catch (error) {
                console.error('❌ Error loading gallery:', error);
                document.getElementById('gallery-loading').innerHTML = 
                    '<p style="color: #dc3545;"><strong>Error loading gallery</strong><br>' + error.message + '</p>';
            }
        }
        
        // Load gallery when page loads
        document.addEventListener('DOMContentLoaded', loadGallery);
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    </script>
</body>
</html>`;

  return createResponse(200, homepage, {
    'Content-Type': 'text/html; charset=utf-8'
  });
}

/**
 * Serve static assets (placeholder - in production, use CloudFront/S3)
 */
function serveStaticAsset(requestPath) {
  // In a real implementation, you'd serve from S3 or CloudFront
  // For now, return a simple response
  const mimeType = getMimeType(requestPath);
  
  return createResponse(404, 'Static assets should be served from S3/CloudFront', {
    'Content-Type': mimeType
  });
}

/**
 * Simple MIME type detection
 */
function getMimeType(path) {
  const ext = path.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}
