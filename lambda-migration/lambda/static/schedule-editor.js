// Monthly Schedule Editor for Admin
window.ScheduleEditor = class ScheduleEditor {
    constructor(container) {
        this.container = container;
        this.schedule = [];
        this.isLoading = false;
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.setupEditor();
    }

    setupEditor() {
        this.container.innerHTML = `
            <div class="schedule-controls">
                <div class="month-navigation">
                    <button class="nav-btn prev-month">&lt; Prev</button>
                    <h2 class="current-month-display">Loading...</h2>
                    <button class="nav-btn next-month">Next &gt;</button>
                </div>
                <div class="actions">
                    <button class="primary-btn add-class-btn">Add Class</button>
                    <button class="secondary-btn save-schedule-btn">Save Schedule</button>
                    <span class="status-text" style="margin-left: 10px;"></span>
                </div>
            </div>
            <div class="schedule-loading" style="display: none; text-align: center; padding: 1rem;">
                <p>Loading class schedule...</p>
            </div>
            <div class="schedule-empty" style="display: none; text-align: center; padding: 1rem;">
                <p>No classes scheduled. Click "Add Class" to create your first class.</p>
            </div>
            <div class="monthly-calendar">
                <div class="calendar-header">
                    <div>Sunday</div>
                    <div>Monday</div>
                    <div>Tuesday</div>
                    <div>Wednesday</div>
                    <div>Thursday</div>
                    <div>Friday</div>
                    <div>Saturday</div>
                </div>
                <div class="calendar-body"></div>
            </div>
            <div class="modal" style="display: none;">
                <div class="modal-content">
                    <h3>Add/Edit Class</h3>
                    <div class="form-group">
                        <label for="class-name">Class Name</label>
                        <input type="text" id="class-name" required>
                    </div>
                    <div class="form-group">
                        <label for="class-date">Date</label>
                        <input type="date" id="class-date" required>
                    </div>
                    <div class="form-group">
                        <label for="class-time">Time</label>
                        <input type="time" id="class-time" required>
                    </div>
                    <div class="form-group">
                        <label for="class-duration">Duration (minutes)</label>
                        <input type="number" id="class-duration" min="15" step="15" value="60" required>
                    </div>
                    <div class="form-group">
                        <label for="class-capacity">Capacity</label>
                        <input type="number" id="class-capacity" min="1" value="10" required>
                    </div>
                    <div class="form-group">
                        <label for="class-description">Description</label>
                        <textarea id="class-description" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="class-category">Category</label>
                        <select id="class-category">
                            <option value="general">General</option>
                            <option value="beginners">Beginners</option>
                            <option value="advanced">Advanced</option>
                            <option value="specialized">Specialized</option>
                            <option value="workshop">Workshop</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button class="cancel-btn">Cancel</button>
                        <button class="primary-btn save-class-btn">Save</button>
                    </div>
                </div>
            </div>
        `;

        // Setup month navigation
        this.updateMonthDisplay();
        this.container.querySelector('.prev-month').addEventListener('click', () => {
            this.navigateMonth(-1);
        });
        this.container.querySelector('.next-month').addEventListener('click', () => {
            this.navigateMonth(1);
        });

        // Setup other event listeners
        this.container.querySelector('.add-class-btn').addEventListener('click', () => {
            this.showModal();
        });

        this.container.querySelector('.save-schedule-btn').addEventListener('click', () => {
            this.saveSchedule();
        });

        const modal = this.container.querySelector('.modal');
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.querySelector('.save-class-btn').addEventListener('click', () => {
            this.saveClass();
        });

        // Set default date in modal to today
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
        this.container.querySelector('#class-date').value = formattedDate;
        
        // Load initial schedule
        this.loadSchedule();
    }

    updateMonthDisplay() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        this.container.querySelector('.current-month-display').textContent = 
            `${monthNames[this.currentMonth]} ${this.currentYear}`;
    }

    navigateMonth(direction) {
        this.currentMonth += direction;
        
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        
        this.updateMonthDisplay();
        this.renderCalendar();
    }

    getDaysInMonth(month, year) {
        return new Date(year, month + 1, 0).getDate();
    }

    getFirstDayOfMonth(month, year) {
        return new Date(year, month, 1).getDay(); // 0 = Sunday, 6 = Saturday
    }

    renderCalendar() {
        const calendarBody = this.container.querySelector('.calendar-body');
        calendarBody.innerHTML = '';

        const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
        const firstDay = this.getFirstDayOfMonth(this.currentMonth, this.currentYear);
        
        let date = 1;
        let html = '<div class="calendar-week">';
        
        // Add empty cells for days before the first day of month
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
        
        // Fill the calendar with days
        while (date <= daysInMonth) {
            // If we've reached the end of a week, start a new row
            if ((date + firstDay - 1) % 7 === 0 && date !== 1) {
                html += '</div><div class="calendar-week">';
            }

            const currentDate = new Date(this.currentYear, this.currentMonth, date);
            const formattedDate = this.formatDate(currentDate);
            
            html += `
                <div class="calendar-day" data-date="${formattedDate}">
                    <div class="day-header">
                        <span class="day-number">${date}</span>
                    </div>
                    <div class="day-classes"></div>
                </div>
            `;
            
            date++;
        }
        
        // Add empty cells for days after the end of month to complete the last week
        const lastWeekCells = (date + firstDay - 1) % 7;
        if (lastWeekCells > 0) {
            for (let i = 0; i < 7 - lastWeekCells; i++) {
                html += '<div class="calendar-day empty"></div>';
            }
        }
        
        html += '</div>'; // Close the last week
        
        calendarBody.innerHTML = html;
        
        // Set up drag and drop for days
        this.setupDragAndDrop();
        
        // Populate classes on the calendar
        this.populateClasses();
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    parseDate(dateString) {
        // Parse YYYY-MM-DD format
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    setupDragAndDrop() {
        this.container.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
            day.addEventListener('dragover', e => {
                e.preventDefault();
                day.classList.add('drag-over');
            });

            day.addEventListener('dragleave', () => {
                day.classList.remove('drag-over');
            });

            day.addEventListener('drop', e => {
                e.preventDefault();
                day.classList.remove('drag-over');
                const classId = e.dataTransfer.getData('text/plain');
                const classBlock = document.getElementById(classId);
                if (classBlock) {
                    const oldDay = classBlock.parentElement.closest('.calendar-day');
                    const newDay = day;
                    
                    const classesContainer = newDay.querySelector('.day-classes');
                    classesContainer.appendChild(classBlock);
                    
                    this.updateClassDate(classId, newDay.dataset.date);
                }
            });
        });
    }

    async loadSchedule() {
        try {
            this.isLoading = true;
            this.updateUIState();

            const headers = getAuthHeaders();
            if (!headers) return;

            console.log('Fetching classes from API...');
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            // Try using admin/classes endpoint
            let response;
            
            response = await fetch('/dev/admin/classes', {
                headers,
                signal: controller.signal
            });
            
            if (!response.ok) {
                console.log(`Admin classes endpoint returned ${response.status}. Trying fallback...`);
                throw new Error('Admin endpoint failed');
            }

            clearTimeout(timeoutId);

            const data = await response.json();
            console.log('Received class data:', data);
            
            // Handle different response formats
            if (data.classes && Array.isArray(data.classes)) {
                this.schedule = data.classes;
                console.log(`Found ${this.schedule.length} classes in response from admin endpoint`);
            } else if (data.classes && data.classes.length === 0) {
                this.schedule = [];
                console.log('No classes found in the database');
            } else {
                // Try to handle other formats
                console.log('Attempting to parse alternative data format');
                this.schedule = [];
                
                if (Array.isArray(data)) {
                    this.schedule = data;
                } else {
                    for (const key in data) {
                        if (Array.isArray(data[key])) {
                            const possibleClasses = data[key];
                            if (possibleClasses.length > 0 && 
                                possibleClasses[0].title && 
                                (possibleClasses[0].scheduleDate || possibleClasses[0].date)) {
                                this.schedule = possibleClasses;
                                break;
                            }
                        }
                    }
                }
            }
            
            const statusText = this.container.querySelector('.status-text');
            statusText.textContent = `${this.schedule.length} classes scheduled`;

            // Trigger event for parent components
            const event = new CustomEvent('schedule-loaded', { 
                detail: { count: this.schedule.length } 
            });
            this.container.dispatchEvent(event);

            this.isLoading = false;
            this.updateUIState();
            this.renderCalendar();
        } catch (error) {
            console.error('Failed to load schedule:', error);
            showNotification('Failed to load schedule', 'error');
            this.isLoading = false;
            this.updateUIState();
        }
    }

    updateUIState() {
        const calendar = this.container.querySelector('.monthly-calendar');
        const emptyMessage = this.container.querySelector('.schedule-empty');
        const loadingMessage = this.container.querySelector('.schedule-loading');
        
        if (this.isLoading) {
            calendar.style.display = 'none';
            emptyMessage.style.display = 'none';
            loadingMessage.style.display = 'block';
        } else if (this.schedule.length === 0) {
            calendar.style.display = 'none';
            emptyMessage.style.display = 'block';
            loadingMessage.style.display = 'none';
        } else {
            calendar.style.display = 'block';
            emptyMessage.style.display = 'none';
            loadingMessage.style.display = 'none';
        }
    }

    populateClasses() {
        if (this.schedule.length === 0) return;
        
        console.log('Populating classes on calendar');
        
        // Reset all day containers
        this.container.querySelectorAll('.day-classes').forEach(container => {
            container.innerHTML = '';
        });
        
        // Get classes for the current month
        const classes = this.schedule.filter(classItem => {
            const classDate = this.parseDate(classItem.scheduleDate || classItem.date);
            return classDate.getMonth() === this.currentMonth && 
                  classDate.getFullYear() === this.currentYear;
        });
        
        console.log(`Found ${classes.length} classes for current month view`);
        
        // Add classes to their respective days
        classes.forEach(classItem => {
            const scheduleDate = classItem.scheduleDate || classItem.date;
            const dayElement = this.container.querySelector(`.calendar-day[data-date="${scheduleDate}"]`);
            
            if (!dayElement) {
                console.warn(`No calendar day found for class date: ${scheduleDate}`);
                return;
            }
            
            const classesContainer = dayElement.querySelector('.day-classes');
            
            const classBlock = document.createElement('div');
            classBlock.id = classItem.id;
            classBlock.className = 'class-block';
            classBlock.draggable = true;
            classBlock.innerHTML = `
                <div class="class-time">${classItem.startTime}</div>
                <div class="class-title">${classItem.title}</div>
                <div class="class-actions">
                    <button class="edit-btn">✏️</button>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;
            
            // Setup drag events
            classBlock.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', classItem.id);
            });

            // Setup action buttons
            classBlock.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.editClass(classItem);
            });

            classBlock.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteClass(classItem.id);
            });
            
            classesContainer.appendChild(classBlock);
        });
    }

    showModal(classData = null) {
        const modal = this.container.querySelector('.modal');
        const nameInput = modal.querySelector('#class-name');
        const dateInput = modal.querySelector('#class-date');
        const timeInput = modal.querySelector('#class-time');
        const durationInput = modal.querySelector('#class-duration');
        const capacityInput = modal.querySelector('#class-capacity');
        const descriptionInput = modal.querySelector('#class-description');
        const categoryInput = modal.querySelector('#class-category');

        if (classData) {
            nameInput.value = classData.title || '';
            dateInput.value = classData.scheduleDate || classData.date || '';
            timeInput.value = classData.startTime || '09:00';
            
            // Calculate duration in minutes if endTime is available
            if (classData.startTime && classData.endTime) {
                const startParts = classData.startTime.split(':').map(Number);
                const endParts = classData.endTime.split(':').map(Number);
                const startMinutes = startParts[0] * 60 + startParts[1];
                const endMinutes = endParts[0] * 60 + endParts[1];
                const duration = endMinutes - startMinutes;
                durationInput.value = duration > 0 ? duration : 60;
            } else {
                durationInput.value = classData.duration || 60;
            }
            
            capacityInput.value = classData.maxParticipants || 10;
            descriptionInput.value = classData.description || '';
            categoryInput.value = classData.category || 'general';
            
            modal.dataset.editId = classData.id;
        } else {
            nameInput.value = '';
            // Keep date as is (current value or today)
            timeInput.value = '09:00';
            durationInput.value = '60';
            capacityInput.value = '10';
            descriptionInput.value = '';
            categoryInput.value = 'general';
            delete modal.dataset.editId;
        }

        modal.style.display = 'flex';
    }

    async saveClass() {
        const modal = this.container.querySelector('.modal');
        const nameInput = modal.querySelector('#class-name');
        const dateInput = modal.querySelector('#class-date');
        const timeInput = modal.querySelector('#class-time');
        const durationInput = modal.querySelector('#class-duration');
        const capacityInput = modal.querySelector('#class-capacity');
        const descriptionInput = modal.querySelector('#class-description');
        const categoryInput = modal.querySelector('#class-category');

        // Input validation
        if (!nameInput.value.trim()) {
            showNotification('Class name is required', 'error');
            return;
        }
        
        if (!dateInput.value) {
            showNotification('Date is required', 'error');
            return;
        }

        if (!timeInput.value) {
            showNotification('Start time is required', 'error');
            return;
        }

        // Calculate end time based on duration
        const duration = parseInt(durationInput.value) || 60;
        const [hours, minutes] = timeInput.value.split(':').map(Number);
        const endMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

        // Extract day of week from selected date
        const selectedDate = new Date(dateInput.value);
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = daysOfWeek[selectedDate.getDay()];
        
        const classData = {
            title: nameInput.value,
            scheduleDate: dateInput.value,
            date: dateInput.value, // Ensure compatibility with different API formats
            day: dayOfWeek,
            startTime: timeInput.value,
            endTime: endTime,
            maxParticipants: parseInt(capacityInput.value) || 10,
            description: descriptionInput.value || `${nameInput.value} class`,
            price: 25, // Default price
            category: categoryInput.value,
            level: 'all-levels',
            duration: duration,
            location: 'Main Studio',
            status: 'active'
        };

        try {
            const url = modal.dataset.editId 
                ? `/dev/admin/classes/${modal.dataset.editId}`
                : '/dev/admin/classes';

            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch(url, {
                method: modal.dataset.editId ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify(classData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save class');
            }

            showNotification('Class saved successfully', 'success');
            modal.style.display = 'none';
            
            // Trigger custom event
            const event = new CustomEvent('schedule-updated', { 
                detail: { action: modal.dataset.editId ? 'update' : 'create' } 
            });
            this.container.dispatchEvent(event);
            
            this.loadSchedule();
        } catch (error) {
            console.error('Failed to save class:', error);
            showNotification(`Failed to save class: ${error.message}`, 'error');
        }
    }

    editClass(classData) {
        this.showModal(classData);
    }

    async deleteClass(classId) {
        if (!confirm('Are you sure you want to delete this class?')) return;

        try {
            // First, try deleting through the admin API
            console.log(`Attempting to delete class ${classId} via admin API`);
            const headers = getAuthHeaders();
            if (!headers) return;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`/dev/admin/classes/${classId}`, {
                method: 'DELETE',
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.log(`Admin delete returned ${response.status}`);
                throw new Error('Admin delete failed');
            }

            showNotification('Class deleted successfully', 'success');
            
            // Update local array
            this.schedule = this.schedule.filter(c => c.id !== classId);
            
            // Update status
            const statusText = this.container.querySelector('.status-text');
            statusText.textContent = `${this.schedule.length} classes scheduled`;
            
            // Trigger custom event
            const event = new CustomEvent('schedule-updated', { 
                detail: { action: 'delete', classId } 
            });
            this.container.dispatchEvent(event);
            
            this.renderCalendar();
            this.updateUIState();
        } catch (error) {
            console.error('Failed to delete class:', error);
            showNotification(`Failed to delete class: ${error.message}`, 'error');
        }
    }

    async updateClassDate(classId, newDate) {
        console.log(`Updating class ${classId} to date ${newDate}`);
        
        const classData = this.schedule.find(c => c.id === classId);
        if (!classData) {
            console.error(`Class not found in schedule: ${classId}`);
            return;
        }

        // Extract day of week from new date
        const selectedDate = this.parseDate(newDate);
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = daysOfWeek[selectedDate.getDay()];

        // Update the date
        classData.scheduleDate = newDate;
        classData.date = newDate; // Ensure compatibility with different API formats
        classData.day = dayOfWeek;
        
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`/dev/admin/classes/${classId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(classData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update class date');
            }

            showNotification('Class date updated successfully', 'success');
            
            // Trigger custom event
            const event = new CustomEvent('schedule-updated', { 
                detail: { action: 'move', classId } 
            });
            this.container.dispatchEvent(event);
            
            // Update the schedule locally
            const index = this.schedule.findIndex(c => c.id === classId);
            if (index !== -1) {
                this.schedule[index] = classData;
            }
            
        } catch (error) {
            console.error('Failed to update class:', error);
            showNotification(`Failed to update class: ${error.message}`, 'error');
            this.loadSchedule(); // Reload to revert changes
        }
    }

    async saveSchedule() {
        try {
            showNotification('Saving class schedule...', 'info');
            const statusText = this.container.querySelector('.status-text');
            statusText.textContent = 'Saving schedule...';
            
            let successCount = 0;
            let failCount = 0;
            
            // For each class, ensure it's saved to the server
            for (const classItem of this.schedule) {
                try {
                    const headers = getAuthHeaders();
                    if (!headers) return;
                    
                    const url = `/dev/admin/classes/${classItem.id}`;
                    const response = await fetch(url, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify(classItem)
                    });
                    
                    if (response.ok) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (e) {
                    console.error(`Error updating class ${classItem.id}:`, e);
                    failCount++;
                }
            }

            if (failCount === 0) {
                showNotification('Schedule saved successfully', 'success');
                statusText.textContent = `${this.schedule.length} classes scheduled`;
                
                // Trigger custom event
                const event = new CustomEvent('schedule-updated', { 
                    detail: { action: 'save-all' } 
                });
                this.container.dispatchEvent(event);
            } else {
                showNotification(`Schedule partially saved. ${failCount} classes failed to update.`, 'warning');
                statusText.textContent = `${successCount}/${this.schedule.length} classes saved`;
            }
        } catch (error) {
            console.error('Failed to save schedule:', error);
            showNotification('Failed to save schedule', 'error');
        }
    }
}

// Helper function for getting auth headers
function getAuthHeaders() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/dev/login.html';
            return null;
        }
        
        // Ensure token doesn't already have 'Bearer ' prefix
        const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
        console.log('Using auth token:', cleanToken.substring(0, 10) + '...');
        
        const headers = {
            'Authorization': `Bearer ${cleanToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Add more debug logs
        console.log('Authorization header:', headers.Authorization.substring(0, 15) + '...');
        
        return headers;
    } catch (error) {
        console.error('Error preparing auth headers:', error);
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }
}

// Schedule-specific notification function
function showNotification(message, type = 'success') {
    // Use admin's notification function if it exists and is NOT this function
    // (prevents infinite recursion)
    if (typeof window.showNotification === 'function' && 
        window.showNotification !== showNotification) {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback to creating our own notification
    let notification = document.getElementById('schedule-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'schedule-notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
