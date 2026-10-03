// SLA Tracker View JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Navigation handling
    const navItems = document.querySelectorAll('.nav-item');
    const backBtn = document.querySelector('.back-btn');
    
    // Navigation event listeners
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Get the view name from data attribute
            const viewName = this.getAttribute('data-view');
            
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
    
    // Role switching
    const eoRoleBtn = document.getElementById('eo-role');
    const deptHeadRoleBtn = document.getElementById('dept-head-role');
    
    eoRoleBtn.addEventListener('click', function() {
        this.classList.remove('btn-outline');
        this.classList.add('btn-primary');
        deptHeadRoleBtn.classList.remove('btn-primary');
        deptHeadRoleBtn.classList.add('btn-outline');
        document.querySelector('.role').textContent = 'Executive Officer';
    });
    
    deptHeadRoleBtn.addEventListener('click', function() {
        this.classList.remove('btn-outline');
        this.classList.add('btn-primary');
        eoRoleBtn.classList.remove('btn-primary');
        eoRoleBtn.classList.add('btn-outline');
        document.querySelector('.role').textContent = 'Department Head';
    });
    
    // Initialize the page
    console.log('SLA Tracker view loaded');
});