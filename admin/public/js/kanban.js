// Kanban View JavaScript - Updated to match React+Vite+TypeScript patterns
document.addEventListener('DOMContentLoaded', function() {
    // State management similar to React useState
    let currentState = {
        currentView: 'kanban',
        userRole: 'EO',
        userData: {
            name: 'Admin User',
            department: 'Department',
            deptId: 'Admin',
            role: 'Executive Officer'
        },
        tasks: {
            todo: [
                {
                    id: 'TASK-001',
                    title: 'Street light repair',
                    issueId: 'CIV-2025-001',
                    location: 'Sector 5',
                    priority: 'High',
                    assignee: 'Ramesh Kumar',
                    dueDate: 'Today'
                },
                {
                    id: 'TASK-002',
                    title: 'Water logging issue',
                    issueId: 'CIV-2025-002',
                    location: 'Sector 2',
                    priority: 'Medium',
                    assignee: 'Unassigned',
                    dueDate: '2 days'
                }
            ],
            inProgress: [
                {
                    id: 'TASK-003',
                    title: 'Garbage collection',
                    issueId: 'CIV-2025-003',
                    location: 'Block A',
                    priority: 'Low',
                    assignee: 'Suresh Singh',
                    dueDate: 'Completed'
                }
            ],
            review: [
                {
                    id: 'TASK-004',
                    title: 'Park maintenance',
                    issueId: 'CIV-2025-004',
                    location: 'Sector 4',
                    priority: 'Low',
                    assignee: 'Santosh Kumar',
                    dueDate: '2 days'
                }
            ],
            done: [
                {
                    id: 'TASK-005',
                    title: 'Road repair',
                    issueId: 'CIV-2025-005',
                    location: 'Sector 8',
                    priority: 'Low',
                    assignee: 'Vikash Jha',
                    dueDate: 'Completed'
                }
            ]
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
    
    // Filter and New Task buttons
    const filterButton = document.querySelector('.view-header .btn-outline');
    const newTaskButton = document.querySelector('.view-header .btn-primary');
    
    if (filterButton) {
        filterButton.addEventListener('click', function() {
            alert('Filter options would appear here in a full implementation');
        });
    }
    
    if (newTaskButton) {
        newTaskButton.addEventListener('click', function() {
            alert('New task form would appear here in a full implementation');
        });
    }
    
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
    console.log('Kanban view loaded with React-like patterns');
});