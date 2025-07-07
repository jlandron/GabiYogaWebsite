/**
 * Admin QuillJS Editor Component
 * A reusable text editor component for admin pages
 * Supports resizable images that work with both local storage and S3
 */

// Initialize Quill fonts and formats
(function() {
    if (typeof Quill === 'undefined') {
        console.warn('QuillJS not loaded yet. Font registration will be deferred.');
        return;
    }
    
    console.log('Initializing QuillJS Font Formats');
    
    try {
        // Register custom font formats with Quill
        const Font = Quill.import('formats/font');
        
        // Set whitelist of fonts - includes site fonts and common web fonts
        Font.whitelist = [
            // Site theme fonts
            'playfair', 'opensans',
            
            // Custom site fonts
            'julietta', 'themunday',
            
            // Standard fonts
            'arial', 'times', 'helvetica', 'georgia', 'courier', 'roboto',
            
            // Script & Decorative fonts
            'dancing', 'greatvibes', 'pacifico', 'sacramento', 
            'allura', 'satisfy', 'amatic', 'caveat', 'shadows'
        ];
        Quill.register(Font, true);
        
        // Define custom font sizes with readable labels
        const Size = Quill.import('attributors/style/size');
        Size.whitelist = [
            '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', 
            '20px', '22px', '24px', '26px', '28px', '32px', '36px', 
            '42px', '48px', '56px', '64px', '72px'
        ];
        Quill.register(Size, true);
        
        // Create a custom size class that adds human-readable size labels
        const SizeClass = Quill.import('attributors/class/size');
        SizeClass.whitelist = [
            'size-8', 'size-9', 'size-10', 'size-11', 'size-12', 'size-14', 'size-16', 'size-18',
            'size-20', 'size-22', 'size-24', 'size-26', 'size-28', 'size-32', 'size-36',
            'size-42', 'size-48', 'size-56', 'size-64', 'size-72'
        ];
        Quill.register(SizeClass, true);
        
        console.log('QuillJS Font Formats initialized successfully');
    } catch (error) {
        console.error('Error initializing QuillJS formats:', error);
    }
})();

/**
 * Create a QuillJS editor
 * 
 * @param {string} targetId - The ID of the textarea to replace (without #)
 * @param {Object} options - Configuration options for the editor
 * @param {string} options.defaultFont - Default font to use (e.g., "'Open Sans', sans-serif")
 * @param {string} options.defaultSize - Default font size to use (e.g., "16px")
 * @param {number} options.height - Height of the editor in pixels (e.g., 200)
 * @param {boolean} options.simplified - Whether to use simplified toolbar options
 * @param {Function} options.imageHandler - Custom handler for image insertion (optional)
 * @returns {Object} The created QuillJS instance
 */
function createQuillEditor(targetId, options = {}) {
    console.log(`[QuillJS Debug] Creating Quill editor for ${targetId} with options:`, JSON.stringify(options));
    
    // Default options
    const defaults = {
        defaultFont: "'Open Sans', sans-serif",
        defaultSize: "16px",
        height: 250,
        simplified: false,
        imageHandler: null
    };
    
    // Merge options
    const config = { ...defaults, ...options };
    
    // Find the target element
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
        console.error(`Target element with ID '${targetId}' not found.`);
        return null;
    }
    
    // Create a container to replace the textarea
    const containerId = `${targetId}-container`;
    let containerElement = document.getElementById(containerId);
    
    if (!containerElement) {
        containerElement = document.createElement('div');
        containerElement.id = containerId;
        containerElement.className = 'quill-editor-container';
        
        // Add the container before the textarea
        targetElement.parentNode.insertBefore(containerElement, targetElement);
        
        // Hide the original textarea but keep it for form submission
        targetElement.style.display = 'none';
        
        // Setup toolbar options based on whether simplified mode is enabled
        let toolbarOptions;
        
        // Get font and size options from Quill
        const Font = Quill.import('formats/font');
        
        // Get size options from Quill
        const SizeOptions = Quill.import('attributors/style/size');
        
        if (config.simplified) {
            toolbarOptions = [
                ['bold', 'italic', 'underline'],
                [{ 'font': Font.whitelist }],
                [{ 'size': SizeOptions.whitelist }],
                ['clean']
            ];
        } else {
            toolbarOptions = [
                ['bold', 'italic', 'underline'],
                [{ 'font': Font.whitelist }],
                [{ 'size': SizeOptions.whitelist }],
                [{ 'header': [2, 3, 4, false] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                ['clean']
            ];
        }
        
        // Setup toolbar handlers
        const toolbarHandlers = {};
        
        if (!config.simplified && config.imageHandler) {
            toolbarHandlers.image = config.imageHandler;
        }
        
        // Ensure size format is registered
        Quill.register(Quill.import('attributors/style/size'), true);
        
        // Initialize Quill
        const quill = new Quill(`#${containerId}`, {
            modules: {
                toolbar: {
                    container: toolbarOptions,
                    handlers: toolbarHandlers
                }
            },
            placeholder: targetElement.getAttribute('placeholder') || 'Write content here...',
            theme: 'snow'
        });
        
        // Set default font and size if provided
        if (config.defaultFont) {
            // Map the CSS font-family to the corresponding Quill font value
            let fontValue = null;
            if (config.defaultFont.includes("Playfair")) fontValue = "playfair";
            else if (config.defaultFont.includes("Open Sans")) fontValue = "opensans";
            else if (config.defaultFont.includes("Julietta")) fontValue = "julietta";
            else if (config.defaultFont.includes("Themunday")) fontValue = "themunday";
            else if (config.defaultFont.includes("Arial")) fontValue = "arial";
            else if (config.defaultFont.includes("Times")) fontValue = "times";
            else if (config.defaultFont.includes("Helvetica")) fontValue = "helvetica";
            else if (config.defaultFont.includes("Georgia")) fontValue = "georgia";
            else if (config.defaultFont.includes("Courier")) fontValue = "courier";
            else if (config.defaultFont.includes("Roboto")) fontValue = "roboto";
            else if (config.defaultFont.includes("Dancing")) fontValue = "dancing";
            else if (config.defaultFont.includes("Great Vibes")) fontValue = "greatvibes";
            else if (config.defaultFont.includes("Pacifico")) fontValue = "pacifico";
            else if (config.defaultFont.includes("Sacramento")) fontValue = "sacramento";
            else if (config.defaultFont.includes("Allura")) fontValue = "allura";
            else if (config.defaultFont.includes("Satisfy")) fontValue = "satisfy";
            else if (config.defaultFont.includes("Amatic")) fontValue = "amatic";
            else if (config.defaultFont.includes("Caveat")) fontValue = "caveat";
            else if (config.defaultFont.includes("Shadows Into Light")) fontValue = "shadows";
            
            if (fontValue) {
                quill.format('font', fontValue);
            }
        }
        
        // Check if defaultSize is in the whitelist
        const SizeFormat = Quill.import('attributors/style/size');
        if (config.defaultSize && SizeFormat.whitelist.includes(config.defaultSize)) {
            quill.format('size', config.defaultSize);
        }
        
        // Set custom height
        const editorElement = containerElement.querySelector('.ql-editor');
        if (editorElement) {
            editorElement.style.minHeight = `${config.height}px`;
            editorElement.style.maxHeight = `${config.height * 2}px`;
        }
        
        // Track if we're in initialization to suppress text change events
        let isInitializing = true;
        
        /**
         * Clean HTML content from QuillJS to only keep necessary formatting
         * @param {string} html - Raw HTML from quill.root.innerHTML
         * @returns {string} Cleaned HTML with only essential formatting
         */
        function cleanQuillHTML(html) {
            // Create a temporary div to manipulate the HTML
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            // Keep only these tags and attributes
            const allowedTags = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'img'];
            const allowedAttributes = {
                'a': ['href', 'target'],
                'img': ['src', 'alt', 'width', 'height', 'data-original-width', 'data-original-height'],
                '*': ['style', 'class'] // Allow these on any element
            };
            
            // Allowed inline styles (font properties and alignment)
            const allowedStyles = [
                'font-family', 'font-size', 'font-weight', 'font-style', 
                'text-decoration', 'text-align'
            ];
            
            // Clean quill-specific classes and data attributes
            function cleanElement(element) {
                if (element.nodeType !== 1) return; // Skip non-element nodes
                
                // Remove element if it's not in allowedTags
                if (!allowedTags.includes(element.tagName.toLowerCase())) {
                    // Replace with its content
                    while (element.firstChild) {
                        element.parentNode.insertBefore(element.firstChild, element);
                    }
                    element.parentNode.removeChild(element);
                    return;
                }
                
                // Clean attributes
                const attributes = [...element.attributes];
                for (const attr of attributes) {
                    const attrName = attr.name.toLowerCase();
                    
                    // Check if this attribute is allowed for this tag
                    const tagSpecificAttrs = allowedAttributes[element.tagName.toLowerCase()];
                    const genericAttrs = allowedAttributes['*'];
                    
                    if ((!tagSpecificAttrs || !tagSpecificAttrs.includes(attrName)) && 
                        (!genericAttrs || !genericAttrs.includes(attrName))) {
                        element.removeAttribute(attrName);
                    }
                    
                    // Clean style attribute to only keep allowed styles
                    if (attrName === 'style') {
                        const styles = element.style;
                        const stylesToKeep = {};
                        
                        for (const style of allowedStyles) {
                            if (styles[style]) {
                                stylesToKeep[style] = styles[style];
                            }
                        }
                        
                        // Clear style attribute and add back only allowed styles
                        element.removeAttribute('style');
                        for (const [prop, value] of Object.entries(stylesToKeep)) {
                            element.style[prop] = value;
                        }
                    }
                    
                    // Clean classes, only keep font classes
                    if (attrName === 'class') {
                        const classes = attr.value.split(' ');
                        const classesToKeep = classes.filter(cls => 
                            cls.startsWith('font-') || 
                            cls.startsWith('size-') || 
                            cls.startsWith('ql-align-')
                        );
                        
                        if (classesToKeep.length > 0) {
                            element.className = classesToKeep.join(' ');
                        } else {
                            element.removeAttribute('class');
                        }
                    }
                }
                
                // Clean children recursively
                const children = [...element.children];
                children.forEach(cleanElement);
            }
            
            // Clean all elements
            const elements = [...temp.children];
            elements.forEach(cleanElement);
            
            // Return cleaned HTML
            return temp.innerHTML;
        }
        
        // We'll store the original handler in a variable to safely remove it if needed
        const textChangeHandler = function(delta, oldDelta, source) {
            // Skip initial content setting
            if (isInitializing) {
                console.log(`[QuillJS Debug] Ignoring text-change event during initialization for ${targetId}`);
                return;
            }
            
            console.log(`[QuillJS Debug] Text change in ${targetId} (source: ${source})`);
            console.log(`[QuillJS Debug] Raw editor HTML for ${targetId}: ${quill.root.innerHTML.substring(0, 100)}${quill.root.innerHTML.length > 100 ? '...' : ''}`);
            
            // Clean HTML content before storing
            const cleanedHTML = cleanQuillHTML(quill.root.innerHTML);
            console.log(`[QuillJS Debug] Cleaned HTML for ${targetId}: ${cleanedHTML.substring(0, 100)}${cleanedHTML.length > 100 ? '...' : ''}`);
            targetElement.value = cleanedHTML;
            
            // Dispatch input event for form validation
            const event = new Event('input', { bubbles: true });
            targetElement.dispatchEvent(event);
        };
        
        // Attach the handler
        quill.on('text-change', textChangeHandler);
        
        // Set initial content from textarea
        if (targetElement.value) {
            try {
                console.log(`[QuillJS Debug] Setting initial content for ${targetId}, length: ${targetElement.value.length}, starts with HTML: ${targetElement.value.trim().startsWith('<')}`);
                console.log(`[QuillJS Debug] Content preview: ${targetElement.value.substring(0, 100)}${targetElement.value.length > 100 ? '...' : ''}`);
                
                // If content is HTML, use it directly
                if (targetElement.value.trim().startsWith('<')) {
                    quill.root.innerHTML = targetElement.value;
                    console.log(`[QuillJS Debug] Set HTML content for ${targetId}`);
                } 
                // If content might be markdown and marked library is available
                else if (window.marked && !targetElement.value.includes('<')) {
                    quill.root.innerHTML = window.marked.parse(targetElement.value);
                    console.log(`[QuillJS Debug] Parsed markdown content for ${targetId}`);
                } else {
                    quill.setText(targetElement.value);
                    console.log(`[QuillJS Debug] Set plain text content for ${targetId}`);
                }
                
                // Log the resulting content in the quill editor
                console.log(`[QuillJS Debug] Resulting Quill HTML for ${targetId}: ${quill.root.innerHTML.substring(0, 100)}${quill.root.innerHTML.length > 100 ? '...' : ''}`);
                
                // Allow text-change events after a brief delay to ensure initialization is complete
                setTimeout(() => {
                    isInitializing = false;
                    console.log(`[QuillJS Debug] Initialization complete for ${targetId}, text-change events will now be processed`);
                }, 500);
            } catch (e) {
                console.error('Error parsing content:', e);
                console.log(`[QuillJS Debug] Error details:`, e);
                quill.setText(targetElement.value);
                console.log(`[QuillJS Debug] Fallback to plain text for ${targetId} after error`);
                isInitializing = false;
            }
        } else {
            console.log(`[QuillJS Debug] No initial content for ${targetId}`);
            isInitializing = false;
        }
        
        console.log(`Quill editor initialized for ${targetId}`);
        return quill;
    }
    
    return null;
}

// Export the function globally
window.createQuillEditor = createQuillEditor;
