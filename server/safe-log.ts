import type { Request } from 'express';

export interface RequestWithId extends Request {
  requestId?: string;
}

export function errorClassification(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNKNOWN_ERROR';
  const candidate = error as { code?: unknown; type?: unknown; name?: unknown };
  const value = candidate.code ?? candidate.type ?? candidate.name;
  return typeof value === 'string'
    ? value.toUpperCase().replace(/[^A-Z0-9_.-]/g, '_').slice(0, 80)
    : 'UNKNOWN_ERROR';
}

export function safeRequestContext(req: RequestWithId): Record<string, string> {
  return {
    requestId: req.requestId || 'unassigned',
    method: req.method,
    route: req.path,
  };
}

export function safeLogError(event: string, error: unknown, context: Record<string, unknown> = {}): void {
  console.error(event, { ...context, classification: errorClassification(error) });
}
