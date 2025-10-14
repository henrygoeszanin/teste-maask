import { FastifyReply, FastifyRequest } from "fastify";
import { LoginDTO } from "@/application/dtos/auth.dto";

export class AuthController {
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      // TODO: Implementar lógica de login
      const { email, password } = request.body as LoginDTO;

      return reply.status(200).send({
        message: "Login endpoint - to be implemented",
        email,
      });
    } catch (error) {
      return reply.status(500).send({ error: "Internal server error" });
    }
  }
}
