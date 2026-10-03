// Escalations JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Navigation handling
    const navItems = document.querySelectorAll('.nav-item');
    const backBtn = document.querySelector('.back-btn');
    
    // Navigation event listeners
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get the view name from data attribute
            const view = this.getAttribute('data-view');
            
            // Redirect to the main portal with the selected view
            window.location.href = `dm-portal.html#${view}`;
        });
    });
    
    // Back button event listener
    backBtn.addEventListener('click', function() {
        window.location.href = 'dm-portal.html';
    });
    
    // Action button event listeners
    const viewButtons = document.querySelectorAll('.btn-outline');
    const actionButtons = document.querySelectorAll('.btn-primary');
    
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const escalationCard = this.closest('.escalation-card');
            const title = escalationCard.querySelector('h3').textContent;
            console.log('Viewing details for:', title);
            // In a real implementation, this would show escalation details
            alert(`Viewing details for: ${title}`);
        });
    });
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const escalationCard = this.closest('.escalation-card');
            const title = escalationCard.querySelector('h3').textContent;
            console.log('Taking action on:', title);
            // In a real implementation, this would open action modal
            alert(`Taking action on: ${title}`);
        });
    });
});