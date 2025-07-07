/**
 * Environment Indicator Script
 * Adds a visual indicator (purple border) when running on the dev environment
 */

document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the dev domain
  if (window.location.hostname === 'dev.gabi.yoga' || 
      window.location.hostname.includes('dev.gabi') || 
      window.location.hostname.includes('localhost')) {
    // Add the dev environment class to the body
    document.body.classList.add('dev-environment');
    
    // Optionally log to console for developers
    console.log('Development environment detected - visual indicator enabled');
  }
});
