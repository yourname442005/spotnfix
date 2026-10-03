// Community View JavaScript - Updated to match React+Vite+TypeScript patterns
document.addEventListener('DOMContentLoaded', function() {
    // State management similar to React useState
    let currentState = {
        currentView: 'community',
        userRole: 'EO',
        userData: {
            name: 'Admin User',
            department: 'Department',
            deptId: 'Admin',
            role: 'Executive Officer'
        },
        messages: [
            {
                id: 1,
                sender: 'EO - Ramesh Kumar',
                role: 'Executive Officer',
                message: 'Electrical team has completed 5 street light repairs today. 3 more pending for tomorrow.',
                timestamp: '2:30 PM',
                priority: false
            },
            {
                id: 2,
                sender: 'You',
                role: 'Current User',
                message: 'Great work! Please prioritize the remaining 3 for early morning tomorrow.',
                timestamp: '2:35 PM',
                priority: false
            },
            {
                id: 3,
                sender: 'Dept Head - Sanitation',
                role: 'Department Head',
                message: 'Garbage collection truck broke down in Sector 3. Alternative arrangements made.',
                timestamp: '1:45 PM',
                priority: true
            },
            {
                id: 4,
                sender: 'Admin - Municipal Office',
                role: 'Administrator',
                message: 'Weekly performance review scheduled for Friday 10 AM. All dept heads please confirm.',
                timestamp: '12:15 PM',
                priority: false
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
    
    // Chat input handling
    const chatInput = document.querySelector('.chat-input input');
    const sendButton = document.querySelector('.chat-input button');
    
    if (chatInput && sendButton) {
        // Send message on button click
        sendButton.addEventListener('click', sendMessage);
        
        // Send message on Enter key
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        function sendMessage() {
            const message = chatInput.value.trim();
            if (message) {
                // In a real implementation, this would send the message to the server
                alert(`Message sent: ${message}`);
                chatInput.value = '';
            }
        }
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
    console.log('Community view loaded with React-like patterns');
});