import { ulid } from "ulid";

export type DeviceStatus = "active" | "inactive";

export class Device {
  constructor(
    public id: string,
    public userId: string,
    public deviceId: string, // gerado no cliente (ex: UUID)
    public publicKey: string, // chave pública do dispositivo (RSA-4096 ou Ed25519)
    public publicKeyFormat: string, // formato da chave pública (ex: PEM, SPKI)
    public keyFingerprint: string, // fingerprint da chave pública (SHA-256)
    public status: DeviceStatus, // status do dispositivo
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(
    userId: string,
    deviceId: string,
    publicKey: string,
    publicKeyFormat: string,
    keyFingerprint: string
  ): Device {
    return new Device(
      ulid(), // id
      userId,
      deviceId,
      publicKey,
      publicKeyFormat,
      keyFingerprint,
      "active", // status inicial sempre "active"
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

  isActive(): boolean {
    return this.status === "active";
  }
}
