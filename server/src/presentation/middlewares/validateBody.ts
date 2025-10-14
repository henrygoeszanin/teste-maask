import { z, ZodError } from "zod";
import { FastifyRequest, FastifyReply } from "fastify";

/**
 * Middleware para validar o body da requisição usando um schema Zod.
 * Uso: app.post('/rota', validateBody(schema), handler)
 */
export function validateBody<T extends z.ZodType<any>>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          message: "Validation error",
          errors: error.issues,
        });
      }
      throw error;
    }
  };
}
