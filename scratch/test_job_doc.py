import os
import sys
import dotenv

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Ensure server module can be loaded
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))

from dynamo_client import get_dynamo_service

svc = get_dynamo_service()

# 1. Test count query
count_query = """
    SELECT COUNT(*) 
    FROM jobs j 
    LEFT JOIN clients c ON j.client_id = c.id
    LEFT JOIN users u1 ON j.created_by = u1.id
"""
count_res = svc.execute_query(count_query, [])
print("Count res:", count_res)

# 2. Test data query
safe_sort = "created_at"
sort_order = "DESC"
limit_clause = "LIMIT $1 OFFSET $2"
query_params = [10, 0]

data_query = f"""
    SELECT 
        j.*,
        c.client_name AS client_name,
        u1.full_name AS created_by_name,
        u2.full_name AS updated_by_name,
        (
            SELECT ROUND(
                (
                    (
                        COALESCE((
                            SELECT SUM((item->>'total')::numeric)
                            FROM jsonb_array_elements(dq.content->'items') AS item
                        ), 0)
                    ) * (1 - COALESCE((dq.content->>'discount')::numeric, 0) / 100.0)
                ) * 1.18,
                2
            )
            FROM documents dq
            WHERE dq.job_id = j.id
              AND LOWER(dq.document_type) = 'quotation'
            ORDER BY dq.created_at DESC
            LIMIT 1
        ) AS "quotationAmount"
    FROM jobs j
    LEFT JOIN clients c ON j.client_id = c.id
    LEFT JOIN users u1 ON j.created_by = u1.id
    LEFT JOIN users u2 ON j.updated_by = u2.id
    
    ORDER BY j.{safe_sort} {sort_order}
    {limit_clause}
"""

data_res = svc.execute_query(data_query, query_params)
print("Data res count:", len(data_res))
if data_res:
    item0 = data_res[0]
    print("First item job_code:", item0.get("job_code"))
    print("First item client_name:", item0.get("client_name"))
    print("First item created_by_name:", item0.get("created_by_name"))
    print("First item quotationAmount:", item0.get("quotationAmount"))

# 3. Test get_entity("jobs", 430)
job430 = svc.get_entity("jobs", 430)
print("job430 found:", bool(job430))
if job430:
    print("job430 code:", job430.get("job_code"))
    print("job430 tests count:", len(job430.get("tests") or []))
    print("job430 logs count:", len(job430.get("logs") or []))
    print("job430 materials count:", len(job430.get("materials") or []))

