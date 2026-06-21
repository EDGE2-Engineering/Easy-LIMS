const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getHeaders = (options) => {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const buildUrl = (endpoint, options) => {
  let url = `${API_URL}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // If it's an array (for in_ filters), join with comma
        if (Array.isArray(value)) {
          searchParams.append(key, value.join(','));
        } else {
          searchParams.append(key, value);
        }
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  return url;
};

export const apiClient = {
  async get(endpoint, options = {}) {
    const response = await fetch(buildUrl(endpoint, options), {
      ...options,
      headers: getHeaders(options),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP Error ${response.status}`);
    }
    return response.json();
  },

  async post(endpoint, data, options = {}) {
    const response = await fetch(buildUrl(endpoint, options), {
      ...options,
      method: 'POST',
      headers: getHeaders(options),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP Error ${response.status}`);
    }
    return response.json();
  },

  async put(endpoint, data, options = {}) {
    const response = await fetch(buildUrl(endpoint, options), {
      ...options,
      method: 'PUT',
      headers: getHeaders(options),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP Error ${response.status}`);
    }
    return response.json();
  },

  async delete(endpoint, options = {}) {
    const response = await fetch(buildUrl(endpoint, options), {
      ...options,
      method: 'DELETE',
      headers: getHeaders(options),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP Error ${response.status}`);
    }
    return response.json();
  },
};

export default apiClient;
