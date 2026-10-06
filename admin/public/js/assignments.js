// Assignments View — real assignment data from the SpotnFix backend
document.addEventListener('DOMContentLoaded', function() {
    // Static frontend department list (the backend has no department registry)
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

    let reports = [];
    let dms = [];
    let reportsError = null;
    let dmsError = null;

    const navItems = document.querySelectorAll('.nav-item');
    const backBtn = document.querySelector('.back-btn');

    // Navigation event listeners
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const viewName = this.getAttribute('data-view');

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

    // Back button event listener — returns to the admin portal SPA
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'admin-portal.html';
        });
    }

    // Role switcher (demo only)
    const eoRoleBtn = document.getElementById('eo-role');
    const deptHeadRoleBtn = document.getElementById('dept-head-role');

    if (eoRoleBtn && deptHeadRoleBtn) {
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
    }

    // Assignment form submit
    const assignSubmitBtn = document.getElementById('assign-submit');
    if (assignSubmitBtn) {
        assignSubmitBtn.addEventListener('click', submitAssignment);
    }

    setTodayBadge();
    init();

    async function init() {
        await Promise.all([loadReports(), loadDms()]);
        renderReportOptions();
        renderDmOptions();
        renderDepartmentOptions();
        renderStats();
        renderAssignmentsList();
    }

    function setTodayBadge() {
        const badge = document.getElementById('today-badge');
        if (badge) {
            badge.innerHTML = '<i class="fas fa-calendar"></i> Today: ' + new Date().toLocaleDateString();
        }
    }

    function escapeHTML(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function redirectIfSignedOut(response) {
        if (response.status === 401) {
            localStorage.removeItem('adminData');
            window.location.href = 'admin_login.html';
            return true;
        }
        if (response.status === 403) {
            localStorage.removeItem('adminData');
            window.location.href = 'admin_login.html';
            return true;
        }
        return false;
    }

    async function loadReports() {
        try {
            const response = await SPOTNFIX.fetch('/api/admin/reports');
            if (redirectIfSignedOut(response)) return;

            const data = await response.json();
            if (!data.success) {
                reportsError = data.error || 'Failed to load reports';
                return;
            }
            reports = data.reports || [];
            reportsError = null;
        } catch (error) {
            console.error('Error loading reports:', error);
            reportsError = 'Could not reach the server';
        }
    }

    async function loadDms() {
        try {
            const response = await SPOTNFIX.fetch('/api/admin/dms');
            if (redirectIfSignedOut(response)) return;

            const data = await response.json();
            if (!data.success) {
                dmsError = data.error || 'Failed to load DMs';
                return;
            }
            dms = data.dms || [];
            dmsError = null;
        } catch (error) {
            console.error('Error loading DMs:', error);
            dmsError = 'Could not reach the server';
        }
    }

    function assignableReports() {
        return reports.filter(report =>
            SPOTNFIX.canonicalStatus(report.status) === 'VERIFIED' && !report.assigned_dm_name
        );
    }

    function assignedReports() {
        return reports.filter(report => report.assigned_dm_name);
    }

    function renderReportOptions() {
        const select = document.getElementById('assign-report');
        if (!select) return;

        if (reportsError) {
            select.innerHTML = '<option value="">' + escapeHTML(reportsError) + '</option>';
            return;
        }

        const options = assignableReports();
        if (options.length === 0) {
            select.innerHTML = '<option value="">No verified reports awaiting assignment</option>';
            return;
        }

        select.innerHTML = options.map(report =>
            '<option value="' + report._id + '">' +
            escapeHTML(report.issue_title) + ' — ' + escapeHTML(report.issue_location || 'Location not set') +
            '</option>'
        ).join('');
    }

    function renderDmOptions() {
        const select = document.getElementById('assign-dm');
        if (!select) return;

        if (dmsError) {
            select.innerHTML = '<option value="">' + escapeHTML(dmsError) + '</option>';
            return;
        }

        if (dms.length === 0) {
            select.innerHTML = '<option value="">No DMs registered yet</option>';
            return;
        }

        select.innerHTML = dms.map(dm =>
            '<option value="' + dm._id + '">' +
            escapeHTML(dm.name) + (dm.idNumber ? ' (' + escapeHTML(dm.idNumber) + ')' : '') +
            '</option>'
        ).join('');
    }

    function renderDepartmentOptions() {
        const select = document.getElementById('assign-dept');
        if (!select) return;
        select.innerHTML = DEPARTMENTS.map(dept =>
            '<option value="' + dept + '">' + dept + '</option>'
        ).join('');
    }

    function setStat(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value);
    }

    function renderStats() {
        const assigned = assignedReports();
        const completed = assigned.filter(r => SPOTNFIX.canonicalStatus(r.status) === 'RESOLVED');
        const inProgress = assigned.filter(r => SPOTNFIX.canonicalStatus(r.status) === 'IN_PROGRESS');
        const awaiting = assignableReports();

        setStat('stat-total-assigned', assigned.length);
        setStat('stat-completed-assigned', completed.length);
        setStat('stat-inprogress-assigned', inProgress.length);
        setStat('stat-awaiting-assigned', awaiting.length);
    }

    function renderAssignmentsList() {
        const list = document.getElementById('assignments-list');
        if (!list) return;

        if (reportsError) {
            list.innerHTML = '<p class="text-danger" style="padding: 16px;">' + escapeHTML(reportsError) + '</p>';
            return;
        }

        const assigned = assignedReports()
            .slice()
            .sort((a, b) => new Date(b.assigned_at || b.created_at) - new Date(a.assigned_at || a.created_at));

        if (assigned.length === 0) {
            list.innerHTML = '<p class="text-muted" style="padding: 16px;">No reports have been assigned to a DM yet.</p>';
            return;
        }

        list.innerHTML = assigned.map(report => {
            const st = SPOTNFIX.canonicalStatus(report.status);
            const priority = (report.priority || '').toUpperCase();
            const priorityClass = priority === 'HIGH' ? 'badge-high' : (priority === 'MEDIUM' ? 'badge-medium' : 'badge-low');
            const statusClass = st === 'RESOLVED' ? 'badge-green' : (st === 'IN_PROGRESS' ? 'badge-blue' : 'badge-yellow');
            const assignedDate = report.assigned_at ? new Date(report.assigned_at).toLocaleString() : '';

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
                            ${report.issue_location ? `<span>•</span><span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(report.issue_location)}</span>` : ''}
                            ${assignedDate ? `<span>•</span><span><i class="fas fa-clock"></i> ${assignedDate}</span>` : ''}
                        </div>
                    </div>
                    <div class="assignment-status">
                        <span class="badge ${statusClass}">${escapeHTML(st)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function submitAssignment() {
        const messageEl = document.getElementById('assign-message');
        const reportId = document.getElementById('assign-report') ? document.getElementById('assign-report').value : '';
        const dmId = document.getElementById('assign-dm') ? document.getElementById('assign-dm').value : '';
        const department = document.getElementById('assign-dept') ? document.getElementById('assign-dept').value : '';

        function setMessage(text, isError) {
            if (messageEl) {
                messageEl.textContent = text;
                messageEl.className = isError ? 'text-danger' : 'text-muted';
            }
        }

        if (!reportId || !dmId) {
            setMessage('Select a verified report and a DM first.', true);
            return;
        }

        const body = { dmId: dmId, department: department };
        try {
            const stored = localStorage.getItem('adminData');
            const adminId = stored ? JSON.parse(stored).id : null;
            if (adminId) body.adminId = adminId;
        } catch (error) {
            // identity is validated from the session cookie on the backend
        }

        try {
            const response = await SPOTNFIX.fetch('/api/admin/reports/' + reportId + '/assign', {
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
                setMessage('Assigned to ' + name + ' (' + ((data.assignedTo && data.assignedTo.department) || department) + ').', false);
                await init();
                return;
            }

            if (response.status === 400) {
                setMessage('Invalid assignment: ' + (data.error || 'check the details'), true);
            } else if (response.status === 403) {
                setMessage('Not authorised to assign this report: ' + (data.error || 'rejected'), true);
            } else if (response.status === 404) {
                setMessage('Report or DM not found: ' + (data.error || 'missing record'), true);
                await init();
            } else if (response.status === 409) {
                setMessage('Cannot assign this report: ' + (data.error || 'its status changed'), true);
                await init();
            } else {
                setMessage('Assignment failed: ' + (data.error || 'Unknown error'), true);
            }
        } catch (error) {
            console.error('Error assigning report:', error);
            setMessage('Could not reach the server. Please check your connection and try again.', true);
        }
    }

    console.log('Assignments view loaded');
});
