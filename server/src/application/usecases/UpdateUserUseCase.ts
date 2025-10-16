import { AppError } from "@/domain/errors/AppError";
import { UpdateUserDTO } from "../dtos/user.dto";
import { IUserRepository, PublicUser } from "../interfaces/IUserRepository";

export class UpdateUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string, data: UpdateUserDTO): Promise<PublicUser> {
    // Verifica se o usuário existe
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Atualiza apenas os campos fornecidos
    const updateData: Partial<typeof user> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    return await this.userRepo.update(userId, updateData);
  }
}
