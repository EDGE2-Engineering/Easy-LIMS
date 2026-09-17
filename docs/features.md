# Easy-LIMS™ Product Documentation & Features Reference Manual

> **Enterprise-Grade Laboratory Information Management System (LIMS)**  
> *Engineered for Geotechnical, Civil, Environmental, Chemical, and Material Testing Laboratories.*

---

## Table of Contents

1. [Executive Product Overview](#1-executive-product-overview)
2. [Role-Based Access Control (RBAC) & Security Architecture](#2-role-based-access-control-rbac--security-architecture)
   - 2.1 [User Roles & Functional Responsibilities](#21-user-roles--functional-responsibilities)
   - 2.2 [Permissions Matrix](#22-permissions-matrix)
   - 2.3 [Security, Session Management & Audit Trails](#23-security-session-management--audit-trails)
3. [End-to-End Testing & Job Lifecycle (16-Stage Workflow)](#3-end-to-end-testing--job-lifecycle-16-stage-workflow)
   - 3.1 [Stage-by-Stage Workflow Breakdown](#31-stage-by-stage-workflow-breakdown)
   - 3.2 [Process Flow Architecture Diagram](#32-process-flow-architecture-diagram)
4. [Role-Specific Dashboards & Workspaces](#4-role-specific-dashboards--workspaces)
   - 4.1 [Executive & Administrator Dashboard](#41-executive--administrator-dashboard)
   - 4.2 [Test Engineer / Analyst Dashboard](#42-test-engineer--analyst-dashboard)
   - 4.3 [Lab Technician Dashboard](#43-lab-technician-dashboard)
   - 4.4 [Material Receiving Officer (MRO) Dashboard](#44-material-receiving-officer-mro-dashboard)
   - 4.5 [Accounts & Finance Dashboard](#45-accounts--finance-dashboard)
   - 4.6 [Human Resources (HR) Dashboard](#46-human-resources-hr-dashboard)
5. [Sample Reception & Material Inwarding (MRO Module)](#5-sample-reception--material-inwarding-mro-module)
   - 5.1 [Material Inward Register & Sample Tagging](#51-material-inward-register--sample-tagging)
   - 5.2 [Job Card cum Result Sheet Generation](#52-job-card-cum-result-sheet-generation)
   - 5.3 [Departmental Sample Dispatch](#53-departmental-sample-dispatch)
6. [Comprehensive Geotechnical & Laboratory Testing Suite](#6-comprehensive-geotechnical--laboratory-testing-suite)
   - 6.1 [Geotechnical Soil & Rock Calculation Engine](#61-geotechnical-soil--rock-calculation-engine)
   - 6.2 [Interactive Test Modals & Mathematical Formulations](#62-interactive-test-modals--mathematical-formulations)
   - 6.3 [Borehole Stratification & SPT Correction Analysis](#63-borehole-stratification--spt-correction-analysis)
   - 6.4 [Safe Bearing Capacity (SBC) Calculations & Cross-Section Visualizer](#64-safe-bearing-capacity-sbc-calculations--cross-section-visualizer)
7. [Document Generation, Invoicing & Quotation Engine](#7-document-generation-invoicing--quotation-engine)
   - 7.1 [Document Lifecycle & Multi-Type Support](#71-document-lifecycle--multi-type-support)
   - 7.2 [Dynamic Pricing, Packages & GST Engine](#72-dynamic-pricing-packages--gst-engine)
   - 7.3 [NABL/ISO Test Report Publishing & QR Digital Signing](#73-nabliso-test-report-publishing--qr-digital-signing)
8. [Human Resources & Workforce Management](#8-human-resources--workforce-management)
   - 8.1 [Leave Applications & Multi-Tier Approvals](#81-leave-applications--multi-tier-approvals)
   - 8.2 [Company Calendar & Roster Management](#82-company-calendar--roster-management)
   - 8.3 [Technician Capability & Competency Matrix](#83-technician-capability--competency-matrix)
9. [Financial Accounting, Banking & Expense Tracking](#9-financial-accounting-banking--expense-tracking)
   - 9.1 [Expense Logging & Receipt Management](#91-expense-logging--receipt-management)
   - 9.2 [Bank Statement Parsing & Automated Reconciliation](#92-bank-statement-parsing--automated-reconciliation)
   - 9.3 [Vendors, Subcontractors & Supplier Directory](#93-vendors-subcontractors--supplier-directory)
10. [Internal Ticketing & Operational Support System](#10-internal-ticketing--operational-support-system)
11. [Client Management & Pricing Master](#11-client-management--pricing-master)
12. [Broadcast Emailing & Communication Engine](#12-broadcast-emailing--communication-engine)
13. [System Administration & Master Data Settings](#13-system-administration--master-data-settings)

---

## 1. Executive Product Overview

**Easy-LIMS™** is a comprehensive, cloud-native Laboratory Information Management System built to streamline laboratory operations, enforce rigorous quality control standards (compliant with **ISO/IEC 17025** and **NABL** testing norms), automate complex civil/geotechnical calculations, and manage end-to-end commercial billing and customer delivery.

### Key Capabilities at a Glance:
- **Zero-Data-Loss Inwarding**: Instant tracking of incoming physical samples with automated Unified Identification Numbers (UIN) and digital Job Cards.
- **Deep Geotechnical Engineering Engine**: Built-in automated computation for Grain Size Sieve Analysis, Atterberg Limits, Standard/Modified Proctor Compaction, Lab California Bearing Ratio (CBR), Rock Unconfined Compressive Strength (UCS), Point Load Strength Index, and IS 6403 / Hansen / Meyerhof Safe Bearing Capacity (SBC) calculations.
- **16-Stage Workflow State Machine**: Strict step-by-step gatekeeping from initial Quotation through Testing, Quality Verification, Technical Review, Invoicing, Payment Confirmation, and Release of Signed Reports.
- **Enterprise Financials**: Automated GST compliance (CGST/SGST/IGST), HSN/SAC code tracking, proforma & tax invoice generation, expense tracking, and bank statement parsing.
- **Human Capital & Capability Tracking**: Employee leave workflows, technician capability-to-test mapping, and team availability calendars.
- **Complete Audit Trail**: Immutable logging of every system transaction, state transition, and user action for regulatory audits.

---

## 2. Role-Based Access Control (RBAC) & Security Architecture

Easy-LIMS incorporates a strict Role-Based Access Control (RBAC) system. Every user account is assigned a primary role and mapped to one or more operational departments.

### 2.1 User Roles & Functional Responsibilities

| Role Identifier | Role Title | Primary Functional Responsibilities |
| :--- | :--- | :--- |
| `superadmin` | **Super Administrator** | Global authority. Full read/write access across all system modules, organization configurations, user provisioning, bank reconciliation, and security settings. |
| `admin` | **Administrator** | Executive lab operations, job management, technician assignments, test result review/rejection, report digital authorization, client pricing, and billing oversight. |
| `analyst` | **Test Engineer / Senior Analyst** | Review of raw test data entered by technicians, calculation verification, quality assurance sign-offs, bearing capacity analysis, and technical report authoring. |
| `technician` | **Lab Technician** | Sample testing execution, raw measurement data entry into test modals (e.g., dial readings, weights, sieve masses), and submission of completed tests for review. |
| `mro` | **Material Receiving Officer** | Physical sample reception, condition-on-receipt documentation, Job Order / UIN tagging, sample storage allocation, and client directory maintenance. |
| `accounts` | **Accounts Officer** | Financial management, tax invoice generation, proforma billing, payment reconciliation, expense tracking, receipt logging, and report release upon payment clearance. |
| `human_resource` | **Human Resource Officer** | Employee onboarding, attendance monitoring, leave approvals, company calendar management, and workforce utilization tracking. |

---

### 2.2 Permissions Matrix

The table below details module access and functional privileges across user roles:

| Module / Feature Area | Super Admin | Admin | Analyst | Technician | MRO | Accounts | HR |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Executive Dashboard** |  Full |  Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Role-Specific Dashboard** | — | — |  Analyst |  Tech |  MRO |  Accounts |  HR |
| **Jobs Manager** |  Full |  Full |  Assigned |  Assigned |  Inward/View | ❌ Read Only | ❌ |
| **Material Inwarding** |  Full |  Full |  View |  View |  Full | ❌ | ❌ |
| **Technician Assignment** |  Full |  Full | ❌ | ❌ |  Full | ❌ | ❌ |
| **Raw Test Data Entry** |  Full |  Full |  Full |  Full | ❌ | ❌ | ❌ |
| **Test Verification / Rejection**|  Full |  Full |  Full | ❌ | ❌ | ❌ | ❌ |
| **Report Generation & Sign-Off**|  Full |  Full |  Draft/Review| ❌ | ❌ | ❌ | ❌ |
| **Document Generation (Quotes)**|  Full |  Full | ❌ | ❌ |  Create | ❌ | ❌ |
| **Document Generation (Invoices)**| Full |  Full | ❌ | ❌ | ❌ |  Full | ❌ |
| **Report Release Gate** |  Full |  Full | ❌ | ❌ | ❌ |  Full | ❌ |
| **Expenses Management** |  Full |  Full | ❌ | ❌ | ❌ |  Full | ❌ |
| **Bank Statements & Rec.** |  Full |  Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Leave Approval Queue** |  Full |  Full | ❌ | ❌ | ❌ | ❌ |  Full |
| **My Leaves (Apply)** |  Full |  Full |  Full |  Full |  Full |  Full |  Full |
| **Internal Tickets Manager** |  Full |  Full |  Full |  Full |  Full |  Full |  Full |
| **Email Campaigns & Logs** |  Full |  Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Bearing Capacity Calc Master** | Full |  Full |  Full | ❌ | ❌ | ❌ | ❌ |
| **System Settings & Masters** |  Full |  Full | ❌ | ❌ | ❌ | ❌ |  Org Info |

---

### 2.3 Security, Session Management & Audit Trails

1. **Inactivity Auto-Logout**: To protect sensitive testing data on shared laboratory terminals, user sessions automatically expire after **5 minutes of inactivity**. Cross-tab activity monitoring synchronizes idle state across multiple browser windows.
2. **Server-Side Token Revocation**: Secure logout invalidates authorization tokens immediately in both local storage and database session tables.
3. **Audit Logging Engine (`audit_logs`)**: Every critical action (login/logout, test result update, invoice generation, status override, leave approval) is automatically captured with:
   - User ID & Full Name
   - Exact Action & Entity Name
   - Entity ID & Description
   - Complete Before/After JSON payload diff
   - Client IP Address & Timestamp
4. **Real-time Security Alerts**: Integrated Telegram Bot notifier transmits instant alerts on login events, critical workflow status progressions, and system overrides.

---

## 3. End-to-End Testing & Job Lifecycle (16-Stage Workflow)

The core testing process in Easy-LIMS is governed by a strict 16-stage state machine that prevents premature report release, unverified data submission, or billing discrepancies.

```
 [1. JOB_CREATED] ──► [2. QUOTATION_SENT] ──► [3. WORK_ORDER_RECEIVED] ──► [4. MATERIAL_RECEIVED]
                                                                                   │
 ┌─────────────────────────────────────────────────────────────────────────────────┘
 ▼
 [5. TECHNICIANS_ASSIGNED] ──► [6. UNDER_TESTING] ──► [7. TEST_DATA_UNDER_REVIEW]
                                                              │            │ (Rejected)
                                               (Approved)     ▼            ▼
 [9. REPORT_GENERATED] ◄── [8. DATA_VERIFIED] ◄───────────────┘     [Re-Test / Edit]
       │
       ▼
 [10. REPORT_UNDER_REVIEW] ──► [11. REPORT_SIGNED] ──► [12. INVOICE_GENERATED]
                                                             │
 ┌───────────────────────────────────────────────────────────┘
 ▼
 [13. AWAITING_PAYMENT] ──► [14. PAYMENT_RECEIVED] ──► [15. REPORT_RELEASED] ──► [16. JOB_COMPLETE]
```

### 3.1 Stage-by-Stage Workflow Breakdown

1. **`JOB_CREATED`**: Job container initialized. Client selection, project location, sample category, and expected test types are configured.
2. **`QUOTATION_SENT`**: Formal quotation generated with itemized testing rates, sampling charges, GST, and terms. Transmitted to client.
3. **`WORK_ORDER_RECEIVED`**: Client acceptance recorded. Client Purchase Order / Work Order number and formal authorization document attached.
4. **`MATERIAL_RECEIVED`**: Physical samples arrive at laboratory. MRO logs sample condition, tags unique UIN barcode labels, and confirms inward register.
5. **`TECHNICIANS_ASSIGNED`**: Department leads or administrators assign qualified technicians based on test capabilities and workload.
6. **`UNDER_TESTING`**: Lab technicians perform experimental procedures, recording raw observations and measurements in dedicated test modals.
7. **`TEST_DATA_UNDER_REVIEW`**: Technicians submit completed data sheets. Testing moves to the quality assurance queue.
8. **`DATA_VERIFIED`**: Test Engineer / Analyst verifies calculations, moisture curves, sieve graphs, and standard code compliance. *(If discrepancies exist, status is sent back to `UNDER_TESTING`)*.
9. **`REPORT_GENERATED`**: Automated test report compiled containing project details, methodology, IS code references, tabular test values, and auto-generated charts.
10. **`REPORT_UNDER_REVIEW`**: Technical manager conducts final review of compiled documentation.
11. **`REPORT_SIGNED`**: Authorized signatory applies digital certificate/signature and unique report identification (ULR/Report No).
12. **`INVOICE_GENERATED`**: Accounts department generates GST Tax Invoice based on completed work items.
13. **`AWAITING_PAYMENT`**: Invoice transmitted to client; payment terms clock initiates.
14. **`PAYMENT_RECEIVED`**: Accounts logs receipt of wire transfer, cheque, or online payment against the invoice.
15. **`REPORT_RELEASED`**: System unlocks official signed PDF reports with watermarks removed for client download/dispatch.
16. **`JOB_COMPLETE`**: Job closed and permanently archived in searchable historical records.

---

## 4. Role-Specific Dashboards & Workspaces

Easy-LIMS delivers tailored interfaces matching each user's daily workflow.

### 4.1 Executive & Administrator Dashboard
- **Financial & Operational KPIs**: Real-time monthly revenue, outstanding receivables, gross billings, and expense burn rate.
- **Workflow Pipeline Analytics**: Visual status distribution of all active laboratory jobs.
- **Testing Throughput**: Real-time count of samples currently under testing, awaiting review, and pending report release.
- **Workforce Availability**: Daily team attendance widget showing active, on-leave, and field-deployed personnel.

### 4.2 Test Engineer / Analyst Dashboard
- **Verification Queue**: Filterable list of jobs awaiting technical review and data sign-off.
- **Engineering Workbench**: Quick access to Soil/Rock Bearing Capacity computation modules.
- **Active Technical Tickets**: Bug reports, calibration requests, and data queries assigned to the analyst.

### 4.3 Lab Technician Dashboard
- **Assigned Job Queue**: List of active jobs where the technician is designated to perform specific tests.
- **Direct Test Launch**: 1-click launch into material-specific test entry sheets (Moisture, Atterberg, Compaction, Sieve, CBR, UCS).
- **Personal Leave & Ticket Tracker**: Overview of personal leave balances and task assignments.

### 4.4 Material Receiving Officer (MRO) Dashboard
- **Inward Register Queue**: Log of all recent consignments, physical sample packages, and courier deliveries.
- **Pending Physical Reception**: Pre-booked jobs awaiting physical sample arrival at the receiving dock.
- **Quick Sample Inwarding**: Rapid multi-sample registration tool with barcode/UIN generation.

### 4.5 Accounts & Finance Dashboard
- **Billing Summary**: Real-time counts and totals for Draft Quotes, Proforma Invoices, and Tax Invoices.
- **Aging Receivables**: List of unpaid invoices with due dates, payment follow-up status, and client contact information.
- **Monthly Expenditure Monitor**: Categorized overview of lab operational and capital expenses.

### 4.6 Human Resources (HR) Dashboard
- **Active Employee Directory**: Roster of laboratory personnel by department and role.
- **Pending Leave Approvals**: Actionable approval queue for employee leave requests with balance impact previews.
- **Live Team Calendar**: Consolidated view of public holidays, scheduled leaves, and technician field schedules.

---

## 5. Sample Reception & Material Inwarding (MRO Module)

The Material Inwarding module establishes physical chain-of-custody for all laboratory samples.

```
Client Delivery / Courier
        │
        ▼
[MRO Inward Register] ──► Auto-Generate Unified Identification Number (UIN)
        │
        ├─► Capture Sample Condition (Intact, Disturbed, Undisturbed, Core Box)
        ├─► Assign Storage Rack / Bin Location
        ├─► Log Witness / Sampling Details (Borehole No, Depth, Sampling Date)
        │
        ▼
[Print Job Card cum Result Sheet] ──► Physical Dispatch to Chemical / Physical / Soil Lab
```

### 5.1 Material Inward Register & Sample Tagging
- **Auto-Generated Job Order Numbers**: Configurable sequential numbering formats (e.g., `JO/2026-27/00430`).
- **Comprehensive Sample Metadata**:
  - Sample Mark / Borehole ID / Chainage / Location
  - Depth Range ($m$ to $m$)
  - Physical Description (e.g., *Greyish fine-grained dense SAND with traces of gravel*)
  - Sampling Type: Undisturbed Core (UDS), Disturbed (DS), Core Run Box, Water/Slurry container
  - Condition on Receipt: Good / Damaged / Partially Saturated / Disturbed
  - Storage Location: Rack, Bin, Cold Storage, or Curing Tank ID
- **Bulk Sample Import**: Register multi-sample borehole sequences (e.g., 20 samples from a single drill hole) in a single unified entry.

### 5.2 Job Card cum Result Sheet Generation
- One-click printing of official internal **Job Card cum Result Sheets** carrying the UIN barcode, required standard test specifications, and designated blank observation tables for manual workbench recording prior to digital entry.

---

## 6. Comprehensive Geotechnical & Laboratory Testing Suite

Easy-LIMS features an integrated, high-precision mathematical engine covering all major Indian Standard (IS), ASTM, and British Standard (BS) geotechnical testing procedures.

---

### 6.1 Geotechnical Soil & Rock Calculation Engine

The system supports automatic validation, cross-check alerts, and dynamic graph plotting across all standard laboratory tests:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       EASY-LIMS GEOTECHNICAL ENGINE                          │
├──────────────────────┬──────────────────────┬────────────────────────────────┤
│ Physical & Index     │ Strength & Bearing   │ Compaction & Consolidation     │
├──────────────────────┼──────────────────────┼────────────────────────────────┤
│ • Moisture Content   │ • Lab CBR (Soaked)   │ • Light Compaction (Std Proc)  │
│ • Specific Gravity   │ • Rock UCS (Core)    │ • Heavy Compaction (Mod Proc)  │
│ • Atterberg Limits   │ • Point Load Index   │ • Compaction / ZAV Curves      │
│ • Sieve Analysis     │ • Soil SBC (IS 6403) │ • Swelling Pressure & FSI      │
│ • Shrinkage Limit    │ • Rock SBC (IS 12070)│ • Direct Shear / Triaxial      │
└──────────────────────┴──────────────────────┴────────────────────────────────┘
```

---

### 6.2 Interactive Test Modals & Mathematical Formulations

#### 1. Moisture Content (IS 2720 Part 2 / ASTM D2216)
- **Methodology**: Oven-drying method at $105^\circ\text{C}\text{--}110^\circ\text{C}$.
- **Formulation**:
  $$w (\%) = \frac{M_2 - M_3}{M_3 - M_1} \times 100$$
  *Where $M_1 = \text{Tare container mass}$, $M_2 = \text{Container + Wet Soil}$, $M_3 = \text{Container + Dry Soil}$.*
- Multi-trial averaging with automatic outlier detection.

#### 2. Specific Gravity ($G_s$) (IS 2720 Part 3 / ASTM D854)
- **Methodology**: Density bottle (50 ml) or Pycnometer method with water bath temperature correction.
- **Formulation**:
  $$G_s = \frac{M_2 - M_1}{(M_4 - M_1) - (M_3 - M_2)} \times K$$
  *Where $K$ is the temperature correction factor normalized to $27^\circ\text{C}$.*

#### 3. Sieve Analysis & Grain Size Distribution (IS 2720 Part 4 / ASTM D422)
- **Automated Calculations**:
  - Percentage retained on each sieve: $\% R_i = \frac{m_i}{M_{\text{total}}} \times 100$
  - Cumulative percentage retained: $\% CR_i = \sum_{k=1}^i \% R_k$
  - Percentage passing / finer: $\% N_i = 100 - \% CR_i$
  - Fractions computed: **Gravel (>4.75mm)**, **Sand (0.075 to 4.75mm)**, **Silt & Clay (<0.075mm)**.
- **Soil Classification Metrics**:
  - Effective grain sizes: $D_{10}, D_{30}, D_{60}$ (interpolated from semi-log curve).
  - Uniformity Coefficient: $C_u = \frac{D_{60}}{D_{10}}$
  - Coefficient of Curvature: $C_c = \frac{(D_{30})^2}{D_{10} \times D_{60}}$
  - Automatic IS / USCS Soil Classification (e.g., `GW`, `GP`, `SW`, `SP`, `SM`, `SC`, `CL`, `CH`).

#### 4. Atterberg Limits (Liquid Limit, Plastic Limit, Plasticity Index) (IS 2720 Part 5)
- **Liquid Limit ($LL$)**:
  - *Casagrande Method*: Multi-trial log(blows) vs. moisture content regression line to 25 blows.
  - *Cone Penetrometer Method*: Multi-trial depth of cone penetration (mm) vs. moisture content; interpolated at exactly 20 mm penetration.
- **Plastic Limit ($PL$)**: Average of $3\text{ mm}$ thread crumb tests.
- **Plasticity Index ($PI$)**:
  $$PI = LL - PL$$
- **A-Line Comparison (IS 1498)**:
  $$PI_{\text{A-Line}} = 0.73 \times (LL - 20)$$
  *Automatic categorization into Organic vs Inorganic Clays/Silts and Low/Intermediate/High compressibility (`CL`, `CI`, `CH`, `ML`, `MI`, `MH`).*

#### 5. Free Swell Index (FSI) (IS 2720 Part 40)
- Differential volume comparison in kerosene (non-polar) vs. distilled water after 24 hours.
- Formulation:
  $$\text{FSI} (\%) = \frac{V_d - V_k}{V_k} \times 100$$
  *Automated degree of expansiveness classification: Low (<20%), Moderate (20–35%), High (35–50%), Very High (>50%).*

#### 6. Shrinkage Limit (IS 2720 Part 6)
- Mercury/water displacement method to determine soil volume at minimum moisture boundary.
- Computes Shrinkage Ratio ($SR$), Volumetric Shrinkage ($VS$), and Linear Shrinkage ($LS$).

#### 7. Light & Heavy Compaction / Proctor Testing (IS 2720 Part 7 & Part 8)
- **Light Compaction (Standard Proctor)**: $2.6\text{ kg}$ rammer, $310\text{ mm}$ drop, 3 layers.
- **Heavy Compaction (Modified Proctor)**: $4.9\text{ kg}$ rammer, $450\text{ mm}$ drop, 5 layers.
- **Dynamic Charting**:
  - Automatic polynomial regression curve fitting for Dry Density ($\gamma_d$) vs. Moisture Content ($w$).
  - Determines **Optimum Moisture Content (OMC)** and **Maximum Dry Density (MDD)**.
  - Zero Air Voids (ZAV) theoretical saturation curve overlay based on $G_s$.

#### 8. California Bearing Ratio (Lab CBR) (IS 2720 Part 16 / ASTM D1883)
- Tested at standard penetration rates ($1.25\text{ mm/min}$) on soaked (96-hour) or unsoaked specimens.
- Multi-point load-penetration curve plotting with zero-correction tangent adjustment.
- Automated CBR evaluation at $2.5\text{ mm}$ (standard load $1370\text{ kg}$) and $5.0\text{ mm}$ (standard load $2055\text{ kg}$).
- Surcharge weight recording and swelling percentage during soaking.

#### 9. Point Load Strength Index ($I_s$) (IS 8764 / ASTM D5731)
- Diametral, axial, block, and irregular rock core specimens.
- Uncorrected point load strength: $I_s = \frac{P}{D_e^2}$
- Size-corrected index for $50\text{ mm}$ diameter cores:
  $$I_{s(50)} = I_s \times \left(\frac{D_e}{50}\right)^{0.45}$$
- UCS correlation estimate: $\text{Estimated } UCS \approx 20\text{ to }24 \times I_{s(50)}$.

#### 10. Rock Unconfined Compressive Strength (UCS) (IS 9143 / ASTM D7012)
- Cylindrical rock core specimen with length-to-diameter ratio ($L/D$).
- Measured peak compressive load at axial failure ($P$).
- $L/D$ Ratio correction factor:
  $$C = \frac{0.88}{0.77 + 0.23(D / L)}$$
- Corrected Uniaxial Compressive Strength:
  $$\sigma_c (\text{UCS}) = \frac{P}{A} \times C \quad (\text{MPa / N/mm}^2)$$
- Failure mode logging: Axial splitting, shearing, cone-and-split, crumbling.

---

### 6.3 Borehole Stratification & SPT Correction Analysis

Easy-LIMS includes a full-fledged geotechnical subsurface profiling module:
- **Observed SPT N-Values ($N_{\text{obs}}$)**: Recorded at specified depth intervals ($1.5\text{ m}, 3.0\text{ m}, \dots$).
- **Overburden Pressure Correction ($C_N$)**:
  - Interpolated from the system overburden table (IS 2131 / Liao & Whitman / Peck-Hanson-Thornburn).
  - Enforces IS code cap: $C_N = 0.75$ when effective overburden pressure $\sigma_v' > 200\text{ kN/m}^2$.
  - Corrected value: $N' = C_N \times N_{\text{obs}}$.
- **Dilatancy / Water Table Correction ($N_{\text{cor}}$)**:
  - Applied when testing fine sands and silts below water table when $N' > 15$:
    $$N_{\text{cor}} = 15 + 0.5 \times (N' - 15)$$

---

### 6.4 Safe Bearing Capacity (SBC) Calculations & Cross-Section Visualizer

The system features an automated **Geotechnical Bearing Capacity Engine** for both soil and rock foundations per **IS 6403** and **IS 12070**.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SAFE BEARING CAPACITY (SBC) ENGINE                        │
├──────────────────────────────────────────────────────────────────────────────┤
│  1. Shear Failure Criteria (IS 6403):                                        │
│     q_ult = c·Nc·sc·dc·ic + q·(Nq - 1)·sq·dq·iq·W' + 0.5·B·γ·Nγ·sγ·dγ·iγ·W'  │
│                                                                              │
│  2. Settlement Criteria (Permissible Settlement S_allow = 25 / 40 / 50 mm):  │
│     q_net_safe = (N_cor - 3) / [(B + 0.3) / 2B]^2 · S_allow · W'            │
│                                                                              │
│  3. Rock Mass Rating & IS 12070 Formulation:                                 │
│     q_safe = q_c · N_j (Based on Core Recovery, RQD, and Joint Spacing)      │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Interactive Cross-Section Visualizer**: Generates dynamic graphical diagrams showing ground level, footing depth ($D_f$), footing width ($B$), water table location ($D_w$), soil strata boundaries, and calculated stress distribution bulbs.

---

## 7. Document Generation, Invoicing & Quotation Engine

Easy-LIMS features a rich, multi-tier document engine with WYSIWYG printing, PDF generation, and automated financial arithmetic.

### 7.1 Document Lifecycle & Multi-Type Support

The system handles 5 specialized commercial document types:
1. **Quotations (`Quotation`)**: Estimated pricing for requested tests, sampling logistics, and special terms.
2. **Proforma Invoices (`Proforma Invoice`)**: Advance billing raised upon work order receipt.
3. **Tax Invoices (`Tax Invoice`)**: Formal GST-compliant invoice raised upon report authorization.
4. **Delivery Challans (`Delivery Challan`)**: Physical sample or document dispatch note.
5. **Test Reports (`Test Report`)**: Technical test certificate with ULR number and digital verification.

---

### 7.2 Dynamic Pricing, Packages & GST Engine

- **Flexible Line Items**: Add field tests, lab tests, borehole drilling per-meter charges, mobilized equipment, and package bundles.
- **Client-Specific Rate Lists**: System automatically overrides standard tariff rates with negotiated client price contracts when present.
- **Automated GST Taxation Engine**:
  - **Intra-State Transactions** (Matching State Code): Automatically splits tax into equal **CGST (9%)** and **SGST (9%)**.
  - **Inter-State Transactions** (Different State Codes): Automatically computes unified **IGST (18%)**.
  - Auto-lookup of mandatory SAC / HSN codes (e.g., SAC `998346` for Technical Testing and Analysis Services).
- **Rupee Words Conversion**: Automatic translation of numeric invoice totals into standard Indian English currency text (e.g., *"Rupees One Lakh Twenty-Five Thousand Four Hundred Only"*).

---

### 7.3 NABL/ISO Test Report Publishing & QR Digital Signing

- **Standardized NABL Layout**: Pre-formatted headers/footers with ISO/IEC 17025 compliance marks, laboratory accreditation numbers, discipline, group, and Unique Lab Report (ULR) serial numbers.
- **Authorized Digital Signature Blocks**: Name, designation, and encrypted signature token of the approved signatory.
- **QR Code Verification**: Every generated report embeds a scannable QR code linking to the secure server verification endpoint to authenticate original test results against tampering.

---

## 8. Human Resources & Workforce Management

Easy-LIMS incorporates a dedicated HR sub-system designed for laboratory workforce planning.

### 8.1 Leave Applications & Multi-Tier Approvals
- **Employee Leave Self-Service (`My Leaves`)**: Staff can submit leave requests specifying leave category (*Casual, Sick, Earned, Duty Leave*), full-day/half-day flag, date range, and coverage notes.
- **HR Approval Workbench (`Approvals`)**: HR and Admins can review pending leave applications with real-time visibility into the employee’s historical balance and concurrent team absences.

### 8.2 Company Calendar & Roster Management
- Integrated interactive laboratory calendar highlighting:
  - Official company and statutory public holidays.
  - Approved staff leaves and travel deployments.
  - Scheduled client witness testing sessions.

### 8.3 Technician Capability & Competency Matrix
- System maintains a verified capability registry for each lab technician:
  - Links technician profiles to certified test categories (e.g., *Soil Physical Testing, Concrete NDT, Chemical Water Analysis*).
  - Prevents assignment of unqualified staff to regulated testing procedures.

---

## 9. Financial Accounting, Banking & Expense Tracking

The Accounts module manages laboratory cash flows, operational expenses, and bank reconciliations.

### 9.1 Expense Logging & Receipt Management
- Record operational and capital expenditures:
  - Categories: *Equipment Calibration, Chemical Reagents, Consumables, Vehicle Fuel, Utilities, Maintenance, Subcontractor Testing*.
  - Upload physical receipts, invoices, and vouchers (PDF, PNG, JPEG) with built-in preview modal.
  - Multi-account tracking (Cash on Hand, Petty Cash, Corporate Bank Accounts).

### 9.2 Bank Statement Parsing & Automated Reconciliation
- **Bank Statement Upload**: Support for CSV/Excel statement imports from major commercial banks.
- **Automated Matching**: Matches statement credit entries against pending customer invoices using invoice reference numbers, amounts, and client account identifiers.
- **One-Click Settlement**: Automatically transitions invoice status from `AWAITING_PAYMENT` to `PAYMENT_RECEIVED` upon reconciliation.

### 9.3 Vendors, Subcontractors & Supplier Directory
- Complete registry of testing equipment vendors, external NABL calibration agencies, transport contractors, and consumable suppliers.
- Tracks vendor GSTIN, contact persons, payment terms, and historical expense ledgers.

---

## 10. Internal Ticketing & Operational Support System

To maintain smooth day-to-day operations and ISO 17025 continuous improvement (CAPA), Easy-LIMS includes an integrated ticketing workbench (`AdminTicketsManager`).

```
[Create Ticket] ──► Open ──► In Progress ──► Needs More Details
                                  │
      ┌───────────────────────────┴───────────────────────────┐
      ▼                                                       ▼
Needs Verification ──► Verified ──► Resolved               Deferred / Invalid
      │
      ▼
   Closed
```

- **Rich-Text TipTap Editor**: Full formatting support with bold, italics, code snippets, lists, and embedded image/file attachments.
- **Customizable Classifications**: Bug Reports, Machine Calibration, Sample Queries, Procurement Requests, IT Support.
- **Multi-Level Priority**: Low, Normal, High, Urgent.
- **Internal Discussions**: Chronological thread of comments with attachment previews.

---

## 11. Client Management & Pricing Master

- **Client Directory**: Centralized master storing company name, billing/shipping addresses, GSTIN, PAN, primary/secondary contact persons, phone numbers, and email IDs.
- **Custom Rate Card Management (`Client Pricing`)**:
  - Ability to define custom negotiated unit rates per test or service for specific enterprise clients.
  - Automatically loads discounted rates during Quotation and Invoice generation.

---

## 12. Broadcast Emailing & Communication Engine

- **Email Template Designer (`email_templates`)**: Create and maintain branded HTML email templates with dynamic placeholder variables:
  - `{{client_name}}`: Replaced with recipient company name.
  - `{{contact_person}}`: Replaced with client representative's name.
  - `{{site_name}}`: Replaced with laboratory branding name.
  - `{{job_id}}`: Replaced with relevant Job Order / Report number.
- **Broadcast Campaigns**: Filter clients by category, city, or status and transmit bulk notifications (e.g., Service Updates, Rate Revision Notices, Holiday Schedules).
- **Delivery & Transmission Logs**: Complete history of sent emails, recipient timestamps, and delivery statuses.

---

## 13. System Administration & Master Data Settings

The Administration suite provides complete autonomy over laboratory configurations without requiring source code modifications:

1. **Measurement Unit Types (`unit_types`)**: Configure system-wide units ($mm, cm, m, kg, g, kN, N/mm^2, MPa, \%, g/cc$).
2. **HSN & SAC Codes Master (`hsn_codes`)**: Maintain GST tax rates and official service accounting codes.
3. **Terms & Conditions Master (`terms`)**: Library of reusable contractual clauses categorized by document type.
4. **Technical Specifications Master (`technicals`)**: Library of national and international standard code references (e.g., `IS 2720`, `IS 456`, `IS 1892`, `ASTM D1586`, `BS 1377`).
5. **Payment Terms Master (`payment_terms`)**: Pre-configured commercial terms (e.g., *100% Advance with PO, Net 30 Days, 50% Advance & Balance against Report Release*).
6. **Materials Master (`materials`)**: Master list of testable materials (Soil, Rock, Aggregates, Cement, Concrete, Steel, Water, Bitumen).
7. **Testing Input Form Associations (`material_forms`)**: Configurable mapping engine linking material types to specific data entry forms.
8. **Collection Centers (`collection_centers`)**: Management of branch sample collection hubs, field kiosks, and regional depots.
9. **Bearing Capacity Factors Matrix (`bearing_capacity`)**: Reference tables for Terzaghi, Meyerhof, and IS 6403 bearing capacity factors ($N_c, N_q, N_\gamma$) indexed against soil internal friction angle ($\phi$).
10. **Overburden Correction Factor Table (`overburden_correction`)**: Depth and pressure correction factors for standard penetration testing.
11. **User & Identity Management (`users`)**: Provisioning user credentials, department assignments, active/deactivated toggles, and role allocations.

---

*Easy-LIMS™ — Setting the standard in modern, automated, and compliant laboratory information management.*
