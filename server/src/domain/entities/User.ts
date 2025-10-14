import { config } from "@/config";
import { ulid } from "ulid";

// Example entity
export class User {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public createdAt: Date,
    public password: string,
    public criptografyCode: string,
    public pepperVersion: number,
    public memoryCost: number,
    public timeCost: number,
    public parallelism: number,
    public updatedAt: Date
  ) {}

  static create(
    name: string,
    email: string,
    password: string,
    criptografyCode: string
  ): User {
    return new User(
      ulid(), // id
      name,
      email,
      new Date(), // createdAt
      password, // password
      criptografyCode,
      config.security.pepperVersion, // pepperVersion (default value)
      config.security.memoryCost, // memoryCost (default value)
      config.security.timeCost, // timeCost (default value)
      config.security.parallelism, // parallelism (default value)
      new Date() // updatedAt
    );
  }
}
