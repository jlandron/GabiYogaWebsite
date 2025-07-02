
class ScheduleEditor {
    constructor(container) {
        this.container = container;
        this.schedule = [];
        this.setupEditor();
    }

    setupEditor() {
        this.container.innerHTML = `
            <div class="schedule-controls">
                <button class="primary-btn add-class-btn">Add Class</button>
                <button class="secondary-btn save-schedule-btn">Save Schedule</button>
            </div>
            <div class="schedule-calendar">
                <div class="calendar-header time-slot">Time</div>
                <div class="calendar-header">Monday</div>
                <div class="calendar-header">Tuesday</div>
                <div class="calendar-header">Wednesday</div>
                <div class="calendar-header">Thursday</div>
                <div class="calendar-header">Friday</div>
                <div class="calendar-header">Saturday</div>
                <div class="calendar-header">Sunday</div>
                ${this.generateTimeSlots()}
            </div>
            <div class="modal" style="display: none;">
                <div class="modal-content">
                    <h3>Add/Edit Class</h3>
                    <div class="form-group">
                        <label for="class-name">Class Name</label>
                        <input type="text" id="class-name" required>
                    </div>
                    <div class="form-group">
                        <label for="class-day">Day</label>
                        <select id="class-day" required>
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                            <option value="sunday">Sunday</option>
                        </select>
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
                    <div class="modal-actions">
                        <button class="cancel-btn">Cancel</button>
                        <button class="primary-btn save-class-btn">Save</button>
                    </div>
                </div>
            </div>
        `;

        // Setup event listeners
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

        // Setup drag and drop
        this.setupDragAndDrop();
        
        // Load initial schedule
        this.loadSchedule();
    }

    generateTimeSlots() {
        let html = '';
        for (let hour = 6; hour <= 20; hour++) {
            const time = `${hour.toString().padStart(2, '0')}:00`;
            html += `
                <div class="time-slot">${time}</div>
                <div class="calendar-slot" data-day="monday" data-time="${time}"></div>
                <div class="calendar-slot" data-day="tuesday" data-time="${time}"></div>
                <div class="calendar-slot" data-day="wednesday" data-time="${time}"></div>
                <div class="calendar-slot" data-day="thursday" data-time="${time}"></div>
                <div class="calendar-slot" data-day="friday" data-time="${time}"></div>
                <div class="calendar-slot" data-day="saturday" data-time="${time}"></div>
                <div class="calendar-slot" data-day="sunday" data-time="${time}"></div>
            `;
        }
        return html;
    }

    setupDragAndDrop() {
        this.container.querySelectorAll('.calendar-slot').forEach(slot => {
            slot.addEventListener('dragover', e => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', e => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const classId = e.dataTransfer.getData('text/plain');
                const classBlock = document.getElementById(classId);
                if (classBlock) {
                    const oldSlot = classBlock.parentElement;
                    slot.appendChild(classBlock);
                    this.updateClassTime(classId, slot.dataset.day, slot.dataset.time);
                }
            });
        });
    }

    async loadSchedule() {
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch('/dev/schedule', {
                headers,
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to load schedule');

            const schedule = await response.json();
            this.schedule = schedule;
            this.renderSchedule();
        } catch (error) {
            console.error('Failed to load schedule:', error);
            showNotification('Failed to load schedule', 'error');
        }
    }

    renderSchedule() {
        // Clear existing classes
        this.container.querySelectorAll('.class-block').forEach(block => block.remove());

        // Render each class
        this.schedule.forEach(classItem => {
            const slot = this.container.querySelector(
                `.calendar-slot[data-day="${classItem.day}"][data-time="${classItem.time}"]`
            );

            if (slot) {
                const classBlock = document.createElement('div');
                classBlock.id = classItem.id;
                classBlock.className = 'class-block';
                classBlock.draggable = true;
                classBlock.innerHTML = `
                    <div class="class-info">
                        <strong>${classItem.name}</strong>
                        <span>${classItem.time}</span>
                    </div>
                    <div class="class-actions">
                        <button class="edit-btn">Edit</button>
                        <button class="delete-btn">Delete</button>
                    </div>
                `;

                // Setup drag events
                classBlock.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('text/plain', classItem.id);
                });

                // Setup action buttons
                classBlock.querySelector('.edit-btn').addEventListener('click', () => {
                    this.editClass(classItem);
                });

                classBlock.querySelector('.delete-btn').addEventListener('click', () => {
                    this.deleteClass(classItem.id);
                });

                slot.appendChild(classBlock);
            }
        });
    }

    showModal(classData = null) {
        const modal = this.container.querySelector('.modal');
        const nameInput = modal.querySelector('#class-name');
        const daySelect = modal.querySelector('#class-day');
        const timeInput = modal.querySelector('#class-time');
        const durationInput = modal.querySelector('#class-duration');
        const capacityInput = modal.querySelector('#class-capacity');

        if (classData) {
            nameInput.value = classData.name;
            daySelect.value = classData.day;
            timeInput.value = classData.time;
            durationInput.value = classData.duration;
            capacityInput.value = classData.capacity;
            modal.dataset.editId = classData.id;
        } else {
            nameInput.value = '';
            daySelect.value = 'monday';
            timeInput.value = '09:00';
            durationInput.value = '60';
            capacityInput.value = '10';
            delete modal.dataset.editId;
        }

        modal.style.display = 'flex';
    }

    async saveClass() {
        const modal = this.container.querySelector('.modal');
        const nameInput = modal.querySelector('#class-name');
        const daySelect = modal.querySelector('#class-day');
        const timeInput = modal.querySelector('#class-time');
        const durationInput = modal.querySelector('#class-duration');
        const capacityInput = modal.querySelector('#class-capacity');

        const classData = {
            name: nameInput.value,
            day: daySelect.value,
            time: timeInput.value,
            duration: parseInt(durationInput.value),
            capacity: parseInt(capacityInput.value)
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
                body: JSON.stringify(classData),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to save class');

            showNotification('Class saved successfully', 'success');
            modal.style.display = 'none';
            this.loadSchedule();
        } catch (error) {
            console.error('Failed to save class:', error);
            showNotification('Failed to save class', 'error');
        }
    }

    editClass(classData) {
        this.showModal(classData);
    }

    async deleteClass(classId) {
        if (!confirm('Are you sure you want to delete this class?')) return;

        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`/dev/admin/classes/${classId}`, {
                method: 'DELETE',
                headers,
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to delete class');

            showNotification('Class deleted successfully', 'success');
            this.loadSchedule();
        } catch (error) {
            console.error('Failed to delete class:', error);
            showNotification('Failed to delete class', 'error');
        }
    }

    async updateClassTime(classId, newDay, newTime) {
        const classData = this.schedule.find(c => c.id === classId);
        if (!classData) return;

        classData.day = newDay;
        classData.time = newTime;

        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`/dev/admin/classes/${classId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(classData),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to update class');

            showNotification('Class updated successfully', 'success');
            this.loadSchedule();
        } catch (error) {
            console.error('Failed to update class:', error);
            showNotification('Failed to update class', 'error');
            this.loadSchedule(); // Reload to revert changes
        }
    }

    async saveSchedule() {
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch('/dev/admin/settings', {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    schedule: this.schedule
                }),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to save schedule');

            showNotification('Schedule saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save schedule:', error);
            showNotification('Failed to save schedule', 'error');
        }
    }
}

// Helper function for getting auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/dev/login.html';
        return null;
    }
    return {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}
