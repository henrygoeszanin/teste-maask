import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "@/config";

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        error: "Token not provided",
        message: "Authentication token is required",
      });
    }

    const [bearer, token] = authHeader.split(" ");

    if (bearer !== "Bearer" || !token) {
      return reply.status(401).send({
        error: "Invalid token format",
        message: "Token must be provided in the format: Bearer <token>",
      });
    }

    const decoded = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;

    // Adiciona as informações do usuário ao request
    request.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return reply.status(401).send({
        error: "Token expired",
        message: "Authentication token has expired. Please login again.",
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return reply.status(401).send({
        error: "Invalid token",
        message: "Authentication token is invalid",
      });
    }

    return reply.status(401).send({
      error: "Authentication error",
      message: "Unable to authenticate user",
    });
  }
}
