/**
 * Quill Resizable Image Handler
 * Extends Quill's default image handling to support resizable images
 */

(function() {
    if (typeof Quill === 'undefined') {
        console.warn('QuillJS not loaded yet. Resizable image module will be deferred.');
        return;
    }

    // Get necessary Quill objects
    const BlockEmbed = Quill.import('blots/block/embed');
    const Parchment = Quill.import('parchment');
    
    // Create attributes to store width and height
    const ImageWidthAttribute = new Parchment.Attributor.Attribute('width', 'width', {
        scope: Parchment.Scope.INLINE
    });
    
    const ImageHeightAttribute = new Parchment.Attributor.Attribute('height', 'height', {
        scope: Parchment.Scope.INLINE
    });
    
    Quill.register(ImageWidthAttribute);
    Quill.register(ImageHeightAttribute);

    /**
     * ResizableImage Blot
     * Extends BlockEmbed to create resizable images
     */
    class ResizableImage extends BlockEmbed {
        static create(value) {
            const node = super.create();
            
            // Handle both string values and object values
            if (typeof value === 'string') {
                node.setAttribute('src', value);
            } else {
                node.setAttribute('src', value.src);
                
                if (value.alt) {
                    node.setAttribute('alt', value.alt);
                }
                
                if (value.width) {
                    node.setAttribute('width', value.width);
                }
                
                if (value.height) {
                    node.setAttribute('height', value.height);
                }
                
                // Make image responsive by default
                node.setAttribute('style', 'max-width: 100%');
                
                // Add data attributes to track original dimensions
                if (value.originalWidth) {
                    node.setAttribute('data-original-width', value.originalWidth);
                }
                
                if (value.originalHeight) {
                    node.setAttribute('data-original-height', value.originalHeight);
                }
            }
            
            return node;
        }

        static value(node) {
            return {
                src: node.getAttribute('src'),
                alt: node.getAttribute('alt') || '',
                width: node.getAttribute('width') || '',
                height: node.getAttribute('height') || '',
                originalWidth: node.getAttribute('data-original-width') || '',
                originalHeight: node.getAttribute('data-original-height') || ''
            };
        }
        
        /**
         * Make the image resizable by adding handles after it's inserted into the DOM
         */
        attach() {
            super.attach();
            
            // Don't add resize handles if already present
            if (this.domNode.nextElementSibling?.classList?.contains('quill-image-resize-container')) {
                return;
            }
            
            // Set up resizable image
            this.setupResizableImage(this.domNode);
            
            // Add click handler to show resize indicators
            this.domNode.addEventListener('click', (e) => {
                // Toggle the selected state
                const wasSelected = this.domNode.classList.contains('selected');
                
                // Remove selected class from all images first
                document.querySelectorAll('.ql-resizable-image').forEach(img => {
                    img.classList.remove('selected');
                    if (img.nextElementSibling?.classList?.contains('quill-image-resize-container')) {
                        img.nextElementSibling.classList.remove('active');
                    }
                });
                
                if (!wasSelected) {
                    // Add selected class to this image
                    this.domNode.classList.add('selected');
                    if (this.domNode.nextElementSibling?.classList?.contains('quill-image-resize-container')) {
                        this.domNode.nextElementSibling.classList.add('active');
                    }
                }
            });
        }
        
        /**
         * Clean up resize handlers when removed from DOM
         */
        detach() {
            // Remove resize container if it exists
            if (this.domNode.nextElementSibling?.classList?.contains('quill-image-resize-container')) {
                this.domNode.nextElementSibling.remove();
            }
            
            super.detach();
        }
        
        /**
         * Setup resizable image by adding resize handles
         * @param {HTMLElement} img - The image element to make resizable
         */
        setupResizableImage(img) {
            const parent = img.parentElement;
            if (!parent) return;
            
            // Create resize container
            const resizeContainer = document.createElement('div');
            resizeContainer.classList.add('quill-image-resize-container');
            
            // Insert container after image
            if (img.nextSibling) {
                parent.insertBefore(resizeContainer, img.nextSibling);
            } else {
                parent.appendChild(resizeContainer);
            }
            
            // Create resize handles
            const positions = ['nw', 'ne', 'sw', 'se'];
            positions.forEach(pos => {
                const handle = document.createElement('div');
                handle.classList.add('quill-image-resize-handle', `quill-image-resize-handle-${pos}`);
                resizeContainer.appendChild(handle);
                
                handle.addEventListener('mousedown', this.startResize.bind(this, img, handle, pos));
            });
            
            // Position the resize container around the image
            this.positionResizeContainer(img, resizeContainer);
            
            // Monitor image changes to update resize container
            const observer = new MutationObserver(() => {
                this.positionResizeContainer(img, resizeContainer);
            });
            
            observer.observe(img, { 
                attributes: true,
                attributeFilter: ['width', 'height', 'style']
            });
        }
        
        /**
         * Position the resize container around the image
         * @param {HTMLElement} img - The image element
         * @param {HTMLElement} container - The resize container
         */
        positionResizeContainer(img, container) {
            const imgRect = img.getBoundingClientRect();
            
            // Position container to match image dimensions and position
            container.style.top = img.offsetTop + 'px';
            container.style.left = img.offsetLeft + 'px';
            container.style.width = imgRect.width + 'px';
            container.style.height = imgRect.height + 'px';
        }
        
        /**
         * Start resize operation
         * @param {HTMLElement} img - The image being resized
         * @param {HTMLElement} handle - The resize handle being dragged
         * @param {string} position - Position of the handle (nw, ne, sw, se)
         * @param {MouseEvent} e - The mouse event
         */
        startResize(img, handle, position, e) {
            e.preventDefault();
            
            // Get initial dimensions
            const startWidth = img.width || img.naturalWidth;
            const startHeight = img.height || img.naturalHeight;
            const startX = e.clientX;
            const startY = e.clientY;
            const startPosition = { width: startWidth, height: startHeight, x: startX, y: startY };
            
            // Calculate aspect ratio
            const aspectRatio = startWidth / startHeight;
            
            // Add resize events
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            // Add indicator class to show we're resizing
            document.body.classList.add('quill-image-resizing');
            
            /**
             * Handle mouse movement during resize
             * @param {MouseEvent} moveEvent - The mouse move event
             */
            function handleMouseMove(moveEvent) {
                moveEvent.preventDefault();
                
                // Calculate new dimensions based on mouse movement
                let newWidth, newHeight;
                
                // Calculate change in mouse position
                const deltaX = moveEvent.clientX - startPosition.x;
                const deltaY = moveEvent.clientY - startPosition.y;
                
                // Adjust dimensions based on which handle is being dragged
                switch (position) {
                    case 'se':
                        newWidth = startPosition.width + deltaX;
                        newHeight = startPosition.height + deltaY;
                        break;
                    case 'sw':
                        newWidth = startPosition.width - deltaX;
                        newHeight = startPosition.height + deltaY;
                        break;
                    case 'ne':
                        newWidth = startPosition.width + deltaX;
                        newHeight = startPosition.height - deltaY;
                        break;
                    case 'nw':
                        newWidth = startPosition.width - deltaX;
                        newHeight = startPosition.height - deltaY;
                        break;
                }
                
                // Enforce a minimum size
                newWidth = Math.max(30, newWidth);
                newHeight = Math.max(30, newHeight);
                
                // Maintain aspect ratio with shift key
                if (moveEvent.shiftKey) {
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        newHeight = newWidth / aspectRatio;
                    } else {
                        newWidth = newHeight * aspectRatio;
                    }
                }
                
                // Round values
                newWidth = Math.round(newWidth);
                newHeight = Math.round(newHeight);
                
                // Update image dimensions
                img.setAttribute('width', newWidth);
                img.setAttribute('height', newHeight);
                
                // Store originalWidth/originalHeight if not already set
                if (!img.hasAttribute('data-original-width')) {
                    img.setAttribute('data-original-width', startPosition.width);
                }
                
                if (!img.hasAttribute('data-original-height')) {
                    img.setAttribute('data-original-height', startPosition.height);
                }
                
                // Trigger resize event so Quill updates
                const resizeEvent = new Event('resize', { bubbles: true });
                img.dispatchEvent(resizeEvent);
            }
            
            /**
             * Handle mouse up to end resizing
             * @param {MouseEvent} upEvent - The mouse up event
             */
            function handleMouseUp(upEvent) {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.classList.remove('quill-image-resizing');
                
                // Fire a change event on the editor
                const changeEvent = new Event('quill-image-resize-complete', { bubbles: true });
                img.dispatchEvent(changeEvent);
            }
        }
    }

    // Define static properties
    ResizableImage.blotName = 'resizable-image';
    ResizableImage.tagName = 'img';
    ResizableImage.className = 'ql-resizable-image';
    
    // Register our new blot
    Quill.register(ResizableImage);
    
    // Add a click handler on the document to deselect images when clicking elsewhere
    document.addEventListener('click', function(e) {
        // If the click was not on an image or a resize handle, deselect all images
        if (!e.target.classList.contains('ql-resizable-image') && 
            !e.target.classList.contains('quill-image-resize-handle')) {
            
            document.querySelectorAll('.ql-resizable-image').forEach(img => {
                img.classList.remove('selected');
                if (img.nextElementSibling?.classList?.contains('quill-image-resize-container')) {
                    img.nextElementSibling.classList.remove('active');
                }
            });
        }
    });
    
    console.log('QuillJS Resizable Image module initialized');
})();
