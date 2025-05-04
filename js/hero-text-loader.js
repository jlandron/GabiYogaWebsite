/**
 * Hero Text Loader
 * 
 * Updates the homepage hero section with the text, fonts, and sizes from admin settings
 * Adds fade-in animation for hero text and button on page load
 * Implements progressive image loading for hero background
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Get the hero content container
    const heroContent = document.querySelector('.hero-content');
    const heroSection = document.querySelector('.hero');
    
    if (!heroContent || !heroSection) return;
    
    // Preload the hero image
    preloadHeroImage();
    
    // Create hero elements
    const heroHeading = document.createElement('h1');
    const heroSubheading = document.createElement('p');
    const heroButton = document.createElement('a');
    
    // Set initial attributes for button
    heroButton.href = '#offerings';
    heroButton.className = 'btn';
    heroButton.textContent = 'Explore Classes';
    
    // Append elements to hero content
    heroContent.appendChild(heroHeading);
    heroContent.appendChild(heroSubheading);
    heroContent.appendChild(heroButton);
    
    // Set initial state for fade-in animation
    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(25px)';
    heroContent.style.transition = 'opacity 0.8s ease, transform 0.8s ease'; // Faster animation
    
    heroHeading.style.opacity = '0';
    heroHeading.style.transition = 'opacity 0.8s ease'; // Faster animation
    
    heroSubheading.style.opacity = '0';
    heroSubheading.style.transition = 'opacity 0.8s ease 0.2s'; // Faster animation with reduced delay
    
    heroButton.style.opacity = '0';
    heroButton.style.transform = 'translateY(20px)';
    heroButton.style.transition = 'opacity 0.8s ease 0.5s, transform 0.8s ease 0.5s'; // Faster animation with reduced delay
    
    try {
        // Fetch the website settings from the API
        const response = await fetch('/api/website-settings');
        
        if (!response.ok) {
            console.warn('[Hero Debug] Failed to fetch website settings:', response.statusText);
            return;
        }
        
        const data = await response.json();
        console.log('[Hero Debug] Website settings received from API:', 
                    data.success ? 'Success' : 'Failed', 
                    data.settings ? 'Settings data present' : 'No settings data');
        
        // If we got valid settings with hero text data, update the elements
        if (data && data.success && data.settings && data.settings.heroText) {
            // Log the raw hero text data before processing
            console.log('[Hero Debug] Raw hero text data from API:', 
                        JSON.stringify({
                            headingFont: data.settings.heroText?.heading?.font,
                            headingSize: data.settings.heroText?.heading?.size,
                            subheadingFont: data.settings.heroText?.subheading?.font,
                            subheadingSize: data.settings.heroText?.subheading?.size
                        }));
            
            // Clone the data to ensure we don't lose any properties
            const heading = {...(data.settings.heroText.heading || {})};
            const subheading = {...(data.settings.heroText.subheading || {})};
            
            // Set default fonts if missing
            if (!heading.font) {
                heading.font = "'Julietta', serif";
                console.log('[Hero Debug] Added default heading font: Julietta');
            }
            
            if (!heading.size) {
                heading.size = "64px";
                console.log('[Hero Debug] Added default heading size: 64px');
            }
            
            if (!subheading.font) {
                subheading.font = "'Satisfy', cursive";
                console.log('[Hero Debug] Added default subheading font: Satisfy');
            }
            
            if (!subheading.size) {
                subheading.size = "16px";
                console.log('[Hero Debug] Added default subheading size: 16px');
            }
            
            // Update heading
            if (heading) {
                console.log('[Hero Debug] Processing heading with:', {
                    textLength: heading.text?.length || 0,
                    isHTML: heading.text?.trim().startsWith('<') || false,
                    font: heading.font,
                    size: heading.size,
                    weight: heading.fontWeight,
                    style: heading.fontStyle,
                    decoration: heading.textDecoration,
                    align: heading.textAlign || 'center'
                });
                
                // Add an isolated class to the heading to avoid style conflicts
                heroHeading.className = 'isolated-hero-heading';
                console.log('[Hero Debug] Applied isolated class to heading');
                
                // Check if text is HTML or plain text
                if (heading.text) {
                    if (heading.text.trim().startsWith('<')) {
                        // If it's HTML, use innerHTML
                        heroHeading.innerHTML = heading.text;
                        console.log('[Hero Debug] Applied heading HTML content, length:', heading.text.length);
                    } else {
                        // If it's plain text, use textContent
                        heroHeading.textContent = heading.text;
                        console.log('[Hero Debug] Applied heading plain text content:', heading.text.substring(0, 50));
                    }
                } else {
                    heroHeading.textContent = 'Find Your Inner Peace';
                    console.log('[Hero Debug] Applied default heading text: "Find Your Inner Peace"');
                }
                
                // Create a style tag specifically for the isolated hero heading
                const styleId = 'isolated-hero-heading-style';
                let styleEl1 = document.getElementById(styleId);
                
                if (!styleEl1) {
                    styleEl1 = document.createElement('style');
                    styleEl1.id = styleId;
                    document.head.appendChild(styleEl1);
                    console.log('[Hero Debug] Created style element for isolated heading');
                }
                
                // Define all styling for the isolated heading in this CSS rule
                let cssRules = [];
                cssRules.push(`font-size: ${heading.size || '3.5rem'}`);
                cssRules.push(`font-family: ${heading.font || "'Julietta', serif"}`);
                
                if (heading.fontWeight) {
                    cssRules.push(`font-weight: ${heading.fontWeight}`);
                }
                
                if (heading.fontStyle) {
                    cssRules.push(`font-style: ${heading.fontStyle}`);
                }
                
                if (heading.textDecoration) {
                    cssRules.push(`text-decoration: ${heading.textDecoration}`);
                }
                
                cssRules.push(`text-align: ${heading.textAlign || 'center'}`);
                cssRules.push('margin-bottom: 20px');
                cssRules.push('text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7)');
                cssRules.push('color: #fff');
                
                // Create the complete rule
                styleEl1.textContent = `.isolated-hero-heading { ${cssRules.join('; ')}; }`;
                console.log('[Hero Debug] Applied custom CSS rule:', styleEl1.textContent);
                
                // Apply styles with improved font handling
                if (heading.font) {
                    console.log('[Hero Debug] Processing heading font value:', heading.font);
                    
                    // Extract actual font name from CSS font-family value if quoted
                    const fontMatch = heading.font.match(/'([^']+)'|"([^"]+)"|([^,\s]+)/);
                    if (fontMatch) {
                        const fontName = fontMatch[1] || fontMatch[2] || fontMatch[3];
                        console.log('[Hero Debug] Extracted heading font name:', fontName);
                    }
                    
                    // Apply the font directly to the element
                    heroHeading.style.fontFamily = heading.font;
                    console.log('[Hero Debug] Applied heading font:', heading.font);
                }
                
                // Set the CSS custom property for the size with !important to increase priority
                document.documentElement.style.setProperty('--custom-hero-heading-size', heading.size + ' !important');
                console.log('[Hero Debug] Applied heading size via CSS variable with !important:', heading.size);
                
                // Apply direct inline style with important flag using setAttribute to guarantee highest priority
                heroHeading.setAttribute('style', `font-size: ${heading.size} !important; ${heroHeading.getAttribute('style') || ''}`);
                console.log('[Hero Debug] Applied heading size with inline style:', heading.size);
                
                // Add a custom style tag with high specificity as another fallback
                const customStyleId = 'custom-hero-style';
                let styleEl2 = document.getElementById(customStyleId);
                
                if (!styleEl2) {
                    styleEl2 = document.createElement('style');
                    styleEl2.id = customStyleId;
                    document.head.appendChild(styleEl2);
                }
                
                // Add a unique ID to the heading for maximum specificity
                const headingId = `hero-heading-${Date.now()}`;
                heroHeading.id = headingId;
                
                // Add high specificity CSS rule using ID selector (highest CSS specificity)
                styleEl2.textContent = `
                  #${headingId} { font-size: ${heading.size} !important; }
                  .hero-content h1#${headingId} { font-size: ${heading.size} !important; }
                  body .hero-content h1#${headingId} { font-size: ${heading.size} !important; }
                  h1.isolated-hero-heading#${headingId} { font-size: ${heading.size} !important; }
                `;
                console.log('[Hero Debug] Added maximum specificity CSS rules using ID selector:', styleEl2.textContent);
                
                if (heading.fontWeight) {
                    heroHeading.style.fontWeight = heading.fontWeight;
                    console.log('[Hero Debug] Applied heading weight:', heading.fontWeight);
                }
                
                if (heading.fontStyle) {
                    heroHeading.style.fontStyle = heading.fontStyle;
                    console.log('[Hero Debug] Applied heading style:', heading.fontStyle);
                }
                
                if (heading.textDecoration) {
                    heroHeading.style.textDecoration = heading.textDecoration;
                    console.log('[Hero Debug] Applied heading decoration:', heading.textDecoration);
                }
                
                heroHeading.style.textAlign = heading.textAlign || 'center';
                console.log('[Hero Debug] Applied heading alignment:', heading.textAlign || 'center');
            } else {
                // Default text and styles if no settings are available
                heroHeading.textContent = 'Find Your Inner Peace';
                heroHeading.style.fontWeight = 'normal';
                heroHeading.style.fontStyle = 'normal';
                heroHeading.style.textDecoration = 'none';
                heroHeading.style.textAlign = 'center';
            }
            
            // Update subheading
            if (subheading) {
                console.log('[Hero Debug] Processing subheading with:', {
                    textLength: subheading.text?.length || 0,
                    isHTML: subheading.text?.trim().startsWith('<') || false,
                    font: subheading.font,
                    size: subheading.size,
                    weight: subheading.fontWeight,
                    style: subheading.fontStyle,
                    decoration: subheading.textDecoration,
                    align: subheading.textAlign || 'center'
                });
                
                // Check if text is HTML or plain text
                if (subheading.text) {
                    if (subheading.text.trim().startsWith('<')) {
                        // If it's HTML, use innerHTML
                        heroSubheading.innerHTML = subheading.text;
                        console.log('[Hero Debug] Applied subheading HTML content, length:', subheading.text.length);
                    } else {
                        // If it's plain text, use textContent
                        heroSubheading.textContent = subheading.text;
                        console.log('[Hero Debug] Applied subheading plain text content:', subheading.text.substring(0, 50));
                    }
                } else {
                    heroSubheading.textContent = 'Join our community and transform your mind, body, and spirit';
                    console.log('[Hero Debug] Applied default subheading text');
                }
                
                // Apply styles with improved font handling
                if (subheading.font) {
                    console.log('[Hero Debug] Processing subheading font value:', subheading.font);
                    
                    // Extract actual font name from CSS font-family value if quoted
                    const fontMatch = subheading.font.match(/'([^']+)'|"([^"]+)"|([^,\s]+)/);
                    if (fontMatch) {
                        const fontName = fontMatch[1] || fontMatch[2] || fontMatch[3];
                        console.log('[Hero Debug] Extracted subheading font name:', fontName);
                    }
                    
                    // Apply the font directly to the element
                    heroSubheading.style.fontFamily = subheading.font;
                    console.log('[Hero Debug] Applied subheading font:', subheading.font);
                }
                
                if (subheading.size) {
                    heroSubheading.style.fontSize = subheading.size;
                    console.log('[Hero Debug] Applied subheading size:', subheading.size);
                }
                
                if (subheading.fontWeight) {
                    heroSubheading.style.fontWeight = subheading.fontWeight;
                    console.log('[Hero Debug] Applied subheading weight:', subheading.fontWeight);
                }
                
                if (subheading.fontStyle) {
                    heroSubheading.style.fontStyle = subheading.fontStyle;
                    console.log('[Hero Debug] Applied subheading style:', subheading.fontStyle);
                }
                
                if (subheading.textDecoration) {
                    heroSubheading.style.textDecoration = subheading.textDecoration;
                    console.log('[Hero Debug] Applied subheading decoration:', subheading.textDecoration);
                }
                
                heroSubheading.style.textAlign = subheading.textAlign || 'center';
                console.log('[Hero Debug] Applied subheading alignment:', subheading.textAlign || 'center');
            } else {
                // Default text and styles if no settings are available
                heroSubheading.textContent = 'Join our community and transform your mind, body, and spirit';
                heroSubheading.style.fontWeight = 'normal';
                heroSubheading.style.fontStyle = 'normal';
                heroSubheading.style.textDecoration = 'none';
                heroSubheading.style.textAlign = 'center';
            }
            
            // Update the button text if it exists
            if (heroButton && heroButton.textContent === '') {
                heroButton.textContent = 'Explore Classes';
                console.log('[Hero Debug] Applied default button text');
            }
            
            console.log('[Hero Debug] Hero text updated successfully');
            
            // Log the final DOM state for debugging
            if (heroHeading) {
                console.log('[Hero Debug] Final heading DOM:', {
                    text: heroHeading.textContent || heroHeading.innerHTML,
                    fontFamily: heroHeading.style.fontFamily,
                    fontSize: heroHeading.style.fontSize,
                    fontWeight: heroHeading.style.fontWeight,
                    fontStyle: heroHeading.style.fontStyle,
                    textDecoration: heroHeading.style.textDecoration,
                    textAlign: heroHeading.style.textAlign
                });
            }
            
            if (heroSubheading) {
                console.log('[Hero Debug] Final subheading DOM:', {
                    text: heroSubheading.textContent || heroSubheading.innerHTML,
                    fontFamily: heroSubheading.style.fontFamily,
                    fontSize: heroSubheading.style.fontSize,
                    fontWeight: heroSubheading.style.fontWeight,
                    fontStyle: heroSubheading.style.fontStyle,
                    textDecoration: heroSubheading.style.textDecoration,
                    textAlign: heroSubheading.style.textAlign
                });
            }
        }
        
        // Trigger fade-in animation after content is loaded and processed
        setTimeout(() => {
            if (heroContent) {
                heroContent.style.opacity = '1';
                heroContent.style.transform = 'translateY(0)';
            }
            
            if (heroHeading) {
                heroHeading.style.opacity = '1';
            }
            
            if (heroSubheading) {
                heroSubheading.style.opacity = '1';
            }
            
            if (heroButton) {
                heroButton.style.opacity = '1';
                heroButton.style.transform = 'translateY(0)';
            }
        }, 500); // Increased delay to ensure a more noticeable fade-in effect
        
    } catch (error) {
        console.error('Error loading hero text:', error);
    }
});

/**
 * Preloads the hero image and applies it directly to the hero background
 * when the image is fully loaded for a smooth transition experience.
 */
function preloadHeroImage() {
    const heroSection = document.querySelector('.hero');
    if (!heroSection) return;
    
    // First set up a transition on the background for smooth appearance
    heroSection.style.transition = "background 1s ease-in";
    
    // Create a new image object to preload the hero image
    const img = new Image();
    
    // When the image is loaded, apply it directly as a background
    img.onload = function() {
        console.log('[Hero Debug] Hero image preloaded successfully');
        
        // Add a small delay before showing the image for a smoother experience
        // This allows the page to render and stabilize first
        setTimeout(() => {
            // Apply the background directly to the hero element
            heroSection.style.background = `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('/images/photo-1615729947596-a598e5de0ab3.jpeg')`;
            heroSection.style.backgroundSize = 'cover';
            heroSection.style.backgroundPosition = 'center';
            console.log('[Hero Debug] Applied background image directly to hero section');
            
            // Also add the class for any additional CSS styling
            heroSection.classList.add('image-loaded');
            console.log('[Hero Debug] Added image-loaded class to hero section');
        }, 100);
    };
    
    // In case of error, use a fallback or keep the color background
    img.onerror = function() {
        console.warn('[Hero Debug] Error loading hero image, using fallback');
        // Optionally, you could set a fallback image here
    };
    
    // Start loading the image with absolute path from domain root
    img.src = '/images/photo-1615729947596-a598e5de0ab3.jpeg';
    console.log('[Hero Debug] Started preloading hero image: ' + img.src);
}
