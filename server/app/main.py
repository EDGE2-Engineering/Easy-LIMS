from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Easy-LIMS API", version="1.0.0")

# Allow requests from the UI
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

from pydantic import BaseModel
from typing import Optional

class AuditLogCreate(BaseModel):
    performed_by: Optional[int] = None
    entity_type: str
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    action: str
    details: Optional[dict] = None

@app.post("/api/audit-logs")
def create_audit_log(log: AuditLogCreate):
    # TODO: Save to DB
    return {"status": "success", "log": log}

# We will include routers here later
from .routers import auth
app.include_router(auth.router, prefix='/api')
from .routers import client_test_prices
app.include_router(client_test_prices.router, prefix='/api')
from .routers import clients
app.include_router(clients.router, prefix='/api')
from .routers import tests
app.include_router(tests.router, prefix='/api')
from .routers import app_settings
app.include_router(app_settings.router, prefix='/api')
from .routers import bank_accounts
app.include_router(bank_accounts.router, prefix='/api')
from .routers import client_service_prices
app.include_router(client_service_prices.router, prefix='/api')
from .routers import services
app.include_router(services.router, prefix='/api')
from .routers import company_calendar
app.include_router(company_calendar.router, prefix='/api')
from .routers import expenses
app.include_router(expenses.router, prefix='/api')
from .routers import users
app.include_router(users.router, prefix='/api')
from .routers import inquiries
app.include_router(inquiries.router, prefix='/api')
from .routers import hsn_sac_codes
app.include_router(hsn_sac_codes.router, prefix='/api')
from .routers import job_tests
app.include_router(job_tests.router, prefix='/api')
from .routers import jobs
app.include_router(jobs.router, prefix='/api')
from .routers import job_to_technicians
app.include_router(job_to_technicians.router, prefix='/api')
from .routers import documents
app.include_router(documents.router, prefix='/api')
from .routers import collection_centers
app.include_router(collection_centers.router, prefix='/api')
from .routers import material_samples
app.include_router(material_samples.router, prefix='/api')
from .routers import material_inward_register
app.include_router(material_inward_register.router, prefix='/api')
from .routers import request_approvals
app.include_router(request_approvals.router, prefix='/api')
from .routers import sampling
app.include_router(sampling.router, prefix='/api')
from .routers import sampling_to_technicals
app.include_router(sampling_to_technicals.router, prefix='/api')
from .routers import technicals
app.include_router(technicals.router, prefix='/api')
from .routers import service_unit_types
app.include_router(service_unit_types.router, prefix='/api')
from .routers import reports
app.include_router(reports.router, prefix='/api')
from .routers import sampling_to_terms_conditions
app.include_router(sampling_to_terms_conditions.router, prefix='/api')
from .routers import terms_and_conditions
app.include_router(terms_and_conditions.router, prefix='/api')
from .routers import test_to_technicals
app.include_router(test_to_technicals.router, prefix='/api')
from .routers import service_to_technicals
app.include_router(service_to_technicals.router, prefix='/api')
from .routers import service_to_terms_conditions
app.include_router(service_to_terms_conditions.router, prefix='/api')
from .routers import technician_capabilities
app.include_router(technician_capabilities.router, prefix='/api')
from .routers import test_to_terms_conditions
app.include_router(test_to_terms_conditions.router, prefix='/api')
from .routers import job_workflow_logs
app.include_router(job_workflow_logs.router, prefix='/api')
from .routers import sampling_to_materials
app.include_router(sampling_to_materials.router, prefix='/api')


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

ui_dist = "/app/dist"
if os.path.exists(ui_dist):
    app.mount("/assets", StaticFiles(directory=f"{ui_dist}/assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_ui(full_path: str):
        if full_path.startswith("api/"):
            return {"error": "API route not found"}
        
        file_path = f"{ui_dist}/{full_path}"
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Fallback for React Router SPA
        return FileResponse(f"{ui_dist}/index.html")
