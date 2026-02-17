import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ObjectId } from "mongodb";

// ================================
// Utility: Convert Mongo documents
// ================================
export function serialize<T>(doc: T): any {
  if (!doc) return doc;

  const result: any = { ...doc };

  if (result._id instanceof ObjectId) {
    result._id = result._id.toString();
  }

  // Convert nested Mongo fields
  for (const key in result) {
    if (result[key] instanceof ObjectId) {
      result[key] = result[key].toString();
    }
  }

  return result;
}

// ================================
// SUCCESS RESPONSE (STANDARDIZED)
// ================================
export function apiResponse<T>(
  data: T,
  status: number = 200,
  message?: string
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data: serialize(data),
    },
    { status }
  );
}

// ================================
// ERROR RESPONSE (STANDARDIZED)
// ================================
export function apiError(
  error: string | Error,
  status: number = 500,
  details?: any
) {
  const message = typeof error === "string" ? error : error.message;

  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
    },
    { status }
  );
}

// ================================
// MAIN ERROR HANDLER (Zod + Custom)
// ================================
export function handleApiError(error: unknown) {
  console.error("🔴 API ERROR:", error);

  if (error instanceof ZodError) {
    return apiError("Validation failed", 400, error.errors);
  }

  if (error instanceof Error) {
    return apiError(error.message, 500);
  }

  return apiError("Internal Server Error", 500);
}

// ================================
// METHOD VALIDATION
// ================================
export function validateMethod(
  request: Request,
  allowed: string[]
): NextResponse | null {
  if (!allowed.includes(request.method)) {
    return apiError(`Method ${request.method} Not Allowed`, 405);
  }
  return null;
}

// ================================
// SAFE BODY PARSING
// ================================
export async function parseRequestBody<T = any>(
  request: Request
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

// ================================
// QUERY PARAMS EXTRACTOR
// ================================
export function getQueryParams(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}

// ================================
// PAGINATION HELPER
// ================================
export function paginate<T>(items: T[], page = 1, limit = 50) {
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    items: items.slice(start, end),
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
      hasMore: end < items.length,
    },
  };
}

// ================================
// RATE LIMIT (simple in-memory)
// ================================
const rateLimitMap = new Map<string, number[]>();

export function rateLimit(
  key: string,
  maxRequests = 60,
  windowMs = 60_000
) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];

  // Keep only recent events
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) return false;

  recent.push(now);
  rateLimitMap.set(key, recent);
  return true;
}

// Cleanup job
setInterval(() => {
  const now = Date.now();
  const windowMs = 60_000;

  for (const [key, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter((t) => now - t < windowMs);
    if (recent.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, recent);
    }
  }
}, 60_000);
