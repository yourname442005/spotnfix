// DM Portal JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Navigation handling
    const navItems = document.querySelectorAll('.nav-item');
    const contentArea = document.getElementById('content-area');
    const backBtn = document.querySelector('.back-btn');
    
    // Load initial content (Overview)
    loadOverviewContent();
    
    // Initialize profile section if it exists
    if (document.getElementById('profile-view')) {
        loadProfileContent();
    }
    
    // Navigation event listeners
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get the view name from data attribute
            const view = this.getAttribute('data-view');
            
            // Load the appropriate content
            loadContent(view);
        });
    });
    
    // Back button event listener
    backBtn.addEventListener('click', function() {
        alert('Back to Portal functionality would be implemented here');
    });
    
    // Function to load content based on view
    function loadContent(view) {
        // Clear content area first
        contentArea.innerHTML = '';
        
        switch(view) {
            case 'overview':
                loadOverviewContent();
                break;
            case 'ward-analytics':
                loadWardAnalyticsContent();
                break;
            case 'escalations':
                loadEscalationsContent();
                break;
            case 'eo-community':
                loadEOCommunityContent();
                break;
            case 'ai-metrics':
                loadAIMetricsContent();
                break;
            case 'weather-predictions':
                loadWeatherPredictionsContent();
                break;
            case 'reports':
                loadReportsContent();
                break;
            case 'profile':
                loadProfileContent();
                break;
            default:
                loadOverviewContent();
        }
    }
    
    // Profile Content
    function loadProfileContent() {
        // Render profile HTML
        contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>DM Profile</h2>
                    <button class="btn btn-outline btn-sm" id="edit-profile-btn">
                        <i class="fas fa-edit"></i>
                        Edit Profile
                    </button>
                </div>
                
                <div id="profile-view-mode">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <i class="fas fa-user-tie"></i>
                        </div>
                        <div class="profile-info">
                            <h3 id="profile-name">DM Name</h3>
                            <p id="profile-role">District Magistrate</p>
                            <p id="profile-id">ID: N/A</p>
                        </div>
                    </div>
                    
                    <div class="profile-details">
                        <div class="detail-row">
                            <label>Full Name:</label>
                            <span id="view-name">Loading...</span>
                        </div>
                        <div class="detail-row">
                            <label>Email:</label>
                            <span id="view-email">Loading...</span>
                        </div>
                        <div class="detail-row">
                            <label>ID Number:</label>
                            <span id="view-idNumber">Loading...</span>
                        </div>
                        <div class="detail-row">
                            <label>Address:</label>
                            <span id="view-address">Loading...</span>
                        </div>
                    </div>
                </div>
                
                <div id="profile-edit-mode" class="hidden">
                    <h3>Edit Profile Information</h3>
                    <div class="form-group">
                        <label for="edit-name">Full Name</label>
                        <input type="text" id="edit-name" class="form-input" placeholder="Enter your full name">
                    </div>
                    <div class="form-group">
                        <label for="edit-email">Email</label>
                        <input type="email" id="edit-email" class="form-input" placeholder="Enter your email">
                    </div>
                    <div class="form-group">
                        <label for="edit-idNumber">ID Number</label>
                        <input type="text" id="edit-idNumber" class="form-input" placeholder="Enter your ID number">
                    </div>
                    <div class="form-group">
                        <label for="edit-address">Address</label>
                        <textarea id="edit-address" class="form-input" placeholder="Enter your address" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-outline" id="cancel-edit-btn">Cancel</button>
                        <button class="btn btn-primary" id="save-profile-btn">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        // Load DM profile data
        loadDMProfile();
        
        // Add event listeners for profile editing
        setupProfileEventListeners();
    }
    
    async function loadDMProfile() {
        try {
            // Get DM data from localStorage
            let dmData = localStorage.getItem('dmData');
            console.log('DM data from localStorage:', dmData);
            
            if (dmData) {
                dmData = JSON.parse(dmData);
                console.log('Parsed DM data:', dmData);
                updateDMProfileDisplay(dmData);
            } else {
                console.log('No DM data found in localStorage');
                setDefaultDMProfile();
            }
        } catch (error) {
            console.error('Error loading DM profile:', error);
            setDefaultDMProfile();
        }
    }
    
    function updateDMProfileDisplay(dmData) {
        console.log('Updating DM profile display with data:', dmData);
        
        // Update profile header
        document.getElementById('profile-name').textContent = dmData.name || 'DM Name';
        document.getElementById('profile-role').textContent = 'District Magistrate';
        document.getElementById('profile-id').textContent = 'ID: ' + (dmData.idNumber || 'N/A');
        
        // Update profile details
        document.getElementById('view-name').textContent = dmData.name || '';
        document.getElementById('view-email').textContent = dmData.email || '';
        document.getElementById('view-idNumber').textContent = dmData.idNumber || '';
        document.getElementById('view-address').textContent = dmData.address || '';
        
        console.log('DM profile display updated successfully');
    }
    
    function setDefaultDMProfile() {
        document.getElementById('view-name').textContent = 'Loading...';
        document.getElementById('view-email').textContent = 'Loading...';
        document.getElementById('view-idNumber').textContent = 'Loading...';
        document.getElementById('view-address').textContent = 'Loading...';
    }
    
    function setupProfileEventListeners() {
        const editBtn = document.getElementById('edit-profile-btn');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        const saveBtn = document.getElementById('save-profile-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', function() {
                // Get current values
                const currentName = document.getElementById('view-name').textContent;
                const currentEmail = document.getElementById('view-email').textContent;
                const currentIdNumber = document.getElementById('view-idNumber').textContent;
                const currentAddress = document.getElementById('view-address').textContent;
                
                // Set edit form values
                document.getElementById('edit-name').value = currentName;
                document.getElementById('edit-email').value = currentEmail;
                document.getElementById('edit-idNumber').value = currentIdNumber;
                document.getElementById('edit-address').value = currentAddress;
                
                // Switch to edit mode
                document.getElementById('profile-view-mode').classList.add('hidden');
                document.getElementById('profile-edit-mode').classList.remove('hidden');
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                // Switch back to view mode
                document.getElementById('profile-edit-mode').classList.add('hidden');
                document.getElementById('profile-view-mode').classList.remove('hidden');
            });
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', async function() {
                // Get edited values
                const newName = document.getElementById('edit-name').value;
                const newEmail = document.getElementById('edit-email').value;
                const newIdNumber = document.getElementById('edit-idNumber').value;
                const newAddress = document.getElementById('edit-address').value;
                
                // Get DM ID from localStorage
                const dmData = localStorage.getItem('dmData');
                if (!dmData) {
                    alert('DM data not found. Please login again.');
                    return;
                }
                
                const dmId = JSON.parse(dmData).id;
                
                try {
                    // Call API to update profile
                    const response = await fetch(`http://localhost:5000/api/dm/profile/${dmId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: newName,
                            email: newEmail,
                            idNumber: newIdNumber,
                            address: newAddress
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Update localStorage with new data
                        localStorage.setItem('dmData', JSON.stringify(result.dm));
                        
                        // Update view mode values
                        document.getElementById('view-name').textContent = newName;
                        document.getElementById('view-email').textContent = newEmail;
                        document.getElementById('view-idNumber').textContent = newIdNumber;
                        document.getElementById('view-address').textContent = newAddress;
                        
                        // Update profile header
                        document.getElementById('profile-name').textContent = newName;
                        document.getElementById('profile-id').textContent = 'ID: ' + newIdNumber;
                        
                        // Switch back to view mode
                        document.getElementById('profile-edit-mode').classList.add('hidden');
                        document.getElementById('profile-view-mode').classList.remove('hidden');
                        
                        // Show success message
                        alert('Profile updated successfully!');
                    } else {
                        alert('Error updating profile: ' + result.message);
                    }
                } catch (error) {
                    console.error('Error updating profile:', error);
                    alert('Error updating profile. Please try again.');
                }
            });
        }
    }
    
    // Overview Content
    function loadOverviewContent() {
        contentArea.innerHTML = `
            <div class="dashboard-header">
                <div>
                    <h1>District Overview</h1>
                    <p>Jharkhand State-wide Civic Intelligence Dashboard</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <span class="badge badge-primary">District Magistrate</span>
                    <span class="badge badge-success">System Operational</span>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <h3>Active Issues</h3>
                        <div class="stat-icon activity">
                            <i class="fas fa-heartbeat"></i>
                        </div>
                    </div>
                    <div class="stat-value">342</div>
                    <div class="stat-footer trending-up">
                        <i class="fas fa-arrow-up"></i>
                        <span>-8% from yesterday</span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <h3>SLA Compliance</h3>
                        <div class="stat-icon target">
                            <i class="fas fa-bullseye"></i>
                        </div>
                    </div>
                    <div class="stat-value">88%</div>
                    <div class="progress-bar">
                        <div class="progress-fill progress-88"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <h3>Citizen Satisfaction</h3>
                        <div class="stat-icon award">
                            <i class="fas fa-award"></i>
                        </div>
                    </div>
                    <div class="stat-value">4.3/5</div>
                    <div class="stat-footer">
                        <span>Based on 2,847 feedback responses</span>
                    </div>
                </div>
            </div>
            
            <div class="map-card">
                <div class="map-header">
                    <h2>Jharkhand Issue Density Heatmap</h2>
                    <button class="btn-outline">
                        <i class="fas fa-eye"></i>
                        Full Map View
                    </button>
                </div>
                <div class="map-container">
                    <div class="map-icon">
                        <i class="fas fa-map-pin"></i>
                    </div>
                    <h3>Interactive Jharkhand Map</h3>
                    <p>Real-time issue density and ward performance visualization</p>
                    <div class="legend">
                        <div class="legend-item">
                            <div class="legend-color green"></div>
                            <span>Low Density</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color yellow"></div>
                            <span>Medium Density</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color red"></div>
                            <span>High Density</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="ward-performance-card">
                <h2>Ward Performance Summary</h2>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Ward</th>
                                <th>Executive Officer</th>
                                <th>Active Issues</th>
                                <th>Resolved</th>
                                <th>SLA %</th>
                                <th>Performance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Ward 1</td>
                                <td>Ramesh Kumar</td>
                                <td>45</td>
                                <td>38</td>
                                <td>
                                    <div class="sla-progress">
                                        <span>91</span>
                                        <div class="progress-small">
                                            <div class="progress-fill-small progress-91"></div>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="performance-badge badge-excellent">Excellent</span></td>
                            </tr>
                            <tr>
                                <td>Ward 5</td>
                                <td>Priya Singh</td>
                                <td>52</td>
                                <td>43</td>
                                <td>
                                    <div class="sla-progress">
                                        <span>89</span>
                                        <div class="progress-small">
                                            <div class="progress-fill-small progress-89"></div>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="performance-badge badge-good">Good</span></td>
                            </tr>
                            <tr>
                                <td>Ward 12</td>
                                <td>Amit Sharma</td>
                                <td>38</td>
                                <td>35</td>
                                <td>
                                    <div class="sla-progress">
                                        <span>94</span>
                                        <div class="progress-small">
                                            <div class="progress-fill-small progress-94"></div>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="performance-badge badge-excellent">Excellent</span></td>
                            </tr>
                            <tr>
                                <td>Ward 18</td>
                                <td>Sunita Devi</td>
                                <td>67</td>
                                <td>51</td>
                                <td>
                                    <div class="sla-progress">
                                        <span>82</span>
                                        <div class="progress-small">
                                            <div class="progress-fill-small progress-82"></div>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="performance-badge badge-average">Average</span></td>
                            </tr>
                            <tr>
                                <td>Ward 23</td>
                                <td>Manoj Gupta</td>
                                <td>41</td>
                                <td>39</td>
                                <td>
                                    <div class="sla-progress">
                                        <span>96</span>
                                        <div class="progress-small">
                                            <div class="progress-fill-small progress-96"></div>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="performance-badge badge-excellent">Excellent</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // Ward Analytics Content
    function loadWardAnalyticsContent() {
        contentArea.innerHTML = `
            <div class="dashboard-header">
                <div>
                    <h1>Ward Analytics</h1>
                    <p>Detailed performance metrics and analytics for all wards</p>
                </div>
            </div>
            <div style="background: white; padding: 40px; border-radius: 12px; text-align: center;">
                <i class="fas fa-chart-bar" style="font-size: 48px; color: #00A896; margin-bottom: 20px;"></i>
                <h2>Ward Analytics Dashboard</h2>
                <p>Interactive charts and detailed analytics for all wards would be displayed here.</p>
                <p>This section would include:</p>
                <ul style="text-align: left; max-width: 600px; margin: 20px auto; line-height: 1.8;">
                    <li>Performance trends over time</li>
                    <li>Issue category breakdowns</li>
                    <li>Resolution time analytics</li>
                    <li>SLA compliance tracking</li>
                    <li>Comparative ward performance</li>
                </ul>
            </div>
        `;
    }
    
    // Escalations Content
    function loadEscalationsContent() {
        contentArea.innerHTML = `
            <div class="dashboard-header">
                <div>
                    <h1>Issue Escalations</h1>
                    <p>Critical issues requiring immediate attention</p>
                </div>
                <span class="badge" style="background-color: #FECACA; color: #B91C1C;">2 Critical Escalations</span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="background: white; border-left: 4px solid #EF4444; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                                <h3 style="font-size: 18px; color: #0B3C5D; margin: 0;">Multiple water pipeline bursts in Sector 7</h3>
                                <span class="badge" style="background-color: #FECACA; color: #B91C1C;">Critical</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 15px; font-size: 14px; color: #64748B;">
                                <span>ESC-2025-001</span>
                                <span>•</span>
                                <span>Ward 15</span>
                                <span>•</span>
                                <span>EO: Kavita Jha</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span class="badge" style="background-color: #FEF3C7; color: #92400E; margin-bottom: 10px;">In Review</span>
                            <p style="font-size: 12px; color: #94A3B8;">2 hours ago</p>
                        </div>
                    </div>
                    
                    <div style="background-color: #FEF2F2; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <i class="fas fa-exclamation-triangle" style="color: #EF4444;"></i>
                            <span style="font-weight: 600; color: #B91C1C;">Escalation Reason</span>
                        </div>
                        <p style="color: #B91C1C; margin: 0;">SLA breach - 72 hours overdue</p>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <div style="font-size: 14px;">
                                <span style="color: #94A3B8;">Affected Citizens:</span>
                                <span style="font-weight: 600; color: #0B3C5D; margin-left: 5px;">450</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button style="padding: 8px 16px; background: transparent; border: 1px solid #CBD5E1; border-radius: 6px; color: #64748B; font-weight: 500; cursor: pointer;">View Details</button>
                            <button style="padding: 8px 16px; background: #00A896; border: none; border-radius: 6px; color: white; font-weight: 500; cursor: pointer;">Take Action</button>
                        </div>
                    </div>
                </div>
                
                <div style="background: white; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                                <h3 style="font-size: 18px; color: #0B3C5D; margin: 0;">Power outage affecting industrial area</h3>
                                <span class="badge" style="background-color: #FEF3C7; color: #92400E;">High</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 15px; font-size: 14px; color: #64748B;">
                                <span>ESC-2025-002</span>
                                <span>•</span>
                                <span>Ward 8</span>
                                <span>•</span>
                                <span>EO: Ravi Mehta</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span class="badge" style="background-color: #DBEAFE; color: #1E40AF; margin-bottom: 10px;">Action Required</span>
                            <p style="font-size: 12px; color: #94A3B8;">4 hours ago</p>
                        </div>
                    </div>
                    
                    <div style="background-color: #FFFBEB; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <i class="fas fa-exclamation-triangle" style="color: #F59E0B;"></i>
                            <span style="font-weight: 600; color: #92400E;">Escalation Reason</span>
                        </div>
                        <p style="color: #92400E; margin: 0;">Citizen complaints > 50</p>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <div style="font-size: 14px;">
                                <span style="color: #94A3B8;">Affected Citizens:</span>
                                <span style="font-weight: 600; color: #0B3C5D; margin-left: 5px;">1200</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button style="padding: 8px 16px; background: transparent; border: 1px solid #CBD5E1; border-radius: 6px; color: #64748B; font-weight: 500; cursor: pointer;">View Details</button>
                            <button style="padding: 8px 16px; background: #00A896; border: none; border-radius: 6px; color: white; font-weight: 500; cursor: pointer;">Take Action</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // EO Community Content
    function loadEOCommunityContent() {
        contentArea.innerHTML = `
            <div class="dashboard-header">
                <div>
                    <h1>EO State Community</h1>
                    <p>District-wide coordination and real-time updates</p>
                </div>
                <span class="badge" style="background-color: #D1FAE5; color: #047857;">24 Executive Officers Online</span>
            </div>
            
            <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                <div style="background: linear-gradient(135deg, #0B3C5D, #00A896); color: white; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 24px;">Jharkhand EO Network</h2>
                            <p style="margin: 5px 0 0; opacity: 0.9;">District-wide coordination and real-time updates</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 24px; font-weight: bold;">24</div>
                            <div style="font-size: 14px; opacity: 0.9;">Online</div>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 20px; border-bottom: 1px solid #E2E8F0;">
                    <div style="display: flex; gap: 15px;">
                        <div style="flex: 1;">
                            <input type="text" placeholder="Type a message..." style="width: 100%; padding: 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 16px;">
                        </div>
                        <button style="padding: 12px 20px; background: #00A896; border: none; border-radius: 8px; color: white; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-paper-plane"></i>
                            Send
                        </button>
                    </div>
                </div>
                
                <div style="padding: 20px; max-height: 500px; overflow-y: auto;">
                    <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #00A896; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">EO</div>
                        <div style="flex: 1;">
                            <div style="background: #F1F5F9; border-radius: 12px; padding: 15px; display: inline-block; max-width: 80%;">
                                <div style="font-weight: 600; margin-bottom: 5px;">EO - Ward 5 (Priya Singh)</div>
                                <div>Heat wave preparation complete. Additional water tankers deployed in 3 sectors.</div>
                                <div style="font-size: 12px; color: #94A3B8; margin-top: 8px; text-align: right;">11:30 AM</div>
                            </div>
                            <div style="display: flex; gap: 5px; margin-top: 8px;">
                                <span style="background: #E2E8F0; border-radius: 12px; padding: 2px 8px; font-size: 12px;">👍</span>
                                <span style="background: #E2E8F0; border-radius: 12px; padding: 2px 8px; font-size: 12px;">💪</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 20px; justify-content: flex-end;">
                        <div style="flex: 1; text-align: right;">
                            <div style="background: #00A896; color: white; border-radius: 12px; padding: 15px; display: inline-block; max-width: 80%;">
                                <div style="font-weight: 600; margin-bottom: 5px;">You (District Magistrate)</div>
                                <div>Please ensure all EOs submit their heat wave preparedness reports by EOD.</div>
                                <div style="font-size: 12px; opacity: 0.9; margin-top: 8px; text-align: right;">11:35 AM</div>
                            </div>
                        </div>
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #0B3C5D; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">DM</div>
                    </div>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #00A896; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">EO</div>
                        <div style="flex: 1;">
                            <div style="background: #F1F5F9; border-radius: 12px; padding: 15px; display: inline-block; max-width: 80%;">
                                <div style="font-weight: 600; margin-bottom: 5px;">EO - Ward 12 (Amit Sharma)</div>
                                <div>Power backup systems checked. All emergency contacts updated with JBSEB.</div>
                                <div style="font-size: 12px; color: #94A3B8; margin-top: 8px; text-align: right;">10:45 AM</div>
                            </div>
                            <div style="display: flex; gap: 5px; margin-top: 8px;">
                                <span style="background: #E2E8F0; border-radius: 12px; padding: 2px 8px; font-size: 12px;">✅</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #00A896; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">EO</div>
                        <div style="flex: 1;">
                            <div style="background: #F1F5F9; border-radius: 12px; padding: 15px; display: inline-block; max-width: 80%;">
                                <div style="font-weight: 600; margin-bottom: 5px;">EO - Ward 23 (Manoj Gupta)</div>
                                <div>Citizens reporting water quality issues. Lab testing scheduled for tomorrow morning.</div>
                                <div style="font-size: 12px; color: #94A3B8; margin-top: 8px; text-align: right;">9:20 AM</div>
                            </div>
                            <div style="display: flex; gap: 5px; margin-top: 8px;">
                                <span style="background: #E2E8F0; border-radius: 12px; padding: 2px 8px; font-size: 12px;">⚠️</span>
                                <span style="background: #E2E8F0; border-radius: 12px; padding: 2px 8px; font-size: 12px;">👍</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // AI Metrics Content
    function loadAIMetricsContent() {
        contentArea.innerHTML = `
            <div class="dashboard-header">
                <div>
                    <h1>AI System Metrics</h1>
                    <p>Performance indicators for AI-driven functionalities</p>
                </div>
                <span class="badge" style="background-color: #D1FAE5; color: #047857;">All Systems Operational</span>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <h3>Routing Accuracy</h3>
                        <div class="stat-icon activity">
                            <i class="fas fa-robot"></i>
                        </div>
                    </div>
                    <div class="stat-value">93.8%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 93.8%; background: linear-gradient(90deg, #0B3C5D, #00A896);"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <h3>Duplicate Detection</h3>
                        <div class="stat-icon target">
                            <i class="fas fa-bullseye"></i>
                        </div>
                    </div>
                    <div class="stat-value">96.2%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 96.2%; background: linear-gradient(90deg, #0B3C5D, #00A896);"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <h3>Predictive Accuracy</h3>
                        <div class="stat-icon award">
                            <i class="fas fa-chart-line"></i>
                        </div>
                    </div>
                    <div class="stat-value">89.1%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 89.1%; background: linear-gradient(90deg, #0B3C5D, #00A896);"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <h3>Language Processing</h3>
                        <div class="stat-icon activity">
                            <i class="fas fa-comment"></i>
                        </div>
                    </div>
                    <div class="stat-value">91.7%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 91.7%; background: linear-gradient(90deg, #0B3C5D, #00A896);"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <h3>Sentiment Analysis</h3>
                        <div class="stat-icon target">
                            <i class="fas fa-heart"></i>
                        </div>
                    </div>
                    <div class="stat-value">87.4%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 87.4%; background: linear-gradient(90deg, #0B3C5D, #00A896);"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <h3>Total Processed</h3>
                        <div class="stat-icon award">
                            <i class="fas fa-database"></i>
                        </div>
                    </div>
                    <div class="stat-value">1,247</div>
                    <div class="stat-footer">
                        <span>Issues processed today</span>
                    </div>
                </div>
            </div>
            
            <div class="map-card">
                <h2 style="font-size: 20px; color: #0B3C5D; margin: 0 0 24px;">AI Performance Trends</h2>
                <div style="background: linear-gradient(90deg, #DBEAFE, #D1FAE5); border-radius: 12px; padding: 40px; text-align: center;">
                    <i class="fas fa-chart-bar" style="font-size: 64px; color: #00A896; margin-bottom: 20px;"></i>
                    <h3 style="font-size: 20px; color: #0B3C5D; margin-bottom: 15px;">Performance Analytics</h3>
                    <p style="color: #64748B; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
                        7-day trend analysis showing consistent improvement in all AI metrics
                    </p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; max-width: 500px; margin: 0 auto;">
                        <div>
                            <div style="font-size: 28px; font-weight: bold; color: #10B981;">+2.3%</div>
                            <div style="font-size: 14px; color: #64748B;">Weekly Improvement</div>
                        </div>
                        <div>
                            <div style="font-size: 28px; font-weight: bold; color: #00A896;">99.8%</div>
                            <div style="font-size: 14px; color: #64748B;">System Uptime</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Weather Predictions Content
    function loadWeatherPredictionsContent() {
        contentArea.innerHTML = `
            <div class="dashboard-header">
                <div>
                    <h1>Weather & Issue Predictions</h1>
                    <p>AI-powered civic issue forecasting based on weather patterns</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <span class="badge" style="background-color: #FECACA; color: #B91C1C;">Heat Wave Alert</span>
                    <span class="badge" style="background: #00A896; color: white;">AI Predictions Active</span>
                </div>
            </div>
            
            <div style="background: linear-gradient(90deg, #F97316, #EF4444); color: white; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div>
                        <h2 style="font-size: 24px; margin: 0 0 10px;">Ranchi, Jharkhand</h2>
                        <p style="opacity: 0.9; margin: 0;">Current Conditions</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 48px; font-weight: bold; margin: 0 0 5px;">42°C</div>
                        <p style="opacity: 0.9; margin: 0;">Hot</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-tint" style="font-size: 20px;"></i>
                        <div>
                            <p style="font-size: 12px; opacity: 0.9; margin: 0;">Humidity</p>
                            <p style="font-weight: 600; margin: 0;">65%</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-wind" style="font-size: 20px;"></i>
                        <div>
                            <p style="font-size: 12px; opacity: 0.9; margin: 0;">Wind</p>
                            <p style="font-weight: 600; margin: 0;">12 km/h</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-sun" style="font-size: 20px;"></i>
                        <div>
                            <p style="font-size: 12px; opacity: 0.9; margin: 0;">UV Index</p>
                            <p style="font-weight: 600; margin: 0;">9/10</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <h3 style="font-size: 18px; color: #0B3C5D; margin: 0 0 5px;">Today</h3>
                            <p style="font-size: 14px; color: #64748B; margin: 0;">Extreme Heat</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 28px; font-weight: bold; color: #0B3C5D;">42°C</div>
                            <i class="fas fa-thermometer-full" style="color: #EF4444; margin-top: 5px;"></i>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <h4 style="font-size: 14px; color: #0B3C5D; margin: 0 0 15px; font-weight: 600;">Predicted Issues:</h4>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #F1F5F9; border-radius: 8px;">
                                <div>
                                    <p style="font-weight: 600; font-size: 14px; color: #0B3C5D; margin: 0 0 3px;">Water Issues</p>
                                    <p style="font-size: 12px; color: #64748B; margin: 0;">Est. 89 cases</p>
                                </div>
                                <span class="badge" style="background: rgba(0, 168, 150, 0.1); color: #00A896; border: 1px solid rgba(0, 168, 150, 0.2);">94%</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #F1F5F9; border-radius: 8px;">
                                <div>
                                    <p style="font-weight: 600; font-size: 14px; color: #0B3C5D; margin: 0 0 3px;">Power Outages</p>
                                    <p style="font-size: 12px; color: #64748B; margin: 0;">Est. 45 cases</p>
                                </div>
                                <span class="badge" style="background: rgba(0, 168, 150, 0.1); color: #00A896; border: 1px solid rgba(0, 168, 150, 0.2);">87%</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #F1F5F9; border-radius: 8px;">
                                <div>
                                    <p style="font-weight: 600; font-size: 14px; color: #0B3C5D; margin: 0 0 3px;">Road Damage</p>
                                    <p style="font-size: 12px; color: #64748B; margin: 0;">Est. 12 cases</p>
                                </div>
                                <span class="badge" style="background: rgba(0, 168, 150, 0.1); color: #00A896; border: 1px solid rgba(0, 168, 150, 0.2);">72%</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <h3 style="font-size: 18px; color: #0B3C5D; margin: 0 0 5px;">Tomorrow</h3>
                            <p style="font-size: 14px; color: #64748B; margin: 0;">Heat Wave</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 28px; font-weight: bold; color: #0B3C5D;">44°C</div>
                            <i class="fas fa-thermometer-full" style="color: #EF4444; margin-top: 5px;"></i>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <h4 style="font-size: 14px; color: #0B3C5D; margin: 0 0 15px; font-weight: 600;">Predicted Issues:</h4>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #F1F5F9; border-radius: 8px;">
                                <div>
                                    <p style="font-weight: 600; font-size: 14px; color: #0B3C5D; margin: 0 0 3px;">Water Issues</p>
                                    <p style="font-size: 12px; color: #64748B; margin: 0;">Est. 112 cases</p>
                                </div>
                                <span class="badge" style="background: rgba(0, 168, 150, 0.1); color: #00A896; border: 1px solid rgba(0, 168, 150, 0.2);">96%</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #F1F5F9; border-radius: 8px;">
                                <div>
                                    <p style="font-weight: 600; font-size: 14px; color: #0B3C5D; margin: 0 0 3px;">Power Outages</p>
                                    <p style="font-size: 12px; color: #64748B; margin: 0;">Est. 67 cases</p>
                                </div>
                                <span class="badge" style="background: rgba(0, 168, 150, 0.1); color: #00A896; border: 1px solid rgba(0, 168, 150, 0.2);">91%</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #F1F5F9; border-radius: 8px;">
                                <div>
                                    <p style="font-weight: 600; font-size: 14px; color: #0B3C5D; margin: 0 0 3px;">Health Emergency</p>
                                    <p style="font-size: 12px; color: #64748B; margin: 0;">Est. 23 cases</p>
                                </div>
                                <span class="badge" style="background: rgba(0, 168, 150, 0.1); color: #00A896; border: 1px solid rgba(0, 168, 150, 0.2);">78%</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <h3 style="font-size: 18px; color: #0B3C5D; margin: 0 0 5px;">Day 3</h3>
                            <p style="font-size: 14px; color: #64748B; margin: 0;">Thunderstorms</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 28px; font-weight: bold; color: #0B3C5D;">38°C</div>
                            <i class="fas fa-bolt" style="color: #F59E0B; margin-top: 5px;"></i>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <h4 style="font-size: 14px; color: #0B3C5D; margin: 0 0 15px; font-weight: 600;">Predicted Issues:</h4>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #F1F5F9; border-radius: 8px;">
                                <div>
                                    <p style="font-weight: 600; font-size: 14px; color: #0B3C5D; margin: 0 0 3px;">Waterlogging</p>
                                    <p style="font-size: 12px; color: #64748B; margin: 0;">Est. 78 cases</p>
                                </div>
                                <span class="badge" style="background: rgba(0, 168, 150, 0.1); color: #00A896; border: 1px solid rgba(0, 168, 150, 0.2);">93%</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #F1F5F9; border-radius: 8px;">
                                <div>
                                    <p style="font-weight: 600; font-size: 14px; color: #0B3C5D; margin: 0 0 3px;">Tree Falls</p>
                                    <p style="font-size: 12px; color: #64748B; margin: 0;">Est. 34 cases</p>
                                </div>
                                <span class="badge" style="background: rgba(0, 168, 150, 0.1); color: #00A896; border: 1px solid rgba(0, 168, 150, 0.2);">85%</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #F1F5F9; border-radius: 8px;">
                                <div>
                                    <p style="font-weight: 600; font-size: 14px; color: #0B3C5D; margin: 0 0 3px;">Power Issues</p>
                                    <p style="font-size: 12px; color: #64748B; margin: 0;">Est. 56 cases</p>
                                </div>
                                <span class="badge" style="background: rgba(0, 168, 150, 0.1); color: #00A896; border: 1px solid rgba(0, 168, 150, 0.2);">88%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="map-card">
                <h2 style="font-size: 20px; color: #0B3C5D; margin: 0 0 20px;">AI Recommendations</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                    <div style="padding: 20px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <i class="fas fa-exclamation-triangle" style="color: #F59E0B; font-size: 20px;"></i>
                            <span style="font-weight: 600; color: #92400E;">Immediate Actions</span>
                        </div>
                        <ul style="color: #92400E; padding-left: 20px; margin: 0; line-height: 1.6;">
                            <li>Deploy additional water tankers in high-density areas</li>
                            <li>Activate emergency cooling centers</li>
                            <li>Alert electrical teams for transformer monitoring</li>
                            <li>Issue heat wave warnings to citizens</li>
                        </ul>
                    </div>
                    <div style="padding: 20px; background: #DBEAFE; border: 1px solid #BFDBFE; border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <i class="fas fa-heartbeat" style="color: #3B82F6; font-size: 20px;"></i>
                            <span style="font-weight: 600; color: #1E40AF;">Resource Allocation</span>
                        </div>
                        <ul style="color: #1E40AF; padding-left: 20px; margin: 0; line-height: 1.6;">
                            <li>Increase staffing for water & electrical departments</li>
                            <li>Prepare emergency medical response teams</li>
                            <li>Stock additional repair materials</li>
                            <li>Coordinate with state power board</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Reports Content
    function loadReportsContent() {
        contentArea.innerHTML = `
            <div class="dashboard-header">
                <div>
                    <h1>Reports</h1>
                    <p>Comprehensive analytics and performance reports</p>
                </div>
            </div>
            
            <div style="background: white; padding: 40px; border-radius: 12px; text-align: center;">
                <i class="fas fa-file-alt" style="font-size: 48px; color: #00A896; margin-bottom: 20px;"></i>
                <h2>Reports Dashboard</h2>
                <p>Comprehensive analytics and performance reports would be displayed here.</p>
                <p>This section would include:</p>
                <ul style="text-align: left; max-width: 600px; margin: 20px auto; line-height: 1.8;">
                    <li>Ward-wise performance reports</li>
                    <li>SLA compliance summaries</li>
                    <li>Issue resolution analytics</li>
                    <li>Citizen satisfaction reports</li>
                    <li>Resource allocation reports</li>
                    <li>Historical trend analysis</li>
                </ul>
            </div>
        `;
    }

    // Load escalated reports for DM
    async function loadEscalatedReports() {
        try {
            const response = await fetch('http://localhost:5000/api/dm/reports');
            const data = await response.json();
            
            if (data.success) {
                displayEscalatedReports(data.reports);
            } else {
                console.error('Failed to load escalated reports:', data.error);
                document.getElementById('escalated-reports-container').innerHTML = '<p class="text-danger">Failed to load escalated reports</p>';
            }
        } catch (error) {
            console.error('Error loading escalated reports:', error);
            document.getElementById('escalated-reports-container').innerHTML = '<p class="text-danger">Error loading escalated reports</p>';
        }
    }

    // Display escalated reports in the DM portal
    function displayEscalatedReports(reports) {
        const container = document.getElementById('escalated-reports-container');
        
        if (reports.length === 0) {
            container.innerHTML = '<p class="text-muted">No escalated reports found</p>';
            return;
        }
        
        let html = '';
        reports.forEach(report => {
            const createdDate = new Date(report.created_at).toLocaleDateString();
            const daysPending = Math.floor((new Date() - new Date(report.created_at)) / (1000 * 60 * 60 * 24));
            
            html += `
                <div class="card mb-3" style="border-left: 4px solid #EF4444;">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${report.issue_title}</h5>
                        <span class="badge badge-danger">
                            <i class="fas fa-exclamation-triangle"></i> ESCALATED (${daysPending} days)
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Category:</strong> ${report.issue_category}</p>
                                <p><strong>Location:</strong> ${report.issue_location}</p>
                                <p><strong>Method:</strong> ${report.reporting_method}</p>
                                <p><strong>Created:</strong> ${createdDate}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Reporter:</strong> ${report.user.full_name}</p>
                                <p><strong>Email:</strong> ${report.user.email}</p>
                                <p><strong>Phone:</strong> ${report.user.phone}</p>
                                <p><strong>Priority:</strong> ${report.priority}</p>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12">
                                <p><strong>Description:</strong></p>
                                <p class="text-muted">${report.issue_description}</p>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-12">
                                <div class="alert alert-warning">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <strong>Escalation Reason:</strong> This report has been pending for more than 2 days and requires immediate attention.
                                </div>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-12">
                                <button class="btn btn-success btn-sm" onclick="updateDMReportStatus('${report._id}', 'completed')">
                                    <i class="fas fa-check"></i> Mark as Completed
                                </button>
                                <button class="btn btn-info btn-sm ml-2" onclick="viewReportDetails('${report._id}')">
                                    <i class="fas fa-eye"></i> View Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Update DM report status
    async function updateDMReportStatus(reportId, status) {
        try {
            const dmData = localStorage.getItem('dmData');
            if (!dmData) {
                alert('DM data not found. Please login again.');
                return;
            }
            
            const dm = JSON.parse(dmData);
            
            const response = await fetch(`http://localhost:5000/api/dm/reports/${reportId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: status,
                    dmId: dm.id
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Report status updated successfully!');
                loadEscalatedReports(); // Refresh the reports list
            } else {
                alert('Failed to update report status: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating DM report status:', error);
            alert('Error updating report status');
        }
    }

    // View report details
    function viewReportDetails(reportId) {
        alert('Report details view would be implemented here for report: ' + reportId);
    }

    // Make functions globally available
    window.loadEscalatedReports = loadEscalatedReports;
    window.updateDMReportStatus = updateDMReportStatus;
    window.viewReportDetails = viewReportDetails;
});