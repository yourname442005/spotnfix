// Reports JavaScript
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
    
    // Filter change event listeners
    const filters = document.querySelectorAll('.filter-group select');
    filters.forEach(filter => {
        filter.addEventListener('change', function() {
            console.log('Filter changed:', this.name, this.value);
            // In a real implementation, this would trigger a report refresh
            updateReportData();
        });
    });
    
    // Button event listeners
    const actionButtons = document.querySelectorAll('.btn-primary, .btn-outline');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const buttonText = this.textContent.trim();
            console.log('Button clicked:', buttonText);
            
            if (buttonText.includes('Export')) {
                alert('Exporting report data...');
                // In a real implementation, this would export the report
            } else if (buttonText.includes('Generate')) {
                alert('Generating new report...');
                // In a real implementation, this would generate a new report
            } else if (buttonText.includes('Print')) {
                alert('Printing report...');
                // In a real implementation, this would print the report
            } else if (buttonText.includes('Share')) {
                alert('Sharing report...');
                // In a real implementation, this would share the report
            }
        });
    });
    
    // Function to simulate updating report data based on filters
    function updateReportData() {
        // This would normally fetch new data based on filter selections
        console.log('Updating report data based on filters');
    }
    
    // Initialize the page
    console.log('Reports page loaded');
});