import axios from 'axios';

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true, timeout: 15000 });

// Normalise every error into an Error with a readable message
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message
      || (err.code === 'ECONNABORTED' ? 'Request timed out' : 'Cannot reach the server. Is the API running?');
    return Promise.reject(Object.assign(new Error(message), { status: err.response?.status, details: err.response?.data?.details }));
  },
);

const crud = (path) => ({
  list: (params) => http.get(path, { params }),
  get: (id) => http.get(`${path}/${id}`),
  create: (body) => http.post(path, body),
  update: (id, body) => http.put(`${path}/${id}`, body),
  remove: (id) => http.delete(`${path}/${id}`),
});

export const api = {
  auth: {
    register: (b) => http.post('/auth/register', b),
    login: (b) => http.post('/auth/login', b),
    logout: () => http.post('/auth/logout'),
    me: () => http.get('/auth/me'),
  },
  sports: crud('/sports'),
  competitions: { ...crud('/competitions'), standings: (id) => http.get(`/competitions/${id}/standings`) },
  teams: crud('/teams'),
  players: crud('/players'),
  matches: {
    ...crud('/matches'),
    live: (params) => http.get('/matches/live', { params }),
    upcoming: (params) => http.get('/matches/upcoming', { params }),
    results: (params) => http.get('/matches/results', { params }),
  },
  users: {
    me: () => http.get('/users/me'),
    update: (b) => http.put('/users/me', b),
    follow: (type, id) => http.post('/users/favorites', { type, id }),
    unfollow: (type, id) => http.delete(`/users/favorites/${type}/${id}`),
  },
  admin: {
    dashboard: () => http.get('/admin/dashboard'),
    users: (params) => http.get('/admin/users', { params }),
    updateUser: (id, b) => http.put(`/admin/users/${id}`, b),
  },
};
