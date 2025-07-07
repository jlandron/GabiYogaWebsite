/**
 * Communications Manager for Admin Panel
 * Handles displaying and managing contact form submissions
 */
class CommunicationsManager {
    constructor(container) {
        this.container = container;
        this.messages = [];
        this.statusFilter = 'all'; // 'all', 'new', 'read', 'archived'
        
        // Initialize UI
        this.init();
    }
    
    /**
     * Initialize the communications manager UI
     */
    init() {
        this.container.innerHTML = `
            <h2>Contact Messages</h2>
            <p>View and manage contact form submissions from your website visitors.</p>
            
            <div class="filter-controls">
                <label for="status-filter">Filter by status: </label>
                <select id="status-filter">
                    <option value="all">All Messages</option>
                    <option value="NEW">New</option>
                    <option value="READ">Read</option>
                    <option value="ARCHIVED">Archived</option>
                </select>
            </div>
            
            <div class="messages-container">
                <div id="messages-loading" class="loading">
                    <p>Loading messages...</p>
                </div>
                <div id="messages-list" class="messages-list" style="display: none;"></div>
                <div id="messages-empty" class="empty-state" style="display: none;">
                    <p>No messages found.</p>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.loadMessages();
        });
        
        // Load messages
        this.loadMessages();
    }
    
    /**
     * Load messages from the API
     */
    async loadMessages() {
        try {
            const loadingEl = document.getElementById('messages-loading');
            const listEl = document.getElementById('messages-list');
            const emptyEl = document.getElementById('messages-empty');
            
            // Show loading state
            loadingEl.style.display = 'block';
            listEl.style.display = 'none';
            emptyEl.style.display = 'none';
            
            // Build API URL with filters
            let url = '/admin/communications';
            const params = [];
            
            // Add status filter if not 'all'
            if (this.statusFilter !== 'all') {
                params.push(`status=${this.statusFilter}`);
            }
            
            // Add type filter for contact messages
            params.push('type=CONTACT');
            
            // Add limit parameter
            params.push('limit=100');
            
            // Append query string if we have parameters
            if (params.length > 0) {
                url += '?' + params.join('&');
            }
            
            // Fetch messages
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.messages = data.messages || [];
            
            // Update UI
            loadingEl.style.display = 'none';
            
            if (this.messages.length === 0) {
                emptyEl.style.display = 'block';
            } else {
                listEl.style.display = 'block';
                this.renderMessages();
            }
            
        } catch (error) {
            console.error('Error loading messages:', error);
            document.getElementById('messages-loading').innerHTML = `
                <p style="color: var(--color-error);">
                    <strong>Error loading messages</strong><br>
                    ${error.message}
                </p>
            `;
        }
    }
    
    /**
     * Render messages in the UI
     */
    renderMessages() {
        const listEl = document.getElementById('messages-list');
        
        // Sort messages by date (newest first)
        const sortedMessages = [...this.messages].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        // Create HTML for each message
        listEl.innerHTML = sortedMessages.map(message => {
            const status = message.status || 'NEW';
            const date = new Date(message.createdAt).toLocaleString();
            const notes = message.notes || '';
            
            return `
                <div class="message-item ${status.toLowerCase()}" data-id="${message.id}">
                    <div class="message-header" onclick="communicationsManager.toggleMessageExpand('${message.id}')">
                        <div class="message-meta">
                            <span class="message-from">${message.name} &lt;${message.email}&gt;</span>
                            <span class="message-date">${date}</span>
                        </div>
                        <span class="message-status ${status.toLowerCase()}">${status}</span>
                    </div>
                    <div class="message-body">
                        <div class="message-content">
                            ${message.message}
                        </div>
                        <div class="message-notes">
                            <h4>Admin Notes</h4>
                            <textarea class="message-notes-input" data-id="${message.id}">${notes}</textarea>
                        </div>
                        <div class="message-actions">
                            ${status !== 'READ' ? 
                                `<button class="secondary-btn" onclick="communicationsManager.updateMessageStatus('${message.id}', 'READ')">
                                    Mark as Read
                                </button>` : ''}
                            ${status !== 'ARCHIVED' ? 
                                `<button class="secondary-btn" onclick="communicationsManager.updateMessageStatus('${message.id}', 'ARCHIVED')">
                                    Archive
                                </button>` : ''}
                            ${status === 'ARCHIVED' ? 
                                `<button class="secondary-btn" onclick="communicationsManager.updateMessageStatus('${message.id}', 'READ')">
                                    Unarchive
                                </button>` : ''}
                            <button class="secondary-btn" onclick="communicationsManager.saveNotes('${message.id}')">
                                Save Notes
                            </button>
                            <button class="cancel-btn" onclick="communicationsManager.deleteMessage('${message.id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Toggle expansion of a message item
     */
    toggleMessageExpand(messageId) {
        const messageEl = document.querySelector(`.message-item[data-id="${messageId}"]`);
        if (messageEl) {
            messageEl.classList.toggle('expanded');
            
            // If the message is expanded and has 'NEW' status, mark it as read
            if (messageEl.classList.contains('expanded') && messageEl.classList.contains('new')) {
                this.updateMessageStatus(messageId, 'READ');
            }
        }
    }
    
    /**
     * Update the status of a message
     */
    async updateMessageStatus(messageId, status) {
        try {
            const response = await fetch(`/admin/communications/${messageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ status })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Update the message in our local array
                const messageIndex = this.messages.findIndex(m => m.id === messageId);
                if (messageIndex !== -1) {
                    this.messages[messageIndex].status = status;
                }
                
                // Show notification
                showNotification(`Message marked as ${status.toLowerCase()}`);
                
                // Refresh the UI
                this.renderMessages();
            } else {
                throw new Error(data.message || 'Failed to update message status');
            }
        } catch (error) {
            console.error('Error updating message status:', error);
            showNotification(`Error: ${error.message}`, 'error');
        }
    }
    
    /**
     * Save notes for a message
     */
    async saveNotes(messageId) {
        try {
            const notesEl = document.querySelector(`.message-notes-input[data-id="${messageId}"]`);
            if (!notesEl) return;
            
            const notes = notesEl.value.trim();
            
            const response = await fetch(`/admin/communications/${messageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ notes })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Update the message in our local array
                const messageIndex = this.messages.findIndex(m => m.id === messageId);
                if (messageIndex !== -1) {
                    this.messages[messageIndex].notes = notes;
                }
                
                // Show notification
                showNotification('Notes saved successfully');
            } else {
                throw new Error(data.message || 'Failed to save notes');
            }
        } catch (error) {
            console.error('Error saving notes:', error);
            showNotification(`Error: ${error.message}`, 'error');
        }
    }
    
    /**
     * Delete a message
     */
    async deleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/admin/communications/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Remove the message from our local array
                this.messages = this.messages.filter(m => m.id !== messageId);
                
                // Show notification
                showNotification('Message deleted successfully');
                
                // Refresh the UI
                this.renderMessages();
                
                // Show empty state if no messages left
                if (this.messages.length === 0) {
                    document.getElementById('messages-list').style.display = 'none';
                    document.getElementById('messages-empty').style.display = 'block';
                }
            } else {
                throw new Error(data.message || 'Failed to delete message');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            showNotification(`Error: ${error.message}`, 'error');
        }
    }
}
