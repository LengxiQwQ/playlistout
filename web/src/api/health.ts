import { API_BASE_URL, REMOTE_API_BASE_URL } from './base';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      return response.json();
    }
  } catch {
    // If local dev check fails, try remote API
  }
  if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
    const remoteResponse = await fetch(`${REMOTE_API_BASE_URL}/health`);
    if (remoteResponse.ok) {
      return remoteResponse.json();
    }
  }
  throw new Error('Health check failed');
}
