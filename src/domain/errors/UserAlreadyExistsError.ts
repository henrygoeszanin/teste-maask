import { AppError } from "./AppError";

export class UserAlreadyExistsError extends AppError {
  constructor(email: string) {
    super(`Já existe um usuário cadastrado com o e-mail: ${email}`);
    this.name = "UserAlreadyExistsError";
  }
}
