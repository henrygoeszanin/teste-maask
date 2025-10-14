import { ulid } from "ulid";

export type DeviceStatus = "active" | "inactive" | "revoked";

export class Device {
  constructor(
    public id: string,
    public userId: string,
    public deviceName: string,
    public createdAt: Date,
    public updatedAt: Date,
    public status: DeviceStatus = "active"
  ) {}

  static create(userId: string, deviceId: string): Device {
    return new Device(
      ulid(), // id
      userId,
      deviceId,
      new Date(), // createdAt
      new Date() // updatedAt
    );
  }

  deactivate(): void {
    this.status = "inactive";
    this.updatedAt = new Date();
  }

  activate(): void {
    this.status = "active";
    this.updatedAt = new Date();
  }

  revoke(): void {
    this.status = "revoked";
    this.updatedAt = new Date();
  }

  isActive(): boolean {
    return this.status === "active";
  }

  isRevoked(): boolean {
    return this.status === "revoked";
  }
}
