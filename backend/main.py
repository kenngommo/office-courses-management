import os
from fastapi import FastAPI, HTTPException, Query, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import shutil
from backend.storage import BACKUP_DIR, DATA_DIR, EXCEL_FILE, PERSISTENT_STORAGE_CONFIGURED, create_backup

from backend.db_manager import (
    init_db,
    get_courses,
    add_course_modules,
    delete_course,
    get_employees,
    save_employee,
    delete_employee,
    get_progress,
    save_progress,
    get_enrollments,
    save_enrollment,
    delete_enrollment,
    authenticate_user,
    change_user_password,
    reset_user_password,
    update_user_avatar,
    toggle_module_status,
    clone_course_campaign,
    clone_plan_campaign,
    add_source_module_to_template,
    reorder_courses_in_plan,
    update_module_duration,
    move_module_to_course,
    delete_single_module
)

# Initialize sheet schema if not already present
init_db()

app = FastAPI(title="Courses Management API V5")

@app.middleware("http")
async def backup_after_data_change(request, call_next):
    response = await call_next(request)
    is_data_change = request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.url.path != "/api/auth/login"
    if is_data_change and response.status_code < 400:
        create_backup(f"{request.method.lower()}-{request.url.path.strip('/').replace('/', '-')}")
    return response

# Setup CORS to allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---

class LoginRequest(BaseModel):
    user_or_email: str
    password: str

class ChangePasswordRequest(BaseModel):
    username: str
    old_password: str
    new_password: str

class ResetPasswordRequest(BaseModel):
    email: str

class ModuleInput(BaseModel):
    module_name: str
    duration: str
    duration_minutes: int
    queue: bool = True

class CourseInsertRequest(BaseModel):
    plan: str
    course_name: str
    path: Optional[str] = ""
    modules: List[ModuleInput]

class EmployeeRequest(BaseModel):
    username: str
    fullname: str
    english_name: Optional[str] = ""
    role: str
    email: Optional[str] = ""
    initial_password: Optional[str] = None

class ProgressUpdateRequest(BaseModel):
    username: str
    course_name: str
    path: Optional[str] = ""
    module_name: str
    module_id: Optional[str] = None
    status: str  # Not Started, In Progress, Completed
    progress_percent: float = Field(..., ge=0, le=100)
    start_date: Optional[str] = None          # YYYY-MM-DD
    completion_date: Optional[str] = None     # YYYY-MM-DD
    planned_completion_date: str              # YYYY-MM-DD

# --- Auth Endpoints ---

@app.post("/api/auth/login")
def api_login(req: LoginRequest):
    user = authenticate_user(req.user_or_email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập/email hoặc mật khẩu. Vui lòng kiểm tra lại.")
    return {"status": "success", "user": user}

@app.post("/api/auth/change-password")
def api_change_password(req: ChangePasswordRequest):
    if len(req.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 4 ký tự.")
    success, message = change_user_password(req.username, req.old_password, req.new_password)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message}

@app.post("/api/auth/reset-password")
def api_reset_password(req: ResetPasswordRequest):
    success, message, temp_password = reset_user_password(req.email)
    if not success:
        raise HTTPException(status_code=404, detail=message)
    return {"status": "success", "message": message, "temp_password": temp_password}

# --- API Endpoints ---

@app.get("/api/system/storage")
def api_storage_status():
    backups = sorted(BACKUP_DIR.glob("sheet-*.xlsx"), key=lambda p: p.stat().st_mtime, reverse=True)
    return {
        "data_dir": str(DATA_DIR),
        "workbook_exists": EXCEL_FILE.exists(),
        "workbook_size": EXCEL_FILE.stat().st_size if EXCEL_FILE.exists() else 0,
        "backup_count": len(backups),
        "latest_backup": backups[0].name if backups else None,
        "persistent_storage_configured": PERSISTENT_STORAGE_CONFIGURED,
    }

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

# 1. Course Endpoints
@app.get("/api/courses")
def api_get_courses():
    try:
        return get_courses()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading courses: {str(e)}")

@app.post("/api/courses")
def api_add_course_modules(req: CourseInsertRequest):
    try:
        modules_list = [m.model_dump() for m in req.modules]
        add_course_modules(req.plan, req.course_name, req.path, modules_list)
        return {"status": "success", "message": f"Successfully added modules for {req.course_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding course modules: {str(e)}")

@app.delete("/api/courses")
def api_delete_course(course_name: str = Query(..., description="Name of the course to delete")):
    try:
        delete_course(course_name)
        return {"status": "success", "message": f"Successfully deleted course: {course_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting course: {str(e)}")

# 2. Employee Endpoints
@app.get("/api/employees")
def api_get_employees():
    try:
        return get_employees()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading employees: {str(e)}")

@app.post("/api/employees")
def api_add_employee(req: EmployeeRequest):
    try:
        init_pwd = req.initial_password.strip() if req.initial_password else None
        save_employee(req.username.strip(), req.fullname.strip(), req.role.strip(), (req.english_name or "").strip(), (req.email or "").strip(), initial_password=init_pwd)
        return {"status": "success", "message": f"Saved employee: {req.username}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving employee: {str(e)}")

@app.delete("/api/employees")
def api_delete_employee(username: str = Query(..., description="Username of the employee to delete")):
    try:
        delete_employee(username)
        return {"status": "success", "message": f"Successfully deleted employee: {username}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting employee: {str(e)}")

# 3. Progress Endpoints
@app.get("/api/progress")
def api_get_progress(username: Optional[str] = None):
    try:
        return get_progress(username)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading progress: {str(e)}")

@app.post("/api/progress")
def api_save_progress(req: ProgressUpdateRequest):
    try:
        save_progress(
            username=req.username,
            course_name=req.course_name,
            path=req.path,
            module_name=req.module_name,
            module_id=req.module_id,
            status=req.status,
            progress_percent=req.progress_percent,
            start_date=req.start_date,
            completion_date=req.completion_date,
            planned_completion_date=req.planned_completion_date
        )
        return {"status": "success", "message": "Successfully saved progress"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating progress: {str(e)}")

# --- Enrollment Endpoints ---

class EnrollmentRequest(BaseModel):
    username: str
    target_type: str = "plan"  # "plan" or "course"
    target_name: str           # Plan name or Course name
    target_id: Optional[str] = None
    course_name: Optional[str] = None # Backward compatibility
    start_date: str          # YYYY-MM-DD
    planned_end_date: str    # YYYY-MM-DD
    workweek_type: int = 5   # 5, 6, or 7
    ratio: float = 3.0       # Video learning multiplier ratio
    daily_hours: float = Field(2.0, ge=0.5, le=24) # Configurable study-day capacity

@app.get("/api/enrollments")
def api_get_enrollments(username: Optional[str] = None):
    try:
        return get_enrollments(username)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading enrollments: {str(e)}")

@app.post("/api/enrollments")
def api_save_enrollment(req: EnrollmentRequest):
    try:
        if req.workweek_type not in (5, 6, 7):
            raise HTTPException(status_code=400, detail="Workweek type must be 5 (Mon-Fri), 6 (Mon-Sat), or 7 (All days)")
        
        target_name = req.target_name or req.course_name
        if not target_name:
            raise HTTPException(status_code=400, detail="Target name (Plan or Course) is required")
            
        save_enrollment(
            username=req.username,
            target_type=req.target_type,
            target_name=target_name,
            start_date=req.start_date,
            end_date=req.planned_end_date,
            workweek_type=req.workweek_type,
            ratio=req.ratio,
            daily_hours=req.daily_hours,
            target_id=req.target_id
        )
        return {"status": "success", "message": f"Successfully enrolled {req.username} in {target_name} ({req.target_type})"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving enrollment: {str(e)}")

@app.delete("/api/enrollments")
def api_delete_enrollment(
    username: str = Query(...), 
    target_name: Optional[str] = Query(None),
    course_name: Optional[str] = Query(None)
):
    try:
        name_to_del = target_name or course_name
        if not name_to_del:
            raise HTTPException(status_code=400, detail="target_name or course_name is required")
        delete_enrollment(username, name_to_del)
        return {"status": "success", "message": f"Successfully deleted enrollment for {username} in {name_to_del}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting enrollment: {str(e)}")

@app.post("/api/user/avatar")
async def api_update_avatar(
    username: str = Form(...),
    avatar_url: Optional[str] = Form(None),
    avatar_file: Optional[UploadFile] = File(None)
):
    try:
        final_url = avatar_url.strip() if avatar_url else None
        
        if avatar_file and avatar_file.filename:
            # Ensure uploads directory exists
            uploads_dir = os.path.join(FRONTEND_DIR, "uploads", "avatars")
            os.makedirs(uploads_dir, exist_ok=True)
            
            # Clean filename and save
            safe_filename = f"{username.strip()}_{avatar_file.filename.replace(' ', '_')}"
            file_path = os.path.join(uploads_dir, safe_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(avatar_file.file, buffer)
                
            final_url = f"/uploads/avatars/{safe_filename}"
            
        if not final_url:
            raise HTTPException(status_code=400, detail="Vui lòng tải lên tệp ảnh hoặc nhập đường dẫn URL ảnh.")
            
        updated_user = update_user_avatar(username, final_url)
        if not updated_user:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng.")
            
        return {"status": "success", "message": "Cập nhật ảnh đại diện thành công!", "user": updated_user}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật ảnh đại diện: {str(e)}")

class ToggleModuleRequest(BaseModel):
    plan: Optional[str] = None
    course_name: Optional[str] = None
    path: Optional[str] = None
    module_name: Optional[str] = None
    queue: bool = True

@app.post("/api/courses/toggle-active")
def api_toggle_course_module(req: ToggleModuleRequest):
    try:
        success = toggle_module_status(
            plan=req.plan,
            course_name=req.course_name,
            module_name=req.module_name,
            path=req.path,
            queue=req.queue
        )
        if not success:
            raise HTTPException(status_code=404, detail="Không tìm thấy module/khóa học phù hợp.")
        return {"status": "success", "message": "Cập nhật trạng thái Active/Unactive thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CloneCampaignRequest(BaseModel):
    source_course_name: str
    source_path: Optional[str] = None
    new_plan: Optional[str] = None
    new_course_name: str
    new_path: Optional[str] = None

@app.post("/api/courses/clone-campaign")
def api_clone_course_campaign(req: CloneCampaignRequest):
    try:
        success = clone_course_campaign(
            source_course_name=req.source_course_name,
            new_course_name=req.new_course_name,
            new_plan=req.new_plan,
            new_path=req.new_path,
            source_path=req.source_path
        )
        if not success:
            raise HTTPException(status_code=400, detail="Không tìm thấy module Active nào từ khóa học gốc để nhân bản.")
        return {"status": "success", "message": f"Tạo Đợt đào tạo mới '{req.new_course_name}' thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ClonePlanRequest(BaseModel):
    source_plan: str
    new_plan: str

@app.post("/api/courses/clone-plan")
def api_clone_plan(req: ClonePlanRequest):
    try:
        success = clone_plan_campaign(
            source_plan=req.source_plan,
            new_plan=req.new_plan
        )
        if not success:
            raise HTTPException(status_code=400, detail="Không tìm thấy module/khóa học Active nào trong Plan gốc để nhân bản.")
        return {"status": "success", "message": f"Tạo Plan đào tạo mới '{req.new_plan}' thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ReorderCoursesRequest(BaseModel):
    plan: str
    course_order: List[str]

class IncludeTemplateModuleRequest(BaseModel):
    template_plan: str
    source_module_id: str

@app.post("/api/plan-templates/include-module")
def api_include_template_module(req: IncludeTemplateModuleRequest):
    try:
        if not add_source_module_to_template(req.template_plan, req.source_module_id):
            raise HTTPException(status_code=400, detail="Template hoặc module nguồn không hợp lệ.")
        return {"status": "success", "message": "Đã thêm module từ Plan chính vào Plan Template."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/courses/reorder")
def api_reorder_courses(req: ReorderCoursesRequest):
    try:
        success = reorder_courses_in_plan(
            plan=req.plan,
            course_order=req.course_order
        )
        if not success:
            raise HTTPException(status_code=400, detail="Không tìm thấy các khóa học trong Plan để sắp xếp.")
        return {"status": "success", "message": "Cập nhật thứ tự khóa học thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UpdateModuleDurationRequest(BaseModel):
    plan: Optional[str] = None
    course_name: str
    module_name: str
    path: Optional[str] = None
    duration: str
    duration_minutes: int

@app.post("/api/courses/update-duration")
def api_update_module_duration(req: UpdateModuleDurationRequest):
    try:
        success = update_module_duration(
            plan=req.plan,
            course_name=req.course_name,
            module_name=req.module_name,
            path=req.path,
            duration=req.duration,
            duration_minutes=req.duration_minutes
        )
        if not success:
            raise HTTPException(status_code=404, detail="Không tìm thấy module để cập nhật thời lượng.")
        return {"status": "success", "message": "Cập nhật thời lượng module thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MoveModuleRequest(BaseModel):
    source_plan: Optional[str] = None
    source_course: str
    module_name: str
    source_path: Optional[str] = None
    target_plan: str
    target_course: str
    target_path: Optional[str] = None

@app.post("/api/courses/move-module")
def api_move_module(req: MoveModuleRequest):
    try:
        success = move_module_to_course(
            source_plan=req.source_plan,
            source_course=req.source_course,
            module_name=req.module_name,
            target_plan=req.target_plan,
            target_course=req.target_course,
            target_path=req.target_path,
            source_path=req.source_path
        )
        if not success:
            raise HTTPException(status_code=404, detail="Không tìm thấy module để di chuyển.")
        return {"status": "success", "message": f"Chuyển module '{req.module_name}' sang khóa '{req.target_course}' thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AddModuleToCourseRequest(BaseModel):
    plan: str
    course_name: str
    path: Optional[str] = None
    module_name: str
    duration: str
    duration_minutes: int

@app.post("/api/courses/add-module")
def api_add_module_to_course(req: AddModuleToCourseRequest):
    try:
        add_course_modules(
            plan=req.plan,
            course_name=req.course_name,
            path=req.path or "",
            modules=[{
                "module_name": req.module_name,
                "duration": req.duration,
                "duration_minutes": req.duration_minutes,
                "queue": True
            }]
        )
        return {"status": "success", "message": f"Thêm module '{req.module_name}' vào khóa '{req.course_name}' thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/courses/module")
def api_delete_single_module(
    plan: Optional[str] = Query(None),
    course_name: str = Query(...),
    module_name: str = Query(...),
    path: Optional[str] = Query(None)
):
    try:
        success = delete_single_module(
            plan=plan,
            course_name=course_name,
            module_name=module_name,
            path=path
        )
        if not success:
            raise HTTPException(status_code=404, detail="Không tìm thấy module để xóa.")
        return {"status": "success", "message": f"Xóa module '{module_name}' thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import Response

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

# Mount the frontend static files using absolute path
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
UPLOADS_DIR = os.path.join(FRONTEND_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


