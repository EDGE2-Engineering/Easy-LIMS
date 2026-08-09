const BASE_URL = (typeof window !== 'undefined' && window.location) ? '' : (process.env.VITE_API_URL || 'http://localhost:8000');

const ENDPOINT_MAP = {
  documents: '/api/documents',
  jobs: '/api/jobs',
  expenses: '/api/expenses',
  users: '/api/users',
  clients: '/api/clients',
  request_approvals: '/api/approvals',
  audit_logs: '/api/audit-logs',
  company_calendar: '/api/calendar',
  field_tests: '/api/field-tests',
  lab_tests: '/api/lab-tests',
  sampling: '/api/sampling',
  packages: '/api/packages',
  service_unit_types: '/api/service-units',
  hsn_sac_codes: '/api/hsn-sac-codes',
  inquiries: '/api/inquiries',
  tickets: '/api/tickets',
  ticket_comments: '/api/ticket-comments',
  ticket_history: '/api/ticket-history',
  materials: '/api/materials',
  material_inward_register: '/api/material-inward',
  payment_terms: '/api/payment-terms',
  terms_and_conditions: '/api/terms-conditions',
  technicals: '/api/technicals',
  app_settings: '/api/app-settings',
  bank_accounts: '/api/bank-accounts',
  bank_statements: '/api/bank-statements',
  collection_centers: '/api/collection-centers',
  reports: '/api/reports',
  client_lab_test_prices: '/api/client-pricing/lab',
  job_to_technicians: '/api/job-technicians',
  job_workflow_logs: '/api/job-workflow-logs',
  material_samples: '/api/material-samples',
  material_form_associations: '/api/material-form-associations',
  client_options: '/api/filter-options/clients',
  user_options: '/api/filter-options/users',
};

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this._select = '*';
    this._filters = [];
    this._single = false;
    this._maybeSingle = false;
    this._mutation = null; // { type, data }
  }

  select(cols = '*') {
    this._select = cols;
    return this;
  }

  eq(col, val) {
    this._filters.push({ type: 'eq', column: col, value: val });
    return this;
  }

  neq(col, val) {
    this._filters.push({ type: 'neq', column: col, value: val });
    return this;
  }

  gt(col, val) {
    this._filters.push({ type: 'gt', column: col, value: val });
    return this;
  }

  gte(col, val) {
    this._filters.push({ type: 'gte', column: col, value: val });
    return this;
  }

  lt(col, val) {
    this._filters.push({ type: 'lt', column: col, value: val });
    return this;
  }

  lte(col, val) {
    this._filters.push({ type: 'lte', column: col, value: val });
    return this;
  }

  like(col, val) {
    this._filters.push({ type: 'like', column: col, value: val });
    return this;
  }

  ilike(col, val) {
    this._filters.push({ type: 'ilike', column: col, value: val });
    return this;
  }

  in(col, val) {
    this._filters.push({ type: 'in', column: col, value: val });
    return this;
  }

  is(col, val) {
    this._filters.push({ type: 'is', column: col, value: val });
    return this;
  }

  order(col, options = {}) {
    const ascending = options.ascending !== false;
    this._filters.push({ type: 'order', column: col, ascending });
    return this;
  }

  limit(val) {
    this._filters.push({ type: 'limit', value: val });
    return this;
  }

  range(from, to) {
    const limit = Math.max(1, to - from + 1);
    const page = Math.floor(from / limit) + 1;
    this._filters.push({ type: 'page', value: page });
    this._filters.push({ type: 'limit', value: limit });
    return this;
  }

  page(p) {
    this._filters.push({ type: 'page', value: p });
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  maybeSingle() {
    this._maybeSingle = true;
    return this;
  }

  insert(data) {
    this._mutation = { type: 'insert', data };
    return this;
  }

  update(data) {
    this._mutation = { type: 'update', data };
    return this;
  }

  delete() {
    this._mutation = { type: 'delete' };
    return this;
  }

  async then(onfulfilled, onrejected) {
    try {
      const basePath = ENDPOINT_MAP[this.table] || `/api/${this.table.replace(/_/g, '-')}`;
      const apiPath = `${BASE_URL}${basePath}`;
      let res, resData;

      if (this._mutation) {
        const mtype = this._mutation.type;
        const idFilter = this._filters.find((f) => f.type === 'eq' && f.column === 'id');
        const entityId = idFilter ? idFilter.value : null;

        if (mtype === 'insert') {
          const payload = Array.isArray(this._mutation.data) ? this._mutation.data[0] : this._mutation.data;
          res = await fetch(apiPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } else if (mtype === 'update') {
          const targetUrl = entityId ? `${apiPath}/${entityId}` : apiPath;
          res = await fetch(targetUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this._mutation.data),
          });
        } else if (mtype === 'delete') {
          const targetUrl = entityId ? `${apiPath}/${entityId}` : apiPath;
          res = await fetch(targetUrl, {
            method: 'DELETE',
          });
        }

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `HTTP error ${res.status}`);
        }

        resData = await res.json();
        const resultData = (mtype === 'insert' && Array.isArray(this._mutation.data)) ? [resData] : resData;
        const finalResult = { data: resultData, count: null, error: null };
        return onfulfilled ? onfulfilled(finalResult) : finalResult;
      }

      // Handle GET (SELECT) Queries
      const idFilter = this._filters.find((f) => f.type === 'eq' && f.column === 'id');
      if (idFilter && (this._single || this._maybeSingle)) {
        // Direct GET by ID endpoint
        res = await fetch(`${apiPath}/${idFilter.value}`);
        if (!res.ok) {
          if (res.status === 404 && this._maybeSingle) {
            const finalResult = { data: null, count: 0, error: null };
            return onfulfilled ? onfulfilled(finalResult) : finalResult;
          }
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `HTTP error ${res.status}`);
        }
        resData = await res.json();
        const finalResult = { data: resData, count: 1, error: null };
        return onfulfilled ? onfulfilled(finalResult) : finalResult;
      }

      // Build REST query parameters
      const urlParams = new URLSearchParams();
      let hasLimit = false;

      this._filters.forEach((f) => {
        if (f.type === 'eq') {
          urlParams.append(f.column, f.value);
        } else if (f.type === 'neq') {
          urlParams.append('exclude_' + f.column, f.value);
        } else if (f.type === 'in') {
          urlParams.append(f.column, Array.isArray(f.value) ? f.value.join(',') : f.value);
        } else if (f.type === 'like' || f.type === 'ilike') {
          const cleanVal = String(f.value).replace(/%/g, '');
          urlParams.append('q', cleanVal);
        } else if (f.type === 'gte') {
          if (['created_at', 'date', 'event_date'].includes(f.column)) {
            urlParams.append('date_from', f.value);
          }
        } else if (f.type === 'lte') {
          if (['created_at', 'date', 'event_date'].includes(f.column)) {
            urlParams.append('date_to', f.value);
          }
        } else if (f.type === 'page') {
          urlParams.append('page', f.value);
        } else if (f.type === 'limit') {
          hasLimit = true;
          urlParams.append('limit', f.value);
        } else if (f.type === 'order') {
          urlParams.append('sort_by', f.column);
          urlParams.append('order', f.ascending ? 'asc' : 'desc');
        }
      });

      if (!hasLimit && !this._single && !this._maybeSingle && !this.table.includes('options')) {
        urlParams.append('limit', '10000');
      }

      const queryString = urlParams.toString();
      const fetchUrl = queryString ? `${apiPath}?${queryString}` : apiPath;

      res = await fetch(fetchUrl);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `HTTP error ${res.status}`);
      }

      resData = await res.json();

      // Unwrap paginated wrapper if present (i.e. { data: [...], total: 100 })
      let finalData = (resData && typeof resData === 'object' && Array.isArray(resData.data)) ? resData.data : resData;
      const totalCount = (resData && typeof resData === 'object' && resData.total !== undefined) ? resData.total : (Array.isArray(finalData) ? finalData.length : (finalData ? 1 : 0));

      if (Array.isArray(finalData)) {
        if (this._single) {
          if (finalData.length === 0) throw new Error('JSON object requested, multiple (or no) rows returned');
          finalData = finalData[0];
        } else if (this._maybeSingle) {
          finalData = finalData.length > 0 ? finalData[0] : null;
        }
      }

      const finalResult = { data: finalData, count: totalCount, error: null };
      return onfulfilled ? onfulfilled(finalResult) : finalResult;
    } catch (err) {
      const finalResult = { data: null, count: 0, error: err };
      return onrejected ? onrejected(finalResult) : finalResult;
    }
  }
}

const apiClient = {
  from(table) {
    return new QueryBuilder(table);
  },
  channel(name) {
    return {
      on(event, filter, callback) {
        return this;
      },
      subscribe() {
        return this;
      },
    };
  },
  removeChannel(channel) {},
  api: {
    documents: {
      list: (params) => fetch(`${BASE_URL}/api/documents?` + new URLSearchParams(params)).then((r) => r.json()),
      get: (id) => fetch(`${BASE_URL}/api/documents/${id}`).then((r) => r.json()),
      create: (data) => fetch(`${BASE_URL}/api/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
      update: (id, data) => fetch(`${BASE_URL}/api/documents/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
      delete: (id) => fetch(`${BASE_URL}/api/documents/${id}`, { method: 'DELETE' }).then((r) => r.json()),
      version: (id, payload) => fetch(`${BASE_URL}/api/documents/${id}/version`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()),
    },
    jobs: {
      list: (params) => fetch(`${BASE_URL}/api/jobs?` + new URLSearchParams(params)).then((r) => r.json()),
      get: (id) => fetch(`${BASE_URL}/api/jobs/${id}`).then((r) => r.json()),
      create: (data) => fetch(`${BASE_URL}/api/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
      update: (id, data) => fetch(`${BASE_URL}/api/jobs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
      delete: (id) => fetch(`${BASE_URL}/api/jobs/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    },
    insights: () => fetch(`${BASE_URL}/api/insights`).then((r) => r.json()),
  },
};

export default apiClient;
export { apiClient };
