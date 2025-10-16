# Error Handling and Response Contract

This document specifies the standard format and conventions for error responses produced by the server API.

Goal

- Ensure all server-side error messages are presented in English.
- Provide a small, machine-friendly error contract that clients can reliably parse.
- Preserve a human-readable `message` for display in UIs and logs.

Principles

- Machine-readable error codes should be stable, concise and uppercase snake_case (for example: `DEVICE_REVOKED`, `TOKEN_EXPIRED`, `USER_NOT_FOUND`).
- Human-readable messages must be in English and concise.
- HTTP status codes must be appropriate to the error (e.g. 401 Unauthorized, 404 Not Found, 400 Bad Request, 500 Internal Server Error).
- Avoid returning sensitive information in error responses (stack traces, tokens, secrets, or user data).

Recommended JSON Error Schema

- `error` (string): machine-readable error code (UPPER_SNAKE_CASE)
- `message` (string): user-facing English message explaining the error
- `status` (number) optional: the HTTP status code
- `details` (object) optional: additional metadata (validation errors, field names)

Example (401 - token expired)

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "TOKEN_EXPIRED",
  "message": "Authentication token has expired. Please login again.",
  "status": 401
}
```

Example (401 - device revoked)

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "DEVICE_REVOKED",
  "message": "This device has been revoked. Please login from another device.",
  "status": 401
}
```

Example (404 - user not found)

```
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "USER_NOT_FOUND",
  "message": "User not found",
  "status": 404
}
```

Implementation guidance

- Use `AppError` (or another application-specific error type) for expected errors and set its `message` to the machine code or a short English description. Controllers should translate AppError into the standardized response body.
- For unexpected errors, return a generic 500 response with `error: "INTERNAL_SERVER_ERROR"` and `message: "Internal server error"`.
- Do not leak stack traces or internal details to the client; log them on the server instead.
- Update API documentation (Swagger/OpenAPI) with examples for each error response and the error codes used by each endpoint.

Migration notes

- If the codebase currently returns Portuguese messages, migrate them to English progressively. Start with authentication and token-related flows (login/refresh), then proceed to other critical flows (device revocation, file operations).

Ownership

- API owners should run a small audit and replace any non-English error messages found in the codebase with the approved English messages before the next release.
