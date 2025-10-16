import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "@/infrastructure/databases/connection";
import { AppError } from "@/domain/errors/AppError";

export class HealthController {
  /**
   * Verifica o status de saúde da aplicação e banco de dados
   * @param request - Requisição Fastify
   * @param reply - Resposta Fastify
   * @returns Retorna status da aplicação, timestamp e status do banco de dados com latência
   */
  async check(request: FastifyRequest, reply: FastifyReply) {
    try {
      const dbStatus = "ok";
      let dbLatency = null;
      const start = Date.now();
      // Executa uma query simples para testar conexão e latência
      await db.execute("SELECT 1");
      dbLatency = Date.now() - start;
      return reply.status(200).send({
        status: "ok",
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      } else {
        return reply
          .status(500)
          .send({ error: "unknown error", details: String(error) });
      }
    }
  }
}
