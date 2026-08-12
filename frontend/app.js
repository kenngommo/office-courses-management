const API_BASE = ""; // Since frontend is served from FastAPI root, requests are relative

// Application State
let state = {
    users: [],
    loggedInUser: null, // Logged in user session (e.g. Manager)
    currentUser: null,  // Target user being viewed in personal progress dashboard
    courses: [],
    progress: [],
    enrollments: [],
    lang: localStorage.getItem("epm_lang") || "vi"
};

// MULTILINGUAL (i18n) DICTIONARY
const i18n = {
    vi: {
        brand_name: "EPM Courses Hub",
        viewing_as_prefix: "Đang xem tiến độ của nhân viên:",
        return_to_my_account: "[Trở về tài khoản của tôi]",
        my_account_opt: "⭐ Tài khoản của tôi",
        user_selector_label: "Chuyển tài khoản (Manager)",
        manage_account: "Quản lý tài khoản",
        change_password: "Đổi mật khẩu",
        logout: "Đăng xuất",

        tab_my_progress: "Tiến độ cá nhân",
        tab_overall_progress: "Quản lý nhóm",
        
        stat_total_modules: "Tổng số Module",
        stat_avg_speed: "Tốc độ trung bình",
        stat_ontrack: "Đúng tiến độ",
        stat_ahead: "Học nhanh",
        stat_slow: "Chậm tiến độ",
        stat_critical: "Quá chậm",
        
        filter_all_emp: "-- Tất cả nhân viên --",
        filter_all_plans: "-- Tất cả Plan --",
        filter_all_courses: "-- Tất cả khóa học --",
        filter_all_status: "-- Tất cả trạng thái --",
        filter_all_tracking: "-- Tất cả tiến độ --",

        btn_create_course: "+ Tạo khóa học mới",
        btn_expand_all: "Xổ ra tất cả",
        btn_collapse_all: "Thu gọn tất cả",
        btn_add_emp: "+ Thêm nhân viên mới",
        btn_add_enr: "+ Đăng ký Lộ trình mới",

        col_employee: "Nhân viên",
        col_course_plan: "Tên Khóa học / Plan",
        col_path: "Lộ trình (Path)",
        col_module: "Module bài học",
        col_status: "Trạng thái",
        col_progress: "Tiến độ (%)",
        col_start_date: "Ngày bắt đầu",
        col_actual_end: "Hoàn thành thực tế",
        col_planned_end: "Hoàn thành dự kiến",
        col_tracking: "Tốc độ tiến độ",

        col_username: "Username",
        col_fullname: "Họ và tên",
        col_email: "Email",
        col_role: "Vai trò",
        col_pwd_status: "Trạng thái Mật khẩu",
        col_actions: "Thao tác",

        col_scope: "Phân loại Đăng ký",
        col_plan_course: "Plan / Khóa học",
        col_ratio: "Hệ số Ratio",
        col_daily_hours: "Giờ học / ngày",
        col_study_days: "Số ngày học",
        col_workweek: "Chế độ làm việc",

        status_completed: "Completed",
        status_in_progress: "In Progress",
        status_not_started: "Not Started",
        track_ontrack: "Đúng tiến độ",
        track_fast: "Học nhanh",
        track_slow: "Chậm",
        track_too_slow: "Quá chậm",

        level1_subtitle: "Level 1: Phân loại khoá học (Plan)",
        btn_save_as_plan: "Lưu thành Plan mới",
        btn_add_module: "Thêm Module",
        btn_active: "Active",
        btn_inactive: "Inactive",

        lbl_remember_me: "Lưu thông tin đăng nhập",
        lbl_forgot_password: "Quên mật khẩu?"
    },
    en: {
        brand_name: "EPM Courses Hub",
        viewing_as_prefix: "Viewing progress for employee:",
        return_to_my_account: "[Return to My Account]",
        my_account_opt: "⭐ My Account",
        user_selector_label: "Switch Account (Manager)",
        manage_account: "Manage Account",
        change_password: "Change Password",
        logout: "Log Out",

        tab_my_progress: "My Progress",
        tab_overall_progress: "Team Dashboard",

        stat_total_modules: "Total Modules",
        stat_avg_speed: "Average Speed",
        stat_ontrack: "On Track",
        stat_ahead: "Ahead of Schedule",
        stat_slow: "Slow",
        stat_critical: "Critical Delay",
        
        filter_all_emp: "-- All Employees --",
        filter_all_plans: "-- All Plans --",
        filter_all_courses: "-- All Courses --",
        filter_all_status: "-- All Statuses --",
        filter_all_tracking: "-- All Progress Speeds --",

        btn_create_course: "+ Create New Course",
        btn_expand_all: "Expand All",
        btn_collapse_all: "Collapse All",
        btn_add_emp: "+ Add New Employee",
        btn_add_enr: "+ Register Schedule",

        col_employee: "Employee",
        col_course_plan: "Course / Plan Name",
        col_path: "Path",
        col_module: "Module Name",
        col_status: "Status",
        col_progress: "Progress (%)",
        col_start_date: "Start Date",
        col_actual_end: "Actual Completion Date",
        col_planned_end: "Planned Completion Date",
        col_tracking: "Tracking Speed",

        col_username: "Username",
        col_fullname: "Full Name",
        col_email: "Email",
        col_role: "Role",
        col_pwd_status: "Password Status",
        col_actions: "Actions",

        col_scope: "Enrollment Scope",
        col_plan_course: "Plan / Course",
        col_ratio: "Ratio Multiplier",
        col_daily_hours: "Daily Hours",
        col_study_days: "Study Days",
        col_workweek: "Workweek Schedule",

        status_completed: "Completed",
        status_in_progress: "In Progress",
        status_not_started: "Not Started",
        track_ontrack: "On Track",
        track_fast: "Ahead",
        track_slow: "Slow",
        track_too_slow: "Critical Delay",

        level1_subtitle: "Level 1: Course Classification (Plan)",
        btn_save_as_plan: "Save as New Plan",
        btn_add_module: "Add Module",
        btn_active: "Active",
        btn_inactive: "Inactive",

        lbl_remember_me: "Remember Me",
        lbl_forgot_password: "Forgot Password?"
    }
};

function t(key) {
    const lang = state.lang || "vi";
    return (i18n[lang] && i18n[lang][key]) || (i18n["vi"] && i18n["vi"][key]) || key;
}

function updateLanguageUI() {
    const currentLangCode = document.getElementById("currentLangCode");
    if (currentLangCode) {
        currentLangCode.textContent = state.lang === "en" ? "EN" : "VN";
    }

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (key) {
            el.textContent = t(key);
        }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (key) {
            el.placeholder = t(key);
        }
    });

    if (state.loggedInUser) {
        renderSelectors();
        renderManagerDashboard();
    }
}

function setLanguage(lang) {
    state.lang = lang;
    localStorage.setItem("epm_lang", lang);
    updateLanguageUI();
}

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

// Auth Modals & Elements
const loginOverlay = document.getElementById("loginOverlay");
const loginForm = document.getElementById("loginForm");
const loginErrorMsg = document.getElementById("loginErrorMsg");

const forgotPasswordModal = document.getElementById("forgotPasswordModal");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const forgotMsg = document.getElementById("forgotMsg");

const changePasswordModal = document.getElementById("changePasswordModal");
const changePasswordForm = document.getElementById("changePasswordForm");
const changePwdMsg = document.getElementById("changePwdMsg");

const profileModal = document.getElementById("profileModal");
const btnOpenProfileModal = document.getElementById("btnOpenProfileModal");
const profileAvatarForm = document.getElementById("profileAvatarForm");
const profileMsg = document.getElementById("profileMsg");
const btnProfileChangePwd = document.getElementById("btnProfileChangePwd");

const campaignModal = document.getElementById("campaignModal");
const campaignForm = document.getElementById("campaignForm");

const editDurationModal = document.getElementById("editDurationModal");
const editDurationForm = document.getElementById("editDurationForm");

const moveModuleModal = document.getElementById("moveModuleModal");
const moveModuleForm = document.getElementById("moveModuleForm");
const addModuleToCourseModal = document.getElementById("addModuleToCourseModal");
const addModuleToCourseForm = document.getElementById("addModuleToCourseForm");

const userProfileBtn = document.getElementById("userProfileBtn");
const userDropdownMenu = document.getElementById("userDropdownMenu");
const btnOpenChangePassword = document.getElementById("btnOpenChangePassword");
const btnLogout = document.getElementById("btnLogout");

// INIT FUNCTION
window.addEventListener("DOMContentLoaded", async () => {
    setupEventHandlers();
    updateLanguageUI();
    await refreshData();
    
    // Check saved remember credentials
    const savedRememberJson = localStorage.getItem("epm_remember");
    if (savedRememberJson) {
        try {
            const rem = JSON.parse(savedRememberJson);
            if (rem.user_or_email) document.getElementById("loginUserOrEmail").value = rem.user_or_email;
            if (rem.password) document.getElementById("loginPassword").value = rem.password;
            document.getElementById("rememberMeCheck").checked = true;
        } catch(e) {}
    }
    
    // Check active session in localStorage
    const savedUserJson = localStorage.getItem("epm_user");
    if (savedUserJson) {
        try {
            const savedUser = JSON.parse(savedUserJson);
            const verifiedUser = state.users.find(u => u.username === savedUser.username);
            if (verifiedUser) {
                state.loggedInUser = verifiedUser;
                state.currentUser = verifiedUser;
                renderSelectors();
                userSelector.value = state.currentUser.username;
                loginOverlay.classList.remove("active");
                onUserChanged();
                
                if (state.loggedInUser.must_change_password) {
                    setTimeout(() => {
                        alert("Tài khoản của bạn cần đổi mật khẩu mới để đảm bảo an toàn.");
                        showModal(changePasswordModal);
                    }, 500);
                }
                return;
            }
        } catch (e) {
            console.error("Error parsing saved user session:", e);
        }
    }
    
    // If not logged in, keep login overlay active
    loginOverlay.classList.add("active");
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
        
        if (state.loggedInUser) {
            const freshLoggedIn = state.users.find(u => u.username === state.loggedInUser.username);
            if (freshLoggedIn) state.loggedInUser = freshLoggedIn;
        }
        if (state.currentUser) {
            const freshCurrent = state.users.find(u => u.username === state.currentUser.username);
            if (freshCurrent) state.currentUser = freshCurrent;
        }
        
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
    
    if (state.loggedInUser) {
        const myOpt = document.createElement("option");
        myOpt.value = state.loggedInUser.username;
        myOpt.textContent = `⭐ Tài khoản của tôi (${state.loggedInUser.fullname})`;
        userSelector.appendChild(myOpt);
        
        state.users.filter(u => u.username !== state.loggedInUser.username).forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.username;
            const nameDisplay = u.english_name ? `${u.fullname} (${u.english_name})` : u.fullname;
            opt.textContent = `${nameDisplay} (${u.role})`;
            userSelector.appendChild(opt);
        });
    } else {
        state.users.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.username;
            const nameDisplay = u.english_name ? `${u.fullname} (${u.english_name})` : u.fullname;
            opt.textContent = `${nameDisplay} (${u.role})`;
            userSelector.appendChild(opt);
        });
    }
    
    if (state.currentUser) {
        userSelector.value = state.currentUser.username;
    } else if (previousVal && state.users.find(u => u.username === previousVal)) {
        userSelector.value = previousVal;
    }
}

// Global Event Listeners
function setupEventHandlers() {
    // Auth Dropdown Toggle
    if (userProfileBtn) {
        userProfileBtn.onclick = (e) => {
            e.stopPropagation();
            userDropdownMenu.classList.toggle("show");
        };
    }
    
    // Password Visibility Toggle Buttons (Supports Login & Change Password fields)
    document.querySelectorAll(".toggle-password-btn").forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute("data-target") || "loginPassword";
            const pwdInput = document.getElementById(targetId);
            if (!pwdInput) return;
            const icon = btn.querySelector("span");
            if (pwdInput.type === "password") {
                pwdInput.type = "text";
                if (icon) icon.textContent = "visibility_off";
            } else {
                pwdInput.type = "password";
                if (icon) icon.textContent = "visibility";
            }
        };
    });

    // Login Form Submit
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            loginErrorMsg.classList.add("hidden");
            loginErrorMsg.textContent = "";

            const userOrEmail = document.getElementById("loginUserOrEmail").value.trim();
            const password = document.getElementById("loginPassword").value;
            const rememberMeCheck = document.getElementById("rememberMeCheck");

            try {
                const response = await fetch(`${API_BASE}/api/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_or_email: userOrEmail, password: password })
                });

                const data = await response.json();
                if (response.ok && data.user) {
                    state.loggedInUser = data.user;
                    state.currentUser = data.user;
                    localStorage.setItem("epm_user", JSON.stringify(data.user));
                    
                    if (rememberMeCheck && rememberMeCheck.checked) {
                        localStorage.setItem("epm_remember", JSON.stringify({ user_or_email: userOrEmail, password: password }));
                    } else {
                        localStorage.removeItem("epm_remember");
                    }

                    renderSelectors();
                    loginOverlay.classList.remove("active");
                    onUserChanged();

                    if (data.user.must_change_password) {
                        setTimeout(() => {
                            alert("Đây là lần đầu đăng nhập (hoặc mật khẩu vừa được reset). Vui lòng đổi mật khẩu mới ngay.");
                            showModal(changePasswordModal);
                        }, 400);
                    }
                } else {
                    loginErrorMsg.textContent = data.detail || "Đăng nhập thất bại. Vui lòng thử lại.";
                    loginErrorMsg.classList.remove("hidden");
                }
            } catch (err) {
                loginErrorMsg.textContent = "Không thể kết nối đến máy chủ API.";
                loginErrorMsg.classList.remove("hidden");
            }
        };
    }

    // Forgot Password Trigger & Submit
    const btnForgotToLogin = document.getElementById("btnForgotToLogin");
    
    document.getElementById("btnOpenForgotPassword").onclick = () => {
        forgotPasswordForm.reset();
        forgotMsg.classList.add("hidden");
        if (btnForgotToLogin) btnForgotToLogin.classList.add("hidden");
        showModal(forgotPasswordModal);
    };

    document.getElementById("closeForgotModal").onclick = () => hideModal(forgotPasswordModal);
    document.getElementById("btnCancelForgotModal").onclick = () => hideModal(forgotPasswordModal);

    if (btnForgotToLogin) {
        btnForgotToLogin.onclick = () => {
            hideModal(forgotPasswordModal);
            loginOverlay.classList.add("active");
            const emailVal = document.getElementById("forgotEmail").value.trim();
            if (emailVal) {
                document.getElementById("loginUserOrEmail").value = emailVal;
            }
            document.getElementById("loginPassword").focus();
        };
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.onsubmit = async (e) => {
            e.preventDefault();
            forgotMsg.classList.add("hidden");
            if (btnForgotToLogin) btnForgotToLogin.classList.add("hidden");

            const emailVal = document.getElementById("forgotEmail").value.trim();
            try {
                const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: emailVal })
                });
                const data = await response.json();
                if (response.ok) {
                    forgotMsg.className = "auth-info-msg";
                    forgotMsg.textContent = data.message;
                    forgotMsg.classList.remove("hidden");
                    
                    if (btnForgotToLogin) btnForgotToLogin.classList.remove("hidden");
                    await refreshData();
                } else {
                    forgotMsg.className = "auth-error-msg";
                    forgotMsg.textContent = data.detail || "Lỗi khôi phục mật khẩu.";
                    forgotMsg.classList.remove("hidden");
                }
            } catch (err) {
                forgotMsg.className = "auth-error-msg";
                forgotMsg.textContent = "Lỗi kết nối máy chủ.";
                forgotMsg.classList.remove("hidden");
            }
        };
    }

    // Profile & Avatar Management Triggers
    if (btnOpenProfileModal) {
        btnOpenProfileModal.onclick = () => {
            userDropdownMenu.classList.remove("show");
            if (!state.currentUser) return;
            
            document.getElementById("profileModalFullName").textContent = state.currentUser.fullname;
            document.getElementById("profileModalRole").textContent = state.currentUser.role;
            document.getElementById("profileModalEmail").textContent = state.currentUser.email || "Chưa đăng ký email";
            document.getElementById("profileModalAvatarImg").src = state.currentUser.avatar_url;
            
            document.getElementById("avatarUrlInput").value = state.currentUser.avatar_url || "";
            document.getElementById("avatarFileInput").value = "";
            profileMsg.classList.add("hidden");
            
            showModal(profileModal);
        };
    }

    document.getElementById("closeProfileModal").onclick = () => hideModal(profileModal);

    if (btnProfileChangePwd) {
        btnProfileChangePwd.onclick = () => {
            hideModal(profileModal);
            changePasswordForm.reset();
            changePwdMsg.classList.add("hidden");
            showModal(changePasswordModal);
        };
    }

    // Submit Profile Avatar Form
    if (profileAvatarForm) {
        profileAvatarForm.onsubmit = async (e) => {
            e.preventDefault();
            profileMsg.classList.add("hidden");

            const fileInput = document.getElementById("avatarFileInput");
            const urlInput = document.getElementById("avatarUrlInput");

            const formData = new FormData();
            formData.append("username", state.currentUser.username);

            if (fileInput.files && fileInput.files[0]) {
                formData.append("avatar_file", fileInput.files[0]);
            }
            if (urlInput.value.trim()) {
                formData.append("avatar_url", urlInput.value.trim());
            }

            try {
                const response = await fetch(`${API_BASE}/api/user/avatar`, {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();
                if (response.ok && data.user) {
                    state.currentUser = data.user;
                    localStorage.setItem("epm_user", JSON.stringify(data.user));
                    profileMsg.className = "auth-info-msg";
                    profileMsg.textContent = "Cập nhật ảnh đại diện thành công!";
                    profileMsg.classList.remove("hidden");
                    
                    document.getElementById("profileModalAvatarImg").src = data.user.avatar_url;
                    onUserChanged();
                    await refreshData();
                } else {
                    profileMsg.className = "auth-error-msg";
                    profileMsg.textContent = data.detail || "Cập nhật ảnh thất bại.";
                    profileMsg.classList.remove("hidden");
                }
            } catch (err) {
                profileMsg.className = "auth-error-msg";
                profileMsg.textContent = "Không thể kết nối tới máy chủ.";
                profileMsg.classList.remove("hidden");
            }
        };
    }

    // Change Password Trigger & Submit
    if (btnOpenChangePassword) {
        btnOpenChangePassword.onclick = () => {
            userDropdownMenu.classList.remove("show");
            changePasswordForm.reset();
            changePwdMsg.classList.add("hidden");
            showModal(changePasswordModal);
        };
    }

    document.getElementById("closeChangePwdModal").onclick = () => hideModal(changePasswordModal);
    document.getElementById("btnCancelChangePwdModal").onclick = () => hideModal(changePasswordModal);

    if (changePasswordForm) {
        changePasswordForm.onsubmit = async (e) => {
            e.preventDefault();
            changePwdMsg.classList.add("hidden");

            const oldPassword = document.getElementById("changeOldPassword").value;
            const newPassword = document.getElementById("changeNewPassword").value;
            const confirmPassword = document.getElementById("changeConfirmPassword").value;

            if (newPassword !== confirmPassword) {
                changePwdMsg.textContent = "Xác nhận mật khẩu mới không khớp.";
                changePwdMsg.classList.remove("hidden");
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/auth/change-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: state.currentUser.username,
                        old_password: oldPassword,
                        new_password: newPassword
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    alert("Đổi mật khẩu thành công!");
                    hideModal(changePasswordModal);
                    if (state.currentUser) {
                        state.currentUser.must_change_password = false;
                        localStorage.setItem("epm_user", JSON.stringify(state.currentUser));
                    }
                    await refreshData();
                } else {
                    changePwdMsg.textContent = data.detail || "Đổi mật khẩu thất bại.";
                    changePwdMsg.classList.remove("hidden");
                }
            } catch (err) {
                changePwdMsg.textContent = "Lỗi kết nối máy chủ.";
                changePwdMsg.classList.remove("hidden");
            }
        };
    }

    // Logout Button
    if (btnLogout) {
        btnLogout.onclick = () => {
            userDropdownMenu.classList.remove("show");
            localStorage.removeItem("epm_user");
            state.loggedInUser = null;
            state.currentUser = null;
            loginOverlay.classList.add("active");
        };
    }

    // Switch Back To Self Button in Manager View-As Banner
    const btnSwitchBackToSelf = document.getElementById("btnSwitchBackToSelf");
    if (btnSwitchBackToSelf) {
        btnSwitchBackToSelf.onclick = () => {
            if (state.loggedInUser) {
                state.currentUser = state.loggedInUser;
                userSelector.value = state.loggedInUser.username;
                onUserChanged();
            }
        };
    }

    // User Switcher (for Manager role progress viewing)
    userSelector.addEventListener("change", (e) => {
        const username = e.target.value;
        const targetUser = state.users.find(u => u.username === username);
        if (targetUser) {
            state.currentUser = targetUser;
            onUserChanged();
        }
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

    const langToggleBtn = document.getElementById("langToggleBtn");
    if (langToggleBtn) {
        langToggleBtn.onclick = () => {
            const nextLang = state.lang === "vi" ? "en" : "vi";
            setLanguage(nextLang);
        };
    }

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

    document.getElementById("closeCampaignModal").onclick = () => hideModal(campaignModal);
    document.getElementById("btnCancelCampaignModal").onclick = () => hideModal(campaignModal);

    if (campaignForm) campaignForm.addEventListener("submit", submitCampaignForm);

    document.getElementById("closeEditDurationModal").onclick = () => hideModal(editDurationModal);
    document.getElementById("btnCancelEditDurationModal").onclick = () => hideModal(editDurationModal);
    if (editDurationForm) editDurationForm.addEventListener("submit", submitEditDurationForm);

    const edDurStringInput = document.getElementById("edDurString");
    if (edDurStringInput) {
        edDurStringInput.addEventListener("input", autoCalcEditDurationMinutes);
    }

    document.getElementById("closeMoveModuleModal").onclick = () => hideModal(moveModuleModal);
    document.getElementById("btnCancelMoveModuleModal").onclick = () => hideModal(moveModuleModal);
    if (moveModuleForm) moveModuleForm.addEventListener("submit", submitMoveModuleForm);

    document.getElementById("closeAddModuleToCourseModal").onclick = () => hideModal(addModuleToCourseModal);
    document.getElementById("btnCancelAddModuleToCourseModal").onclick = () => hideModal(addModuleToCourseModal);
    if (addModuleToCourseForm) addModuleToCourseForm.addEventListener("submit", submitAddModuleToCourseForm);

    const amDurationStringInput = document.getElementById("amDurationString");
    if (amDurationStringInput) {
        amDurationStringInput.addEventListener("input", () => {
            const val = amDurationStringInput.value.trim();
            const parts = val.split(":");
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                const h = parseInt(parts[0]) || 0;
                const m = parseInt(parts[1]) || 0;
                const calculated = h * 60 + m;
                if (calculated > 0) document.getElementById("amDurationMinutes").value = calculated;
            } else if (!isNaN(val) && val) {
                document.getElementById("amDurationMinutes").value = parseInt(val);
            }
        });
    }

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
        document.getElementById("enrollmentModalTitle").textContent = "Đăng ký lộ trình / khóa học cho nhân viên";
        const enrUser = document.getElementById("enrUsername");
        if (enrUser) enrUser.disabled = false;
        enrollmentForm.reset();
        populateEnrollmentOptions();
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

    // 2-Way Sync Event Listeners for Enrollment Modal
    // Direction A: Ratio / Start Date / Plan / Course / Daily Hours / Workweek -> Calculate End Date
    ["enrRatio", "enrStartDate", "enrDailyHours", "enrPlanSelect", "enrCourseSelect", "enrWorkweek"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", recalculateEndDateFromRatio);
            el.addEventListener("change", recalculateEndDateFromRatio);
        }
    });

    // Direction B: End Date -> Calculate Ratio
    const enrEndDateInput = document.getElementById("enrEndDate");
    if (enrEndDateInput) {
        enrEndDateInput.addEventListener("input", recalculateRatioFromEndDate);
        enrEndDateInput.addEventListener("change", recalculateRatioFromEndDate);
    }

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
    const activeUser = state.loggedInUser || state.currentUser;
    
    const nameDisplay = state.currentUser.english_name ? `${state.currentUser.fullname} (${state.currentUser.english_name})` : state.currentUser.fullname;
    currentUserNameLabel.textContent = nameDisplay;
    currentUserRoleLabel.textContent = state.currentUser.role;
    
    // Top Nav Header Profile Elements ALWAYS reflect state.loggedInUser (the authenticated Manager session)
    const topUserName = document.getElementById("topUserName");
    const topUserRole = document.getElementById("topUserRole");
    const dropdownFullName = document.getElementById("dropdownFullName");
    const dropdownEmail = document.getElementById("dropdownEmail");
    const managerUserSwitcherItem = document.getElementById("managerUserSwitcherItem");
    const managerUserSwitcherDivider = document.getElementById("managerUserSwitcherDivider");

    const loggedInNameDisplay = activeUser.english_name ? `${activeUser.fullname} (${activeUser.english_name})` : activeUser.fullname;
    if (topUserName) topUserName.textContent = loggedInNameDisplay;
    if (topUserRole) topUserRole.textContent = activeUser.role;
    if (dropdownFullName) dropdownFullName.textContent = activeUser.fullname;
    if (dropdownEmail) dropdownEmail.textContent = activeUser.email || "No email registered";
    
    // Update Avatar Images: topAvatar shows loggedInUser, personalAvatar shows target viewing user
    const topAvatar = document.getElementById("topUserAvatar");
    const personalAvatar = document.getElementById("personalAvatarImg");
    if (topAvatar && activeUser.avatar_url) topAvatar.src = activeUser.avatar_url;
    if (personalAvatar && state.currentUser.avatar_url) personalAvatar.src = state.currentUser.avatar_url;
    
    // Check Authorization & Sidebar/Header Visibility based on loggedInUser (activeUser)
    const isManager = activeUser.role === "Manager" || activeUser.role === "Power User" || activeUser.role === "Super User";
    if (isManager) {
        appSidebar.classList.remove("hidden");
        tabManagerLink.classList.remove("hidden");
        if (managerUserSwitcherItem) managerUserSwitcherItem.classList.remove("hidden");
        if (managerUserSwitcherDivider) managerUserSwitcherDivider.classList.remove("hidden");
    } else {
        // Normal User (Employee): Hide Sidebar and Manager User Switcher for a clean experience
        appSidebar.classList.add("hidden");
        tabManagerLink.classList.add("hidden");
        if (managerUserSwitcherItem) managerUserSwitcherItem.classList.add("hidden");
        if (managerUserSwitcherDivider) managerUserSwitcherDivider.classList.add("hidden");
        
        // Force navigate to personal progress if in Manager panel
        if (managerTab.classList.contains("active")) {
            tabEmployeeLink.click();
        }
    }
    
    // Manager View-As Banner logic
    const viewingUserBanner = document.getElementById("viewingUserBanner");
    const viewingUserNameTag = document.getElementById("viewingUserNameTag");
    if (viewingUserBanner) {
        if (state.loggedInUser && state.currentUser.username !== state.loggedInUser.username) {
            if (viewingUserNameTag) viewingUserNameTag.textContent = state.currentUser.fullname;
            viewingUserBanner.classList.remove("hidden");
        } else {
            viewingUserBanner.classList.add("hidden");
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
    const activeUser = state.loggedInUser || state.currentUser;
    
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
    
    // 2. Render Manager Dashboard components if loggedInUser is authorized
    if (activeUser.role === "Manager" || activeUser.role === "Power User" || activeUser.role === "Super User") {
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
        
        const isExamMod = /1z0-|exam|certification|professional/i.test(courseModule.module_name);
        const modIconName = isExamMod ? 'assignment_turned_in' : 'play_circle';
        
        tr.innerHTML = `
            <td><strong>${courseModule.plan}</strong></td>
            <td>${courseModule.course_name}</td>
            <td><span class="text-secondary">${courseModule.path || "-"}</span></td>
            <td>
                <span class="material-icons-round font-sm ${isExamMod ? 'text-warning' : 'text-primary'}" style="vertical-align: middle; margin-right: 4px;" title="${isExamMod ? 'Bài thi chứng chỉ (Ratio 1.0x)' : 'Bài học nội dung'}">${modIconName}</span>
                <strong>${courseModule.module_name}</strong>
                ${isExamMod ? '<span class="badge-type-exam ml-1">Exam</span>' : ''}
            </td>
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
    let txt = t("status_not_started");
    if (status === "In Progress") {
        cls = "badge-status-inprogress";
        txt = t("status_in_progress");
    } else if (status === "Completed") {
        cls = "badge-status-completed";
        txt = t("status_completed");
    }
    return `<span class="badge ${cls}">${txt}</span>`;
}

function getSpeedBadge(speed, status, plannedDate) {
    if (!plannedDate) return `<span class="text-muted">-</span>`;
    
    let cls = "badge-speed-ontrack";
    let txt = t("track_ontrack");
    let icon = "check_circle_outline";
    
    if (speed === "Fast") {
        cls = "badge-speed-fast";
        txt = t("track_fast");
        icon = "bolt";
    } else if (speed === "Slow") {
        cls = "badge-speed-slow";
        txt = t("track_slow");
        icon = "history";
    } else if (speed === "Too slow") {
        cls = "badge-speed-tooslow";
        txt = t("track_too_slow");
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

// Global helper to drill-down into employee's personal detail
window.viewEmployeeDetail = function(username) {
    if (userSelector) {
        const emp = state.users.find(u => u.username === username);
        if (emp) {
            userSelector.value = username;
            state.currentUser = emp;
            onUserChanged();
            const tabEmployeeLink = document.querySelector('[data-tab="employee-tab"]');
            if (tabEmployeeLink) tabEmployeeLink.click();
        }
    }
};

// TEAM PROGRESS VIEW FOR MANAGER
function renderTeamProgressTable() {
    teamProgressTableBody.innerHTML = "";
    
    state.progress.forEach(p => {
        const emp = state.users.find(u => u.username === p.username);
        let employeeName = p.username;
        if (emp) {
            employeeName = emp.english_name ? `${emp.fullname} (${emp.english_name})` : emp.fullname;
        }
        
        const avatarUrl = emp && emp.avatar_url ? emp.avatar_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(employeeName)}&background=3b82f6&color=fff&bold=true`;
        
        const tr = document.createElement("tr");
        const safeUsername = p.username.replace(/'/g, "\\'");
        const isTeamExamMod = /1z0-|exam|certification|professional/i.test(p.module_name);
        const teamModIcon = isTeamExamMod ? 'assignment_turned_in' : 'play_circle';

        tr.innerHTML = `
            <td>
                <div class="user-cell-with-avatar">
                    <img src="${avatarUrl}" class="table-user-avatar" alt="Avatar">
                    <div>
                        <strong>${employeeName}</strong>
                        <div class="text-muted font-mono font-xs">ID: ${p.username}</div>
                    </div>
                </div>
            </td>
            <td>${p.course_name}</td>
            <td>${p.path || "-"}</td>
            <td>
                <span class="material-icons-round font-sm ${isTeamExamMod ? 'text-warning' : 'text-primary'}" style="vertical-align: middle; margin-right: 4px;" title="${isTeamExamMod ? 'Bài thi chứng chỉ (Ratio 1.0x)' : 'Bài học nội dung'}">${teamModIcon}</span>
                <strong>${p.module_name}</strong>
                ${isTeamExamMod ? '<span class="badge-type-exam ml-1">Exam</span>' : ''}
            </td>
            <td><span class="badge ${p.status === 'Completed' ? 'badge-status-completed' : p.status === 'In Progress' ? 'badge-status-inprogress' : 'badge-status-notstarted'}">${p.status}</span></td>
            <td><span class="font-mono text-secondary">${p.planned_completion_date}</span></td>
            <td>
                <div class="prog-bar-cell">
                    <div class="prog-bar-bg"><div class="prog-bar-fill" style="width: ${p.progress_percent}%"></div></div>
                    <span class="font-mono">${p.progress_percent}%</span>
                </div>
            </td>
            <td>${getSpeedBadge(p.tracking_status, p.status, p.planned_completion_date)}</td>
            <td class="actions-col">
                <button class="btn btn-secondary btn-sm" onclick="viewEmployeeDetail('${safeUsername}')" title="Soi chi tiết tiến độ bài học của nhân viên này">
                    <span class="material-icons-round font-sm">visibility</span> Chi tiết
                </button>
            </td>
        `;
        teamProgressTableBody.appendChild(tr);
    });
    
    if (state.progress.length === 0) {
        teamProgressTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Chưa có bản ghi tiến độ nào của nhân viên.</td></tr>`;
    }
}

// EMPLOYEE REGISTRY VIEW
function renderEmployeeMgmtTable() {
    employeesTableBody.innerHTML = "";
    state.users.forEach(u => {
        const tr = document.createElement("tr");
        const safeFullname = (u.fullname || "").replace(/'/g, "\\'");
        const safeEngName = (u.english_name || "").replace(/'/g, "\\'");
        const safeEmail = (u.email || "").replace(/'/g, "\\'");
        tr.innerHTML = `
            <td><span class="font-mono">${u.username}</span></td>
            <td>
                <div class="user-cell-with-avatar">
                    <img src="${u.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.fullname)}" class="table-user-avatar" alt="Avatar">
                    <strong>${u.fullname}</strong>
                </div>
            </td>
            <td><span class="text-secondary">${u.english_name || "-"}</span></td>
            <td><span class="font-mono font-xs text-muted">${u.email || "-"}</span></td>
            <td><span class="role-badge">${u.role}</span></td>
            <td class="actions-col">
                <button class="btn btn-secondary btn-sm" onclick="openEditEmployee('${u.username}', '${safeFullname}', '${safeEngName}', '${u.role}', '${safeEmail}')">
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

window.openEditEmployee = function(username, fullname, english_name, role, email) {
    document.getElementById("employeeModalTitle").textContent = "Cập nhật nhân viên";
    document.getElementById("empUsername").value = username;
    document.getElementById("empUsername").disabled = true;
    document.getElementById("empFullname").value = fullname;
    document.getElementById("empEnglishName").value = english_name || "";
    document.getElementById("empRole").value = role;
    document.getElementById("empEmail").value = email || "";
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
        role: document.getElementById("empRole").value,
        email: document.getElementById("empEmail").value || ""
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

window.toggleModuleActiveStatus = async function(plan, courseName, path, moduleName, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/api/courses/toggle-active`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                plan: plan,
                course_name: courseName,
                path: path || null,
                module_name: moduleName,
                queue: newStatus
            })
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
};

window.toggleCourseActiveStatus = async function(plan, courseName, path, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/api/courses/toggle-active`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                plan: plan,
                course_name: courseName,
                path: path || null,
                queue: newStatus
            })
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
};

window.moveCourseInPlan = async function(planName, courseName, direction) {
    const planCourses = [];
    state.courses.forEach(c => {
        if (c.plan === planName && !planCourses.includes(c.course_name)) {
            planCourses.push(c.course_name);
        }
    });

    const idx = planCourses.indexOf(courseName);
    if (idx === -1) return;

    const newIndex = direction === "up" ? idx - 1 : idx + 1;
    if (newIndex < 0 || newIndex >= planCourses.length) return;

    const temp = planCourses[idx];
    planCourses[idx] = planCourses[newIndex];
    planCourses[newIndex] = temp;

    try {
        const response = await fetch(`${API_BASE}/api/courses/reorder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                plan: planName,
                course_order: planCourses
            })
        });

        if (response.ok) {
            await refreshData();
        } else {
            const err = await response.json();
            alert(`Lỗi: ${err.detail}`);
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối tới máy chủ.");
    }
};

// COURSE CATALOG HIERARCHICAL VIEW (LEVEL 1: PLANS, LEVEL 2: COURSES & MODULES)
function renderCourseMgmtTable() {
    if (!courseHierarchyContainer) return;

    // Save currently expanded plans and courses to restore after render
    const expandedPlanNames = new Set(
        Array.from(document.querySelectorAll(".level1-card.expanded"))
            .map(el => el.querySelector(".plan-name")?.textContent?.trim())
            .filter(Boolean)
    );
    const expandedCourseKeys = new Set(
        Array.from(document.querySelectorAll(".level2-card.expanded"))
            .map(el => el.querySelector(".course-title")?.textContent?.trim())
            .filter(Boolean)
    );

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
                activeMinutes: 0,
                totalModules: 0,
                activeModules: 0
            };
        }
        
        // Group by course_name + path
        const courseKey = c.path ? `${c.course_name}:::${c.path}` : c.course_name;
        if (!planMap[planName].courses[courseKey]) {
            planMap[planName].courses[courseKey] = {
                course_name: c.course_name,
                path: c.path || "",
                modules: [],
                totalMinutes: 0,
                activeMinutes: 0,
                activeModules: 0
            };
        }
        
        planMap[planName].courses[courseKey].modules.push(c);
        planMap[planName].courses[courseKey].totalMinutes += (c.duration_minutes || 0);
        planMap[planName].totalMinutes += (c.duration_minutes || 0);
        planMap[planName].totalModules += 1;

        if (c.queue !== false) {
            planMap[planName].courses[courseKey].activeMinutes += (c.duration_minutes || 0);
            planMap[planName].courses[courseKey].activeModules += 1;
            planMap[planName].activeMinutes += (c.duration_minutes || 0);
            planMap[planName].activeModules += 1;
        }
    });

    let planIdx = 0;
    Object.values(planMap).forEach(plan => {
        planIdx++;
        const courseKeys = Object.keys(plan.courses);
        const courseCount = courseKeys.length;
        const planDurationFormatted = formatHoursMinutes(plan.activeMinutes);
        const planCardId = `plan-card-${planIdx}`;
        const safePlan = plan.planName.replace(/'/g, "\\'");
        
        const planCard = document.createElement("div");
        planCard.className = "level1-card glass";
        if (expandedPlanNames.has(plan.planName)) {
            planCard.classList.add("expanded");
        }
        planCard.id = planCardId;

        // Level 1 Header
        planCard.innerHTML = `
            <div class="level1-header" onclick="toggleLevel1('${planCardId}')">
                <div class="level1-title-sec">
                    <span class="material-icons-round level1-chevron">keyboard_arrow_right</span>
                    <span class="material-icons-round level1-icon">school</span>
                    <div class="level1-title-text">
                        <h3 class="plan-name">${plan.planName}</h3>
                        <span class="level1-subtitle">${t("level1_subtitle")} • <strong class="text-success">${plan.activeModules}/${plan.totalModules} modules active</strong></span>
                    </div>
                </div>
                <div class="level1-stats flex-align-center">
                    <span class="stat-badge count-badge">
                        <span class="material-icons-round font-sm">menu_book</span> ${courseCount} ${state.lang === 'en' ? 'courses' : 'khóa học'}
                    </span>
                    <span class="stat-badge time-badge">
                        <span class="material-icons-round font-sm">schedule</span> ${planDurationFormatted} (Active)
                    </span>
                    <button type="button" class="btn btn-secondary btn-sm ml-2" 
                            onclick="event.stopPropagation(); openSaveAsPlanModal('${safePlan}')" 
                            title="Lưu tất cả các khóa & module đang Active của Plan này thành 1 Plan đào tạo mới">
                        <span class="material-icons-round font-sm">content_copy</span> ${t("btn_save_as_plan")}
                    </button>
                </div>
            </div>
            <div class="level2-body">
                <!-- Level 2 courses list -->
            </div>
        `;

        const level2Body = planCard.querySelector(".level2-body");

        let courseIdx = 0;
        courseKeys.forEach((cKey, cArrIdx) => {
            courseIdx++;
            const courseObj = plan.courses[cKey];
            const courseDurationFormatted = formatHoursMinutes(courseObj.activeMinutes, "short");
            const courseCardId = `course-card-${planIdx}-${courseIdx}`;
            
            const courseCard = document.createElement("div");
            courseCard.className = "level2-card";
            if (expandedCourseKeys.has(courseObj.course_name)) {
                courseCard.classList.add("expanded");
            }
            courseCard.id = courseCardId;
            
            const safeCourseName = courseObj.course_name.replace(/'/g, "\\'");
            const safePath = courseObj.path.replace(/'/g, "\\'");
            
            const allCourseModulesActive = courseObj.activeModules === courseObj.modules.length;
            const isFirst = cArrIdx === 0;
            const isLast = cArrIdx === courseKeys.length - 1;

            const examCount = courseObj.modules.filter(m => /1z0-|exam|certification|professional/i.test(m.module_name)).length;
            const regCount = courseObj.modules.length - examCount;
            let modulesStatText = `<strong>${courseObj.activeModules}/${courseObj.modules.length}</strong> modules active`;
            if (examCount > 0) {
                modulesStatText = `<strong>${courseObj.activeModules}/${courseObj.modules.length}</strong> modules (${examCount} exams)`;
            }
            
            // Level 2 Course HTML with ">" module toggle button & Active/Inactive Toggle button
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
                    <div class="level2-right flex-align-center gap-2">
                        <button type="button" class="toggle-switch-btn ${allCourseModulesActive ? 'is-active' : 'is-inactive'}" 
                                onclick="event.stopPropagation(); toggleCourseActiveStatus('${safePlan}', '${safeCourseName}', '${safePath}', ${!allCourseModulesActive})"
                                title="Bấm để ${allCourseModulesActive ? 'chuyển sang Inactive (Tạm ẩn)' : 'chuyển sang Active (Kích hoạt)'} toàn bộ khóa học này">
                            <span class="material-icons-round font-xs">${allCourseModulesActive ? 'check_circle' : 'do_not_disturb_on'}</span>
                            <span>${allCourseModulesActive ? 'Active' : 'Inactive'}</span>
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" 
                                onclick="event.stopPropagation(); openAddModuleToCourseModal('${safePlan}', '${safeCourseName}', '${safePath}')" 
                                title="Thêm module mới vào khóa học này">
                            <span class="material-icons-round font-xs">add</span> ${t("btn_add_module")}
                        </button>
                        <div class="course-stat-item">
                            <span class="material-icons-round">grid_view</span>
                            <span>${modulesStatText}</span>
                        </div>
                        <div class="course-stat-item">
                            <span class="material-icons-round">schedule</span>
                            <span class="font-mono font-weight-bold text-success">${courseDurationFormatted}</span>
                        </div>
                        <div class="btn-group gap-1">
                            <button type="button" class="btn btn-secondary btn-icon-only btn-sm ${isFirst ? 'disabled' : ''}" 
                                    ${isFirst ? 'disabled' : ''} 
                                    onclick="event.stopPropagation(); moveCourseInPlan('${safePlan}', '${safeCourseName}', 'up')" 
                                    title="Chuyển khóa học này lên trên">
                                <span class="material-icons-round font-sm">arrow_upward</span>
                            </button>
                            <button type="button" class="btn btn-secondary btn-icon-only btn-sm ${isLast ? 'disabled' : ''}" 
                                    ${isLast ? 'disabled' : ''} 
                                    onclick="event.stopPropagation(); moveCourseInPlan('${safePlan}', '${safeCourseName}', 'down')" 
                                    title="Chuyển khóa học này xuống dưới">
                                <span class="material-icons-round font-sm">arrow_downward</span>
                            </button>
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
                                <th>Trạng thái & Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${courseObj.modules.map((m, mIdx) => {
                                const isExam = /1z0-|exam|certification|professional/i.test(m.module_name);
                                const iconName = isExam ? 'assignment_turned_in' : 'play_circle';
                                const badgeHtml = isExam 
                                    ? `<span class="badge-type-exam"><span class="material-icons-round font-xs">verified</span> Exam</span>`
                                    : `<span class="badge-type-course"><span class="material-icons-round font-xs">play_circle</span> Course</span>`;
                                const isActive = m.queue !== false;
                                const safeModName = m.module_name.replace(/'/g, "\\'");

                                return `
                                    <tr class="${isActive ? '' : 'module-inactive-row'}">
                                        <td class="font-mono text-muted">${mIdx + 1}</td>
                                        <td class="mod-name-cell">
                                            <span class="material-icons-round mod-type-icon ${isExam ? 'exam-icon' : 'course-icon'}" title="${isExam ? 'Bài thi chứng chỉ (Fixed ratio 1.0x)' : 'Bài học (Nhân hệ số ratio)'}">${iconName}</span>
                                            <strong class="module-name-text">${m.module_name}</strong>
                                            <span class="ml-2">${badgeHtml}</span>
                                        </td>
                                        <td>
                                            <div class="flex-align-center gap-1">
                                                <span class="badge-dur">${m.duration || '-'}</span>
                                                <button type="button" class="btn btn-secondary btn-icon-only btn-sm py-0 px-1" 
                                                        onclick="event.stopPropagation(); openEditModuleDurationModal('${safePlan}', '${safeCourseName}', '${safePath}', '${safeModName}', '${(m.duration || '').replace(/'/g, "\\'")}', ${m.duration_minutes || 0})" 
                                                        title="Chỉnh sửa thời lượng module này">
                                                    <span class="material-icons-round font-xs">edit</span>
                                                </button>
                                            </div>
                                        </td>
                                        <td class="font-mono">${m.duration_minutes} phút</td>
                                        <td>
                                            <div class="flex-align-center gap-1">
                                                <button type="button" class="toggle-switch-btn ${isActive ? 'is-active' : 'is-inactive'}" 
                                                        onclick="event.stopPropagation(); toggleModuleActiveStatus('${safePlan}', '${safeCourseName}', '${safePath}', '${safeModName}', ${!isActive})"
                                                        title="Bấm để ${isActive ? 'chuyển sang Inactive (Tạm ẩn)' : 'chuyển sang Active (Kích hoạt)'} module này">
                                                    <span class="material-icons-round font-xs">${isActive ? 'check_circle' : 'do_not_disturb_on'}</span>
                                                    <span>${isActive ? 'Active' : 'Inactive'}</span>
                                                </button>
                                                <button type="button" class="btn btn-secondary btn-icon-only btn-sm" 
                                                        onclick="event.stopPropagation(); openMoveModuleModal('${safePlan}', '${safeCourseName}', '${safePath}', '${safeModName}')" 
                                                        title="Chuyển module này sang khóa học khác">
                                                    <span class="material-icons-round font-xs">swap_horiz</span>
                                                </button>
                                                <button type="button" class="btn btn-danger btn-icon-only btn-sm" 
                                                        onclick="event.stopPropagation(); deleteModuleRecord('${safePlan}', '${safeCourseName}', '${safePath}', '${safeModName}')" 
                                                        title="Xóa module này khỏi khóa học">
                                                    <span class="material-icons-round font-xs">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
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

window.openSaveAsPlanModal = function(planName) {
    const matchingActive = state.courses.filter(c => c.plan === planName && c.queue !== false);
    if (matchingActive.length === 0) {
        alert("Plan này hiện không có module/khóa học Active nào để lưu thành Plan mới.");
        return;
    }

    const activeCourses = [...new Set(matchingActive.map(c => c.course_name))];
    const totalMins = matchingActive.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);

    document.getElementById("cmpSourcePlan").value = planName;
    document.getElementById("cmpSourcePlanDisplay").value = planName;
    document.getElementById("cmpNewPlan").value = `${planName} - Q3 2026`;

    const cmpSummaryBox = document.getElementById("cmpSummaryBox");
    if (cmpSummaryBox) {
        cmpSummaryBox.innerHTML = `
            <div class="calc-info-row">
                <span><span class="material-icons-round font-xs">school</span> Plan nguồn gốc: <strong>${planName}</strong></span>
            </div>
            <div class="calc-info-row mt-1">
                <span><span class="material-icons-round font-xs">library_books</span> Khóa học Active: <strong class="text-primary">${activeCourses.length} khóa</strong> (${activeCourses.join(", ")})</span>
            </div>
            <div class="calc-info-row mt-1">
                <span><span class="material-icons-round font-xs">task_alt</span> Tổng module nhân bản: <strong class="text-success">${matchingActive.length} modules</strong> (${formatHoursMinutes(totalMins)})</span>
            </div>
        `;
    }

    showModal(campaignModal);
};

async function submitCampaignForm(e) {
    e.preventDefault();
    const data = {
        source_plan: document.getElementById("cmpSourcePlan").value,
        new_plan: document.getElementById("cmpNewPlan").value.trim()
    };

    try {
        const response = await fetch(`${API_BASE}/api/courses/clone-plan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const resData = await response.json();
        if (response.ok) {
            alert(resData.message || "Tạo Plan đào tạo mới thành công!");
            hideModal(campaignModal);
            await refreshData();
        } else {
            alert(`Lỗi: ${resData.detail}`);
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối tới máy chủ.");
    }
}

window.openEditModuleDurationModal = function(plan, courseName, path, moduleName, currentDuration, currentMinutes) {
    document.getElementById("edDurPlan").value = plan || "";
    document.getElementById("edDurCourseName").value = courseName;
    document.getElementById("edDurPath").value = path || "";
    document.getElementById("edDurModuleName").value = moduleName;
    document.getElementById("edDurModuleDisplay").value = moduleName;
    document.getElementById("edDurString").value = currentDuration;
    document.getElementById("edDurMinutes").value = currentMinutes;

    showModal(editDurationModal);
};

function autoCalcEditDurationMinutes() {
    const val = document.getElementById("edDurString").value.trim();
    if (!val) return;
    
    // Match HH:MM:SS or HH:MM
    const parts = val.split(":");
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const h = parseInt(parts[0]) || 0;
        const m = parseInt(parts[1]) || 0;
        const calculated = h * 60 + m;
        if (calculated > 0) {
            document.getElementById("edDurMinutes").value = calculated;
        }
    } else if (!isNaN(val)) {
        document.getElementById("edDurMinutes").value = parseInt(val);
    }
}

async function submitEditDurationForm(e) {
    e.preventDefault();
    const data = {
        plan: document.getElementById("edDurPlan").value || null,
        course_name: document.getElementById("edDurCourseName").value,
        path: document.getElementById("edDurPath").value || null,
        module_name: document.getElementById("edDurModuleName").value,
        duration: document.getElementById("edDurString").value.trim(),
        duration_minutes: parseInt(document.getElementById("edDurMinutes").value) || 0
    };

    try {
        const response = await fetch(`${API_BASE}/api/courses/update-duration`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const resData = await response.json();
        if (response.ok) {
            alert(resData.message || "Cập nhật thời lượng module thành công!");
            hideModal(editDurationModal);
            await refreshData();
        } else {
            alert(`Lỗi: ${resData.detail}`);
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối tới máy chủ.");
    }
}

window.openMoveModuleModal = function(plan, courseName, path, moduleName) {
    document.getElementById("mvSourcePlan").value = plan || "";
    document.getElementById("mvSourceCourse").value = courseName;
    document.getElementById("mvSourcePath").value = path || "";
    document.getElementById("mvModuleName").value = moduleName;
    document.getElementById("mvModuleDisplay").value = moduleName;

    const select = document.getElementById("mvTargetCourseSelect");
    select.innerHTML = "";
    
    const uniqueCourses = [];
    state.courses.forEach(c => {
        const key = `${c.plan}:::${c.course_name}`;
        if (!uniqueCourses.find(u => u.key === key) && c.course_name !== courseName) {
            uniqueCourses.push({
                key: key,
                plan: c.plan,
                course_name: c.course_name,
                path: c.path || ""
            });
        }
    });

    uniqueCourses.forEach(c => {
        const opt = document.createElement("option");
        opt.value = JSON.stringify({ plan: c.plan, course_name: c.course_name, path: c.path });
        opt.textContent = `${c.course_name} (${c.plan})`;
        select.appendChild(opt);
    });

    if (uniqueCourses.length === 0) {
        alert("Hiện không có khóa học khác để chuyển module sang.");
        return;
    }

    showModal(moveModuleModal);
};

async function submitMoveModuleForm(e) {
    e.preventDefault();
    const targetData = JSON.parse(document.getElementById("mvTargetCourseSelect").value);
    const data = {
        source_plan: document.getElementById("mvSourcePlan").value || null,
        source_course: document.getElementById("mvSourceCourse").value,
        source_path: document.getElementById("mvSourcePath").value || null,
        module_name: document.getElementById("mvModuleName").value,
        target_plan: targetData.plan,
        target_course: targetData.course_name,
        target_path: targetData.path || null
    };

    try {
        const response = await fetch(`${API_BASE}/api/courses/move-module`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const resData = await response.json();
        if (response.ok) {
            alert(resData.message || "Chuyển module thành công!");
            hideModal(moveModuleModal);
            await refreshData();
        } else {
            alert(`Lỗi: ${resData.detail}`);
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối tới máy chủ.");
    }
}

window.openAddModuleToCourseModal = function(plan, courseName, path) {
    document.getElementById("amPlan").value = plan;
    document.getElementById("amCourseName").value = courseName;
    document.getElementById("amPath").value = path || "";
    document.getElementById("amCourseDisplay").value = `${courseName} (${plan})`;
    document.getElementById("amModuleName").value = "";
    document.getElementById("amDurationString").value = "01:30:00";
    document.getElementById("amDurationMinutes").value = 90;

    showModal(addModuleToCourseModal);
};

async function submitAddModuleToCourseForm(e) {
    e.preventDefault();
    const data = {
        plan: document.getElementById("amPlan").value,
        course_name: document.getElementById("amCourseName").value,
        path: document.getElementById("amPath").value || null,
        module_name: document.getElementById("amModuleName").value.trim(),
        duration: document.getElementById("amDurationString").value.trim(),
        duration_minutes: parseInt(document.getElementById("amDurationMinutes").value) || 0
    };

    try {
        const response = await fetch(`${API_BASE}/api/courses/add-module`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const resData = await response.json();
        if (response.ok) {
            alert(resData.message || "Thêm module mới thành công!");
            hideModal(addModuleToCourseModal);
            await refreshData();
        } else {
            alert(`Lỗi: ${resData.detail}`);
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối tới máy chủ.");
    }
}

window.deleteModuleRecord = async function(plan, courseName, path, moduleName) {
    if (!confirm(`Bạn có chắc muốn xóa module '${moduleName}' khỏi khóa học '${courseName}'?`)) return;

    let url = `${API_BASE}/api/courses/module?course_name=${encodeURIComponent(courseName)}&module_name=${encodeURIComponent(moduleName)}`;
    if (plan) url += `&plan=${encodeURIComponent(plan)}`;
    if (path) url += `&path=${encodeURIComponent(path)}`;

    try {
        const response = await fetch(url, { method: "DELETE" });
        const resData = await response.json();
        if (response.ok) {
            await refreshData();
        } else {
            alert(`Lỗi: ${resData.detail}`);
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối tới máy chủ.");
    }
};

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
        recalculateEndDateFromRatio();
    }
};

let isSyncingEnrollment = false;

function getSelectedTargetType() {
    const radios = document.getElementsByName("enrTargetType");
    for (const r of radios) {
        if (r.checked) return r.value;
    }
    return "plan";
}

function getSelectedTargetName(targetType) {
    const planSelect = document.getElementById("enrPlanSelect");
    const courseSelect = document.getElementById("enrCourseSelect");
    return (targetType === "plan") ? (planSelect ? planSelect.value : "") : (courseSelect ? courseSelect.value : "");
}

function getTargetVideoMinutes(targetType, targetName) {
    let totalMins = 0;
    let regularMins = 0;
    let examMins = 0;
    let moduleCount = 0;
    let matching = [];
    
    if (targetType === "plan") {
        matching = state.courses.filter(c => c.plan === targetName && c.queue !== false);
    } else {
        matching = state.courses.filter(c => c.course_name === targetName && c.queue !== false);
    }
    
    moduleCount = matching.length;
    matching.forEach(c => {
        const dm = c.duration_minutes || 0;
        totalMins += dm;
        const isExam = /1z0-|exam|certification|professional/i.test(c.module_name);
        if (isExam) {
            examMins += dm;
        } else {
            regularMins += dm;
        }
    });
    
    return { totalMins, regularMins, examMins, moduleCount };
}

function countWorkingDaysBetween(startDateStr, endDateStr, workweekType) {
    let start = new Date(startDateStr);
    let end = new Date(endDateStr);
    if (isNaN(start.getTime())) return 1;
    if (isNaN(end.getTime()) || end < start) {
        end = new Date(start);
    }
    
    let count = 0;
    let curr = new Date(start);
    while (curr <= end) {
        const day = curr.getDay(); // 0 = Sun, 6 = Sat
        let isWorkDay = true;
        if (workweekType === 5) {
            if (day === 0 || day === 6) isWorkDay = false;
        } else if (workweekType === 6) {
            if (day === 0) isWorkDay = false;
        }
        if (isWorkDay) {
            count++;
        }
        curr.setDate(curr.getDate() + 1);
    }
    return Math.max(1, count);
}

function updateSummaryBox(totalMins, regularMins, examMins, moduleCount, ratioVal, adjustedMins, requiredDays, dailyHoursVal) {
    const summaryEl = document.getElementById("enrCalcSummary");
    if (!summaryEl) return;
    
    if (totalMins <= 0 || requiredDays <= 0) {
        summaryEl.innerHTML = "";
        return;
    }
    
    const adjustedHours = adjustedMins / 60.0;
    const examNote = examMins > 0 
        ? ` <span class="text-warning font-xs" title="Thời gian bài thi được giữ cố định (ratio 1.0x)">(Cố định exam 1.0x: ${formatHoursMinutes(examMins)})</span>` 
        : '';

    const startDateVal = document.getElementById("enrStartDate").value;
    const endDateVal = document.getElementById("enrEndDate").value;
    let calendarDaysText = "";
    if (startDateVal && endDateVal) {
        const sDate = new Date(startDateVal);
        const eDate = new Date(endDateVal);
        const diffTime = eDate - sDate;
        const diffCalendarDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
        const wwType = parseInt(document.getElementById("enrWorkweek").value) || 5;
        const wwLabel = wwType === 7 ? "Tất cả các ngày" : wwType === 6 ? "T2 - T7" : "T2 - T6";
        calendarDaysText = ` <span class="text-secondary font-xs">(${diffCalendarDays} ngày lịch - ${wwLabel})</span>`;
    }

    summaryEl.innerHTML = `
        <div class="calc-info-box font-sm glass">
            <div class="calc-info-row">
                <span><span class="material-icons-round font-xs">videocam</span> Video gốc: <strong>${formatHoursMinutes(totalMins)}</strong> (${moduleCount} mục)${examNote}</span>
                <span><span class="material-icons-round font-xs">tune</span> Ratio khóa học: <strong class="text-primary">${ratioVal}x</strong></span>
            </div>
            <div class="calc-info-row mt-1">
                <span><span class="material-icons-round font-xs">timer</span> Thời lượng thực tế: <strong class="text-success">${formatHoursMinutes(adjustedMins)} (${adjustedHours.toFixed(1)}h)</strong></span>
                <span><span class="material-icons-round font-xs">event</span> Dự kiến cần: <strong>${requiredDays} ngày học thực tế</strong> (${dailyHoursVal}h/ngày)${calendarDaysText}</span>
            </div>
        </div>
    `;
}

// 1. DIRECTION A: When Ratio / Start Date / Plan / Workweek / Daily Hours change -> Calculate End Date
function recalculateEndDateFromRatio() {
    if (isSyncingEnrollment) return;
    isSyncingEnrollment = true;
    try {
        const targetType = getSelectedTargetType();
        const targetName = getSelectedTargetName(targetType);
        const startDateVal = document.getElementById("enrStartDate").value;
        const ratioVal = parseFloat(document.getElementById("enrRatio").value) || 1.0;
        const dailyHoursVal = parseFloat(document.getElementById("enrDailyHours").value) || 2.0;
        const workweekType = parseInt(document.getElementById("enrWorkweek").value) || 5;

        if (!startDateVal || !targetName) {
            updateSummaryBox(0, 0, 0, 0, 0, 0, 0, 0);
            return;
        }

        const { totalMins, regularMins, examMins, moduleCount } = getTargetVideoMinutes(targetType, targetName);
        if (totalMins <= 0) {
            updateSummaryBox(0, 0, 0, moduleCount, ratioVal, 0, 0, dailyHoursVal);
            return;
        }

        // Ratio is ONLY applied to regular course modules; exams stay fixed at 1.0x ratio
        const adjustedMins = Math.round(regularMins * ratioVal) + examMins;
        const adjustedHours = adjustedMins / 60.0;
        const requiredDays = Math.max(1, Math.ceil(adjustedHours / dailyHoursVal));

        // Calculate End Date
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
        updateSummaryBox(totalMins, regularMins, examMins, moduleCount, ratioVal, adjustedMins, requiredDays, dailyHoursVal);
    } finally {
        isSyncingEnrollment = false;
    }
}

// 2. DIRECTION B: When End Date changes -> Calculate Ratio for regular courses
function recalculateRatioFromEndDate() {
    if (isSyncingEnrollment) return;
    isSyncingEnrollment = true;
    try {
        const targetType = getSelectedTargetType();
        const targetName = getSelectedTargetName(targetType);
        const startDateVal = document.getElementById("enrStartDate").value;
        const endDateVal = document.getElementById("enrEndDate").value;
        const dailyHoursVal = parseFloat(document.getElementById("enrDailyHours").value) || 2.0;
        const workweekType = parseInt(document.getElementById("enrWorkweek").value) || 5;

        if (!startDateVal || !endDateVal || !targetName) return;

        const { totalMins, regularMins, examMins, moduleCount } = getTargetVideoMinutes(targetType, targetName);
        if (totalMins <= 0) return;

        const actualWorkingDays = countWorkingDaysBetween(startDateVal, endDateVal, workweekType);
        const totalAvailableStudyMins = actualWorkingDays * dailyHoursVal * 60.0;

        // Subtract fixed exam minutes from total available minutes
        const availableForRegularMins = Math.max(0, totalAvailableStudyMins - examMins);

        // Compute ratio for regular courses
        let computedRatio = regularMins > 0 ? (availableForRegularMins / regularMins) : 1.0;
        computedRatio = Math.max(0.1, Math.round(computedRatio * 10) / 10);

        document.getElementById("enrRatio").value = computedRatio;

        const adjustedMins = Math.round(regularMins * computedRatio) + examMins;
        updateSummaryBox(totalMins, regularMins, examMins, moduleCount, computedRatio, adjustedMins, actualWorkingDays, dailyHoursVal);
    } finally {
        isSyncingEnrollment = false;
    }
}

// Legacy helper compatibility
function calculateAutoEndDate() {
    recalculateEndDateFromRatio();
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
        
        const safeUsername = enr.username.replace(/'/g, "\\'");
        const safeTargetName = (enr.target_name || enr.course_name).replace(/'/g, "\\'");

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
                <button class="btn btn-secondary btn-sm mr-1" onclick="openEditEnrollment('${safeUsername}', '${safeTargetName}')" title="Sửa thông tin đăng ký">
                    <span class="material-icons-round font-sm">edit</span> Sửa
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteEnrollmentRecord('${safeUsername}', '${safeTargetName}')" title="Hủy đăng ký">
                    <span class="material-icons-round font-sm">delete</span> Hủy
                </button>
            </td>
        `;
        enrollmentsTableBody.appendChild(tr);
    });
    
    if (state.enrollments.length === 0) {
        enrollmentsTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Chưa có lượt đăng ký khóa học nào.</td></tr>`;
    }
}

window.openEditEnrollment = function(username, targetName) {
    const enr = state.enrollments.find(e => e.username === username && (e.target_name === targetName || e.course_name === targetName));
    if (!enr) return;

    document.getElementById("enrollmentModalTitle").textContent = "Cập nhật thông tin đăng ký khóa học";
    populateEnrollmentOptions();

    const enrUser = document.getElementById("enrUsername");
    if (enrUser) {
        enrUser.value = enr.username;
        enrUser.disabled = true;
    }

    const radios = document.getElementsByName("enrTargetType");
    radios.forEach(r => {
        if (r.value === enr.target_type) {
            r.checked = true;
            r.dispatchEvent(new Event("change"));
        }
    });

    if (enr.target_type === "plan") {
        const enrPlanSelect = document.getElementById("enrPlanSelect");
        if (enrPlanSelect) enrPlanSelect.value = targetName;
    } else {
        const enrCourseSelect = document.getElementById("enrCourseSelect");
        if (enrCourseSelect) enrCourseSelect.value = targetName;
    }

    if (enr.ratio) document.getElementById("enrRatio").value = enr.ratio;
    if (enr.daily_hours) document.getElementById("enrDailyHours").value = enr.daily_hours;
    if (enr.start_date) document.getElementById("enrStartDate").value = enr.start_date;
    if (enr.planned_end_date) document.getElementById("enrEndDate").value = enr.planned_end_date;
    if (enr.workweek_type) document.getElementById("enrWorkweek").value = enr.workweek_type;

    recalculateEndDateFromRatio();
    showModal(enrollmentModal);
};

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
    const enrUserEl = document.getElementById("enrUsername");
    const usernameVal = enrUserEl.value;

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
        username: usernameVal,
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
            enrUserEl.disabled = false;
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
