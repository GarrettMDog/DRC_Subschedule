const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  return res.status === 204 ? null : res.json();
}

// --- Office-side calls (require an MSAL access token) ---
export const api = {
  getSubcontractors: (token) => request('/api/subcontractors', { token }),
  addSubcontractor: (token, data) => request('/api/subcontractors', { method: 'POST', body: data, token }),
  updateSubcontractor: (token, id, data) =>
    request(`/api/subcontractors/${id}`, { method: 'PUT', body: data, token }),

  getJobs: (token) => request('/api/jobs', { token }),
  addJob: (token, data) => request('/api/jobs', { method: 'POST', body: data, token }),
  updateJob: (token, id, data) => request(`/api/jobs/${id}`, { method: 'PUT', body: data, token }),

  getAssignments: (token) => request('/api/assignments', { token }),
  addAssignment: (token, data) => request('/api/assignments', { method: 'POST', body: data, token }),
  updateAssignment: (token, id, data) =>
    request(`/api/assignments/${id}`, { method: 'PUT', body: data, token }),
  cancelAssignment: (token, id) => request(`/api/assignments/${id}`, { method: 'DELETE', token }),

  getServiceAssignees: (token) => request('/api/service-assignees', { token }),
  addServiceAssignee: (token, data) => request('/api/service-assignees', { method: 'POST', body: data, token }),
  updateServiceAssignee: (token, id, data) =>
    request(`/api/service-assignees/${id}`, { method: 'PUT', body: data, token }),
  deleteServiceAssignee: (token, id) => request(`/api/service-assignees/${id}`, { method: 'DELETE', token }),

  getTodos: (token) => request('/api/todos', { token }),
  addTodo: (token, data) => request('/api/todos', { method: 'POST', body: data, token }),
  updateTodo: (token, id, data) => request(`/api/todos/${id}`, { method: 'PUT', body: data, token }),
  deleteTodo: (token, id) => request(`/api/todos/${id}`, { method: 'DELETE', token })
};

// --- Sub-facing calls (no MSAL token — gated by their link token in the URL) ---
export const subApi = {
  getMySchedule: (linkToken) => request(`/api/my-schedule/${linkToken}`),
  respondToAssignment: (linkToken, assignmentId, status, decline_reason) =>
    request(`/api/my-schedule/${linkToken}/assignments/${assignmentId}`, {
      method: 'PUT',
      body: { status, decline_reason }
    })
};
