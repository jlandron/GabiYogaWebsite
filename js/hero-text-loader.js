/**
 * Hero Text Loader
 * 
 * Updates the homepage hero section with the text, fonts, and sizes from admin settings
 * Adds fade-in animation for hero text and button on page load
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Get the hero text elements
    const heroHeading = document.querySelector('.hero-content h1');
    const heroSubheading = document.querySelector('.hero-content p');
    const heroButton = document.querySelector('.hero-content .btn');
    const heroContent = document.querySelector('.hero-content');
    
    // Set initial state for fade-in animation
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(25px)';
        heroContent.style.transition = 'opacity 1.2s ease, transform 1.2s ease';
    }
    
    if (heroHeading) {
        heroHeading.style.opacity = '0';
        heroHeading.style.transition = 'opacity 1.2s ease';
    }
    
    if (heroSubheading) {
        heroSubheading.style.opacity = '0';
        heroSubheading.style.transition = 'opacity 1.2s ease 0.3s'; // Delay subheading animation
    }
    
    if (heroButton) {
        heroButton.style.opacity = '0';
        heroButton.style.transform = 'translateY(20px)';
        heroButton.style.transition = 'opacity 1.2s ease 0.8s, transform 1.2s ease 0.8s'; // Further delay button animation
    }
    
    if (!heroHeading || !heroSubheading) return;
    
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
                if (heading.size) {
                    // Force proper font size application
                    heroHeading.style.fontSize = heading.size;
                    console.log('[Hero Debug] Applied heading size:', heading.size);
                    
                    // Try !important to override any potential CSS conflicts
                    const existingStyle = heroHeading.getAttribute('style') || '';
                    heroHeading.setAttribute('style', `${existingStyle}; font-size: ${heading.size} !important;`);
                    console.log('[Hero Debug] Applied !important font size:', heading.size);
                }
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
