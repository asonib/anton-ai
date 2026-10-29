import axios, { AxiosError, AxiosHeaders } from 'axios';
import { appEnv } from '../config/env';
import { storage } from '../utils/storage';

export const UNAUTHORIZED_EVENT = 'antonai:unauthorized';

/**
 * Shared Axios instance.
 *  - request interceptor: attaches `Authorization: Bearer <jwt>`
 *  - response interceptor: on 401 for an authenticated call, clears the session
 *    and broadcasts UNAUTHORIZED_EVENT so AuthContext can redirect to /login.
 */
export const http = axios.create({
  baseURL: appEnv.apiBaseUrl,
  timeout: 180_000, // local models can be slow on first load
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const hadToken = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && hadToken) {
      storage.clearSession();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);
