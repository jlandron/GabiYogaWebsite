/**
 * Helper utilities for admin settings
 */

/**
 * Helper function to update a single Quill editor with content and formatting
 * @param {Object} quill - The Quill editor instance
 * @param {string} content - Content to set in the editor
 * @param {Object} formats - Formatting to apply
 * @param {string} defaultFont - Default font if none specified in formats
 */
function updateSingleQuillEditor(quill, content, formats, defaultFont = 'opensans') {
    if (!quill) return;
    
    // Temporarily mark editor as initializing to prevent content loss
    quill.initialContentSet = true;
    
    // Clear first to prevent formatting conflicts
    quill.setContents([]);
    
    // Insert content
    if (content && content.trim().startsWith('<')) {
        // If it's HTML content
        quill.root.innerHTML = content;
    } else {
        // If it's plain text
        quill.setText(content || '');
    }
    
    // Force Quill to update before applying formats
    quill.update();
    
    // Apply formatting if content exists
    const length = quill.getLength();
    if (length > 1 && formats) {
        const formatData = {};
        
        // Apply each format property separately for better reliability
        if (formats.font) {
            formatData.font = formats.font;
        }
        
        if (formats.size) {
            formatData.size = formats.size;
        }
        
        if (formats.bold) {
            formatData.bold = formats.bold;
        }
        
        if (formats.italic) {
            formatData.italic = formats.italic;
        }
        
        if (formats.underline) {
            formatData.underline = formats.underline;
        }
        
        if (formats.align) {
            formatData.align = formats.align;
        }
        
        // Apply all formats at once to the entire content
        quill.formatText(0, length, formatData);
        
        // Additional formatting for specific key formats to ensure they apply
        if (formats.font) {
            quill.format('font', formats.font);
        }
    }
    
    // Delay clearing the initialization flag to ensure formats are applied
    setTimeout(() => {
        quill.initialContentSet = false;
    }, 500);
}

/**
 * Convert CSS font-family to Quill font format
 * @param {string} fontFamily - CSS font-family value
 * @returns {string} - Quill font format value
 */
function cssToQuillFont(fontFamily) {
    if (!fontFamily) return 'opensans';
    
    const fontMatch = fontFamily.match(/'([^']+)'|"([^"]+)"|([^,\s]+)/);
    if (fontMatch) {
        const fontName = fontMatch[1] || fontMatch[2] || fontMatch[3];
        
        // Look up this font name in our FONT_MAP
        for (const [key, value] of Object.entries(FONT_MAP)) {
            if (value.includes(fontName)) {
                return key;
            }
        }
    }
    
    return 'opensans';
}
