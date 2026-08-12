import os
import openpyxl
from datetime import datetime, date

EXCEL_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sheet.xlsx")

def init_db():
    """Ensure necessary sheets exist in sheet.xlsx with headers."""
    if not os.path.exists(EXCEL_FILE):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Danh sách khóa học EPM V5"
        # Write headers
        headers = ['Plan', 'Course Name', 'Path', 'Module Name', 'Duration', 'Duration (Minutes)', 'Queue', '% of Total']
        ws.append(headers)
        wb.save(EXCEL_FILE)

    wb = openpyxl.load_workbook(EXCEL_FILE)
    dirty = False

    # 1. Check Course sheet
    if "Danh sách khóa học EPM V5" not in wb.sheetnames:
        ws = wb.create_sheet("Danh sách khóa học EPM V5")
        headers = ['Plan', 'Course Name', 'Path', 'Module Name', 'Duration', 'Duration (Minutes)', 'Queue', '% of Total']
        ws.append(headers)
        dirty = True

    # 2. Check Employees sheet
    if "Danh sách nhân viên" not in wb.sheetnames:
        ws = wb.create_sheet("Danh sách nhân viên")
        headers = ['Username', 'Full Name', 'English Name', 'Role', 'Email', 'PasswordHash', 'MustChangePassword', 'AvatarUrl']
        ws.append(headers)
        dirty = True
    else:
        ws = wb["Danh sách nhân viên"]
        headers = ['Username', 'Full Name', 'English Name', 'Role', 'Email', 'PasswordHash', 'MustChangePassword', 'AvatarUrl']
        for col_idx, h in enumerate(headers, 1):
            if ws.cell(row=1, column=col_idx).value != h:
                ws.cell(row=1, column=col_idx).value = h
                dirty = True
        
        # Populate initial hashed passwords for existing employees if empty
        default_pwd_hash = hash_password(DEFAULT_INITIAL_PASSWORD)
        for r in range(2, ws.max_row + 1):
            u_val = ws.cell(row=r, column=1).value
            pwd_val = ws.cell(row=r, column=6).value
            must_change = ws.cell(row=r, column=7).value
            if u_val is not None and str(u_val).strip() != "":
                if not pwd_val:
                    ws.cell(row=r, column=6).value = default_pwd_hash
                    ws.cell(row=r, column=7).value = False
                    dirty = True
                elif must_change is None:
                    ws.cell(row=r, column=7).value = False
                    dirty = True

    # 3. Check Progress sheet
    if "Tiến độ học tập" not in wb.sheetnames:
        ws = wb.create_sheet("Tiến độ học tập")
        headers = [
            'Username', 'Course Name', 'Path', 'Module Name', 'Status', 
            'Progress (%)', 'Start Date', 'Completion Date', 'Planned Completion Date', 'Tracking Status'
        ]
        ws.append(headers)
        dirty = True

    # 4. Check Enrollments sheet
    if "Đăng ký khóa học" not in wb.sheetnames:
        ws = wb.create_sheet("Đăng ký khóa học")
        headers = ['Username', 'Course Name', 'Start Date', 'Planned End Date', 'Workweek Type']
        ws.append(headers)
        dirty = True

    if dirty:
        wb.save(EXCEL_FILE)
    wb.close()

def get_courses():
    """Retrieve all course modules."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
    ws = wb["Danh sách khóa học EPM V5"]
    courses = []
    # Headers are: Plan, Course Name, Path, Module Name, Duration, Duration (Minutes), Queue, % of Total
    for r in range(2, ws.max_row + 1):
        plan = ws.cell(row=r, column=1).value
        course_name = ws.cell(row=r, column=2).value
        path = ws.cell(row=r, column=3).value
        module_name = ws.cell(row=r, column=4).value
        duration = ws.cell(row=r, column=5).value
        duration_mins = ws.cell(row=r, column=6).value
        queue = ws.cell(row=r, column=7).value
        pct = ws.cell(row=r, column=8).value
        
        # Normalize Queue (can be boolean, string, or cell formula representation)
        is_queue = False
        if queue is not None:
            if isinstance(queue, bool):
                is_queue = queue
            elif str(queue).strip().upper() in ("TRUE", "1", "YES"):
                is_queue = True
        
        if course_name:
            courses.append({
                "row": r,
                "plan": plan,
                "course_name": course_name,
                "path": path if path else "",
                "module_name": module_name if module_name else "",
                "duration": duration if duration else "",
                "duration_minutes": int(duration_mins) if duration_mins is not None else 0,
                "queue": is_queue,
                "percent_of_total": pct if pct else "0.00%"
            })
    wb.close()
    return courses

def recalculate_formulas(ws):
    """Recalculate % of Total formulas in column H."""
    max_row = ws.max_row
    for r in range(2, max_row + 1):
        # Format formula: =IF(G{row}, TEXT(F{row}/SUMIF($G$2:$G${max_row}, TRUE, $F$2:$F${max_row}), "0.00%"), "0.00%")
        formula = f'=IF(G{r}, TEXT(F{r}/SUMIF($G$2:$G${max_row}, TRUE, $F$2:$F${max_row}), "0.00%"), "0.00%")'
        ws.cell(row=r, column=8).value = formula

def add_course_modules(plan, course_name, path, modules):
    """
    modules is a list of dicts: [{"module_name": str, "duration": str, "duration_minutes": int, "queue": bool}]
    Inserts or appends modules under the given course and path.
    """
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách khóa học EPM V5"]
    
    # Find existing row for this course
    insert_at = None
    for r in range(2, ws.max_row + 1):
        c_name = ws.cell(row=r, column=2).value
        p_name = ws.cell(row=r, column=3).value
        if c_name == course_name and (not path or p_name == path):
            insert_at = r
            # Find the last module of this course/path
            while r <= ws.max_row and ws.cell(row=r, column=2).value == course_name and (not path or ws.cell(row=r, column=3).value == path):
                insert_at = r
                r += 1
            break
            
    if insert_at is None:
        # Append at the end
        for m in modules:
            ws.append([
                plan, course_name, path or "", m["module_name"], 
                m["duration"], m["duration_minutes"], m.get("queue", True), ""
            ])
    else:
        # Insert rows right after the last module of the course
        for i, m in enumerate(modules):
            idx = insert_at + 1 + i
            ws.insert_rows(idx)
            ws.cell(row=idx, column=1).value = plan
            ws.cell(row=idx, column=2).value = course_name
            ws.cell(row=idx, column=3).value = path or ""
            ws.cell(row=idx, column=4).value = m["module_name"]
            ws.cell(row=idx, column=5).value = m["duration"]
            ws.cell(row=idx, column=6).value = m["duration_minutes"]
            ws.cell(row=idx, column=7).value = m.get("queue", True)
            
    recalculate_formulas(ws)
    wb.save(EXCEL_FILE)
    wb.close()

def delete_course(course_name):
    """Delete all rows matching course_name."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách khóa học EPM V5"]
    
    rows_to_delete = []
    for r in range(2, ws.max_row + 1):
        if ws.cell(row=r, column=2).value == course_name:
            rows_to_delete.append(r)
            
    # Delete from bottom up
    for r in sorted(rows_to_delete, reverse=True):
        ws.delete_rows(r)
        
    recalculate_formulas(ws)
    wb.save(EXCEL_FILE)
    wb.close()

def toggle_module_status(plan: Optional[str] = None, course_name: Optional[str] = None, module_name: Optional[str] = None, path: Optional[str] = None, queue: bool = True):
    """Toggle Queue (active/inactive) status for a specific module, path, or all modules in a course."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách khóa học EPM V5"]
    
    updated = False
    for r in range(2, ws.max_row + 1):
        p_val = ws.cell(row=r, column=1).value
        c_val = ws.cell(row=r, column=2).value
        path_val = ws.cell(row=r, column=3).value
        m_val = ws.cell(row=r, column=4).value
        
        match_plan = (p_val == plan) if plan else True
        match_course = (c_val == course_name) if course_name else True
        match_path = (path_val == path) if path is not None else True
        match_module = (m_val == module_name) if module_name else True
        
        if match_plan and match_course and match_path and match_module:
            ws.cell(row=r, column=7).value = queue
            updated = True
            
    if updated:
        recalculate_formulas(ws)
        wb.save(EXCEL_FILE)
    wb.close()
    return updated

def update_module_duration(plan: Optional[str], course_name: str, module_name: str, duration: str, duration_minutes: int, path: Optional[str] = None):
    """Update duration string and duration_minutes for a specific module in sheet.xlsx."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách khóa học EPM V5"]
    
    updated = False
    for r in range(2, ws.max_row + 1):
        p_val = ws.cell(row=r, column=1).value
        c_val = ws.cell(row=r, column=2).value
        path_val = ws.cell(row=r, column=3).value
        m_val = ws.cell(row=r, column=4).value
        
        match_plan = (p_val == plan) if plan else True
        match_course = (c_val == course_name)
        match_path = (path_val == path) if path is not None else True
        match_module = (m_val == module_name)
        
        if match_plan and match_course and match_path and match_module:
            ws.cell(row=r, column=5).value = str(duration)
            ws.cell(row=r, column=6).value = int(duration_minutes)
            updated = True
            
    if updated:
        recalculate_formulas(ws)
        wb.save(EXCEL_FILE)
    wb.close()
    return updated

def move_module_to_course(source_plan: Optional[str], source_course: str, module_name: str, target_plan: str, target_course: str, target_path: Optional[str] = None, source_path: Optional[str] = None):
    """Move a module from source course to target course in sheet.xlsx."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách khóa học EPM V5"]
    
    moved = False
    for r in range(2, ws.max_row + 1):
        p_val = ws.cell(row=r, column=1).value
        c_val = ws.cell(row=r, column=2).value
        path_val = ws.cell(row=r, column=3).value
        m_val = ws.cell(row=r, column=4).value
        
        match_plan = (p_val == source_plan) if source_plan else True
        match_course = (c_val == source_course)
        match_path = (path_val == source_path) if source_path is not None else True
        match_module = (m_val == module_name)
        
        if match_plan and match_course and match_path and match_module:
            ws.cell(row=r, column=1).value = target_plan
            ws.cell(row=r, column=2).value = target_course
            ws.cell(row=r, column=3).value = target_path if target_path is not None else path_val
            moved = True
            break
            
    if moved:
        recalculate_formulas(ws)
        wb.save(EXCEL_FILE)
    wb.close()
    return moved

def delete_single_module(plan: Optional[str], course_name: str, module_name: str, path: Optional[str] = None):
    """Delete a single module row from sheet.xlsx."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách khóa học EPM V5"]
    
    target_row = None
    for r in range(2, ws.max_row + 1):
        p_val = ws.cell(row=r, column=1).value
        c_val = ws.cell(row=r, column=2).value
        path_val = ws.cell(row=r, column=3).value
        m_val = ws.cell(row=r, column=4).value
        
        match_plan = (p_val == plan) if plan else True
        match_course = (c_val == course_name)
        match_path = (path_val == path) if path is not None else True
        match_module = (m_val == module_name)
        
        if match_plan and match_course and match_path and match_module:
            target_row = r
            break
            
    if target_row:
        ws.delete_rows(target_row)
        recalculate_formulas(ws)
        wb.save(EXCEL_FILE)
        wb.close()
        return True
        
    wb.close()
    return False

def clone_course_campaign(source_course_name: str, new_course_name: str, new_plan: Optional[str] = None, new_path: Optional[str] = None, source_path: Optional[str] = None):
    """Clone active modules of a course into a new independent course template / campaign."""
    init_db()
    all_courses = get_courses()
    
    # Filter active modules from source course
    matching = [
        c for c in all_courses 
        if c["course_name"] == source_course_name 
        and (not source_path or c["path"] == source_path)
        and c.get("queue", True)
    ]
    
    if not matching:
        return False
        
    target_plan = new_plan or matching[0]["plan"]
    target_path = new_path if new_path is not None else matching[0]["path"]
    
    modules_to_add = []
    for m in matching:
        modules_to_add.append({
            "module_name": m["module_name"],
            "duration": m["duration"],
            "duration_minutes": m["duration_minutes"],
            "queue": True
        })
        
    add_course_modules(target_plan, new_course_name, target_path, modules_to_add)
    return True

def clone_plan_campaign(source_plan: str, new_plan: str):
    """Clone all active courses and modules of a source Plan into a new independent Plan."""
    init_db()
    all_courses = get_courses()
    
    matching = [
        c for c in all_courses 
        if c["plan"] == source_plan 
        and c.get("queue", True)
    ]
    
    if not matching:
        return False
        
    course_groups = {}
    for m in matching:
        key = (m["course_name"], m["path"])
        if key not in course_groups:
            course_groups[key] = []
        course_groups[key].append({
            "module_name": m["module_name"],
            "duration": m["duration"],
            "duration_minutes": m["duration_minutes"],
            "queue": True
        })
        
    for (course_name, path), modules in course_groups.items():
        add_course_modules(new_plan, course_name, path, modules)
        
    return True

def reorder_courses_in_plan(plan: str, course_order: List[str]):
    """Reorder course row blocks in sheet.xlsx for a given plan according to course_order list."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách khóa học EPM V5"]
    
    all_other_rows = []
    plan_rows = []
    
    for r in range(2, ws.max_row + 1):
        p_val = ws.cell(row=r, column=1).value
        row_values = [ws.cell(row=r, column=c).value for c in range(1, 9)]
        if p_val == plan:
            plan_rows.append(row_values)
        else:
            all_other_rows.append(row_values)
            
    if not plan_rows:
        wb.close()
        return False

    # Group plan_rows by course_name
    grouped = {}
    for row in plan_rows:
        c_name = row[1]  # Col B: Course Name
        if c_name not in grouped:
            grouped[c_name] = []
        grouped[c_name].append(row)
        
    # Reassemble plan rows according to course_order
    reordered_plan_rows = []
    for c_name in course_order:
        if c_name in grouped:
            reordered_plan_rows.extend(grouped.pop(c_name))
            
    # Append any remaining courses in plan not explicitly listed
    for remaining_rows in grouped.values():
        reordered_plan_rows.extend(remaining_rows)
        
    # Combine non-plan rows and reordered plan rows
    final_rows = all_other_rows + reordered_plan_rows
    
    # Clear existing worksheet rows from row 2
    ws.delete_rows(2, ws.max_row)
    
    # Write back final_rows
    for row_idx, rdata in enumerate(final_rows, start=2):
        for col_idx, val in enumerate(rdata, start=1):
            ws.cell(row=row_idx, column=col_idx).value = val
            
    recalculate_formulas(ws)
    wb.save(EXCEL_FILE)
    wb.close()
    return True

import hashlib
import hmac

DEFAULT_INITIAL_PASSWORD = "EPM@2026"

def hash_password(password: str, salt: str = None) -> str:
    """Hash password using PBKDF2_HMAC SHA256."""
    if not password:
        password = DEFAULT_INITIAL_PASSWORD
    if not salt:
        salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(stored_password_hash: str, password_candidate: str) -> bool:
    """Verify candidate password against stored PBKDF2 hash."""
    if not stored_password_hash:
        return False
    if '$' not in stored_password_hash:
        return stored_password_hash == password_candidate
    salt, hashed_hex = stored_password_hash.split('$', 1)
    candidate_hash = hashlib.pbkdf2_hmac('sha256', password_candidate.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return hmac.compare_digest(candidate_hash, hashed_hex)

def get_avatar_url(name: str, email: str = "") -> str:
    """Generate high-quality avatar URL using UI-Avatars / Gravatar."""
    clean_name = (name or "User").strip().replace(" ", "+")
    color_palette = ["3b82f6", "10b981", "8b5cf6", "ec4899", "f59e0b", "6366f1", "14b8a6"]
    name_hash = sum(ord(c) for c in clean_name) % len(color_palette)
    bg_color = color_palette[name_hash]
    
    ui_avatar = f"https://ui-avatars.com/api/?name={clean_name}&background={bg_color}&color=ffffff&bold=true&size=128&rounded=true"
    
    if email and "@" in email:
        clean_email = email.strip().lower()
        md5_hash = hashlib.md5(clean_email.encode("utf-8")).hexdigest()
        return f"https://www.gravatar.com/avatar/{md5_hash}?s=128&d={ui_avatar}"
    
    return ui_avatar

def get_employees():
    """Retrieve list of all employees."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
    ws = wb["Danh sách nhân viên"]
    employees = []
    
    for r in range(2, ws.max_row + 1):
        username = ws.cell(row=r, column=1).value
        fullname = ws.cell(row=r, column=2).value
        english_name = ws.cell(row=r, column=3).value
        role = ws.cell(row=r, column=4).value
        email = ws.cell(row=r, column=5).value
        must_change = ws.cell(row=r, column=7).value
        avatar_val = ws.cell(row=r, column=8).value
            
        if username is not None and str(username).strip() != "":
            fn = str(fullname).strip() if fullname else ""
            en = str(english_name).strip() if english_name else ""
            em = str(email).strip() if email else ""
            name_for_avatar = en if en else fn
            avatar_url = str(avatar_val).strip() if avatar_val and str(avatar_val).strip() else get_avatar_url(name_for_avatar, em)
            employees.append({
                "username": str(username).strip(),
                "fullname": fn,
                "english_name": en,
                "role": str(role).strip() if role else "Employee",
                "email": em,
                "must_change_password": bool(must_change),
                "avatar_url": avatar_url
            })
    wb.close()
    return employees

def save_employee(username, fullname, role, english_name="", email="", initial_password=None, avatar_url=None):
    """Add or update an employee."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách nhân viên"]
    
    ws.cell(row=1, column=1).value = 'Username'
    ws.cell(row=1, column=2).value = 'Full Name'
    ws.cell(row=1, column=3).value = 'English Name'
    ws.cell(row=1, column=4).value = 'Role'
    ws.cell(row=1, column=5).value = 'Email'
    ws.cell(row=1, column=6).value = 'PasswordHash'
    ws.cell(row=1, column=7).value = 'MustChangePassword'
    ws.cell(row=1, column=8).value = 'AvatarUrl'
        
    found_row = None
    u_str = str(username).strip()
    for r in range(2, ws.max_row + 1):
        val = ws.cell(row=r, column=1).value
        if val is not None and str(val).strip() == u_str:
            found_row = r
            break
            
    pwd_to_use = initial_password if initial_password else DEFAULT_INITIAL_PASSWORD
    pwd_hash = hash_password(pwd_to_use)
    
    if found_row:
        ws.cell(row=found_row, column=2).value = fullname
        ws.cell(row=found_row, column=3).value = english_name
        ws.cell(row=found_row, column=4).value = role
        ws.cell(row=found_row, column=5).value = email
        if avatar_url is not None:
            ws.cell(row=found_row, column=8).value = avatar_url
        if not ws.cell(row=found_row, column=6).value:
            ws.cell(row=found_row, column=6).value = pwd_hash
            ws.cell(row=found_row, column=7).value = True
    else:
        ws.append([u_str, fullname, english_name, role, email, pwd_hash, True, avatar_url or ""])
        
    wb.save(EXCEL_FILE)
    wb.close()

def update_user_avatar(username: str, avatar_url: str):
    """Update user's avatar_url in sheet.xlsx and return updated user object."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách nhân viên"]
    
    u_target = str(username).strip().lower()
    found_row = None
    for r in range(2, ws.max_row + 1):
        u = str(ws.cell(row=r, column=1).value or "").strip()
        if u.lower() == u_target:
            found_row = r
            break
            
    if not found_row:
        wb.close()
        return None
        
    ws.cell(row=found_row, column=8).value = avatar_url.strip()
    wb.save(EXCEL_FILE)
    wb.close()
    
    # Return updated user object
    all_emps = get_employees()
    return next((e for e in all_emps if e["username"].lower() == u_target), None)

def authenticate_user(user_or_email: str, password_candidate: str):
    """Authenticate user by username or email and password."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
    ws = wb["Danh sách nhân viên"]
    
    query = str(user_or_email).strip().lower()
    candidate_pwd = str(password_candidate or "").strip()
    if not query:
        wb.close()
        return None
        
    found = None
    for r in range(2, ws.max_row + 1):
        u = str(ws.cell(row=r, column=1).value or "").strip()
        fn = str(ws.cell(row=r, column=2).value or "").strip()
        en = str(ws.cell(row=r, column=3).value or "").strip()
        role = str(ws.cell(row=r, column=4).value or "Employee").strip()
        em = str(ws.cell(row=r, column=5).value or "").strip()
        pwd_hash = str(ws.cell(row=r, column=6).value or "").strip()
        must_change = ws.cell(row=r, column=7).value
        avatar_val = ws.cell(row=r, column=8).value
        
        em_prefix = em.split("@")[0].lower() if "@" in em else ""
        if u.lower() == query or (em and em.lower() == query) or (em_prefix and em_prefix == query):
            found = {
                "row": r,
                "username": u,
                "fullname": fn,
                "english_name": en,
                "role": role,
                "email": em,
                "password_hash": pwd_hash,
                "must_change_password": bool(must_change),
                "avatar_url": str(avatar_val).strip() if avatar_val and str(avatar_val).strip() else None
            }
            break
            
    wb.close()
    if not found:
        return None
        
    if verify_password(found["password_hash"], candidate_pwd) or verify_password(found["password_hash"], password_candidate):
        name_for_avatar = found["english_name"] if found["english_name"] else found["fullname"]
        final_avatar = found["avatar_url"] if found["avatar_url"] else get_avatar_url(name_for_avatar, found["email"])
        return {
            "username": found["username"],
            "fullname": found["fullname"],
            "english_name": found["english_name"],
            "role": found["role"],
            "email": found["email"],
            "must_change_password": found["must_change_password"],
            "avatar_url": final_avatar
        }
    return None

def change_user_password(username: str, old_password: str, new_password: str):
    """Change user password after verifying current password."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách nhân viên"]
    
    u_target = str(username).strip().lower()
    found_row = None
    stored_hash = ""
    for r in range(2, ws.max_row + 1):
        u = str(ws.cell(row=r, column=1).value or "").strip()
        if u.lower() == u_target:
            found_row = r
            stored_hash = str(ws.cell(row=r, column=6).value or "").strip()
            break
            
    if not found_row:
        wb.close()
        return False, "Tài khoản không tồn tại."
        
    if not verify_password(stored_hash, old_password):
        wb.close()
        return False, "Mật khẩu hiện tại không đúng."
        
    new_hash = hash_password(new_password)
    ws.cell(row=found_row, column=6).value = new_hash
    ws.cell(row=found_row, column=7).value = False
    
    wb.save(EXCEL_FILE)
    wb.close()
    return True, "Đổi mật khẩu thành công."

def reset_user_password(email: str):
    """Reset user password by registered email and send password reset email via SMTP."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách nhân viên"]
    
    em_target = str(email).strip().lower()
    found_row = None
    found_username = ""
    found_email = ""
    for r in range(2, ws.max_row + 1):
        em = str(ws.cell(row=r, column=5).value or "").strip()
        if em and em.lower() == em_target:
            found_row = r
            found_username = str(ws.cell(row=r, column=1).value or "").strip()
            found_email = em
            break
            
    if not found_row:
        wb.close()
        return False, "Email không tồn tại trong hệ thống. Vui lòng kiểm tra lại.", None
        
    import secrets
    random_pin = secrets.randbelow(899999) + 100000
    temp_password = f"EPM{random_pin}"
    temp_hash = hash_password(temp_password)
    
    ws.cell(row=found_row, column=6).value = temp_hash
    ws.cell(row=found_row, column=7).value = True
    
    wb.save(EXCEL_FILE)
    wb.close()
    
    # Send reset email via SMTP
    try:
        from backend.email_service import send_password_reset_email
        sent_ok, email_msg = send_password_reset_email(found_email, found_username, temp_password)
        if sent_ok:
            return True, f"Mật khẩu mới đã được tự động gửi đến hòm thư {found_email}. Vui lòng kiểm tra hộp thư (hoặc thư rác) để đăng nhập và đổi mật khẩu mới.", temp_password
        else:
            # If SMTP_PASSWORD environment variable is not configured yet, notify user & fallback to temp password info
            return True, f"Đã reset mật khẩu tài khoản thành công!\n({email_msg})\nMật khẩu tạm thời của bạn là: {temp_password}", temp_password
    except Exception as ex:
        return True, f"Mật khẩu của tài khoản '{found_username}' đã được reset về mật khẩu tạm thời: {temp_password}. Vui lòng đăng nhập và đổi mật khẩu mới.", temp_password

def delete_employee(username):
    """Delete employee by username."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Danh sách nhân viên"]
    found_row = None
    u_str = str(username).strip()
    for r in range(2, ws.max_row + 1):
        val = ws.cell(row=r, column=1).value
        if val is not None and str(val).strip() == u_str:
            found_row = r
            break
    if found_row:
        ws.delete_rows(found_row)
        wb.save(EXCEL_FILE)
    wb.close()

def get_tracking_status(status, planned_date_str, completion_date_str, start_date_str=None, duration_minutes=0):
    """
    Calculate tracking status based on:
    - Status (Not Started, In Progress, Completed)
    - Planned Completion Date
    - Actual Completion Date / Current Date
    - Start Date & Duration (Short modules 1-3h)
    """
    if not planned_date_str:
        return "On-track"
        
    try:
        if isinstance(planned_date_str, datetime):
            planned_date = planned_date_str.date()
        elif isinstance(planned_date_str, date):
            planned_date = planned_date_str
        else:
            planned_date = datetime.strptime(str(planned_date_str).split()[0], "%Y-%m-%d").date()
    except Exception:
        return "On-track"
        
    today = date.today()
    
    # Parse start date if available
    start_date = None
    if start_date_str:
        try:
            if isinstance(start_date_str, datetime):
                start_date = start_date_str.date()
            elif isinstance(start_date_str, date):
                start_date = start_date_str
            else:
                start_date = datetime.strptime(str(start_date_str).split()[0], "%Y-%m-%d").date()
        except Exception:
            start_date = None

    is_short_module = (duration_minutes > 0 and duration_minutes <= 180)

    if status == "Completed":
        if completion_date_str:
            try:
                if isinstance(completion_date_str, datetime):
                    comp_date = completion_date_str.date()
                elif isinstance(completion_date_str, date):
                    comp_date = completion_date_str
                else:
                    comp_date = datetime.strptime(str(completion_date_str).split()[0], "%Y-%m-%d").date()
            except Exception:
                comp_date = today
        else:
            comp_date = today
            
        if comp_date <= planned_date:
            return "Fast"
        else:
            return "Slow"
    elif status == "In Progress":
        # Short modules (1-3h) started more than 1 day ago and still incomplete -> Slow
        if is_short_module and start_date and (today - start_date).days > 1:
            return "Slow"

        if today <= planned_date:
            return "On-track"
        else:
            diff_days = (today - planned_date).days
            if diff_days <= 7:
                return "Slow"
            else:
                return "Too slow"
    else:
        # Not Started
        if today < planned_date:
            return "On-track"
        else:
            # If today >= planned_date and user HAS NOT STARTED yet
            diff_days = (today - planned_date).days
            if is_short_module:
                if diff_days <= 3:
                    return "Slow"
                else:
                    return "Too slow"
            else:
                if diff_days <= 7:
                    return "Slow"
                else:
                    return "Too slow"

def get_progress(username=None):
    """Retrieve learning progress for one or all users."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
    ws = wb["Tiến độ học tập"]
    progress_list = []
    
    for r in range(2, ws.max_row + 1):
        u = ws.cell(row=r, column=1).value
        course = ws.cell(row=r, column=2).value
        path = ws.cell(row=r, column=3).value
        module = ws.cell(row=r, column=4).value
        status = ws.cell(row=r, column=5).value
        prog = ws.cell(row=r, column=6).value
        start = ws.cell(row=r, column=7).value
        comp = ws.cell(row=r, column=8).value
        planned = ws.cell(row=r, column=9).value
        track_status = ws.cell(row=r, column=10).value
        
        if u is not None and (username is None or str(u).strip() == str(username).strip()):
            # Format dates to string
            start_str = start.strftime("%Y-%m-%d") if isinstance(start, (datetime, date)) else str(start) if start else ""
            comp_str = comp.strftime("%Y-%m-%d") if isinstance(comp, (datetime, date)) else str(comp) if comp else ""
            planned_str = planned.strftime("%Y-%m-%d") if isinstance(planned, (datetime, date)) else str(planned) if planned else ""
            
            # Recalculate status dynamically in case dates have passed
            track_status = get_tracking_status(status, planned_str, comp_str)
            
            progress_list.append({
                "row": r,
                "username": str(u).strip(),
                "course_name": course,
                "path": path if path else "",
                "module_name": module if module else "",
                "status": status if status else "Not Started",
                "progress_percent": float(prog) if prog is not None else 0.0,
                "start_date": start_str,
                "completion_date": comp_str,
                "planned_completion_date": planned_str,
                "tracking_status": track_status
            })
    wb.close()
    return progress_list

def save_progress(username, course_name, path, module_name, status, progress_percent, start_date, completion_date, planned_completion_date):
    """Save or update student module progress."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Tiến độ học tập"]
    
    # Normalize status and percent alignment
    try:
        progress_percent = float(progress_percent)
    except Exception:
        progress_percent = 0.0

    if progress_percent >= 100.0:
        status = "Completed"
        progress_percent = 100.0
    elif progress_percent > 0.0 and status == "Not Started":
        status = "In Progress"

    today_val = date.today()
    if status in ("In Progress", "Completed") and not start_date:
        start_val = today_val
    elif start_date:
        try:
            start_val = datetime.strptime(str(start_date).split()[0], "%Y-%m-%d").date()
        except Exception:
            start_val = today_val
    else:
        start_val = None

    if status == "Completed":
        if not completion_date:
            comp_val = today_val
        else:
            try:
                comp_val = datetime.strptime(str(completion_date).split()[0], "%Y-%m-%d").date()
            except Exception:
                comp_val = today_val
    else:
        comp_val = None

    if planned_completion_date:
        try:
            planned_val = datetime.strptime(str(planned_completion_date).split()[0], "%Y-%m-%d").date()
        except Exception:
            planned_val = None
    else:
        planned_val = None

    # Calculate status
    tracking = get_tracking_status(status, planned_val, comp_val)

    found_row = None
    for r in range(2, ws.max_row + 1):
        u = ws.cell(row=r, column=1).value
        c = ws.cell(row=r, column=2).value
        p = ws.cell(row=r, column=3).value
        m = ws.cell(row=r, column=4).value
        
        # Check matching record
        if u is not None and str(u).strip() == str(username).strip() and c == course_name and (p or "") == (path or "") and m == module_name:
            found_row = r
            break

    u_str = str(username).strip()
    if found_row:
        ws.cell(row=found_row, column=5).value = status
        ws.cell(row=found_row, column=6).value = float(progress_percent)
        ws.cell(row=found_row, column=7).value = start_val
        ws.cell(row=found_row, column=8).value = comp_val
        ws.cell(row=found_row, column=9).value = planned_val
        ws.cell(row=found_row, column=10).value = tracking
    else:
        ws.append([
            u_str, course_name, path or "", module_name, status, 
            float(progress_percent), start_val, comp_val, 
            planned_val, tracking
        ])
        
    wb.save(EXCEL_FILE)
    wb.close()


def get_working_days(start_date_str, end_date_str, workweek_type):
    """
    Generate list of YYYY-MM-DD date strings between start and end (inclusive)
    excluding weekends depending on workweek_type:
    - 5: exclude Saturday (5) and Sunday (6)
    - 6: exclude Sunday (6)
    - 7: include all days
    """
    from datetime import timedelta
    try:
        start_date = datetime.strptime(str(start_date_str).split()[0], "%Y-%m-%d").date()
        end_date = datetime.strptime(str(end_date_str).split()[0], "%Y-%m-%d").date()
    except Exception:
        return []
        
    working_days = []
    curr = start_date
    while curr <= end_date:
        weekday = curr.weekday() # 0 = Monday, ..., 5 = Saturday, 6 = Sunday
        if workweek_type == 5:
            if weekday < 5: # Monday to Friday
                working_days.append(curr.strftime("%Y-%m-%d"))
        elif workweek_type == 6:
            if weekday < 6: # Monday to Saturday
                working_days.append(curr.strftime("%Y-%m-%d"))
        elif workweek_type == 7:
            working_days.append(curr.strftime("%Y-%m-%d"))
        curr += timedelta(days=1)
    return working_days


def get_enrollments(username=None):
    """Get list of course/plan enrollments."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
    ws = wb["Đăng ký khóa học"]
    enrollments = []
    
    has_target_type = (ws.cell(row=1, column=2).value == 'Target Type')
    
    for r in range(2, ws.max_row + 1):
        u = ws.cell(row=r, column=1).value
        if has_target_type:
            target_type = ws.cell(row=r, column=2).value or "plan"
            target_name = ws.cell(row=r, column=3).value or ""
            start = ws.cell(row=r, column=4).value
            end = ws.cell(row=r, column=5).value
            ww = ws.cell(row=r, column=6).value
            ratio_val = ws.cell(row=r, column=7).value
            daily_h = ws.cell(row=r, column=8).value
        else:
            target_type = "course"
            target_name = ws.cell(row=r, column=2).value or ""
            start = ws.cell(row=r, column=3).value
            end = ws.cell(row=r, column=4).value
            ww = ws.cell(row=r, column=5).value
            ratio_val = 3.0
            daily_h = 2.0
            
        if u is not None and str(u).strip() != "":
            start_str = start.strftime("%Y-%m-%d") if isinstance(start, (datetime, date)) else str(start).split()[0] if start else ""
            end_str = end.strftime("%Y-%m-%d") if isinstance(end, (datetime, date)) else str(end).split()[0] if end else ""
            
            if username is None or str(u).strip() == str(username).strip():
                enrollments.append({
                    "username": str(u).strip(),
                    "target_type": str(target_type).lower(),
                    "target_name": target_name,
                    "course_name": target_name,
                    "start_date": start_str,
                    "planned_end_date": end_str,
                    "workweek_type": int(ww) if ww is not None else 5,
                    "ratio": float(ratio_val) if ratio_val is not None else 3.0,
                    "daily_hours": float(daily_h) if daily_h is not None else 2.0
                })
    wb.close()
    return enrollments


def save_enrollment(username, target_type, target_name, start_date, end_date, workweek_type, ratio=3.0, daily_hours=2.0):
    """Save enrollment (Plan or Course) and auto-schedule module deadlines."""
    init_db()
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Đăng ký khóa học"]
    
    if ws.cell(row=1, column=2).value != 'Target Type':
        ws.cell(row=1, column=2).value = 'Target Type'
        ws.cell(row=1, column=3).value = 'Target Name'
        ws.cell(row=1, column=4).value = 'Start Date'
        ws.cell(row=1, column=5).value = 'Planned End Date'
        ws.cell(row=1, column=6).value = 'Workweek Type'
        ws.cell(row=1, column=7).value = 'Ratio'
        ws.cell(row=1, column=8).value = 'Daily Hours'
        
    found_row = None
    u_str = str(username).strip()
    for r in range(2, ws.max_row + 1):
        u = ws.cell(row=r, column=1).value
        t_name = ws.cell(row=r, column=3).value if ws.cell(row=1, column=2).value == 'Target Type' else ws.cell(row=r, column=2).value
        if u is not None and str(u).strip() == u_str and t_name == target_name:
            found_row = r
            break
            
    start_val = datetime.strptime(start_date, "%Y-%m-%d").date()
    end_val = datetime.strptime(end_date, "%Y-%m-%d").date()
    
    if found_row:
        ws.cell(row=found_row, column=2).value = target_type
        ws.cell(row=found_row, column=3).value = target_name
        ws.cell(row=found_row, column=4).value = start_val
        ws.cell(row=found_row, column=5).value = end_val
        ws.cell(row=found_row, column=6).value = int(workweek_type)
        ws.cell(row=found_row, column=7).value = float(ratio)
        ws.cell(row=found_row, column=8).value = float(daily_hours)
    else:
        ws.append([u_str, target_type, target_name, start_val, end_val, int(workweek_type), float(ratio), float(daily_hours)])
        
    wb.save(EXCEL_FILE)
    wb.close()
    
    # 2. Schedule module deadlines
    all_courses = get_courses()
    if target_type.lower() == "plan":
        target_modules = [m for m in all_courses if m["plan"] == target_name and m.get("queue", True)]
    else:
        target_modules = [m for m in all_courses if m["course_name"] == target_name and m.get("queue", True)]
        
    if not target_modules:
        return
        
    working_days = get_working_days(start_date, end_date, int(workweek_type))
    N = len(working_days)
    if N == 0:
        working_days = [end_date]
        N = 1
        
    import re
    def get_effective_mins(m, r_val):
        m_name = m.get("module_name", "")
        is_exam = bool(re.search(r'1z0-|exam|certification|professional', m_name, re.I))
        dm = m.get("duration_minutes", 0)
        return dm if is_exam else dm * r_val

    r_factor = float(ratio)
    total_effective_mins = sum(get_effective_mins(m, r_factor) for m in target_modules)
    if total_effective_mins == 0:
        total_effective_mins = len(target_modules)
        
    cum_effective_mins = 0
    progress_sheet = openpyxl.load_workbook(EXCEL_FILE)
    p_ws = progress_sheet["Tiến độ học tập"]
    
    for m in target_modules:
        cum_effective_mins += get_effective_mins(m, r_factor)
        weight = cum_effective_mins / total_effective_mins
        idx = int(round(weight * (N - 1)))
        assigned_date = working_days[idx]
        
        existing_row = None
        for r in range(2, p_ws.max_row + 1):
            pu = p_ws.cell(row=r, column=1).value
            pc = p_ws.cell(row=r, column=2).value
            pp = p_ws.cell(row=r, column=3).value
            pm = p_ws.cell(row=r, column=4).value
            if pu is not None and str(pu).strip() == u_str and pc == m["course_name"] and (pp or "") == (m["path"] or "") and pm == m["module_name"]:
                existing_row = r
                break
                
        tracking = get_tracking_status(
            "Not Started" if not existing_row else p_ws.cell(row=existing_row, column=5).value,
            assigned_date,
            None if not existing_row else p_ws.cell(row=existing_row, column=8).value
        )
        
        if existing_row:
            p_ws.cell(row=existing_row, column=9).value = datetime.strptime(assigned_date, "%Y-%m-%d").date()
            p_ws.cell(row=existing_row, column=10).value = tracking
        else:
            p_ws.append([
                u_str, m["course_name"], m["path"] or "", m["module_name"],
                "Not Started", 0.0, None, None, 
                datetime.strptime(assigned_date, "%Y-%m-%d").date(), tracking
            ])
            
    progress_sheet.save(EXCEL_FILE)
    progress_sheet.close()


def delete_enrollment(username, target_name):
    """Delete enrollment and related learning progress modules."""
    init_db()
    u_str = str(username).strip()
    
    all_courses = get_courses()
    target_modules = [m for m in all_courses if m["plan"] == target_name or m["course_name"] == target_name]
    
    wb_prog = openpyxl.load_workbook(EXCEL_FILE)
    ws_p = wb_prog["Tiến độ học tập"]
    rows_to_delete_p = []
    
    for r in range(2, ws_p.max_row + 1):
        u = ws_p.cell(row=r, column=1).value
        c = ws_p.cell(row=r, column=2).value
        if u is not None and str(u).strip() == u_str:
            if c == target_name or any(tm["course_name"] == c for tm in target_modules):
                rows_to_delete_p.append(r)
                
    for r in sorted(rows_to_delete_p, reverse=True):
        ws_p.delete_rows(r)
    wb_prog.save(EXCEL_FILE)
    wb_prog.close()
    
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb["Đăng ký khóa học"]
    found_row = None
    has_target_type = (ws.cell(row=1, column=2).value == 'Target Type')
    name_col = 3 if has_target_type else 2
    
    for r in range(2, ws.max_row + 1):
        u = ws.cell(row=r, column=1).value
        name_val = ws.cell(row=r, column=name_col).value
        if u is not None and str(u).strip() == u_str and name_val == target_name:
            found_row = r
            break
            
    if found_row:
        ws.delete_rows(found_row)
        wb.save(EXCEL_FILE)
    wb.close()

