export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface HealthCheckResponse {
  status: 'ok' | 'error' | 'degraded';
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  details?: Record<string, unknown>;
}
