// Admin Portal JavaScript - Updated to match React+Vite+TypeScript patterns
document.addEventListener('DOMContentLoaded', function() {
    // State management similar to React useState
    let currentState = {
        currentView: 'dashboard',
        userRole: 'EO',
        userData: {
            name: 'Admin User',
            department: 'Department',
            deptId: 'Admin',
            role: 'Executive Officer'
        }
    };

    // Navigation handling for SPA
    const navItems = document.querySelectorAll('.nav-item');
    const backBtn = document.querySelector('.back-btn');
    
    // View containers
    const views = {
        dashboard: document.getElementById('dashboard-view'),
        issues: document.getElementById('issues-view'),
        community: document.getElementById('community-view'),
        assignments: document.getElementById('assignments-view'),
        kanban: document.getElementById('kanban-view'),
        'ai-routing': document.getElementById('ai-routing-view'),
        'sla-tracker': document.getElementById('sla-tracker-view'),
        profile: document.getElementById('profile-view'),
        settings: document.getElementById('settings-view')
    };
    
    // Navigation event listeners
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Get the view name from data attribute
            const viewName = this.getAttribute('data-view');
            
            // Update state
            currentState.currentView = viewName;
            
            // Update active nav item
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            
            // Show the selected view and hide others
            Object.keys(views).forEach(key => {
                if (views[key]) {
                    views[key].classList.remove('active');
                }
            });
            
            if (views[viewName]) {
                views[viewName].classList.add('active');
            }
            
            // Load content for the view if it's empty
            loadViewContent(viewName);
        });
    });
    
    // Back button event listener — ends the session and returns to login
    backBtn.addEventListener('click', function() {
        SPOTNFIX.fetch('/api/logout', { method: 'POST' })
            .catch(function () { /* session may already be gone */ })
            .then(function () {
                localStorage.removeItem('adminData');
                window.location.href = 'admin_login.html';
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
        
        // Update UI for EO role
        updateRoleUI('EO');
    });
    
    deptHeadRoleBtn.addEventListener('click', function() {
        this.classList.remove('btn-outline');
        this.classList.add('btn-primary');
        eoRoleBtn.classList.remove('btn-primary');
        eoRoleBtn.classList.add('btn-outline');
        document.querySelector('.role').textContent = 'Department Head';
        
        // Update state
        currentState.userRole = 'DEPT_HEAD';
        
        // Update UI for Department Head role
        updateRoleUI('DEPT_HEAD');
    });
    
    // Function to update UI based on role
    function updateRoleUI(role) {
        // Hide/show role-specific menu items
        const kanbanItem = document.querySelector('[data-view="kanban"]');
        const aiRoutingItem = document.querySelector('[data-view="ai-routing"]');
        
        if (role === 'EO') {
            if (kanbanItem) kanbanItem.style.display = 'flex';
            if (aiRoutingItem) aiRoutingItem.style.display = 'flex';
        } else {
            if (kanbanItem) kanbanItem.style.display = 'none';
            if (aiRoutingItem) aiRoutingItem.style.display = 'none';
        }
    }
    
    // Function to load content for each view
    function loadViewContent(viewName) {
        // If the view already has content, don't reload
        if (views[viewName] && views[viewName].children.length > 1) {
            return;
        }
        
        // Load content based on view
        switch(viewName) {
            case 'issues':
                loadIssuesContent();
                break;
            case 'community':
                loadCommunityContent();
                break;
            case 'assignments':
                loadAssignmentsContent();
                break;
            case 'kanban':
                loadKanbanContent();
                break;
            case 'ai-routing':
                loadAIRoutingContent();
                break;
            case 'sla-tracker':
                loadSLATrackerContent();
                break;
            case 'settings':
                loadSettingsContent();
                break;
            default:
                // Dashboard content is already in place
                break;
        }
    }
    
    // Content loading functions
    function loadIssuesContent() {
        if (!views.issues) return;
        console.log('Loading issues content...');
        loadUserReports(); // Load reports when issues view is opened
        return; // Exit early to prevent loading static content
        
        views.issues.innerHTML = `
            <div class="view-header">
                <div>
                    <h1>Issue Management</h1>
                    <p class="text-gray-600">Manage and track all civic issues reported in your jurisdiction</p>
                </div>
                <div class="view-actions flex items-center space-x-3">
                    <button class="btn btn-outline">
                        <i class="fas fa-filter"></i>
                        Filter
                    </button>
                    <button class="btn btn-outline">
                        <i class="fas fa-search"></i>
                        Search
                    </button>
                </div>
            </div>
            
            <div class="issues-grid">
                <div class="card issue-card">
                    <div class="issue-header">
                        <div>
                            <div class="issue-title-section flex items-center space-x-3 mb-2">
                                <h3 class="text-lg font-semibold">Street light not working</h3>
                                <span class="badge badge-primary">
                                    <i class="fas fa-robot"></i>
                                    AI: 95%
                                </span>
                            </div>
                            <div class="issue-meta flex items-center space-x-2 text-sm text-gray-600">
                                <span class="font-medium">CIV-2025-001</span>
                                <span>•</span>
                                <span>Main Road, Sector 5</span>
                                <span>•</span>
                                <span>Via Citizen App</span>
                            </div>
                        </div>
                        <div class="issue-status-section text-right">
                            <span class="badge badge-blue mb-2">
                                <i class="fas fa-sync-alt"></i>
                                In Progress
                            </span>
                            <p class="text-xs text-gray-500">SLA: 4 hours</p>
                        </div>
                    </div>
                    
                    <div class="issue-details-grid grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Department</p>
                            <p class="font-medium text-[#0B3C5D]">Electrical</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Assigned To</p>
                            <p class="font-medium text-[#0B3C5D]">Ramesh Kumar</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Priority</p>
                            <span class="badge badge-high">High</span>
                        </div>
                    </div>
                    
                    <div class="issue-actions flex justify-between items-center mt-6">
                        <div class="action-buttons flex space-x-2">
                            <button class="btn btn-outline btn-sm">
                                <i class="fas fa-eye"></i>
                                View Details
                            </button>
                            <button class="btn btn-primary btn-sm">
                                <i class="fas fa-user-check"></i>
                                Assign
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="card issue-card">
                    <div class="issue-header">
                        <div>
                            <div class="issue-title-section flex items-center space-x-3 mb-2">
                                <h3 class="text-lg font-semibold">Water logging issue</h3>
                                <span class="badge badge-primary">
                                    <i class="fas fa-robot"></i>
                                    AI: 87%
                                </span>
                            </div>
                            <div class="issue-meta flex items-center space-x-2 text-sm text-gray-600">
                                <span class="font-medium">CIV-2025-002</span>
                                <span>•</span>
                                <span>Park Avenue, Sector 2</span>
                                <span>•</span>
                                <span>Via WhatsApp</span>
                            </div>
                        </div>
                        <div class="issue-status-section text-right">
                            <span class="badge badge-yellow mb-2">
                                <i class="fas fa-clock"></i>
                                Pending
                            </span>
                            <p class="text-xs text-gray-500">SLA: 2 days</p>
                        </div>
                    </div>
                    
                    <div class="issue-details-grid grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Department</p>
                            <p class="font-medium text-[#0B3C5D]">Public Works</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Assigned To</p>
                            <p class="font-medium text-red-500">Unassigned</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Priority</p>
                            <span class="badge badge-medium">Medium</span>
                        </div>
                    </div>
                    
                    <div class="issue-actions flex justify-between items-center mt-6">
                        <div class="action-buttons flex space-x-2">
                            <button class="btn btn-outline btn-sm">
                                <i class="fas fa-eye"></i>
                                View Details
                            </button>
                            <button class="btn btn-primary btn-sm">
                                <i class="fas fa-user-check"></i>
                                Assign
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="card issue-card">
                    <div class="issue-header">
                        <div>
                            <div class="issue-title-section flex items-center space-x-3 mb-2">
                                <h3 class="text-lg font-semibold">Garbage collection missed</h3>
                                <span class="badge badge-primary">
                                    <i class="fas fa-robot"></i>
                                    AI: 98%
                                </span>
                            </div>
                            <div class="issue-meta flex items-center space-x-2 text-sm text-gray-600">
                                <span class="font-medium">CIV-2025-003</span>
                                <span>•</span>
                                <span>Residential Block A</span>
                                <span>•</span>
                                <span>Via IVR Call</span>
                            </div>
                        </div>
                        <div class="issue-status-section text-right">
                            <span class="badge badge-green mb-2">
                                <i class="fas fa-check-circle"></i>
                                Resolved
                            </span>
                            <p class="text-xs text-gray-500">SLA: Completed</p>
                        </div>
                    </div>
                    
                    <div class="issue-details-grid grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Department</p>
                            <p class="font-medium text-[#0B3C5D]">Sanitation</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Assigned To</p>
                            <p class="font-medium text-[#0B3C5D]">Suresh Singh</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Priority</p>
                            <span class="badge badge-low">Low</span>
                        </div>
                    </div>
                    
                    <div class="issue-actions flex justify-between items-center mt-6">
                        <div class="action-buttons">
                            <button class="btn btn-outline btn-sm">
                                <i class="fas fa-eye"></i>
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function loadCommunityContent() {
        if (!views.community) return;
        
        views.community.innerHTML = `
            <div class="view-header">
                <div>
                    <h1>Ward Community</h1>
                    <p class="text-gray-600">Engage with local communities and manage ward representatives</p>
                </div>
                <div class="view-actions flex items-center space-x-3">
                    <button class="btn btn-outline">
                        <i class="fas fa-filter"></i>
                        Filter
                    </button>
                    <button class="btn btn-outline">
                        <i class="fas fa-search"></i>
                        Search
                    </button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Total Wards</p>
                            <p class="stat-value">42</p>
                        </div>
                        <i class="fas fa-map-marker-alt stat-icon"></i>
                    </div>
                    <div class="stat-footer">
                        <i class="fas fa-trending-up text-green-500"></i>
                        <span class="text-green-600">+2 new wards</span>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Active Representatives</p>
                            <p class="stat-value text-green-600">38</p>
                        </div>
                        <i class="fas fa-users stat-icon text-green-500"></i>
                    </div>
                    <div class="stat-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 90%;"></div>
                        </div>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Community Events</p>
                            <p class="stat-value">12</p>
                        </div>
                        <i class="fas fa-calendar stat-icon"></i>
                    </div>
                    <div class="stat-footer">
                        <i class="fas fa-calendar-plus text-blue-500"></i>
                        <span class="text-blue-500">3 upcoming</span>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Avg Engagement</p>
                            <p class="stat-value">78%</p>
                        </div>
                        <i class="fas fa-chart-line stat-icon text-yellow-500"></i>
                    </div>
                    <div class="stat-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 78%;"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2>Ward Representatives</h2>
                    <button class="btn btn-primary">
                        <i class="fas fa-plus"></i>
                        Add Representative
                    </button>
                </div>
                <div class="representatives-list">
                    <div class="representative-item">
                        <div class="representative-info">
                            <div class="representative-name">
                                <h3>Amit Sharma</h3>
                                <span class="badge badge-outline">Ward 5</span>
                            </div>
                            <div class="representative-details">
                                <span><i class="fas fa-phone"></i> +91 98765 43210</span>
                                <span>•</span>
                                <span><i class="fas fa-envelope"></i> amit.sharma@email.com</span>
                            </div>
                        </div>
                        <div class="representative-status">
                            <span class="badge badge-green">Active</span>
                            <button class="btn btn-outline btn-sm">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                        </div>
                    </div>
                    
                    <div class="representative-item">
                        <div class="representative-info">
                            <div class="representative-name">
                                <h3>Priya Patel</h3>
                                <span class="badge badge-outline">Ward 12</span>
                            </div>
                            <div class="representative-details">
                                <span><i class="fas fa-phone"></i> +91 98765 43211</span>
                                <span>•</span>
                                <span><i class="fas fa-envelope"></i> priya.patel@email.com</span>
                            </div>
                        </div>
                        <div class="representative-status">
                            <span class="badge badge-green">Active</span>
                            <button class="btn btn-outline btn-sm">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                        </div>
                    </div>
                    
                    <div class="representative-item">
                        <div class="representative-info">
                            <div class="representative-name">
                                <h3>Rajesh Kumar</h3>
                                <span class="badge badge-outline">Ward 18</span>
                            </div>
                            <div class="representative-details">
                                <span><i class="fas fa-phone"></i> +91 98765 43212</span>
                                <span>•</span>
                                <span><i class="fas fa-envelope"></i> rajesh.kumar@email.com</span>
                            </div>
                        </div>
                        <div class="representative-status">
                            <span class="badge badge-yellow">Inactive</span>
                            <button class="btn btn-outline btn-sm">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function loadAssignmentsContent() {
        if (!views.assignments) return;

        views.assignments.innerHTML = `
            <div class="view-header">
                <div>
                    <h1>Assignments</h1>
                    <p class="text-gray-600">Track which reports have been assigned to DMs and their departments</p>
                </div>
            </div>

            <div class="stats-grid">
                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Assigned Reports</p>
                            <p class="stat-value" id="stat-assigned-assignments">–</p>
                        </div>
                        <i class="fas fa-tasks stat-icon"></i>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Completed</p>
                            <p class="stat-value text-green-600" id="stat-completed-assignments">–</p>
                        </div>
                        <i class="fas fa-check-circle stat-icon text-green-500"></i>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">In Progress</p>
                            <p class="stat-value" id="stat-inprogress-assignments">–</p>
                        </div>
                        <i class="fas fa-sync-alt stat-icon"></i>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Awaiting Assignment</p>
                            <p class="stat-value text-red-500" id="stat-awaiting-assignments">–</p>
                        </div>
                        <i class="fas fa-exclamation-triangle stat-icon text-red-500"></i>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2>Current Assignments</h2>
                    <button class="btn btn-primary" onclick="openIssuesView()">
                        <i class="fas fa-plus"></i>
                        Assign a Report
                    </button>
                </div>
                <div class="assignments-list" id="assignments-list">
                    <p class="text-muted">Loading assignments...</p>
                </div>
            </div>
        `;

        loadAssignmentsData();
    }

    // Real assignment data from GET /api/admin/reports
    async function loadAssignmentsData() {
        const list = document.getElementById('assignments-list');
        if (!list) return;

        try {
            const response = await SPOTNFIX.fetch('/api/admin/reports');

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('adminData');
                window.location.href = 'admin_login.html';
                return;
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to load reports');
            }

            const reports = data.reports || [];
            const assigned = reports.filter(r => r.assigned_dm_name);
            const completed = reports.filter(r => SPOTNFIX.canonicalStatus(r.status) === 'RESOLVED');
            const inProgress = reports.filter(r => SPOTNFIX.canonicalStatus(r.status) === 'IN_PROGRESS');
            const awaiting = reports.filter(r => SPOTNFIX.canonicalStatus(r.status) === 'VERIFIED');

            setStat('stat-assigned-assignments', assigned.length);
            setStat('stat-completed-assignments', completed.length);
            setStat('stat-inprogress-assignments', inProgress.length);
            setStat('stat-awaiting-assignments', awaiting.length);

            if (assigned.length === 0) {
                list.innerHTML = '<p class="text-muted">No reports have been assigned to a DM yet.</p>';
                return;
            }

            list.innerHTML = assigned
                .slice()
                .sort((a, b) => new Date(b.assigned_at || b.created_at) - new Date(a.assigned_at || a.created_at))
                .map(renderAssignmentItem)
                .join('');
        } catch (error) {
            console.error('Error loading assignments:', error);
            list.innerHTML = '<p class="text-danger">Could not load assignments: ' + escapeHTML(error.message || 'Unknown error') + '</p>';
        }
    }

    function setStat(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value);
    }

    function renderAssignmentItem(report) {
        const st = SPOTNFIX.canonicalStatus(report.status);
        const priority = (report.priority || '').toUpperCase();
        const priorityClass = priority === 'HIGH' ? 'badge-high' : (priority === 'MEDIUM' ? 'badge-medium' : 'badge-low');
        const statusClass = st === 'RESOLVED' ? 'badge-green' : (st === 'IN_PROGRESS' ? 'badge-blue' : 'badge-yellow');
        const assignedDate = report.assigned_at ? new Date(report.assigned_at).toLocaleDateString() : '';

        return `
            <div class="assignment-item">
                <div class="assignment-info">
                    <div class="assignment-title">
                        <h3>${escapeHTML(report.issue_title)}</h3>
                        <span class="badge ${priorityClass}">${escapeHTML(priority || 'NORMAL')} Priority</span>
                    </div>
                    <div class="assignment-details">
                        <span><i class="fas fa-user"></i> Assigned to: ${escapeHTML(report.assigned_dm_name)}</span>
                        ${report.department ? `<span>•</span><span><i class="fas fa-building"></i> ${escapeHTML(report.department)}</span>` : ''}
                        ${assignedDate ? `<span>•</span><span><i class="fas fa-calendar"></i> ${assignedDate}</span>` : ''}
                    </div>
                </div>
                <div class="assignment-status">
                    <span class="badge ${statusClass}">${escapeHTML(st)}</span>
                    <button class="btn btn-outline btn-sm" onclick="openIssuesView()">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                </div>
            </div>
        `;
    }

    function escapeHTML(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Navigate to the Issues view (used by assignment actions)
    function openIssuesView() {
        const issuesNav = document.querySelector('.nav-item[data-view="issues"]');
        if (issuesNav) issuesNav.click();
    }
    
    function loadKanbanContent() {
        if (!views.kanban) return;
        
        views.kanban.innerHTML = `
            <div class="view-header">
                <div>
                    <h1>Kanban Board</h1>
                    <p class="text-gray-600">Visualize workflow and track issue progress across departments</p>
                </div>
                <div class="view-actions flex items-center space-x-3">
                    <button class="btn btn-outline">
                        <i class="fas fa-filter"></i>
                        Filter
                    </button>
                    <button class="btn btn-primary">
                        <i class="fas fa-plus"></i>
                        New Task
                    </button>
                </div>
            </div>
            
            <div class="kanban-board">
                <div class="kanban-column">
                    <div class="column-header">
                        <h3><i class="fas fa-inbox"></i> Backlog</h3>
                        <span class="badge">5</span>
                    </div>
                    <div class="column-content">
                        <div class="kanban-card">
                            <div class="card-header">
                                <h4>Review citizen feedback</h4>
                                <span class="badge badge-low">Low</span>
                            </div>
                            <div class="card-body">
                                <p>Analyze feedback from the last quarter and identify improvement areas</p>
                            </div>
                            <div class="card-footer">
                                <span><i class="fas fa-user"></i> Admin Team</span>
                                <span><i class="fas fa-calendar"></i> Due: 2 weeks</span>
                            </div>
                        </div>
                        
                        <div class="kanban-card">
                            <div class="card-header">
                                <h4>Update department contacts</h4>
                                <span class="badge badge-medium">Medium</span>
                            </div>
                            <div class="card-body">
                                <p>Verify and update contact information for all department heads</p>
                            </div>
                            <div class="card-footer">
                                <span><i class="fas fa-user"></i> HR Department</span>
                                <span><i class="fas fa-calendar"></i> Due: 1 week</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="kanban-column">
                    <div class="column-header">
                        <h3><i class="fas fa-tasks"></i> To Do</h3>
                        <span class="badge">8</span>
                    </div>
                    <div class="column-content">
                        <div class="kanban-card">
                            <div class="card-header">
                                <h4>Prepare quarterly report</h4>
                                <span class="badge badge-high">High</span>
                            </div>
                            <div class="card-body">
                                <p>Compile data and create the quarterly performance report for all departments</p>
                            </div>
                            <div class="card-footer">
                                <span><i class="fas fa-user"></i> Analytics Team</span>
                                <span><i class="fas fa-calendar"></i> Due: 3 days</span>
                            </div>
                        </div>
                        
                        <div class="kanban-card">
                            <div class="card-header">
                                <h4>Plan community event</h4>
                                <span class="badge badge-medium">Medium</span>
                            </div>
                            <div class="card-body">
                                <p>Organize a town hall meeting for Ward 15 residents</p>
                            </div>
                            <div class="card-footer">
                                <span><i class="fas fa-user"></i> Community Team</span>
                                <span><i class="fas fa-calendar"></i> Due: 1 week</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="kanban-column">
                    <div class="column-header">
                        <h3><i class="fas fa-sync-alt"></i> In Progress</h3>
                        <span class="badge">6</span>
                    </div>
                    <div class="column-content">
                        <div class="kanban-card">
                            <div class="card-header">
                                <h4>Implement new routing system</h4>
                                <span class="badge badge-high">High</span>
                            </div>
                            <div class="card-body">
                                <p>Deploy the updated AI routing algorithm for issue categorization</p>
                            </div>
                            <div class="card-footer">
                                <span><i class="fas fa-user"></i> IT Department</span>
                                <span><i class="fas fa-calendar"></i> Due: Tomorrow</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="kanban-column">
                    <div class="column-header">
                        <h3><i class="fas fa-check-circle"></i> Done</h3>
                        <span class="badge">12</span>
                    </div>
                    <div class="column-content">
                        <div class="kanban-card completed">
                            <div class="card-header">
                                <h4>Update website content</h4>
                                <span class="badge badge-green">Completed</span>
                            </div>
                            <div class="card-body">
                                <p>Refresh the municipal website with new service information</p>
                            </div>
                            <div class="card-footer">
                                <span><i class="fas fa-user"></i> Communications</span>
                                <span><i class="fas fa-calendar-check"></i> Completed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function loadAIRoutingContent() {
        if (!views['ai-routing']) return;
        
        views['ai-routing'].innerHTML = `
            <div class="view-header">
                <div>
                    <h1>AI Routing</h1>
                    <p class="text-gray-600">Monitor and manage AI-powered issue categorization and routing</p>
                </div>
                <div class="view-actions flex items-center space-x-3">
                    <button class="btn btn-outline">
                        <i class="fas fa-cog"></i>
                        Configure
                    </button>
                    <button class="btn btn-primary">
                        <i class="fas fa-sync-alt"></i>
                        Refresh
                    </button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Total Issues Routed</p>
                            <p class="stat-value">1,248</p>
                        </div>
                        <i class="fas fa-robot stat-icon"></i>
                    </div>
                    <div class="stat-footer">
                        <i class="fas fa-trending-up text-green-500"></i>
                        <span class="text-green-600">+15% from last month</span>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Accuracy Rate</p>
                            <p class="stat-value text-green-600">94.2%</p>
                        </div>
                        <i class="fas fa-percentage stat-icon text-green-500"></i>
                    </div>
                    <div class="stat-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 94.2%;"></div>
                        </div>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Manual Overrides</p>
                            <p class="stat-value">72</p>
                        </div>
                        <i class="fas fa-exchange-alt stat-icon"></i>
                    </div>
                    <div class="stat-footer">
                        <i class="fas fa-trending-down text-green-500"></i>
                        <span class="text-green-600">-8% from last month</span>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Avg Processing Time</p>
                            <p class="stat-value">2.4s</p>
                        </div>
                        <i class="fas fa-bolt stat-icon text-yellow-500"></i>
                    </div>
                    <div class="stat-footer">
                        <span class="text-gray-600">Target: < 3s</span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2>Routing Performance by Department</h2>
                    <button class="btn btn-outline btn-sm">
                        <i class="fas fa-download"></i>
                        Export Report
                    </button>
                </div>
                <div class="routing-performance">
                    <div class="performance-item">
                        <div class="performance-info">
                            <h3>Electrical Department</h3>
                            <div class="performance-stats">
                                <span>Accuracy: 96.8%</span>
                                <span>•</span>
                                <span>Issues: 342</span>
                            </div>
                        </div>
                        <div class="performance-progress">
                            <div class="progress-bar">
                                <div class="progress-fill bg-green" style="width: 96.8%;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="performance-item">
                        <div class="performance-info">
                            <h3>Public Works</h3>
                            <div class="performance-stats">
                                <span>Accuracy: 92.4%</span>
                                <span>•</span>
                                <span>Issues: 418</span>
                            </div>
                        </div>
                        <div class="performance-progress">
                            <div class="progress-bar">
                                <div class="progress-fill bg-blue" style="width: 92.4%;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="performance-item">
                        <div class="performance-info">
                            <h3>Sanitation</h3>
                            <div class="performance-stats">
                                <span>Accuracy: 95.1%</span>
                                <span>•</span>
                                <span>Issues: 287</span>
                            </div>
                        </div>
                        <div class="performance-progress">
                            <div class="progress-bar">
                                <div class="progress-fill bg-yellow" style="width: 95.1%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function loadSLATrackerContent() {
        if (!views['sla-tracker']) return;
        
        views['sla-tracker'].innerHTML = `
            <div class="view-header">
                <div>
                    <h1>SLA Tracker</h1>
                    <p class="text-gray-600">Monitor service level agreements and response times</p>
                </div>
                <div class="view-actions flex items-center space-x-3">
                    <button class="btn btn-outline">
                        <i class="fas fa-filter"></i>
                        Filter
                    </button>
                    <button class="btn btn-outline">
                        <i class="fas fa-download"></i>
                        Export
                    </button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Overall Compliance</p>
                            <p class="stat-value">91.3%</p>
                        </div>
                        <i class="fas fa-chart-line stat-icon"></i>
                    </div>
                    <div class="stat-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 91.3%;"></div>
                        </div>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">On-Time Resolutions</p>
                            <p class="stat-value text-green-600">87</p>
                        </div>
                        <i class="fas fa-check-circle stat-icon text-green-500"></i>
                    </div>
                    <div class="stat-footer">
                        <i class="fas fa-trending-up text-green-500"></i>
                        <span class="text-green-600">+12% from last week</span>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">SLA Breaches</p>
                            <p class="stat-value text-red-500">12</p>
                        </div>
                        <i class="fas fa-exclamation-triangle stat-icon text-red-500"></i>
                    </div>
                    <div class="stat-footer">
                        <i class="fas fa-trending-down text-green-500"></i>
                        <span class="text-green-600">-3 from last week</span>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-header">
                        <div>
                            <p class="stat-label">Avg Response Time</p>
                            <p class="stat-value">3.2h</p>
                        </div>
                        <i class="fas fa-clock stat-icon"></i>
                    </div>
                    <div class="stat-footer">
                        <span class="text-gray-600">Target: < 4h</span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2>Department SLA Performance</h2>
                    <button class="btn btn-outline btn-sm">
                        <i class="fas fa-eye"></i>
                        View Details
                    </button>
                </div>
                <div class="sla-performance">
                    <div class="performance-item">
                        <div class="performance-info">
                            <h3>Electrical Department</h3>
                            <div class="performance-stats">
                                <span>Compliance: 94.2%</span>
                                <span>•</span>
                                <span>Breaches: 3</span>
                            </div>
                        </div>
                        <div class="performance-progress">
                            <div class="progress-bar">
                                <div class="progress-fill bg-green" style="width: 94.2%;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="performance-item">
                        <div class="performance-info">
                            <h3>Public Works</h3>
                            <div class="performance-stats">
                                <span>Compliance: 89.7%</span>
                                <span>•</span>
                                <span>Breaches: 5</span>
                            </div>
                        </div>
                        <div class="performance-progress">
                            <div class="progress-bar">
                                <div class="progress-fill bg-blue" style="width: 89.7%;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="performance-item">
                        <div class="performance-info">
                            <h3>Sanitation</h3>
                            <div class="performance-stats">
                                <span>Compliance: 92.8%</span>
                                <span>•</span>
                                <span>Breaches: 2</span>
                            </div>
                        </div>
                        <div class="performance-progress">
                            <div class="progress-bar">
                                <div class="progress-fill bg-yellow" style="width: 92.8%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function loadSettingsContent() {
        if (!views.settings) return;
        
        views.settings.innerHTML = `
            <div class="view-header">
                <div>
                    <h1>Settings</h1>
                    <p class="text-gray-600">Configure your admin portal preferences and account settings</p>
                </div>
            </div>
            
            <div class="settings-grid">
                <div class="card">
                    <h3 class="card-title mb-4">Profile Information</h3>
                    <div class="setting-item">
                        <label for="name">Full Name</label>
                        <input type="text" id="name" class="form-input" value="Admin User">
                    </div>
                    <div class="setting-item">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" class="form-input" value="admin@example.com">
                    </div>
                    <div class="setting-item">
                        <label for="department">Department</label>
                        <select id="department" class="form-select">
                            <option>Public Works</option>
                            <option>Electrical</option>
                            <option>Sanitation</option>
                            <option>Transportation</option>
                        </select>
                    </div>
                    <button class="btn btn-primary mt-4">Save Changes</button>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Notifications</h3>
                    <div class="setting-item">
                        <label class="checkbox-label">
                            <input type="checkbox" checked>
                            Email Notifications
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="checkbox-label">
                            <input type="checkbox" checked>
                            SMS Alerts
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="checkbox-label">
                            <input type="checkbox">
                            Push Notifications
                        </label>
                    </div>
                    <button class="btn btn-primary mt-4">Save Preferences</button>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Security</h3>
                    <div class="setting-item">
                        <label for="current-password">Current Password</label>
                        <input type="password" id="current-password" class="form-input">
                    </div>
                    <div class="setting-item">
                        <label for="new-password">New Password</label>
                        <input type="password" id="new-password" class="form-input">
                    </div>
                    <div class="setting-item">
                        <label for="confirm-password">Confirm New Password</label>
                        <input type="password" id="confirm-password" class="form-input">
                    </div>
                    <button class="btn btn-primary mt-4">Update Password</button>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Portal Preferences</h3>
                    <div class="setting-item">
                        <label class="checkbox-label">
                            <input type="checkbox" checked>
                            Enable Dark Mode
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="checkbox-label">
                            <input type="checkbox">
                            Auto-refresh Dashboard
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="checkbox-label">
                            <input type="checkbox" checked>
                            Show Notifications Badge
                        </label>
                    </div>
                    <button class="btn btn-primary mt-4">Save Preferences</button>
                </div>
            </div>
        `;
    }
    
    // Function to simulate React-like component rendering
    function renderView() {
        // Update the active nav item
        navItems.forEach(item => {
            if (item.getAttribute('data-view') === currentState.currentView) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Show the current view
        Object.keys(views).forEach(key => {
            if (views[key]) {
                if (key === currentState.currentView) {
                    views[key].classList.add('active');
                } else {
                    views[key].classList.remove('active');
                }
            }
        });
        
        // Load content for the current view if needed
        loadViewContent(currentState.currentView);
    }
    
    // Profile functionality
    function loadProfileContent() {
        if (!views.profile) return;
        
        // Load admin profile data
        loadAdminProfile();
        
        // Add event listeners for profile editing
        setupProfileEventListeners();
    }
    
    async function loadAdminProfile() {
        // The session cookie is HttpOnly, so the portal only knows its own ID
        // from the login response. The backend still verifies both on every call.
        const storedAdmin = localStorage.getItem('adminData');
        let adminId = null;
        try {
            adminId = storedAdmin ? JSON.parse(storedAdmin).id : null;
        } catch (error) {
            adminId = null;
        }

        if (!adminId) {
            window.location.href = 'admin_login.html';
            return;
        }

        try {
            const response = await SPOTNFIX.fetch(`/api/admin/profile/${adminId}`);

            // 401: no/expired session. 403: the stored ID is not the session
            // identity (or the caller is not an admin). Both mean "log in again".
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('adminData');
                window.location.href = 'admin_login.html';
                return;
            }

            const result = await response.json();

            if (result.success && result.admin) {
                // Backend is the source of truth for the rendered profile.
                localStorage.setItem('adminData', JSON.stringify(result.admin));
                updateAdminProfileDisplay(result.admin);
            } else if (response.status === 404) {
                setDefaultAdminProfile('Admin not found');
            } else {
                setDefaultAdminProfile('Unable to load profile');
            }
        } catch (error) {
            console.error('Error loading admin profile:', error);
            setDefaultAdminProfile('Unable to reach the server');
        }
    }
    
    function updateAdminProfileDisplay(adminData) {
        console.log('Updating admin profile display with data:', adminData);
        
        // Update profile header
        document.getElementById('profile-name').textContent = adminData.name || 'Admin Name';
        document.getElementById('profile-role').textContent = 'Executive Officer';
        document.getElementById('profile-id').textContent = 'ID: ' + (adminData.idNumber || 'N/A');
        
        // Update profile details
        document.getElementById('view-name').textContent = adminData.name || '';
        document.getElementById('view-email').textContent = adminData.email || '';
        document.getElementById('view-idNumber').textContent = adminData.idNumber || '';
        document.getElementById('view-address').textContent = adminData.address || '';
        
        console.log('Admin profile display updated successfully');
    }
    
    function setDefaultAdminProfile(message) {
        const text = message || 'Loading...';
        document.getElementById('view-name').textContent = text;
        document.getElementById('view-email').textContent = text;
        document.getElementById('view-idNumber').textContent = text;
        document.getElementById('view-address').textContent = text;
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
                
                // Get admin ID from localStorage
                const adminData = localStorage.getItem('adminData');
                if (!adminData) {
                    alert('Admin data not found. Please login again.');
                    return;
                }
                
                const adminId = JSON.parse(adminData).id;
                
                try {
                    // Call API to update profile
                    const response = await SPOTNFIX.fetch(`/api/admin/profile/${adminId}`, {
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

                    if (response.status === 401 || response.status === 403) {
                        localStorage.removeItem('adminData');
                        window.location.href = 'admin_login.html';
                        return;
                    }

                    if (result.success) {
                        // Update localStorage with new data
                        localStorage.setItem('adminData', JSON.stringify(result.admin));
                        
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
                        alert('Error updating profile: ' + (result.message || result.error || 'Unknown error'));
                    }
                } catch (error) {
                    console.error('Error updating profile:', error);
                    alert('Error updating profile. Please try again.');
                }
            });
        }
    }
    
    // Add profile to loadViewContent function
    function loadViewContent(viewName) {
        // If the view already has content, don't reload
        if (views[viewName] && views[viewName].children.length > 1) {
            return;
        }
        
        // Load content based on view
        switch(viewName) {
            case 'issues':
                loadIssuesContent();
                break;
            case 'community':
                loadCommunityContent();
                break;
            case 'assignments':
                loadAssignmentsContent();
                break;
            case 'kanban':
                loadKanbanContent();
                break;
            case 'ai-routing':
                loadAIRoutingContent();
                break;
            case 'sla-tracker':
                loadSLATrackerContent();
                break;
            case 'profile':
                loadProfileContent();
                break;
            case 'settings':
                loadSettingsContent();
                break;
            default:
                // Dashboard content is already in place
                break;
        }
    }

    // Load user reports for admin
    let lastReports = [];

    async function loadUserReports() {
        try {
            console.log('Fetching reports from API...');
            const response = await SPOTNFIX.fetch('/api/admin/reports');
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.status === 401) {
                localStorage.removeItem('adminData');
                window.location.href = 'admin_login.html';
                return;
            }
            
            if (data.success) {
                console.log('Reports loaded successfully:', data.reports.length, 'reports');
                displayReports(data.reports);
            } else {
                console.error('Failed to load reports:', data.error);
                document.getElementById('reports-container').innerHTML = '<p class="text-danger">Failed to load reports: ' + data.error + '</p>';
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            document.getElementById('reports-container').innerHTML = '<p class="text-danger">Error loading reports: ' + error.message + '</p>';
        }
    }

    // Display reports in the admin portal
    function displayReports(reports) {
        console.log('Displaying reports:', reports);
        lastReports = Array.isArray(reports) ? reports : [];
        const container = document.getElementById('reports-container');
        console.log('Container element:', container);
        
        if (!container) {
            console.error('Reports container not found!');
            return;
        }
        
        const statusFilter = document.getElementById('status-filter');
        const filterValue = statusFilter ? statusFilter.value : 'all';
        
        // Filter reports by status (filter options use legacy lowercase names,
        // report.status comes back canonical uppercase from the API)
        let filteredReports = reports;
        if (filterValue !== 'all') {
            filteredReports = reports.filter(report =>
                SPOTNFIX.canonicalStatus(report.status) === SPOTNFIX.canonicalStatus(filterValue)
            );
        }
        
        if (filteredReports.length === 0) {
            container.innerHTML = '<p class="text-muted">No reports found</p>';
            return;
        }
        
        let html = '';
        filteredReports.forEach(report => {
            const createdDate = new Date(report.created_at).toLocaleDateString();
            const st = SPOTNFIX.canonicalStatus(report.status);
            const statusClass = st === 'RESOLVED' ? 'success' : (st === 'REJECTED' ? 'danger' : 'warning');
            const statusIcon = st === 'RESOLVED' ? 'check-circle' : (st === 'REJECTED' ? 'times-circle' : 'clock');
            const reporter = report.user || {};
            
            html += `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${report.issue_title}</h5>
                        <span class="badge badge-${statusClass}">
                            <i class="fas fa-${statusIcon}"></i> ${report.status.toUpperCase()}
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
                                <p><strong>Reporter:</strong> ${reporter.full_name}</p>
                                <p><strong>Email:</strong> ${reporter.email}</p>
                                <p><strong>Phone:</strong> ${reporter.phone}</p>
                                <p><strong>Priority:</strong> ${report.priority}</p>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12">
                                <p><strong>Description:</strong></p>
                                <p class="text-muted">${report.issue_description}</p>
                            </div>
                        </div>
                        ${report.assigned_dm_name ? `
                        <div class="row">
                            <div class="col-12">
                                <p><strong>Assigned To:</strong> ${report.assigned_dm_name}${report.department ? ' — ' + report.department : ''}</p>
                                ${report.assigned_at ? `<p><strong>Assigned At:</strong> ${new Date(report.assigned_at).toLocaleString()}</p>` : ''}
                                ${report.assigned_by_admin_name ? `<p><strong>Assigned By:</strong> ${report.assigned_by_admin_name}</p>` : ''}
                                ${report.resolved_by_dm_name ? `<p><strong>Resolved By:</strong> ${report.resolved_by_dm_name}</p>` : ''}
                                ${report.resolution_notes ? `<p><strong>Resolution Notes:</strong> ${report.resolution_notes}</p>` : ''}
                            </div>
                        </div>` : ''}
                        <div class="row mt-3">
                            <div class="col-12">
                                ${st === 'PENDING' ? `
                                    <button class="btn btn-success btn-sm" onclick="updateReportStatus('${report._id}', 'VERIFIED')">
                                        <i class="fas fa-check"></i> Verify
                                    </button>
                                    <button class="btn btn-danger btn-sm ml-2" onclick="updateReportStatus('${report._id}', 'REJECTED')">
                                        <i class="fas fa-times"></i> Reject
                                    </button>
                                ` : st === 'VERIFIED' ? `
                                    <button class="btn btn-primary btn-sm" onclick="openAssignForm('${report._id}')">
                                        <i class="fas fa-user-check"></i> Assign to DM
                                    </button>
                                    <div id="assign-form-${report._id}" class="mt-3"></div>
                                ` : st === 'RESOLVED' ? `
                                    <span class="text-success">
                                        <i class="fas fa-check-circle"></i> Completed
                                    </span>
                                ` : `
                                    <span class="text-muted">
                                        <i class="fas fa-circle-notch"></i> ${st}
                                    </span>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Update report status
    async function updateReportStatus(reportId, status) {
        try {
            const adminData = localStorage.getItem('adminData');
            if (!adminData) {
                alert('Admin data not found. Please login again.');
                return;
            }
            
            const admin = JSON.parse(adminData);
            
            const response = await SPOTNFIX.fetch(`/api/admin/reports/${reportId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: status,
                    adminId: admin.id
                })
            });
            
            if (response.status === 401) {
                localStorage.removeItem('adminData');
                window.location.href = 'admin_login.html';
                return;
            }

            const data = await response.json();

            if (data.success) {
                alert('Report status updated successfully!');
                loadUserReports(); // Refresh the reports list
            } else if (response.status === 404) {
                alert('Report not found.');
                loadUserReports();
            } else if (response.status === 409) {
                alert('Cannot update status: ' + (data.error || 'illegal transition'));
                loadUserReports();
            } else if (response.status === 403) {
                alert('Not authorised: ' + (data.error || 'request rejected'));
            } else {
                alert('Failed to update report status: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error updating report status:', error);
            alert('Could not reach the server. Please check your connection and try again.');
        }
    }

    // ---- Report assignment: admin selects a DM + department, then confirms ----

    // Static frontend department list (there is no backend department registry)
    const DEPARTMENTS = [
        'Electrical',
        'Public Works',
        'Sanitation',
        'Water Supply',
        'Roads & Transport',
        'Parks & Gardens',
        'Health',
        'Other'
    ];

    let dmDirectoryPromise = null;

    // GET /api/admin/dms (admin-only), cached for the session
    function loadDmDirectory() {
        if (!dmDirectoryPromise) {
            dmDirectoryPromise = SPOTNFIX.fetch('/api/admin/dms')
                .then(async function (response) {
                    if (response.status === 401) {
                        localStorage.removeItem('adminData');
                        window.location.href = 'admin_login.html';
                        return [];
                    }
                    const data = await response.json();
                    if (!data.success) {
                        throw new Error(data.error || 'Failed to load DMs');
                    }
                    return data.dms || [];
                })
                .catch(function (error) {
                    dmDirectoryPromise = null; // allow a retry on the next attempt
                    throw error;
                });
        }
        return dmDirectoryPromise;
    }

    // Toggle the inline assignment form inside a VERIFIED report card
    async function openAssignForm(reportId) {
        const host = document.getElementById('assign-form-' + reportId);
        if (!host) return;

        if (host.dataset.open === 'true') {
            closeAssignForm(reportId);
            return;
        }
        host.dataset.open = 'true';
        host.innerHTML = '<p class="text-muted">Loading DMs...</p>';

        try {
            const dms = await loadDmDirectory();
            if (!host.dataset.open || !document.getElementById('assign-form-' + reportId)) return;

            if (dms.length === 0) {
                host.innerHTML = '<p class="text-danger">No DMs are registered yet. Ask an administrator to create a DM account first.</p>';
                return;
            }

            host.innerHTML = `
                <div class="form-group">
                    <label for="assign-dm-${reportId}">District Magistrate</label>
                    <select id="assign-dm-${reportId}" class="form-select">
                        ${dms.map(dm => `<option value="${dm._id}">${escapeHTML(dm.name)}${dm.idNumber ? ' (' + escapeHTML(dm.idNumber) + ')' : ''}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="assign-dept-${reportId}">Department</label>
                    <select id="assign-dept-${reportId}" class="form-select">
                        ${DEPARTMENTS.map(dept => `<option value="${dept}">${dept}</option>`).join('')}
                    </select>
                </div>
                <button class="btn btn-primary btn-sm" id="confirm-assign-${reportId}">
                    <i class="fas fa-check"></i> Confirm Assignment
                </button>
                <button class="btn btn-outline btn-sm" id="cancel-assign-${reportId}">Cancel</button>
            `;

            document.getElementById('confirm-assign-' + reportId).addEventListener('click', function () {
                confirmAssign(reportId);
            });
            document.getElementById('cancel-assign-' + reportId).addEventListener('click', function () {
                closeAssignForm(reportId);
            });
        } catch (error) {
            console.error('Error loading DM directory:', error);
            host.innerHTML = '<p class="text-danger">Could not load the DM list: ' + escapeHTML(error.message || 'Unknown error') + '</p>';
        }
    }

    function closeAssignForm(reportId) {
        const host = document.getElementById('assign-form-' + reportId);
        if (!host) return;
        host.dataset.open = '';
        host.innerHTML = '';
    }

    async function confirmAssign(reportId) {
        const dmSelect = document.getElementById('assign-dm-' + reportId);
        const deptSelect = document.getElementById('assign-dept-' + reportId);
        if (!dmSelect || !deptSelect) return;

        const dmId = dmSelect.value;
        const department = deptSelect.value;
        if (!dmId) {
            alert('Select a DM to assign this report to.');
            return;
        }

        await assignReport(reportId, dmId, department);
    }

    // POST /api/admin/reports/:reportId/assign
    async function assignReport(reportId, dmId, department) {
        const body = { dmId: dmId, department: department };
        try {
            const stored = localStorage.getItem('adminData');
            const adminId = stored ? JSON.parse(stored).id : null;
            if (adminId) body.adminId = adminId;
        } catch (error) {
            // identity comes from the session cookie anyway; the backend re-checks it
        }

        try {
            const response = await SPOTNFIX.fetch(`/api/admin/reports/${reportId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.status === 401) {
                localStorage.removeItem('adminData');
                window.location.href = 'admin_login.html';
                return;
            }

            const data = await response.json();

            if (data.success) {
                const name = data.assignedTo && data.assignedTo.name ? data.assignedTo.name : 'the selected DM';
                alert('Report assigned to ' + name + ' (' + ((data.assignedTo && data.assignedTo.department) || department) + ')');
                loadUserReports();
                refreshAssignmentsView();
                return;
            }

            if (response.status === 400) {
                alert('Invalid assignment request: ' + (data.error || 'check the details'));
            } else if (response.status === 403) {
                alert('Not authorised to assign this report: ' + (data.error || 'request rejected'));
            } else if (response.status === 404) {
                alert('Report or DM not found: ' + (data.error || 'missing record'));
                loadUserReports();
            } else if (response.status === 409) {
                alert('Cannot assign this report: ' + (data.error || 'its status changed'));
                loadUserReports();
            } else {
                alert('Assignment failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error assigning report:', error);
            alert('Could not reach the server. Please check your connection and try again.');
        }
    }

    // Re-render the Assignments view after a successful assignment
    function refreshAssignmentsView() {
        if (document.getElementById('assignments-list')) {
            loadAssignmentsData();
        }
    }


    // Make functions globally available
    window.loadUserReports = loadUserReports;
    window.updateReportStatus = updateReportStatus;
    window.openAssignForm = openAssignForm;
    window.closeAssignForm = closeAssignForm;
    window.confirmAssign = confirmAssign;
    window.assignReport = assignReport;
    window.openIssuesView = openIssuesView;

    // Initialize the page
    renderView();

    // Re-render the reports list when the status filter changes
    const statusFilterEl = document.getElementById('status-filter');
    if (statusFilterEl) {
        statusFilterEl.addEventListener('change', function () {
            displayReports(lastReports);
        });
    }

    // Initialize profile section if it exists
    if (views.profile) {
        loadProfileContent();
    }
    
    console.log('Admin Portal loaded with React-like patterns');
});