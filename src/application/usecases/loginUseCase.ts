import { LoginDTO } from "../dtos/auth.dto";
import { IUserRepository } from "../interfaces/IUserRepository";
import argon2 from "argon2";
import { config } from "@/config";
import jwt from "jsonwebtoken";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export class LoginUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(data: LoginDTO): Promise<LoginResult> {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      throw new Error("Usuário ou senha inválidos");
    }

    // Pré-hash igual ao cadastro
    const pre = this.preHash(data.password, config.security.pepper);
    const valid = await argon2.verify(user.password, pre);
    if (!valid) {
      throw new Error("Usuário ou senha inválidos");
    }

    const payload = { sub: user.id, email: user.email, name: user.name };
    const expiresIn = config.auth.accessTokenExpiresIn;
    const refreshExpiresIn = config.auth.refreshTokenExpiresIn;

    const accessToken = jwt.sign(payload, config.auth.jwtSecret, { expiresIn });
    const refreshToken = jwt.sign(
      { sub: user.id },
      config.auth.jwtRefreshSecret,
      { expiresIn: refreshExpiresIn }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn,
      refreshExpiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  private preHash(password: string, pepper: string): Buffer {
    const crypto = require("crypto");
    return crypto.createHmac("sha256", pepper).update(password).digest();
  }
}
