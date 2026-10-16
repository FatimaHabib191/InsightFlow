import axios from 'axios';
import { clearSession, getSession } from './auth';
import type { Cell, Column, Row, DatasetStats, Filter } from './analyze';
const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api', timeout: 60_000 });
http.interceptors.request.use(c => { const s = getSession(); if (s) c.headers.Authorization = `Bearer ${s.token}`; return c; });
const unwrap = <T,>(p: Promise<{ data: T }>) => p.then(r => r.data).catch(e => {
  if (e.response?.status === 401 && getSession()) { clearSession(); window.location.assign('/login'); } // expired or invalid token
  throw new Error(e.response?.data?.error ?? 'Network error: is the API reachable?');
});
export interface DatasetMeta { _id: string; name: string; rowCount: number; columns: Column[]; stats: DatasetStats; createdAt: string }
export interface Report { _id: string; datasetId: string; title: string; filters: { search: string; filters: Filter[]; rowsIncluded: number }; summary: DatasetStats; observations: string[]; createdAt: string }
export const api = {
  login: (email: string, password: string) => unwrap<{ token: string; email: string }>(http.post('/auth/login', { email, password })),
  register: (email: string, password: string) => unwrap<{ token: string; email: string }>(http.post('/auth/register', { email, password })),
  listDatasets: () => unwrap<DatasetMeta[]>(http.get('/datasets')),
  createDataset: (b: { name: string; fileName?: string; columns: Column[]; rows: Row[]; stats: DatasetStats }) => unwrap<DatasetMeta>(http.post('/datasets', { ...b, rows: b.rows.map(r => b.columns.map(c => r[c.name])) })),
  getDataset: (id: string) => unwrap<DatasetMeta>(http.get(`/datasets/${id}`)),
  getRows: (id: string, columns: Column[]) => unwrap<{ rows: Cell[][] }>(http.get(`/datasets/${id}/rows`))
    .then(({ rows }) => rows.map(r => Object.fromEntries(columns.map((c, i) => [c.name, r[i] ?? null])) as Row)),
  deleteDataset: (id: string) => unwrap<void>(http.delete(`/datasets/${id}`)),
  listReports: (datasetId?: string) => unwrap<Report[]>(http.get('/reports', { params: { datasetId } })),
  createReport: (b: Omit<Report, '_id' | 'createdAt'>) => unwrap<Report>(http.post('/reports', b)),
  deleteReport: (id: string) => unwrap<void>(http.delete(`/reports/${id}`)),
  getReport: (id: string) => unwrap<Report>(http.get(`/reports/${id}`)),
};
