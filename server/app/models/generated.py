from sqlalchemy import create_engine
import os
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@db:5432/postgres')
engine = create_engine(DATABASE_URL)
from sqlalchemy import Column, Integer, String, Boolean, Float, Date, DateTime, JSON, ForeignKey, BigInteger, Text
from ..database import Base

class ClientTestPrices(Base):
    __tablename__ = 'client_test_prices'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Clients(Base):
    __tablename__ = 'clients'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Tests(Base):
    __tablename__ = 'tests'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class AppSettings(Base):
    __tablename__ = 'app_settings'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class BankAccounts(Base):
    __tablename__ = 'bank_accounts'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class ClientServicePrices(Base):
    __tablename__ = 'client_service_prices'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Services(Base):
    __tablename__ = 'services'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class AuditLogs(Base):
    __tablename__ = 'audit_logs'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Users(Base):
    __tablename__ = 'users'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class CompanyCalendar(Base):
    __tablename__ = 'company_calendar'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Expenses(Base):
    __tablename__ = 'expenses'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Inquiries(Base):
    __tablename__ = 'inquiries'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class HsnSacCodes(Base):
    __tablename__ = 'hsn_sac_codes'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class JobTests(Base):
    __tablename__ = 'job_tests'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Jobs(Base):
    __tablename__ = 'jobs'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class JobToTechnicians(Base):
    __tablename__ = 'job_to_technicians'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Documents(Base):
    __tablename__ = 'documents'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class CollectionCenters(Base):
    __tablename__ = 'collection_centers'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class MaterialSamples(Base):
    __tablename__ = 'material_samples'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class MaterialInwardRegister(Base):
    __tablename__ = 'material_inward_register'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class RequestApprovals(Base):
    __tablename__ = 'request_approvals'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Sampling(Base):
    __tablename__ = 'sampling'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class SamplingToTechnicals(Base):
    __tablename__ = 'sampling_to_technicals'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Technicals(Base):
    __tablename__ = 'technicals'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class ServiceUnitTypes(Base):
    __tablename__ = 'service_unit_types'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class Reports(Base):
    __tablename__ = 'reports'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class SamplingToTermsConditions(Base):
    __tablename__ = 'sampling_to_terms_conditions'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class TermsAndConditions(Base):
    __tablename__ = 'terms_and_conditions'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class TestToTechnicals(Base):
    __tablename__ = 'test_to_technicals'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class ServiceToTechnicals(Base):
    __tablename__ = 'service_to_technicals'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class ServiceToTermsConditions(Base):
    __tablename__ = 'service_to_terms_conditions'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class TechnicianCapabilities(Base):
    __tablename__ = 'technician_capabilities'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class TestToTermsConditions(Base):
    __tablename__ = 'test_to_terms_conditions'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class JobWorkflowLogs(Base):
    __tablename__ = 'job_workflow_logs'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

class SamplingToMaterials(Base):
    __tablename__ = 'sampling_to_materials'
    __table_args__ = {'schema': 'public', 'extend_existing': True, 'autoload_with': engine}

