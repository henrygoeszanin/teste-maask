import { RateLimitPluginOptions } from "@fastify/rate-limit";
import { config } from "@config/index";

/**
 * Rate limiter para rotas de autenticação (login, register)
 * Mais restritivo para prevenir brute force
 */
export const authRateLimiter: RateLimitPluginOptions = {
  max: config.rateLimit.auth.max, // 5 tentativas
  timeWindow: config.rateLimit.auth.timeWindow, // 15 minutos
  cache: 5000,
  keyGenerator: (request) => {
    // Combina IP + email para rate limit mais preciso
    const forwarded = request.headers["x-forwarded-for"];
    const realIp = request.headers["x-real-ip"];

    let ip = "unknown";
    if (typeof forwarded === "string") {
      ip = forwarded.split(",")[0].trim();
    } else if (typeof realIp === "string") {
      ip = realIp;
    } else {
      ip = request.ip || "unknown";
    }

    // Tenta pegar email do body para rate limit mais preciso
    const body = request.body as { email?: string };
    const email = body?.email || "";

    return `auth:${ip}:${email}`;
  },
  errorResponseBuilder: (request, context) => {
    const afterMs = typeof context.after === "number" ? context.after : 0;
    const minutes = Math.ceil(afterMs / 1000 / 60);

    return {
      error: `Too many authentication attempts. Please try again after ${minutes} minutes.`,
      statusCode: 429,
      retryAfter: context.after,
    };
  },
  enableDraftSpec: true,
  addHeadersOnExceeding: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
  },
  addHeaders: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
    "retry-after": true,
  },
};

/**
 * Rate limiter para rotas de upload
 * Limita quantidade de uploads por hora
 */
export const uploadRateLimiter: RateLimitPluginOptions = {
  max: config.rateLimit.upload.max, // 10 uploads
  timeWindow: config.rateLimit.upload.timeWindow, // 1 hora
  cache: 10000,
  keyGenerator: (request) => {
    // Usa userId do token JWT para rate limit por usuário
    const user = request.user as { id?: string } | undefined;
    const userId = user?.id || "anonymous";

    const forwarded = request.headers["x-forwarded-for"];
    const realIp = request.headers["x-real-ip"];

    let ip = "unknown";
    if (typeof forwarded === "string") {
      ip = forwarded.split(",")[0].trim();
    } else if (typeof realIp === "string") {
      ip = realIp;
    } else {
      ip = request.ip || "unknown";
    }

    return `upload:${userId}:${ip}`;
  },
  errorResponseBuilder: (request, context) => {
    const afterMs = typeof context.after === "number" ? context.after : 0;
    const minutes = Math.ceil(afterMs / 1000 / 60);

    return {
      error: `Upload limit exceeded. You can upload up to ${config.rateLimit.upload.max} files per hour. Please try again after ${minutes} minutes.`,
      statusCode: 429,
      retryAfter: context.after,
    };
  },
  enableDraftSpec: true,
  addHeadersOnExceeding: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
  },
  addHeaders: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
    "retry-after": true,
  },
};
