from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import date, datetime

class ClientTestPricesBase(BaseModel):
    price: Any
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    client_id: int
    test_id: int
    id: Optional[int] = None

class ClientTestPricesCreate(ClientTestPricesBase):
    pass

class ClientTestPricesResponse(ClientTestPricesBase):
    class Config:
        from_attributes = True

class ClientsBase(BaseModel):
    client_name: str
    client_address: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    contacts: Optional[Any] = None
    id: Optional[int] = None
    gstin: Optional[str] = None

class ClientsCreate(ClientsBase):
    pass

class ClientsResponse(ClientsBase):
    class Config:
        from_attributes = True

class TestsBase(BaseModel):
    test_type: str
    materials: Optional[str] = None
    group: Optional[str] = None
    test_method_specification: Optional[str] = None
    num_days: Optional[Any] = None
    price: Optional[Any] = None
    hsn_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None

class TestsCreate(TestsBase):
    pass

class TestsResponse(TestsBase):
    class Config:
        from_attributes = True

class AppSettingsBase(BaseModel):
    setting_key: str
    setting_value: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None

class AppSettingsCreate(AppSettingsBase):
    pass

class AppSettingsResponse(AppSettingsBase):
    class Config:
        from_attributes = True

class BankAccountsBase(BaseModel):
    id: Optional[Any] = None
    bank_name: str
    bank_account_holder_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    branch_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    is_default: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class BankAccountsCreate(BankAccountsBase):
    pass

class BankAccountsResponse(BankAccountsBase):
    class Config:
        from_attributes = True

class ClientServicePricesBase(BaseModel):
    price: Any
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    client_id: int
    service_id: int
    id: Optional[int] = None

class ClientServicePricesCreate(ClientServicePricesBase):
    pass

class ClientServicePricesResponse(ClientServicePricesBase):
    class Config:
        from_attributes = True

class ServicesBase(BaseModel):
    service_type: str
    unit: Optional[str] = None
    price: Optional[Any] = None
    qty: Optional[Any] = None
    method_of_sampling: Optional[str] = None
    num_bhs: Optional[Any] = None
    measure: Optional[str] = None
    hsn_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None

class ServicesCreate(ServicesBase):
    pass

class ServicesResponse(ServicesBase):
    class Config:
        from_attributes = True

class AuditLogsBase(BaseModel):
    id: Optional[int] = None
    performed_by: Optional[int] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    action: Optional[str] = None
    details: Optional[Any] = None
    created_at: Optional[datetime] = None

class AuditLogsCreate(AuditLogsBase):
    pass

class AuditLogsResponse(AuditLogsBase):
    class Config:
        from_attributes = True

class UsersBase(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    base_salary: Optional[Any] = None
    id: Optional[int] = None
    role: str
    departments: Optional[Any] = None
    employee_id: str

class UsersCreate(UsersBase):
    pass

class UsersResponse(UsersBase):
    class Config:
        from_attributes = True

class CompanyCalendarBase(BaseModel):
    event_date: date
    event_name: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_holiday: Optional[bool] = None
    id: Optional[int] = None

class CompanyCalendarCreate(CompanyCalendarBase):
    pass

class CompanyCalendarResponse(CompanyCalendarBase):
    class Config:
        from_attributes = True

class ExpensesBase(BaseModel):
    description: str
    amount: Optional[Any] = None
    date: Optional[date] = None
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None
    created_by: int
    project_name: Optional[str] = None
    site_address: Optional[str] = None
    paid_by: Optional[str] = None

class ExpensesCreate(ExpensesBase):
    pass

class ExpensesResponse(ExpensesBase):
    class Config:
        from_attributes = True

class InquiriesBase(BaseModel):
    id: Optional[int] = None
    client_name: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    received_at: Optional[datetime] = None
    received_by: int
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class InquiriesCreate(InquiriesBase):
    pass

class InquiriesResponse(InquiriesBase):
    class Config:
        from_attributes = True

class HsnSacCodesBase(BaseModel):
    code: str
    description: str
    id: Optional[int] = None

class HsnSacCodesCreate(HsnSacCodesBase):
    pass

class HsnSacCodesResponse(HsnSacCodesBase):
    class Config:
        from_attributes = True

class JobTestsBase(BaseModel):
    category: str
    status: Optional[str] = None
    results: Optional[Any] = None
    remarks: Optional[str] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None
    job_id: int
    assigned_technician_id: int

class JobTestsCreate(JobTestsBase):
    pass

class JobTestsResponse(JobTestsBase):
    class Config:
        from_attributes = True

class JobsBase(BaseModel):
    job_code: Optional[str] = None
    project_name: str
    project_address: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    test_types: Optional[Any] = None
    work_order_id: Optional[str] = None
    id: Optional[int] = None
    client_id: int
    created_by: int
    updated_by: int

class JobsCreate(JobsBase):
    pass

class JobsResponse(JobsBase):
    class Config:
        from_attributes = True

class JobToTechniciansBase(BaseModel):
    job_id: Optional[int] = None
    technician_id: Optional[int] = None
    created_at: Optional[datetime] = None

class JobToTechniciansCreate(JobToTechniciansBase):
    pass

class JobToTechniciansResponse(JobToTechniciansBase):
    class Config:
        from_attributes = True

class DocumentsBase(BaseModel):
    quote_number: str
    document_type: str
    content: Any
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    payment_date: Optional[date] = None
    payment_mode: Optional[str] = None
    bank_details: Optional[str] = None
    id: Optional[int] = None
    created_by: int
    client_id: int
    job_id: int

class DocumentsCreate(DocumentsBase):
    pass

class DocumentsResponse(DocumentsBase):
    class Config:
        from_attributes = True

class CollectionCentersBase(BaseModel):
    name: str
    address: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None

class CollectionCentersCreate(CollectionCentersBase):
    pass

class CollectionCentersResponse(CollectionCentersBase):
    class Config:
        from_attributes = True

class MaterialSamplesBase(BaseModel):
    sample_code: str
    sample_description: Optional[str] = None
    quantity: Optional[Any] = None
    status: Optional[str] = None
    received_date: date
    received_time: Optional[Any] = None
    expected_test_days: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None
    inward_id: int
    received_by: int
    collection_center_id: int
    material_type: Optional[str] = None

class MaterialSamplesCreate(MaterialSamplesBase):
    pass

class MaterialSamplesResponse(MaterialSamplesBase):
    class Config:
        from_attributes = True

class MaterialInwardRegisterBase(BaseModel):
    job_order_no: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    po_wo_number: Optional[str] = None
    id: Optional[int] = None
    client_id: int
    created_by: int
    updated_by: int
    job_id: int

class MaterialInwardRegisterCreate(MaterialInwardRegisterBase):
    pass

class MaterialInwardRegisterResponse(MaterialInwardRegisterBase):
    class Config:
        from_attributes = True

class RequestApprovalsBase(BaseModel):
    id: Optional[int] = None
    request_type: str
    requester_id: int
    request_data: Any
    status: Optional[str] = None
    admin_remarks: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class RequestApprovalsCreate(RequestApprovalsBase):
    pass

class RequestApprovalsResponse(RequestApprovalsBase):
    class Config:
        from_attributes = True

class SamplingBase(BaseModel):
    service_type: str
    test_type: Optional[str] = None
    group: Optional[str] = None
    test_method_specification: Optional[str] = None
    unit: Optional[str] = None
    qty: Optional[Any] = None
    price: Optional[Any] = None
    hsn_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None

class SamplingCreate(SamplingBase):
    pass

class SamplingResponse(SamplingBase):
    class Config:
        from_attributes = True

class SamplingToTechnicalsBase(BaseModel):
    sampling_id: Optional[int] = None
    technical_id: Optional[int] = None
    created_at: Optional[datetime] = None

class SamplingToTechnicalsCreate(SamplingToTechnicalsBase):
    pass

class SamplingToTechnicalsResponse(SamplingToTechnicalsBase):
    class Config:
        from_attributes = True

class TechnicalsBase(BaseModel):
    text: str
    type: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None

class TechnicalsCreate(TechnicalsBase):
    pass

class TechnicalsResponse(TechnicalsBase):
    class Config:
        from_attributes = True

class ServiceUnitTypesBase(BaseModel):
    unit_type: str
    id: Optional[int] = None

class ServiceUnitTypesCreate(ServiceUnitTypesBase):
    pass

class ServiceUnitTypesResponse(ServiceUnitTypesBase):
    class Config:
        from_attributes = True

class ReportsBase(BaseModel):
    report_number: str
    content: Any
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None
    client_id: int
    created_by: int

class ReportsCreate(ReportsBase):
    pass

class ReportsResponse(ReportsBase):
    class Config:
        from_attributes = True

class SamplingToTermsConditionsBase(BaseModel):
    sampling_id: Optional[int] = None
    tc_id: Optional[int] = None
    created_at: Optional[datetime] = None

class SamplingToTermsConditionsCreate(SamplingToTermsConditionsBase):
    pass

class SamplingToTermsConditionsResponse(SamplingToTermsConditionsBase):
    class Config:
        from_attributes = True

class TermsAndConditionsBase(BaseModel):
    text: str
    type: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    id: Optional[int] = None

class TermsAndConditionsCreate(TermsAndConditionsBase):
    pass

class TermsAndConditionsResponse(TermsAndConditionsBase):
    class Config:
        from_attributes = True

class TestToTechnicalsBase(BaseModel):
    test_id: Optional[int] = None
    technical_id: Optional[int] = None
    created_at: Optional[datetime] = None

class TestToTechnicalsCreate(TestToTechnicalsBase):
    pass

class TestToTechnicalsResponse(TestToTechnicalsBase):
    class Config:
        from_attributes = True

class ServiceToTechnicalsBase(BaseModel):
    service_id: Optional[int] = None
    technical_id: Optional[int] = None
    created_at: Optional[datetime] = None

class ServiceToTechnicalsCreate(ServiceToTechnicalsBase):
    pass

class ServiceToTechnicalsResponse(ServiceToTechnicalsBase):
    class Config:
        from_attributes = True

class ServiceToTermsConditionsBase(BaseModel):
    service_id: Optional[int] = None
    tc_id: Optional[int] = None
    created_at: Optional[datetime] = None

class ServiceToTermsConditionsCreate(ServiceToTermsConditionsBase):
    pass

class ServiceToTermsConditionsResponse(ServiceToTermsConditionsBase):
    class Config:
        from_attributes = True

class TechnicianCapabilitiesBase(BaseModel):
    category: str
    created_at: Optional[datetime] = None
    id: Optional[int] = None
    user_id: int

class TechnicianCapabilitiesCreate(TechnicianCapabilitiesBase):
    pass

class TechnicianCapabilitiesResponse(TechnicianCapabilitiesBase):
    class Config:
        from_attributes = True

class TestToTermsConditionsBase(BaseModel):
    test_id: Optional[int] = None
    tc_id: Optional[int] = None
    created_at: Optional[datetime] = None

class TestToTermsConditionsCreate(TestToTermsConditionsBase):
    pass

class TestToTermsConditionsResponse(TestToTermsConditionsBase):
    class Config:
        from_attributes = True

class JobWorkflowLogsBase(BaseModel):
    from_state: Optional[str] = None
    to_state: str
    action_id: Optional[str] = None
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None
    id: Optional[int] = None
    job_id: int
    performed_by: int

class JobWorkflowLogsCreate(JobWorkflowLogsBase):
    pass

class JobWorkflowLogsResponse(JobWorkflowLogsBase):
    class Config:
        from_attributes = True

class SamplingToMaterialsBase(BaseModel):
    sampling_id: Optional[int] = None
    material_id: Optional[int] = None
    created_at: Optional[datetime] = None

class SamplingToMaterialsCreate(SamplingToMaterialsBase):
    pass

class SamplingToMaterialsResponse(SamplingToMaterialsBase):
    class Config:
        from_attributes = True

