import { http } from './httpClient';
import type { ApiSuccess, AuthResult, User } from './types';

export interface Credentials {
  email: string;
  password: string;
}

export const authApi = {
  async login(body: Credentials): Promise<AuthResult> {
    const { data } = await http.post<ApiSuccess<AuthResult>>('/auth/login', body);
    return data.data;
  },
  async register(body: Credentials): Promise<AuthResult> {
    const { data } = await http.post<ApiSuccess<AuthResult>>('/auth/register', body);
    return data.data;
  },
  async me(): Promise<User> {
    const { data } = await http.get<ApiSuccess<User>>('/auth/me');
    return data.data;
  },
};
