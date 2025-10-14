import { AppError } from "./AppError";

export class UserAlreadyExistsError extends AppError {
  constructor(email: string) {
    super(`A user is already registered with the email: ${email}`);
    this.name = "UserAlreadyExistsError";
  }
}
