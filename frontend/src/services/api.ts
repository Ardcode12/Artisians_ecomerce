/**
 * Universal API Client for Artisans App
 */

import { BACKEND_URL } from '@/config/api';

class ApiClient {
  private formatUrl(urlPath: string, params?: Record<string, any>): string {
    let cleanPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
    const base = BACKEND_URL.replace(/\/+$/, '');
    let full = `${base}${cleanPath}`;

    if (params && Object.keys(params).length > 0) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          q.append(k, String(v));
        }
      }
      const qs = q.toString();
      if (qs) {
        full += (full.includes('?') ? '&' : '?') + qs;
      }
    }
    return full;
  }

  async get<T = any>(url: string, config?: { params?: Record<string, any>; headers?: Record<string, string> }): Promise<{ data: T; status: number }> {
    const targetUrl = this.formatUrl(url, config?.params);
    const resp = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(config?.headers || {}),
      },
    });

    const text = await resp.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = text;
    }

    if (!resp.ok) {
      const err: any = new Error(data?.detail || data?.error || `HTTP ${resp.status}`);
      err.response = { data, status: resp.status };
      throw err;
    }
    return { data, status: resp.status };
  }

  async post<T = any>(url: string, body?: any, config?: { params?: Record<string, any>; headers?: Record<string, string> }): Promise<{ data: T; status: number }> {
    const targetUrl = this.formatUrl(url, config?.params);
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(config?.headers || {}),
      },
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });

    const text = await resp.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = text;
    }

    if (!resp.ok) {
      const err: any = new Error(data?.detail || data?.error || `HTTP ${resp.status}`);
      err.response = { data, status: resp.status };
      throw err;
    }
    return { data, status: resp.status };
  }

  async delete<T = any>(url: string, config?: { params?: Record<string, any>; headers?: Record<string, string> }): Promise<{ data: T; status: number }> {
    const targetUrl = this.formatUrl(url, config?.params);
    const resp = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(config?.headers || {}),
      },
    });

    const text = await resp.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = text;
    }

    if (!resp.ok) {
      const err: any = new Error(data?.detail || data?.error || `HTTP ${resp.status}`);
      err.response = { data, status: resp.status };
      throw err;
    }
    return { data, status: resp.status };
  }
}

export const api = new ApiClient();
export default api;
