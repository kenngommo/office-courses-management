import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
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
    delete_enrollment
)

# Initialize sheet schema if not already present
init_db()

app = FastAPI(title="Courses Management API V5")

# Setup CORS to allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---

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

class ProgressUpdateRequest(BaseModel):
    username: str
    course_name: str
    path: Optional[str] = ""
    module_name: str
    status: str  # Not Started, In Progress, Completed
    progress_percent: float = Field(..., ge=0, le=100)
    start_date: Optional[str] = None          # YYYY-MM-DD
    completion_date: Optional[str] = None     # YYYY-MM-DD
    planned_completion_date: str              # YYYY-MM-DD

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to Courses Management API V5"}

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
def api_save_employee(req: EmployeeRequest):
    try:
        if not req.username.strip():
            raise HTTPException(status_code=400, detail="Username cannot be empty")
        save_employee(req.username.strip(), req.fullname.strip(), req.role.strip(), (req.english_name or "").strip())
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
            status=req.status,
            progress_percent=req.progress_percent,
            start_date=req.start_date,
            completion_date=req.completion_date,
            planned_completion_date=req.planned_completion_date
        )
        return {"status": "success", "message": "Successfully saved progress"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating progress: {str(e)}")

# --- Enrollment Endpoints ---

class EnrollmentRequest(BaseModel):
    username: str
    target_type: str = "plan"  # "plan" or "course"
    target_name: str           # Plan name or Course name
    course_name: Optional[str] = None # Backward compatibility
    start_date: str          # YYYY-MM-DD
    planned_end_date: str    # YYYY-MM-DD
    workweek_type: int = 5   # 5, 6, or 7
    ratio: float = 3.0       # Video learning multiplier ratio
    daily_hours: float = 2.0 # Daily study hours

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
            daily_hours=req.daily_hours
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

from fastapi.responses import Response

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

# Mount the frontend static files using absolute path
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


