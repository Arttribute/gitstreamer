import type { Context } from "hono";
import { AppError } from "../lib/errors.js";

export function errorHandler(err: Error, c: Context) {
  console.error("Error:", err);

  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          message: err.message,
          code: err.code,
        },
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 500
    );
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return c.json(
      {
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: err,
        },
      },
      400
    );
  }

  // Default error response
  return c.json(
    {
      error: {
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      },
    },
    500
  );
}
