import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./api-client";

/**
 * Standard API response wrapper
 */
export function apiResponse<T>(
  data: T,
  status: number = 200,
  message?: string
) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

/**
 * Standard API error response
 */
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

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof ZodError) {
    return apiError("Validation failed", 400, error.errors);
  }

  if (error instanceof ApiError) {
    return apiError(error.message, error.status, error.data);
  }

  if (error instanceof Error) {
    return apiError(error.message, 500);
  }

  return apiError("Internal server error", 500);
}

/**
 * Validate request method
 */
export function validateMethod(
  request: Request,
  allowedMethods: string[]
): boolean {
  return allowedMethods.includes(request.method);
}

/**
 * Parse request body safely
 */
export async function parseRequestBody<T = any>(
  request: Request
): Promise<T | null> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    return null;
  }
}

/**
 * Get query parameters from URL
 */
export function getQueryParams(request: Request): URLSearchParams {
  const url = new URL(request.url);
  return url.searchParams;
}

/**
 * Paginate array results
 */
export function paginate<T>(items: T[], page: number = 1, limit: number = 50) {
  const offset = (page - 1) * limit;
  const paginatedItems = items.slice(offset, offset + limit);

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
      hasMore: offset + limit < items.length,
    },
  };
}

/**
 * Rate limiting helper (simple in-memory)
 */
const rateLimitMap = new Map<string, number[]>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(identifier) || [];

  // Remove old requests outside the window
  const recentRequests = requests.filter((time) => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  recentRequests.push(now);
  rateLimitMap.set(identifier, recentRequests);

  return true;
}

/**
 * Clean up old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  const windowMs = 60000;

  rateLimitMap.forEach((requests, key) => {
    const recentRequests = requests.filter((time) => now - time < windowMs);
    if (recentRequests.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, recentRequests);
    }
  });
}, 60000); // Clean up every minute
