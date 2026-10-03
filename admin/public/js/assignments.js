// Assignments View JavaScript - Updated to match React+Vite+TypeScript patterns
document.addEventListener('DOMContentLoaded', function() {
    // State management similar to React useState
    let currentState = {
        currentView: 'assignments',
        userRole: 'EO',
        userData: {
            name: 'Admin User',
            department: 'Department',
            deptId: 'Admin',
            role: 'Executive Officer'
        },
        assignments: [
            {
                id: 'ASG-001',
                issueId: 'CIV-2025-001',
                issueTitle: 'Street light not working',
                assignedBy: 'EO - Ramesh Kumar',
                assignedTo: 'Electrical Dept - Suresh Kumar',
                department: 'Electrical',
                priority: 'High',
                assignedTime: '09:30 AM',
                status: 'In Progress',
                estimatedCompletion: '2 hours',
                location: 'Main Road, Sector 5',
                description: 'Street light pole #45 not working. Requires bulb replacement and wiring check.',
                deptHeadNotes: 'Team dispatched at 10:15 AM. Parts available in stock.'
            },
            {
                id: 'ASG-002',
                issueId: 'CIV-2025-002',
                issueTitle: 'Water logging issue',
                assignedBy: 'EO - Ramesh Kumar',
                assignedTo: 'Public Works - Rajesh Singh',
                department: 'Public Works',
                priority: 'Medium',
                assignedTime: '10:15 AM',
                status: 'Assigned',
                estimatedCompletion: '4 hours',
                location: 'Park Avenue, Sector 2',
                description: 'Water accumulation due to blocked drainage. Requires cleaning and inspection.',
                deptHeadNotes: ''
            }
        ]
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
    
    // Filter and View Previous Days buttons
    const filterButton = document.querySelector('.card-header .btn-outline:first-child');
    const viewPreviousButton = document.querySelector('.card-header .btn-outline:last-child');
    
    if (filterButton) {
        filterButton.addEventListener('click', function() {
            alert('Filter options would appear here in a full implementation');
        });
    }
    
    if (viewPreviousButton) {
        viewPreviousButton.addEventListener('click', function() {
            alert('Previous days view would appear here in a full implementation');
        });
    }
    
    // Action buttons
    const actionButtons = document.querySelectorAll('.assignment-status .btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const buttonText = this.textContent.trim();
            if (buttonText.includes('Track Progress')) {
                alert('Progress tracking would appear here in a full implementation');
            } else if (buttonText.includes('Follow Up')) {
                alert('Follow up functionality would appear here in a full implementation');
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
    
    // Function to simulate React-like component rendering
    function renderView() {
        // In a single-page app, this would update the DOM
        // For multi-page app, we're just logging the current state
        console.log('Current State:', currentState);
    }
    
    // Initialize the page
    renderView();
    console.log('Assignments view loaded with React-like patterns');
});