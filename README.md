# Yoga Business Website Mockup

This is a responsive website mockup for a yoga business, featuring sections for:
- Instructor bio
- Photo gallery
- Class offerings
- Membership and package options
- Class registration
- Private lesson booking
- Retreat information

## How to View the Website

1. Simply open the `index.html` file in any web browser.
2. The website is fully responsive and works on mobile, tablet, and desktop devices.

## Customizing the Website

### Adding Your Information

1. Open `index.html` in a text editor to:
   - Replace "Your Name" with your actual name
   - Update your bio in the About section
   - Customize class offerings, schedules, and pricing
   - Update contact information

### Adding Images

1. Place your image files in the `images/` folder
2. Replace placeholder image paths in the HTML:
   - Hero image: Replace `images/hero.jpg` 
   - Instructor photo: Replace `images/instructor.jpg`
   - Gallery images: Replace `images/gallery1.jpg` through `images/gallery6.jpg`
   - Retreat images: Replace `images/retreat1.jpg` through `images/retreat3.jpg`

### Customizing Colors

1. Open `css/styles.css` and modify the color variables at the top:
   ```css
   :root {
       --primary-color: #7ba69a;    /* Main brand color */
       --secondary-color: #f8f3eb;  /* Light background color */
       --accent-color: #e0a458;     /* Highlight color */
       --text-color: #4a4a4a;       /* Main text color */
       --light-text: #f8f3eb;       /* Text color for dark backgrounds */
       --dark-bg: #2c3e50;          /* Dark background color */
   }
   ```

## Features

- **Responsive Design**: Adapts to all screen sizes
- **Mobile Navigation**: Hamburger menu for mobile devices
- **Class Sign-up Modal**: Interactive form for class registration
- **Smooth Scroll**: Smooth scrolling to page sections
- **Form Validation**: Client-side validation for all forms
- **Image Placeholders**: Visual indicators where real images would go
- **Scroll Animations**: Elements animate as they come into view

## Next Steps for a Production Site

1. Add real images for the gallery, hero section, and profile
2. Set up a backend for form processing
3. Connect to a class management system
4. Implement actual payment processing
5. Add SEO metadata
6. Set up analytics tracking
