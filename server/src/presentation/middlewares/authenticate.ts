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
        error: "Token não fornecido",
        message: "É necessário fornecer um token de autenticação",
      });
    }

    const [bearer, token] = authHeader.split(" ");

    if (bearer !== "Bearer" || !token) {
      return reply.status(401).send({
        error: "Formato de token inválido",
        message: "O token deve ser fornecido no formato: Bearer <token>",
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
        error: "Token expirado",
        message: "O token de autenticação expirou. Faça login novamente.",
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return reply.status(401).send({
        error: "Token inválido",
        message: "O token de autenticação é inválido",
      });
    }

    return reply.status(401).send({
      error: "Erro de autenticação",
      message: "Não foi possível autenticar o usuário",
    });
  }
}
