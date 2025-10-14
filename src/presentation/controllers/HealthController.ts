import { FastifyReply, FastifyRequest } from "fastify";

export class HealthController {
  async check(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }
}
