const API_BASE = ""; // Since frontend is served from FastAPI root, requests are relative

// Application State
let state = {
    users: [],
    currentUser: null,
    courses: [],
    progress: [],
    enrollments: []
};

// DOM Elements
const userSelector = document.getElementById("userSelector");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const tabEmployeeLink = document.getElementById("tabEmployeeLink");
const tabManagerLink = document.getElementById("tabManagerLink");
const employeeTab = document.getElementById("employee-tab");
const managerTab = document.getElementById("manager-tab");

// Sidebar Elements
const appSidebar = document.getElementById("appSidebar");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");

// User details labels
const currentUserNameLabel = document.getElementById("currentUserNameLabel");
const currentUserRoleLabel = document.getElementById("currentUserRoleLabel");

// Course Filter
const courseFilter = document.getElementById("courseFilter");

// KPI Labels
const kpiTotalModules = document.getElementById("kpiTotalModules");
const kpiCompleted = document.getElementById("kpiCompleted");
const kpiInProgress = document.getElementById("kpiInProgress");
const kpiDelayed = document.getElementById("kpiDelayed");

// Personal Progress Charts
const courseProgressRing = document.getElementById("courseProgressRing");
const courseProgressRingText = document.getElementById("courseProgressRingText");
const segFast = document.getElementById("segFast");
const segOnTrack = document.getElementById("segOnTrack");
const segSlow = document.getElementById("segSlow");
const segTooSlow = document.getElementById("segTooSlow");
const lblFastCount = document.getElementById("lblFastCount");
const lblOnTrackCount = document.getElementById("lblOnTrackCount");
const lblSlowCount = document.getElementById("lblSlowCount");
const lblTooSlowCount = document.getElementById("lblTooSlowCount");

// Tables
const personalProgressTableBody = document.querySelector("#personalProgressTable tbody");
const teamProgressTableBody = document.querySelector("#teamProgressTable tbody");
const employeesTableBody = document.querySelector("#employeesTable tbody");
const courseHierarchyContainer = document.getElementById("courseHierarchyContainer");
const enrollmentsTableBody = document.querySelector("#enrollmentsTable tbody");

// Modals
const progressModal = document.getElementById("progressModal");
const employeeModal = document.getElementById("employeeModal");
const courseModal = document.getElementById("courseModal");
const enrollmentModal = document.getElementById("enrollmentModal");

// Forms
const progressForm = document.getElementById("progressForm");
const employeeForm = document.getElementById("employeeForm");
const courseForm = document.getElementById("courseForm");
const enrollmentForm = document.getElementById("enrollmentForm");

// INIT FUNCTION
window.addEventListener("DOMContentLoaded", async () => {
    setupEventHandlers();
    await refreshData();
    
    // Set initial active user (default to Super User if available)
    if (state.users.length > 0) {
        const defaultUser = state.users.find(u => u.role === "Super User") || 
                            state.users.find(u => u.role === "Manager" || u.role === "Power User") || 
                            state.users[0];
        state.currentUser = defaultUser;
        userSelector.value = state.currentUser.username;
        onUserChanged();
    }
});

// Refresh all records from server
async function refreshData() {
    try {
        const [usersRes, coursesRes, progressRes, enrollmentsRes] = await Promise.all([
            fetch(`${API_BASE}/api/employees`).then(r => r.json()),
            fetch(`${API_BASE}/api/courses`).then(r => r.json()),
            fetch(`${API_BASE}/api/progress`).then(r => r.json()),
            fetch(`${API_BASE}/api/enrollments`).then(r => r.json())
        ]);
        
        state.users = usersRes;
        state.courses = coursesRes;
        state.progress = progressRes;
        state.enrollments = enrollmentsRes;
        
        renderSelectors();
        renderActiveDashboard();
    } catch (err) {
        console.error("Failed to load data from server:", err);
    }
}

// User Dropdown Setup
function renderSelectors() {
    const previousVal = userSelector.value;
    userSelector.innerHTML = "";
    
    state.users.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.username;
        const nameDisplay = u.english_name ? `${u.fullname} (${u.english_name})` : u.fullname;
        opt.textContent = `${nameDisplay} (${u.role})`;
        userSelector.appendChild(opt);
    });
    
    if (previousVal && state.users.find(u => u.username === previousVal)) {
        userSelector.value = previousVal;
    }
}

// Global Event Listeners
function setupEventHandlers() {
    // User Switcher
    userSelector.addEventListener("change", (e) => {
        const username = e.target.value;
        state.currentUser = state.users.find(u => u.username === username);
        onUserChanged();
    });

    // Theme Toggle
    themeToggleBtn.addEventListener("click", () => {
        const body = document.body;
        const icon = themeToggleBtn.querySelector("span");
        if (body.classList.contains("dark-theme")) {
            body.classList.replace("dark-theme", "light-theme");
            icon.textContent = "dark_mode";
        } else {
            body.classList.replace("light-theme", "dark-theme");
            icon.textContent = "light_mode";
        }
    });

    // Sidebar Collapse Trigger
    sidebarToggleBtn.addEventListener("click", () => {
        appSidebar.classList.toggle("collapsed");
    });

    // Sidebar Keyboard Shortcut (Ctrl + B)
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            appSidebar.classList.toggle("collapsed");
        }
    });

    // Course Filter Trigger
    courseFilter.addEventListener("change", () => {
        renderPersonalTab();
    });

    // Main App Navigation Tabs
    const navItems = document.querySelectorAll(".nav-menu .nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");
            
            const tabId = item.getAttribute("data-tab");
            if (tabId === "employee-tab") {
                employeeTab.classList.add("active");
                managerTab.classList.remove("active");
            } else {
                managerTab.classList.add("active");
                employeeTab.classList.remove("active");
            }
        });
    });

    // Manager Dashboard Subtabs Navigation
    const subnavBtns = document.querySelectorAll(".manager-subnav .subnav-btn");
    const subtabPanes = document.querySelectorAll("#manager-tab .subtab-pane");
    subnavBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            subnavBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const subtabId = btn.getAttribute("data-subtab");
            subtabPanes.forEach(pane => {
                if (pane.id === subtabId) {
                    pane.classList.add("active");
                } else {
                    pane.classList.remove("active");
                }
            });
        });
    });

    // Modals closing triggers
    document.getElementById("closeProgressModal").onclick = () => hideModal(progressModal);
    document.getElementById("btnCancelProgressModal").onclick = () => hideModal(progressModal);

    document.getElementById("closeEmployeeModal").onclick = () => hideModal(employeeModal);
    document.getElementById("btnCancelEmployeeModal").onclick = () => hideModal(employeeModal);

    document.getElementById("closeCourseModal").onclick = () => hideModal(courseModal);
    document.getElementById("btnCancelCourseModal").onclick = () => hideModal(courseModal);

    document.getElementById("closeEnrollmentModal").onclick = () => hideModal(enrollmentModal);
    document.getElementById("btnCancelEnrollmentModal").onclick = () => hideModal(enrollmentModal);

    // Open Add Forms
    document.getElementById("btnOpenAddEmployee").onclick = () => {
        document.getElementById("employeeModalTitle").textContent = "Thêm nhân viên mới";
        document.getElementById("empUsername").disabled = false;
        employeeForm.reset();
        showModal(employeeModal);
    };

    document.getElementById("btnOpenAddCourse").onclick = () => {
        courseForm.reset();
        document.getElementById("moduleRowsContainer").innerHTML = "";
        addModuleInputRow(); // Add initial empty row
        showModal(courseModal);
    };

    const btnExpandAllPlans = document.getElementById("btnExpandAllPlans");
    if (btnExpandAllPlans) {
        btnExpandAllPlans.onclick = () => {
            document.querySelectorAll(".level1-card").forEach(c => c.classList.add("expanded"));
            document.querySelectorAll(".level2-card").forEach(c => c.classList.add("expanded"));
        };
    }

    const btnCollapseAllPlans = document.getElementById("btnCollapseAllPlans");
    if (btnCollapseAllPlans) {
        btnCollapseAllPlans.onclick = () => {
            document.querySelectorAll(".level1-card").forEach(c => c.classList.remove("expanded"));
            document.querySelectorAll(".level2-card").forEach(c => c.classList.remove("expanded"));
        };
    }

    document.getElementById("btnOpenAddEnrollment").onclick = () => {
        populateEnrollmentOptions();
        enrollmentForm.reset();
        showModal(enrollmentModal);
    };

    // Target Scope Radio Listeners in Enrollment Modal
    const targetTypeRadios = document.getElementsByName("enrTargetType");
    targetTypeRadios.forEach(r => {
        r.addEventListener("change", (e) => {
            const val = e.target.value;
            const groupPlan = document.getElementById("groupEnrPlan");
            const groupCourse = document.getElementById("groupEnrCourse");
            const lblPlan = document.getElementById("lblTargetPlan");
            const lblCourse = document.getElementById("lblTargetCourse");
            
            if (val === "plan") {
                if (groupPlan) groupPlan.classList.remove("hidden");
                if (groupCourse) groupCourse.classList.add("hidden");
                if (lblPlan) lblPlan.classList.add("active");
                if (lblCourse) lblCourse.classList.remove("active");
            } else {
                if (groupCourse) groupCourse.classList.remove("hidden");
                if (groupPlan) groupPlan.classList.add("hidden");
                if (lblCourse) lblCourse.classList.add("active");
                if (lblPlan) lblPlan.classList.remove("active");
            }
            calculateAutoEndDate();
        });
    });

    // Auto calculate End Date on input changes
    ["enrStartDate", "enrRatio", "enrDailyHours", "enrPlanSelect", "enrCourseSelect", "enrWorkweek"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", calculateAutoEndDate);
            el.addEventListener("change", calculateAutoEndDate);
        }
    });

    // Add module row to catalog designer
    document.getElementById("btnAddModuleRow").onclick = () => {
        addModuleInputRow();
    };

    // Progress slider value listener
    const progPercentInput = document.getElementById("progPercent");
    const percentLabel = document.getElementById("percentLabel");
    progPercentInput.addEventListener("input", (e) => {
        percentLabel.textContent = `${e.target.value}%`;
    });

    // Form Submissions
    progressForm.addEventListener("submit", submitProgressForm);
    employeeForm.addEventListener("submit", submitEmployeeForm);
    courseForm.addEventListener("submit", submitCourseForm);
    enrollmentForm.addEventListener("submit", submitEnrollmentForm);
}

// User Switching Callback
function onUserChanged() {
    if (!state.currentUser) return;
    
    const nameDisplay = state.currentUser.english_name ? `${state.currentUser.fullname} (${state.currentUser.english_name})` : state.currentUser.fullname;
    currentUserNameLabel.textContent = nameDisplay;
    currentUserRoleLabel.textContent = state.currentUser.role;
    
    // Check Authorization
    if (state.currentUser.role === "Manager" || state.currentUser.role === "Power User" || state.currentUser.role === "Super User") {
        tabManagerLink.classList.remove("hidden");
    } else {
        tabManagerLink.classList.add("hidden");
        // Force navigate to personal progress if in Manager panel
        if (managerTab.classList.contains("active")) {
            tabEmployeeLink.click();
        }
    }
    
    renderActiveDashboard();
}

// Show/Hide Modals
function showModal(modalEl) {
    modalEl.classList.add("show");
}
function hideModal(modalEl) {
    modalEl.classList.remove("show");
}

// Render Dashboard Data based on selected user
function renderActiveDashboard() {
    if (!state.currentUser) return;
    
    // 1. Populate the Enrolled Course Filter select element on Personal tab
    const myEnrs = state.enrollments.filter(e => e.username === state.currentUser.username);
    const oldFilterVal = courseFilter.value;
    
    courseFilter.innerHTML = `<option value="ALL">-- Tất cả các khóa --</option>`;
    myEnrs.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.course_name;
        opt.textContent = e.course_name;
        courseFilter.appendChild(opt);
    });
    
    // Restore or reset filter value
    if (oldFilterVal && (oldFilterVal === "ALL" || myEnrs.some(e => e.course_name === oldFilterVal))) {
        courseFilter.value = oldFilterVal;
    } else {
        courseFilter.value = "ALL";
    }
    
    renderPersonalTab();
    
    // 2. Render Manager Dashboard components if authorized
    if (state.currentUser.role === "Manager" || state.currentUser.role === "Power User" || state.currentUser.role === "Super User") {
        renderTeamProgressTable();
        renderEmployeeMgmtTable();
        renderCourseMgmtTable();
        renderEnrollmentsTable();
    }
}

// RENDER PERSONAL TAB (KPIs, Charts, Table)
function renderPersonalTab() {
    const filter = courseFilter.value;
    
    // Get enrollments for current user
    const myEnrs = state.enrollments.filter(e => e.username === state.currentUser.username);
    const enrolledCourseNames = myEnrs.map(e => e.course_name);
    
    // Filter courses based on user's enrollment and dropdown selection
    let userEnrolledCourses = state.courses.filter(c => enrolledCourseNames.includes(c.course_name));
    if (filter !== "ALL") {
        userEnrolledCourses = userEnrolledCourses.filter(c => c.course_name === filter);
    }
    
    // Get progress records for current user
    let myProgress = state.progress.filter(p => p.username === state.currentUser.username);
    if (filter !== "ALL") {
        myProgress = myProgress.filter(p => p.course_name === filter);
    } else {
        // Only show progress for courses the user is currently enrolled in
        myProgress = myProgress.filter(p => enrolledCourseNames.includes(p.course_name));
    }
    
    // 1. Compute KPIs
    const totalModules = userEnrolledCourses.length;
    const completedCount = myProgress.filter(p => p.status === "Completed").length;
    const inProgressCount = myProgress.filter(p => p.status === "In Progress").length;
    const delayedCount = myProgress.filter(p => p.tracking_status === "Slow" || p.tracking_status === "Too slow").length;
    
    kpiTotalModules.textContent = totalModules;
    kpiCompleted.textContent = completedCount;
    kpiInProgress.textContent = inProgressCount;
    kpiDelayed.textContent = delayedCount;
    
    // 2. Compute Weighted Progress & Render SVG Ring
    let totalMinutes = 0;
    let completedMinutes = 0;
    
    userEnrolledCourses.forEach(m => {
        const progRec = myProgress.find(p => 
            p.course_name === m.course_name && 
            (p.path || "") === (m.path || "") && 
            p.module_name === m.module_name
        );
        const progressPercent = progRec ? progRec.progress_percent : 0;
        totalMinutes += m.duration_minutes;
        completedMinutes += (progressPercent * m.duration_minutes) / 100;
    });
    
    const overallProgress = totalMinutes > 0 ? (completedMinutes / totalMinutes) * 100 : 0;
    
    // Animate SVG circular progress (r=50 -> Circumference = 314.16)
    const ringOffset = 314.16 - (314.16 * overallProgress / 100);
    courseProgressRing.style.strokeDashoffset = ringOffset;
    courseProgressRingText.textContent = `${Math.round(overallProgress)}%`;
    
    // 3. Compute Speed Status Counts & Render Visual Stack Bar
    const statusCounts = { Fast: 0, "On-track": 0, Slow: 0, "Too slow": 0 };
    myProgress.forEach(p => {
        if (p.tracking_status in statusCounts) {
            statusCounts[p.tracking_status]++;
        }
    });
    
    const totalStatusCount = statusCounts.Fast + statusCounts["On-track"] + statusCounts.Slow + statusCounts["Too slow"];
    
    if (totalStatusCount > 0) {
        segFast.style.width = `${(statusCounts.Fast / totalStatusCount) * 100}%`;
        segOnTrack.style.width = `${(statusCounts["On-track"] / totalStatusCount) * 100}%`;
        segSlow.style.width = `${(statusCounts.Slow / totalStatusCount) * 100}%`;
        segTooSlow.style.width = `${(statusCounts["Too slow"] / totalStatusCount) * 100}%`;
    } else {
        segFast.style.width = "0%";
        segOnTrack.style.width = "0%";
        segSlow.style.width = "0%";
        segTooSlow.style.width = "0%";
    }
    
    lblFastCount.textContent = statusCounts.Fast;
    lblOnTrackCount.textContent = statusCounts["On-track"];
    lblSlowCount.textContent = statusCounts.Slow;
    lblTooSlowCount.textContent = statusCounts["Too slow"];
    
    // 4. Render Personal Progress Table
    personalProgressTableBody.innerHTML = "";
    
    userEnrolledCourses.forEach(courseModule => {
        const userModuleProg = myProgress.find(p => 
            p.course_name === courseModule.course_name && 
            (p.path || "") === (courseModule.path || "") && 
            p.module_name === courseModule.module_name
        );
        
        const tr = document.createElement("tr");
        
        const currentStatus = userModuleProg ? userModuleProg.status : "Not Started";
        const currentPercent = userModuleProg ? userModuleProg.progress_percent : 0;
        const speedStatus = userModuleProg ? userModuleProg.tracking_status : "On-track";
        const plannedDate = userModuleProg ? userModuleProg.planned_completion_date : "";
        const startDate = userModuleProg ? userModuleProg.start_date : "";
        const compDate = userModuleProg ? userModuleProg.completion_date : "";
        
        tr.innerHTML = `
            <td><strong>${courseModule.plan}</strong></td>
            <td>${courseModule.course_name}</td>
            <td><span class="text-secondary">${courseModule.path || "-"}</span></td>
            <td>${courseModule.module_name}</td>
            <td><span class="font-mono">${courseModule.duration}</span></td>
            <td><span class="font-mono text-secondary">${plannedDate || "Chưa thiết lập"}</span></td>
            <td>
                <div class="prog-bar-cell">
                    <div class="prog-bar-bg"><div class="prog-bar-fill" style="width: ${currentPercent}%"></div></div>
                    <span class="font-mono font-bold">${currentPercent}%</span>
                </div>
            </td>
            <td>${getStatusBadge(currentStatus)}</td>
            <td>${getSpeedBadge(speedStatus, currentStatus, plannedDate)}</td>
            <td class="actions-col">
                <button class="btn btn-secondary btn-sm" onclick="openProgressUpdateModal('${courseModule.course_name}', '${courseModule.path || ""}', '${courseModule.module_name}', '${currentStatus}', ${currentPercent}, '${startDate}', '${compDate}', '${plannedDate}')">
                    <span class="material-icons-round font-sm">edit</span> Cập nhật
                </button>
            </td>
        `;
        personalProgressTableBody.appendChild(tr);
    });
    
    if (totalModules === 0) {
        personalProgressTableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted" style="padding: 2rem;">
                    Chưa được đăng ký học khóa học nào. Vui lòng liên hệ Quản lý (Manager) để đăng ký lộ trình học.
                </td>
            </tr>
        `;
    }
}

// Helpers for badges
function getStatusBadge(status) {
    let cls = "badge-status-notstarted";
    let txt = "Chưa học";
    if (status === "In Progress") {
        cls = "badge-status-inprogress";
        txt = "Đang học";
    } else if (status === "Completed") {
        cls = "badge-status-completed";
        txt = "Hoàn thành";
    }
    return `<span class="badge ${cls}">${txt}</span>`;
}

function getSpeedBadge(speed, status, plannedDate) {
    if (!plannedDate) return `<span class="text-muted">-</span>`;
    
    let cls = "badge-speed-ontrack";
    let txt = "Đúng tiến độ";
    let icon = "check_circle_outline";
    
    if (speed === "Fast") {
        cls = "badge-speed-fast";
        txt = "Học nhanh";
        icon = "bolt";
    } else if (speed === "Slow") {
        cls = "badge-speed-slow";
        txt = "Chậm tiến độ";
        icon = "history";
    } else if (speed === "Too slow") {
        cls = "badge-speed-tooslow";
        txt = "Quá chậm";
        icon = "warning";
    }
    return `<span class="badge ${cls}"><span class="material-icons-round" style="font-size:0.9rem">${icon}</span> ${txt}</span>`;
}

// Open Progress Modal
window.openProgressUpdateModal = function(courseName, path, moduleName, status, progress, start, comp, planned) {
    document.getElementById("progUsername").value = state.currentUser.username;
    document.getElementById("progCourseName").value = courseName;
    document.getElementById("progPath").value = path || "";
    document.getElementById("progModuleName").value = moduleName;
    
    document.getElementById("progInfoCourse").textContent = courseName;
    document.getElementById("progInfoModule").textContent = moduleName;
    
    document.getElementById("progStatus").value = status;
    document.getElementById("progPercent").value = progress;
    document.getElementById("percentLabel").textContent = `${progress}%`;
    
    document.getElementById("progStartDate").value = start || "";
    document.getElementById("progCompDate").value = comp || "";
    
    // Default deadline to 2 weeks from now if not established
    if (!planned) {
        const twoWeeks = new Date();
        twoWeeks.setDate(twoWeeks.getDate() + 14);
        document.getElementById("progPlannedDate").value = twoWeeks.toISOString().split("T")[0];
    } else {
        document.getElementById("progPlannedDate").value = planned;
    }
    
    showModal(progressModal);
};

// Form Progress Submit
async function submitProgressForm(e) {
    e.preventDefault();
    const data = {
        username: document.getElementById("progUsername").value,
        course_name: document.getElementById("progCourseName").value,
        path: document.getElementById("progPath").value || "",
        module_name: document.getElementById("progModuleName").value,
        status: document.getElementById("progStatus").value,
        progress_percent: parseFloat(document.getElementById("progPercent").value),
        start_date: document.getElementById("progStartDate").value || null,
        completion_date: document.getElementById("progCompDate").value || null,
        planned_completion_date: document.getElementById("progPlannedDate").value
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            hideModal(progressModal);
            await refreshData();
        } else {
            const err = await response.json();
            alert(`Lỗi: ${err.detail}`);
        }
    } catch (err) {
        console.error(err);
    }
}

// TEAM PROGRESS VIEW FOR MANAGER
function renderTeamProgressTable() {
    teamProgressTableBody.innerHTML = "";
    
    state.progress.forEach(p => {
        const emp = state.users.find(u => u.username === p.username);
        let employeeName = p.username;
        if (emp) {
            employeeName = emp.english_name ? `${emp.fullname} (${emp.english_name})` : emp.fullname;
        }
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${employeeName}</strong> <span class="text-muted font-mono font-sm">(${p.username})</span></td>
            <td>${p.course_name}</td>
            <td>${p.path || "-"}</td>
            <td>${p.module_name}</td>
            <td><span class="badge ${p.status === 'Completed' ? 'badge-status-completed' : p.status === 'In Progress' ? 'badge-status-inprogress' : 'badge-status-notstarted'}">${p.status}</span></td>
            <td><span class="font-mono text-secondary">${p.planned_completion_date}</span></td>
            <td>
                <div class="prog-bar-cell">
                    <div class="prog-bar-bg"><div class="prog-bar-fill" style="width: ${p.progress_percent}%"></div></div>
                    <span class="font-mono">${p.progress_percent}%</span>
                </div>
            </td>
            <td>${getSpeedBadge(p.tracking_status, p.status, p.planned_completion_date)}</td>
        `;
        teamProgressTableBody.appendChild(tr);
    });
    
    if (state.progress.length === 0) {
        teamProgressTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Chưa có bản ghi tiến độ nào của nhân viên.</td></tr>`;
    }
}

// EMPLOYEE REGISTRY VIEW
function renderEmployeeMgmtTable() {
    employeesTableBody.innerHTML = "";
    state.users.forEach(u => {
        const tr = document.createElement("tr");
        const safeFullname = (u.fullname || "").replace(/'/g, "\\'");
        const safeEngName = (u.english_name || "").replace(/'/g, "\\'");
        tr.innerHTML = `
            <td><span class="font-mono">${u.username}</span></td>
            <td><strong>${u.fullname}</strong></td>
            <td><span class="text-secondary">${u.english_name || "-"}</span></td>
            <td><span class="role-badge">${u.role}</span></td>
            <td class="actions-col">
                <button class="btn btn-secondary btn-sm" onclick="openEditEmployee('${u.username}', '${safeFullname}', '${safeEngName}', '${u.role}')">
                    <span class="material-icons-round font-sm">edit</span>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteEmployeeRecord('${u.username}')">
                    <span class="material-icons-round font-sm">delete</span>
                </button>
            </td>
        `;
        employeesTableBody.appendChild(tr);
    });
}

window.openEditEmployee = function(username, fullname, english_name, role) {
    document.getElementById("employeeModalTitle").textContent = "Cập nhật nhân viên";
    document.getElementById("empUsername").value = username;
    document.getElementById("empUsername").disabled = true;
    document.getElementById("empFullname").value = fullname;
    document.getElementById("empEnglishName").value = english_name || "";
    document.getElementById("empRole").value = role;
    showModal(employeeModal);
};

async function deleteEmployeeRecord(username) {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản '${username}'?`)) return;
    try {
        const response = await fetch(`${API_BASE}/api/employees?username=${encodeURIComponent(username)}`, { method: "DELETE" });
        if (response.ok) {
            await refreshData();
            if (state.currentUser.username === username) {
                state.currentUser = state.users[0] || null;
                onUserChanged();
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function submitEmployeeForm(e) {
    e.preventDefault();
    const data = {
        username: document.getElementById("empUsername").value,
        fullname: document.getElementById("empFullname").value,
        english_name: document.getElementById("empEnglishName").value || "",
        role: document.getElementById("empRole").value
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/employees`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            hideModal(employeeModal);
            await refreshData();
            if (state.currentUser && state.currentUser.username === data.username) {
                state.currentUser = state.users.find(u => u.username === data.username);
                onUserChanged();
            }
        } else {
            const err = await response.json();
            alert(`Lỗi: ${err.detail}`);
        }
    } catch (err) {
        console.error(err);
    }
}

// Helper for formatting duration into hours and minutes
function formatHoursMinutes(totalMinutes, formatType = "long") {
    const mins = parseInt(totalMinutes) || 0;
    if (mins <= 0) return formatType === "short" ? "0m" : "0 phút";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (formatType === "short") {
        if (h > 0 && m > 0) return `${h}h${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    }
    if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
}

// Global Level 1 & Level 2 Expand/Collapse Handlers
window.toggleLevel1 = function(planCardId) {
    const card = document.getElementById(planCardId);
    if (card) {
        card.classList.toggle("expanded");
    }
};

window.toggleLevel2Modules = function(courseCardId, event) {
    if (event) event.stopPropagation();
    const card = document.getElementById(courseCardId);
    if (card) {
        card.classList.toggle("expanded");
    }
};

// COURSE CATALOG HIERARCHICAL VIEW (LEVEL 1: PLANS, LEVEL 2: COURSES & MODULES)
function renderCourseMgmtTable() {
    if (!courseHierarchyContainer) return;
    courseHierarchyContainer.innerHTML = "";
    
    if (!state.courses || state.courses.length === 0) {
        courseHierarchyContainer.innerHTML = `
            <div class="empty-state glass">
                <span class="material-icons-round empty-icon">library_books</span>
                <p>Chưa có dữ liệu khóa học nào. Bấm "Tạo khóa học mới" để bắt đầu.</p>
            </div>
        `;
        return;
    }
    
    // Group state.courses by Plan -> Course (with Path) -> Modules
    const planMap = {};
    state.courses.forEach(c => {
        const planName = c.plan || "Khóa học khác";
        if (!planMap[planName]) {
            planMap[planName] = {
                planName: planName,
                courses: {},
                totalMinutes: 0,
                totalModules: 0
            };
        }
        
        // Group by course_name + path
        const courseKey = c.path ? `${c.course_name}:::${c.path}` : c.course_name;
        if (!planMap[planName].courses[courseKey]) {
            planMap[planName].courses[courseKey] = {
                course_name: c.course_name,
                path: c.path || "",
                modules: [],
                totalMinutes: 0
            };
        }
        
        planMap[planName].courses[courseKey].modules.push(c);
        planMap[planName].courses[courseKey].totalMinutes += (c.duration_minutes || 0);
        planMap[planName].totalMinutes += (c.duration_minutes || 0);
        planMap[planName].totalModules += 1;
    });

    let planIdx = 0;
    Object.values(planMap).forEach(plan => {
        planIdx++;
        const courseKeys = Object.keys(plan.courses);
        const courseCount = courseKeys.length;
        const planDurationFormatted = formatHoursMinutes(plan.totalMinutes);
        const planCardId = `plan-card-${planIdx}`;
        
        const planCard = document.createElement("div");
        planCard.className = "level1-card glass";
        planCard.id = planCardId;

        // Level 1 Header
        planCard.innerHTML = `
            <div class="level1-header" onclick="toggleLevel1('${planCardId}')">
                <div class="level1-title-sec">
                    <span class="material-icons-round level1-chevron">keyboard_arrow_right</span>
                    <span class="material-icons-round level1-icon">school</span>
                    <div class="level1-title-text">
                        <h3 class="plan-name">${plan.planName}</h3>
                        <span class="level1-subtitle">Level 1: Phân loại khoá học (Plan)</span>
                    </div>
                </div>
                <div class="level1-stats">
                    <span class="stat-badge count-badge">
                        <span class="material-icons-round font-sm">menu_book</span> ${courseCount} khóa học
                    </span>
                    <span class="stat-badge time-badge">
                        <span class="material-icons-round font-sm">schedule</span> Tổng thời lượng: ${planDurationFormatted}
                    </span>
                </div>
            </div>
            <div class="level2-body">
                <!-- Level 2 courses list -->
            </div>
        `;

        const level2Body = planCard.querySelector(".level2-body");

        let courseIdx = 0;
        courseKeys.forEach(cKey => {
            courseIdx++;
            const courseObj = plan.courses[cKey];
            const courseDurationFormatted = formatHoursMinutes(courseObj.totalMinutes, "short");
            const courseCardId = `course-card-${planIdx}-${courseIdx}`;
            
            const courseCard = document.createElement("div");
            courseCard.className = "level2-card";
            courseCard.id = courseCardId;
            
            const safeCourseName = courseObj.course_name.replace(/'/g, "\\'");
            
            // Level 2 Course HTML with ">" module toggle button
            courseCard.innerHTML = `
                <div class="level2-header" onclick="toggleLevel2Modules('${courseCardId}', event)">
                    <div class="level2-left">
                        <button type="button" class="toggle-modules-btn font-mono" onclick="toggleLevel2Modules('${courseCardId}', event)" title="Xổ ra / Thu gọn các module con">
                            <span class="toggle-arrow">&gt;</span>
                        </button>
                        <div class="course-info">
                            <h4 class="course-title">${courseObj.course_name}</h4>
                            ${courseObj.path ? `<span class="path-pill"><span class="material-icons-round font-xs">alt_route</span> Lộ trình: ${courseObj.path}</span>` : ''}
                        </div>
                    </div>
                    <div class="level2-right">
                        <div class="course-stat-item">
                            <span class="material-icons-round">grid_view</span>
                            <span><strong>${courseObj.modules.length}</strong> modules</span>
                        </div>
                        <div class="course-stat-item">
                            <span class="material-icons-round">schedule</span>
                            <span class="font-mono font-weight-bold">${courseDurationFormatted}</span>
                        </div>
                        <button class="btn btn-danger btn-icon-only btn-sm" onclick="event.stopPropagation(); deleteCourseRecord('${safeCourseName}')" title="Xóa khóa học">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </div>
                </div>
                <div class="level3-modules-container">
                    <table class="level3-module-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;">#</th>
                                <th>Tên Module</th>
                                <th>Thời lượng</th>
                                <th>Số phút</th>
                                <th>Hàng đợi (Queue)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${courseObj.modules.map((m, mIdx) => `
                                <tr>
                                    <td class="font-mono text-muted">${mIdx + 1}</td>
                                    <td class="mod-name-cell"><strong>${m.module_name}</strong></td>
                                    <td><span class="badge-dur">${m.duration || '-'}</span></td>
                                    <td class="font-mono">${m.duration_minutes} phút</td>
                                    <td>
                                        <span class="${m.queue ? 'badge-queue-active' : 'badge-queue-disabled'}">
                                            ${m.queue ? 'Trong hàng đợi' : 'Tạm hoãn'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            level2Body.appendChild(courseCard);
        });

        courseHierarchyContainer.appendChild(planCard);
    });
}

async function deleteCourseRecord(courseName) {
    if (!confirm(`Bạn có chắc muốn xóa toàn bộ khóa học '${courseName}'? Việc này sẽ xóa tất cả các module thuộc khóa học này.`)) return;
    try {
        const response = await fetch(`${API_BASE}/api/courses?course_name=${encodeURIComponent(courseName)}`, { method: "DELETE" });
        if (response.ok) {
            await refreshData();
        }
    } catch (err) {
        console.error(err);
    }
}

// Course design row templates
function addModuleInputRow() {
    const container = document.getElementById("moduleRowsContainer");
    const div = document.createElement("div");
    div.className = "module-input-row";
    div.innerHTML = `
        <div class="form-group flex-2">
            <label>Tên Module</label>
            <input type="text" class="form-control mod-name" required placeholder="E.g. Module 1: Introduction">
        </div>
        <div class="form-group flex-1">
            <label>Thời lượng</label>
            <input type="text" class="form-control mod-dur" required placeholder="1h 30m">
        </div>
        <div class="form-group flex-1">
            <label>Số phút</label>
            <input type="number" class="form-control mod-dur-min" required placeholder="90">
        </div>
        <div class="form-group check-group">
            <label>Queue</label>
            <input type="checkbox" class="form-check mod-queue" checked>
        </div>
        <span class="material-icons-round delete-row-btn" onclick="this.parentElement.remove()">delete</span>
    `;
    container.appendChild(div);
}

async function submitCourseForm(e) {
    e.preventDefault();
    const rows = document.querySelectorAll("#moduleRowsContainer .module-input-row");
    const modules = [];
    rows.forEach(r => {
        modules.push({
            module_name: r.querySelector(".mod-name").value,
            duration: r.querySelector(".mod-dur").value,
            duration_minutes: parseInt(r.querySelector(".mod-dur-min").value),
            queue: r.querySelector(".mod-queue").checked
        });
    });
    
    if (modules.length === 0) {
        alert("Khóa học phải chứa ít nhất 1 module.");
        return;
    }
    
    const data = {
        plan: document.getElementById("coursePlan").value,
        course_name: document.getElementById("courseNameInput").value,
        path: document.getElementById("coursePath").value || "",
        modules: modules
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/courses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            hideModal(courseModal);
            await refreshData();
        } else {
            const err = await response.json();
            alert(`Lỗi: ${err.detail}`);
        }
    } catch (err) {
        console.error(err);
    }
}

// Global preset helper for Ratio
window.setRatio = function(val) {
    const input = document.getElementById("enrRatio");
    if (input) {
        input.value = val;
        calculateAutoEndDate();
    }
};

// AUTO CALCULATE END DATE BASED ON PLAN/COURSE, RATIO, START DATE, WORKWEEK
function calculateAutoEndDate() {
    const radios = document.getElementsByName("enrTargetType");
    let targetType = "plan";
    for (const r of radios) {
        if (r.checked) {
            targetType = r.value;
            break;
        }
    }
    
    const startDateVal = document.getElementById("enrStartDate").value;
    const ratioVal = parseFloat(document.getElementById("enrRatio").value) || 3.0;
    const dailyHoursVal = parseFloat(document.getElementById("enrDailyHours").value) || 2.0;
    const workweekType = parseInt(document.getElementById("enrWorkweek").value) || 5;
    
    const planSelect = document.getElementById("enrPlanSelect");
    const courseSelect = document.getElementById("enrCourseSelect");
    const targetName = (targetType === "plan") ? planSelect.value : courseSelect.value;
    
    const summaryEl = document.getElementById("enrCalcSummary");

    if (!startDateVal || !targetName) {
        if (summaryEl) summaryEl.innerHTML = "";
        return;
    }

    // 1. Calculate raw total video minutes for target
    let totalMins = 0;
    let moduleCount = 0;
    if (targetType === "plan") {
        const matching = state.courses.filter(c => c.plan === targetName);
        totalMins = matching.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
        moduleCount = matching.length;
    } else {
        const matching = state.courses.filter(c => c.course_name === targetName);
        totalMins = matching.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
        moduleCount = matching.length;
    }

    // 2. Apply ratio
    const adjustedMins = Math.round(totalMins * ratioVal);
    const adjustedHours = adjustedMins / 60.0;

    // 3. Determine required working days
    const requiredDays = Math.max(1, Math.ceil(adjustedHours / dailyHoursVal));

    // Update summary box
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="calc-info-box font-sm glass">
                <div class="calc-info-row">
                    <span><span class="material-icons-round font-xs">videocam</span> Video gốc: <strong>${formatHoursMinutes(totalMins)}</strong> (${moduleCount} modules)</span>
                    <span><span class="material-icons-round font-xs">tune</span> Hệ số Ratio: <strong class="text-primary">${ratioVal}x</strong></span>
                </div>
                <div class="calc-info-row mt-1">
                    <span><span class="material-icons-round font-xs">timer</span> Thời lượng thực tế: <strong class="text-success">${formatHoursMinutes(adjustedMins)} (${adjustedHours.toFixed(1)}h)</strong></span>
                    <span><span class="material-icons-round font-xs">event</span> Dự kiến cần: <strong>${requiredDays} ngày học</strong> (${dailyHoursVal}h/ngày)</span>
                </div>
            </div>
        `;
    }

    // 4. Calculate End Date by adding requiredDays working days
    let curr = new Date(startDateVal);
    let added = 0;
    while (added < requiredDays) {
        const day = curr.getDay(); // 0 = Sun, 6 = Sat
        let isWorkDay = true;
        if (workweekType === 5) {
            if (day === 0 || day === 6) isWorkDay = false;
        } else if (workweekType === 6) {
            if (day === 0) isWorkDay = false;
        }
        
        if (isWorkDay) {
            added++;
            if (added >= requiredDays) break;
        }
        curr.setDate(curr.getDate() + 1);
    }

    document.getElementById("enrEndDate").value = curr.toISOString().split("T")[0];
}

// COURSE ENROLLMENTS (ASSIGNMENTS) MANAGEMENT
function renderEnrollmentsTable() {
    enrollmentsTableBody.innerHTML = "";
    
    state.enrollments.forEach(enr => {
        const emp = state.users.find(u => u.username === enr.username);
        const fullName = emp ? (emp.english_name ? `${emp.fullname} (${emp.english_name})` : emp.fullname) : enr.username;
        const workweekText = enr.workweek_type === 7 ? "Hàng ngày (7 ngày)" : enr.workweek_type === 6 ? "T2 - T7 (Nước rút)" : "T2 - T6 (Thường)";
        const targetTypeLabel = (enr.target_type === "plan") ? "Plan" : "Course";
        const ratioText = enr.ratio ? `${enr.ratio}x` : "3.0x";
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="font-mono">${enr.username}</span></td>
            <td><strong>${fullName}</strong></td>
            <td><span class="badge ${enr.target_type === 'plan' ? 'count-badge' : 'time-badge'}">${targetTypeLabel}</span></td>
            <td><strong>${enr.target_name || enr.course_name}</strong></td>
            <td><span class="font-mono">${enr.start_date}</span></td>
            <td><span class="font-mono text-secondary">${enr.planned_end_date}</span></td>
            <td><span class="badge badge-status-inprogress">${workweekText}</span></td>
            <td><span class="font-mono font-weight-bold text-primary">${ratioText}</span></td>
            <td class="actions-col">
                <button class="btn btn-danger btn-sm" onclick="deleteEnrollmentRecord('${enr.username.replace(/'/g, "\\'")}', '${(enr.target_name || enr.course_name).replace(/'/g, "\\'")}')">
                    <span class="material-icons-round font-sm">delete</span> Hủy đăng ký
                </button>
            </td>
        `;
        enrollmentsTableBody.appendChild(tr);
    });
    
    if (state.enrollments.length === 0) {
        enrollmentsTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Chưa có lượt đăng ký khóa học nào.</td></tr>`;
    }
}

function populateEnrollmentOptions() {
    const enrUser = document.getElementById("enrUsername");
    const enrPlanSelect = document.getElementById("enrPlanSelect");
    const enrCourseSelect = document.getElementById("enrCourseSelect");
    
    if (!enrUser || !enrPlanSelect || !enrCourseSelect) return;

    enrUser.innerHTML = "";
    state.users.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.username;
        const nameDisp = u.english_name ? `${u.fullname} (${u.english_name})` : u.fullname;
        opt.textContent = `${nameDisp} (${u.username})`;
        enrUser.appendChild(opt);
    });
    
    // Populate Plans
    enrPlanSelect.innerHTML = "";
    const uniquePlans = [...new Set(state.courses.map(c => c.plan || "Khác"))];
    uniquePlans.forEach(pName => {
        const opt = document.createElement("option");
        opt.value = pName;
        opt.textContent = `Plan: ${pName}`;
        enrPlanSelect.appendChild(opt);
    });
    
    // Populate Courses
    enrCourseSelect.innerHTML = "";
    const uniqueCourseNames = [...new Set(state.courses.map(c => c.course_name))];
    uniqueCourseNames.forEach(cName => {
        const opt = document.createElement("option");
        opt.value = cName;
        opt.textContent = cName;
        enrCourseSelect.appendChild(opt);
    });
    
    // Default Scope: Plan
    const radios = document.getElementsByName("enrTargetType");
    radios.forEach(r => {
        r.checked = (r.value === "plan");
    });
    const lblPlan = document.getElementById("lblTargetPlan");
    const lblCourse = document.getElementById("lblTargetCourse");
    if (lblPlan) lblPlan.classList.add("active");
    if (lblCourse) lblCourse.classList.remove("active");
    
    const groupPlan = document.getElementById("groupEnrPlan");
    const groupCourse = document.getElementById("groupEnrCourse");
    if (groupPlan) groupPlan.classList.remove("hidden");
    if (groupCourse) groupCourse.classList.add("hidden");
    
    // Default values
    document.getElementById("enrRatio").value = 3.0;
    document.getElementById("enrDailyHours").value = 2.0;
    document.getElementById("enrStartDate").value = new Date().toISOString().split("T")[0];
    
    calculateAutoEndDate();
}

async function deleteEnrollmentRecord(username, targetName) {
    if (!confirm(`Bạn có chắc muốn hủy đăng ký '${targetName}' của nhân viên '${username}'? Việc này cũng sẽ xóa toàn bộ lịch học tập liên quan.`)) return;
    try {
        const response = await fetch(`${API_BASE}/api/enrollments?username=${encodeURIComponent(username)}&target_name=${encodeURIComponent(targetName)}`, {
            method: "DELETE"
        });
        if (response.ok) {
            await refreshData();
        } else {
            const err = await response.json();
            alert(`Lỗi: ${err.detail}`);
        }
    } catch (err) {
        console.error(err);
    }
}

async function submitEnrollmentForm(e) {
    e.preventDefault();
    const radios = document.getElementsByName("enrTargetType");
    let targetType = "plan";
    for (const r of radios) {
        if (r.checked) {
            targetType = r.value;
            break;
        }
    }
    
    const targetName = (targetType === "plan") ? document.getElementById("enrPlanSelect").value : document.getElementById("enrCourseSelect").value;
    
    const data = {
        username: document.getElementById("enrUsername").value,
        target_type: targetType,
        target_name: targetName,
        course_name: targetName,
        start_date: document.getElementById("enrStartDate").value,
        planned_end_date: document.getElementById("enrEndDate").value,
        workweek_type: parseInt(document.getElementById("enrWorkweek").value),
        ratio: parseFloat(document.getElementById("enrRatio").value) || 3.0,
        daily_hours: parseFloat(document.getElementById("enrDailyHours").value) || 2.0
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/enrollments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            hideModal(enrollmentModal);
            await refreshData();
        } else {
            const err = await response.json();
            alert(`Lỗi: ${err.detail}`);
        }
    } catch (err) {
        console.error(err);
    }
}

// Expose global date helpers for quick selector buttons
window.setToday = function(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = new Date().toISOString().split("T")[0];
        calculateAutoEndDate();
    }
};

window.setDateOffset = function(inputId, days) {
    const input = document.getElementById(inputId);
    if (input) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        input.value = d.toISOString().split("T")[0];
        calculateAutoEndDate();
    }
};
