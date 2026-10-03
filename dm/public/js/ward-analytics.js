// Ward Analytics JavaScript
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
    
    // Sort functionality
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            sortButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // In a real implementation, this would sort the table data
            console.log('Sorting by:', this.textContent);
        });
    });
    
    // Table header sort icons
    const sortIcons = document.querySelectorAll('th i');
    sortIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const th = this.parentElement;
            const columnIndex = Array.from(th.parentElement.children).indexOf(th);
            
            // Toggle sort direction
            if (th.classList.contains('sorted-asc')) {
                th.classList.remove('sorted-asc');
                th.classList.add('sorted-desc');
            } else if (th.classList.contains('sorted-desc')) {
                th.classList.remove('sorted-desc');
            } else {
                th.classList.add('sorted-asc');
            }
            
            // In a real implementation, this would sort the table data
            console.log('Sorting column:', columnIndex);
        });
    });
    
    // Filter functionality
    const districtFilter = document.getElementById('district-filter');
    const periodFilter = document.getElementById('period-filter');
    const slaFilter = document.getElementById('sla-filter');
    const searchBox = document.querySelector('.search-box input');
    
    districtFilter.addEventListener('change', function() {
        console.log('District filter changed to:', this.value);
        // In a real implementation, this would filter the table data
    });
    
    periodFilter.addEventListener('change', function() {
        console.log('Period filter changed to:', this.value);
        // In a real implementation, this would filter the table data
    });
    
    slaFilter.addEventListener('change', function() {
        console.log('SLA filter changed to:', this.value);
        // In a real implementation, this would filter the table data
    });
    
    searchBox.addEventListener('input', function() {
        console.log('Search term:', this.value);
        // In a real implementation, this would filter the table data
    });
});