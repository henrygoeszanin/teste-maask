import { config } from "@/config";
import { RegisterDTO } from "../dtos/user.dto";
import crypto from "crypto";
import argon2 from "argon2";
import { IUserRepository, PublicUser } from "../interfaces/IUserRepository";
import { User } from "@domain/entities/User";
import { UserAlreadyExistsError } from "@/domain/errors/UserAlreadyExistsError";

export class RegisterUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(
    data: RegisterDTO,
    newCryptografyCode: string
  ): Promise<PublicUser> {
    // Verifica se já existe usuário com o e-mail
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new UserAlreadyExistsError(data.email);
    }

    const passwordSalt = this.genSalt();
    const pre = this.preHash(data.password, config.security.pepper); // Pré-hash com pepper
    const params = {
      memoryCost: config.security.memoryCost, // em KB, quanto maior mais seguro (e lento)
      timeCost: config.security.timeCost, // quantas iterações, quanto maior mais seguro (e lento)
      parallelism: config.security.parallelism, // threads paralelos, geralmente 1 ou número de CPUs
    };

    const hash = await argon2.hash(pre, {
      // salva o salt e params embutidos no hash
      type: argon2.argon2id,
      salt: passwordSalt,
      memoryCost: params.memoryCost,
      timeCost: params.timeCost,
      parallelism: params.parallelism,
    });

    const user = User.create(data.name, data.email, hash, newCryptografyCode); // Cria a entidade User com a senha já hasheada

    const newUser = await this.userRepo.create(user); // Salva o usuário no repositório

    return newUser;
  }

  /**
   * Gera salt cryptograficamente seguro
   * Gera um salt (valor aleatório) criptograficamente seguro, usado para dificultar ataques de dicionário e rainbow table.
   */
  private genSalt(bytes = 32) {
    return crypto.randomBytes(bytes);
  }

  /**
   * Pré-hash usando HMAC-SHA256 com pepper (evita limits de tamanho de senha
   * e adiciona defesa em profundidade). Alternativa: passar pepper como secret
   * ao argon2 se biblioteca suportar.
   * faz um pré-hash da senha usando HMAC-SHA256 e um "pepper" (segredo global do servidor).
   * Isso protege contra ataques mesmo se o banco de dados for comprometido.
   */

  private preHash(password: string, pepper: string): Buffer {
    return crypto.createHmac("sha256", pepper).update(password).digest();
  }
}
