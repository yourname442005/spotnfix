// AI Metrics JavaScript
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
    
    // Simulate real-time updates for metrics
    function updateMetrics() {
        // In a real implementation, this would fetch live data from the server
        console.log('Updating AI metrics...');
    }
    
    // Update metrics every 30 seconds
    setInterval(updateMetrics, 30000);
    
    // Initialize metrics
    updateMetrics();
});