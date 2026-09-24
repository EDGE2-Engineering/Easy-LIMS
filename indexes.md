# DynamoDB Indexes Guide for Easy-LIMS

This guide provides step-by-step instructions to create **Global Secondary Indexes (GSIs)** on your AWS DynamoDB table `easy-lims`. 

Adding these indexes transforms slow full-table scans (taking 3–8 seconds across 12,000+ items) into sub-20ms O(1) partition queries, dramatically improving application performance and concurrency.

---

## 1. Index Architecture Overview

| Index Name | Partition Key | Sort Key | Projection | Primary Use Case | Expected Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GSI1`** *(Crucial)* | `GSI1PK` (String) | `GSI1SK` (String) | `ALL` | Listing entities sorted by date (`jobs`, `documents`, `clients`, etc.) | **~10ms – 25ms** |
| **`GSI2`** *(Recommended)* | `GSI2PK` (String) | `GSI2SK` (String) | `ALL` | Relational lookups (e.g., all tests for a job, all tickets for a client) | **~10ms – 25ms** |

---

## 2. Index 1: Entity & Date Ordering (`GSI1`) — Highest Priority

### Why is this needed?
Without this index, listing endpoints (e.g. `GET /api/jobs`, `GET /api/documents`, `GET /api/clients`) must scan the **entire 12,500+ item table** across the network just to find the relevant rows. With `GSI1`, DynamoDB queries only the items for that specific entity type, pre-sorted chronologically.

### Key Schema:
* **Index Name**: `GSI1`
* **Partition Key**: `GSI1PK` (Type: **String**)
  * *Value pattern*: `ENTITY#jobs`, `ENTITY#documents`, `ENTITY#clients`, `ENTITY#bank_statements`
* **Sort Key**: `GSI1SK` (Type: **String**)
  * *Value pattern*: Standardized ISO 8601 timestamp (e.g., `2026-09-24T12:00:00Z`)
* **Attribute Projections**: **All attributes**

---

## 3. Index 2: Parent-Child Inverted Index (`GSI2`) — Recommended

### Why is this needed?
Allows querying child entities directly by parent ID without scanning or filtering through unrelated records.
- All tests belonging to a specific job (`job_tests`)
- All tickets belonging to a specific client (`tickets`)
- All attachments belonging to a ticket (`tickets_to_attachments`)

### Key Schema:
* **Index Name**: `GSI2`
* **Partition Key**: `GSI2PK` (Type: **String**)
  * *Value pattern*: `JOB#<job_id>`, `CLIENT#<client_id>`, `ACCOUNT#<account_id>`
* **Sort Key**: `GSI2SK` (Type: **String**)
  * *Value pattern*: `TEST#<test_id>`, `TICKET#<ticket_id>`, `DATE#<iso_date>`
* **Attribute Projections**: **All attributes**

---

## 4. How to Create the Indexes in AWS Console

### Step-by-Step Instructions:

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/dynamodb/).
2. Navigate to **Amazon DynamoDB** -> **Tables** (left sidebar).
3. Click on your table: **`easy-lims`**.
4. Select the **Indexes** tab (located between *Overview* and *Monitor*).
5. Click the orange **Create index** button.
6. Configure **GSI1**:
   - **Partition key**: Enter `GSI1PK` and select **String**.
   - **Sort key**: Enter `GSI1SK` and select **String**.
   - **Index name**: Enter `GSI1` (automatically populated).
   - **Attribute projections**: Select **All**.
7. Click **Create index**.
8. *(Optional)* Repeat steps 5–7 for **GSI2** (`GSI2PK` and `GSI2SK` as Partition and Sort keys).

> [!NOTE]
> DynamoDB will build the index in the background. It will show a status of **Creating** for approximately 1 to 3 minutes before transitioning to **Active**. During this time, the table remains fully operational.

---

## 5. Alternative: Create Indexes via AWS CLI

If you have the AWS CLI configured with your credentials, you can run this command directly:

### Create `GSI1`:
```bash
aws dynamodb update-table \
    --table-name easy-lims \
    --region us-east-1 \
    --attribute-definitions \
        AttributeName=GSI1PK,AttributeType=S \
        AttributeName=GSI1SK,AttributeType=S \
    --global-secondary-index-updates '[
        {
            "Create": {
                "IndexName": "GSI1",
                "KeySchema": [
                    {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
                ],
                "Projection": {
                    "ProjectionType": "ALL"
                }
            }
        }
    ]'
```

### Create `GSI2`:
```bash
aws dynamodb update-table \
    --table-name easy-lims \
    --region us-east-1 \
    --attribute-definitions \
        AttributeName=GSI2PK,AttributeType=S \
        AttributeName=GSI2SK,AttributeType=S \
    --global-secondary-index-updates '[
        {
            "Create": {
                "IndexName": "GSI2",
                "KeySchema": [
                    {"AttributeName": "GSI2PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI2SK", "KeyType": "RANGE"}
                ],
                "Projection": {
                    "ProjectionType": "ALL"
                }
            }
        }
    ]'
```

---

## 6. How the Application Uses These Indexes

When you write or migrate data:
- `GSI1PK` is automatically populated as `ENTITY#<table_name>` (e.g., `ENTITY#jobs`, `ENTITY#documents`).
- `GSI1SK` is automatically populated with the item's `created_at` timestamp.

When listing records:
- Instead of scanning the entire database, the application queries `GSI1PK = "ENTITY#<table_name>"` on `GSI1`.
- Items are returned immediately, sorted chronologically, in under **20 milliseconds**.
