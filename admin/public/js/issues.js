// Issues View JavaScript - Updated to match React+Vite+TypeScript patterns
document.addEventListener('DOMContentLoaded', function() {
    // State management similar to React useState
    let currentState = {
        currentView: 'issues',
        userRole: 'EO',
        userData: {
            name: 'Admin User',
            department: 'Department',
            deptId: 'Admin',
            role: 'Executive Officer'
        },
        issues: [
            {
                id: 'CIV-2025-001',
                title: 'Street light not working',
                location: 'Main Road, Sector 5',
                status: 'In Progress',
                priority: 'High',
                department: 'Electrical',
                assignee: 'Ramesh Kumar',
                slaDeadline: '4 hours',
                aiConfidence: 95,
                reportedBy: 'Citizen App',
                timeAgo: '6 hours ago'
            },
            {
                id: 'CIV-2025-002',
                title: 'Water logging issue',
                location: 'Park Avenue, Sector 2',
                status: 'Pending',
                priority: 'Medium',
                department: 'Public Works',
                assignee: 'Unassigned',
                slaDeadline: '2 days',
                aiConfidence: 87,
                reportedBy: 'WhatsApp',
                timeAgo: '2 hours ago'
            },
            {
                id: 'CIV-2025-003',
                title: 'Garbage collection missed',
                location: 'Residential Block A',
                status: 'Resolved',
                priority: 'Low',
                department: 'Sanitation',
                assignee: 'Suresh Singh',
                slaDeadline: 'Completed',
                aiConfidence: 98,
                reportedBy: 'IVR Call',
                timeAgo: '1 day ago'
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
    
    // Filter and Search buttons
    const filterButton = document.querySelector('.view-header .btn-outline:first-child');
    const searchButton = document.querySelector('.view-header .btn-outline:last-child');
    
    if (filterButton) {
        filterButton.addEventListener('click', function() {
            alert('Filter options would appear here in a full implementation');
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            alert('Search functionality would appear here in a full implementation');
        });
    }
    
    // Action buttons
    const actionButtons = document.querySelectorAll('.issue-actions .btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const buttonText = this.textContent.trim();
            if (buttonText.includes('View Details')) {
                alert('Issue details would appear here in a full implementation');
            } else if (buttonText.includes('Assign')) {
                alert('Assignment functionality would appear here in a full implementation');
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
    console.log('Issues view loaded with React-like patterns');
});