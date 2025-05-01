catch (error) {
            console.error(`Error updating ${offering.key} editor:`, error);
        }
    });
}

/**
 * Update all Quill editors with content from settings 
 * @param {Object} settings - Settings from the API
 */
function updateQuillContents(settings) {
    // Update Hero Text editors
    if (settings.heroText) {
        // Heading
        if (settings.heroText.heading && headingQuill) {
            // Get the textarea
            const textArea = document.getElementById('hero-heading');
            if (textArea) {
                textArea.value = settings.heroText.heading.text || '';
            }
            
            // Clear the editor and set new content
            headingQuill.setContents([]);
            if (settings.heroText.heading.text) {
                if (settings.heroText.heading.text.trim().startsWith('<')) {
                    // If it's HTML content
                    headingQuill.root.innerHTML = settings.heroText.heading.text;
                } else {
                    // If it's plain text
                    headingQuill.setText(settings.heroText.heading.text);
                }
                
                // Apply formatting
                const formats = {
                    font: settings.heroText.heading.font ? 
                        mapCSSFontToQuill(settings.heroText.heading.font) : 'playfair',
                    size: settings.heroText.heading.size || '48px',
                    bold: settings.heroText.heading.fontWeight === 'bold',
                    italic: settings.heroText.heading.fontStyle === 'italic',
                    underline: settings.heroText.heading.textDecoration && 
                             settings.heroText.heading.textDecoration.includes('underline'),
                    align: settings.heroText.heading.textAlign || 'center'
                };
                
                applyQuillFormats(headingQuill, formats);
                console.log('Updated hero heading with content and formats:', formats);
            }
        }
        
        // Subheading
        if (settings.heroText.subheading && subheadingQuill) {
            // Get the textarea
            const textArea = document.getElementById('hero-subheading');
            if (textArea) {
                textArea.value = settings.heroText.subheading.text || '';
            }
            
            // Clear the editor and set new content
            subheadingQuill.setContents([]);
            if (settings.heroText.subheading.text) {
                if (settings.heroText.subheading.text.trim().startsWith('<')) {
                    // If it's HTML content
                    subheadingQuill.root.innerHTML = settings.heroText.subheading.text;
                } else {
                    // If it's plain text
                    subheadingQuill.setText(settings.heroText.subheading.text);
                }
                
                // Apply formatting
                const formats = {
                    font: settings.heroText.subheading.font ? 
                        mapCSSFontToQuill(settings.heroText.subheading.font) : 'opensans',
                    size: settings.heroText.subheading.size || '20px',
                    bold: settings.heroText.subheading.fontWeight === 'bold',
                    italic: settings.heroText.subheading.fontStyle === 'italic',
                    underline: settings.heroText.subheading.textDecoration && 
                             settings.heroText.subheading.textDecoration.includes('underline'),
                    align: settings.heroText.subheading.textAlign || 'center'
                };
                
                applyQuillFormats(subheadingQuill, formats);
                console.log('Updated hero subheading with content and formats:', formats);
            }
        }
    }
    
    // Update Instructor Bio
    if (settings.about && instructorBioQuill) {
        // Get the textarea
        const textArea = document.getElementById('instructor-bio');
        if (textArea) {
            textArea.value = settings.about.bio || '';
        }
        
        // Clear the editor and set new content
        instructorBioQuill.setContents([]);
        if (settings.about.bio) {
            if (settings.about.bio.trim().startsWith('<')) {
                // If it's HTML content
                instructorBioQuill.root.innerHTML = settings.about.bio;
            } else {
                // If it's plain text
                instructorBioQuill.setText(settings.about.bio);
            }
            
            // Apply formatting
            const formats = {
                font: settings.about.bioFont ? 
                    mapCSSFontToQuill(settings.about.bioFont) : 'opensans',
                size: settings.about.bioSize || '16px',
                bold: settings.about.bioFontWeight === 'bold',
                italic: settings.about.bioFontStyle === 'italic',
                underline: settings.about.bioTextDecoration && 
                         settings.about.bioTextDecoration.includes('underline'),
                align: settings.about.bioTextAlign || 'left'
            };
            
            applyQuillFormats(instructorBioQuill, formats);
            console.log('Updated instructor bio with content and formats:', formats);
        }
    }
    
    // Update offerings content
    if (settings.offeringsContent) {
        updateOfferingEditors(settings.offeringsContent);
    }
}
