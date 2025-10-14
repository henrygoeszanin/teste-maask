import { UpdateUserDTO } from "../dtos/user.dto";
import { IUserRepository, PublicUser } from "../interfaces/IUserRepository";
import { NotFoundError } from "@/domain/errors/NotFoundError";
import { UserAlreadyExistsError } from "@/domain/errors/UserAlreadyExistsError";

export class UpdateUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string, data: UpdateUserDTO): Promise<PublicUser> {
    // Verifica se o usuário existe
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("Usuário não encontrado");
    }

    // Se o email está sendo atualizado, verifica se já existe outro usuário com esse email
    if (data.email && data.email !== user.email) {
      const existingUser = await this.userRepo.findByEmail(data.email);
      if (existingUser && existingUser.id !== userId) {
        throw new UserAlreadyExistsError("Este e-mail já está em uso");
      }
    }

    // Atualiza apenas os campos fornecidos
    const updateData: Partial<typeof user> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    return await this.userRepo.update(userId, updateData);
  }
}
