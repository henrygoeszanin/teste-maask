import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "@/infrastructure/databases/connection";

export class HealthController {
  async check(request: FastifyRequest, reply: FastifyReply) {
    let dbStatus = "ok";
    let dbLatency = null;
    try {
      const start = Date.now();
      // Executa uma query simples para testar conexão e latência
      await db.execute("SELECT 1");
      dbLatency = Date.now() - start;
    } catch (e) {
      dbStatus = "unreachable";
    }
    return reply.status(200).send({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
    });
  }
}
