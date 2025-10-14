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
