import { ulid } from "ulid";

export type DeviceStatus = "active" | "inactive" | "revoked";

export class Device {
  constructor(
    public id: string,
    public userId: string,
    public deviceId: string, // gerado no cliente (ex: UUID)
    public publicKey: string, // chave pública do dispositivo (RSA-4096 ou Ed25519)
    public publicKeyFormat: string, // formato da chave pública (ex: PEM, SPKI)
    public keyFingerprint: string, // fingerprint da chave pública (SHA-256)
    public status: DeviceStatus, // status do dispositivo
    public isMasterDevice: number, // 0 = false, 1 = true
    public revokedAt: Date | null,
    public revokedBy: string | null, // deviceId que executou a revogação
    public revocationReason: string | null,
    public lastSeen: Date | null,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(
    userId: string,
    deviceId: string,
    publicKey: string,
    publicKeyFormat: string,
    keyFingerprint: string,
    isMasterDevice: boolean = false
  ): Device {
    return new Device(
      ulid(), // id
      userId,
      deviceId,
      publicKey,
      publicKeyFormat,
      keyFingerprint,
      "active", // status inicial sempre "active"
      isMasterDevice ? 1 : 0, // isMasterDevice (0 = false, 1 = true)
      null, // revokedAt
      null, // revokedBy
      null, // revocationReason
      new Date(), // lastSeen
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

  revoke(revokedBy: string, reason?: string): void {
    this.status = "revoked";
    this.revokedAt = new Date();
    this.revokedBy = revokedBy;
    this.revocationReason = reason || null;
    this.updatedAt = new Date();
  }

  isActive(): boolean {
    return this.status === "active";
  }

  isRevoked(): boolean {
    return this.status === "revoked";
  }

  isMaster(): boolean {
    return this.isMasterDevice === 1;
  }

  setAsMaster(): void {
    this.isMasterDevice = 1;
    this.updatedAt = new Date();
  }

  removeAsMaster(): void {
    this.isMasterDevice = 0;
    this.updatedAt = new Date();
  }
}
