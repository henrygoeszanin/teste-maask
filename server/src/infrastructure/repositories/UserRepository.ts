// Example repository implementation
import { db } from "@infrastructure/databases/connection";
import { eq } from "drizzle-orm";
import { users } from "../databases/schema";
import {
  IUserRepository,
  PublicUser,
} from "@/application/interfaces/IUserRepository";

export class UserRepository implements IUserRepository {
  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async findByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  }

  async findAll(): Promise<PublicUser[]> {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        pepperVersion: users.pepperVersion,
        memoryCost: users.memoryCost,
        timeCost: users.timeCost,
        parallelism: users.parallelism,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        criptografyCode: users.criptografyCode,
      })
      .from(users);
    return result;
  }

  async create(data: typeof users.$inferInsert): Promise<PublicUser> {
    const result = await db.insert(users).values(data).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      criptografyCode: users.criptografyCode,
    });
    return result[0];
  }

  async update(
    id: string,
    data: Partial<typeof users.$inferInsert>
  ): Promise<PublicUser> {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        pepperVersion: users.pepperVersion,
        memoryCost: users.memoryCost,
        timeCost: users.timeCost,
        parallelism: users.parallelism,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        criptografyCode: users.criptografyCode,
      });
    return result[0];
  }

  async delete(id: string) {
    await db.delete(users).where(eq(users.id, id));
  }
}
