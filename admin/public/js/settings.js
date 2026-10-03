// Settings View JavaScript - Updated to match React+Vite+TypeScript patterns
document.addEventListener('DOMContentLoaded', function() {
    // State management similar to React useState
    let currentState = {
        currentView: 'settings',
        userRole: 'EO',
        userData: {
            name: 'Admin User',
            email: 'admin@example.com',
            department: 'Public Works',
            role: 'Executive Officer'
        },
        settings: {
            notifications: {
                email: true,
                sms: true,
                push: false
            },
            security: {
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }
        }
    };

    // Navigation handling
    const navItems = document.querySelectorAll('.nav-item');
    const backBtn = document.querySelector('.back-btn');
    
    // Navigation event listeners
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Get the view name from data attribute
            const viewName = this.getAttribute('data-view');
            
            // Update state
            currentState.currentView = viewName;
            
            // Navigate to the appropriate page
            switch(viewName) {
                case 'dashboard':
                    window.location.href = 'admin-portal.html';
                    break;
                case 'issues':
                    window.location.href = 'issues.html';
                    break;
                case 'community':
                    window.location.href = 'community.html';
                    break;
                case 'assignments':
                    window.location.href = 'assignments.html';
                    break;
                case 'kanban':
                    window.location.href = 'kanban.html';
                    break;
                case 'ai-routing':
                    window.location.href = 'ai-routing.html';
                    break;
                case 'sla-tracker':
                    window.location.href = 'sla-tracker.html';
                    break;
                case 'settings':
                    window.location.href = 'settings.html';
                    break;
                default:
                    window.location.href = 'admin-portal.html';
            }
        });
    });
    
    // Back button event listener
    backBtn.addEventListener('click', function() {
        window.location.href = 'admin-portal.html';
    });
    
    // Save buttons
    const saveButtons = document.querySelectorAll('.btn-primary');
    saveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.card');
            if (card) {
                const title = card.querySelector('.card-title').textContent;
                alert(`${title} saved successfully!`);
                // In a real implementation, this would save the settings
            }
        });
    });
    
    // Role switching
    const eoRoleBtn = document.getElementById('eo-role');
    const deptHeadRoleBtn = document.getElementById('dept-head-role');
    
    eoRoleBtn.addEventListener('click', function() {
        this.classList.remove('btn-outline');
        this.classList.add('btn-primary');
        deptHeadRoleBtn.classList.remove('btn-primary');
        deptHeadRoleBtn.classList.add('btn-outline');
        document.querySelector('.role').textContent = 'Executive Officer';
        
        // Update state
        currentState.userRole = 'EO';
    });
    
    deptHeadRoleBtn.addEventListener('click', function() {
        this.classList.remove('btn-outline');
        this.classList.add('btn-primary');
        eoRoleBtn.classList.remove('btn-primary');
        eoRoleBtn.classList.add('btn-outline');
        document.querySelector('.role').textContent = 'Department Head';
        
        // Update state
        currentState.userRole = 'DEPT_HEAD';
    });
    
    // Form input handling
    const formInputs = document.querySelectorAll('.form-input, .form-select');
    formInputs.forEach(input => {
        input.addEventListener('change', function() {
            // Update state based on input
            const id = this.id;
            const value = this.value;
            
            // Update corresponding state property
            if (id === 'name') {
                currentState.userData.name = value;
            } else if (id === 'email') {
                currentState.userData.email = value;
            } else if (id === 'department') {
                currentState.userData.department = value;
            }
            
            console.log('State updated:', currentState);
        });
    });
    
    // Checkbox handling
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.closest('.checkbox-label');
            const text = label.textContent.trim();
            
            // Update state based on checkbox
            if (text.includes('Email')) {
                currentState.settings.notifications.email = this.checked;
            } else if (text.includes('SMS')) {
                currentState.settings.notifications.sms = this.checked;
            } else if (text.includes('Push')) {
                currentState.settings.notifications.push = this.checked;
            }
            
            console.log('Settings updated:', currentState.settings);
        });
    });
    
    // Function to simulate React-like component rendering
    function renderView() {
        // In a single-page app, this would update the DOM
        // For multi-page app, we're just logging the current state
        console.log('Current State:', currentState);
    }
    
    // Initialize the page
    renderView();
    console.log('Settings view loaded with React-like patterns');
});