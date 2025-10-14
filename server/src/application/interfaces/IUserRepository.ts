import { users } from "@/infrastructure/databases/schema";

export type PublicUser = Omit<
  typeof users.$inferSelect,
  "password" | "pepperVersion" | "memoryCost" | "timeCost" | "parallelism"
>;

export interface IUserRepository {
  findById(id: string): Promise<typeof users.$inferSelect | null>;
  findByEmail(email: string): Promise<typeof users.$inferSelect | null>;
  findAll(): Promise<PublicUser[]>;
  create(data: typeof users.$inferInsert): Promise<PublicUser>;
  update(
    id: string,
    data: Partial<typeof users.$inferInsert>
  ): Promise<PublicUser>;
  delete(id: string): Promise<void>;
}
