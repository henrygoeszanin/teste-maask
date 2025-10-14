import { Device } from "@/domain/entities/Devices";

export interface IDeviceRepository {
  create(device: Device): Promise<Device>;
  findById(id: string): Promise<Device | null>;
  findByDeviceId(deviceId: string): Promise<Device | null>;
  findByUserId(
    userId: string,
    status?: "active" | "inactive" | "revoked"
  ): Promise<Device[]>;
  update(device: Device): Promise<Device>;
  delete(id: string): Promise<void>;
  revoke(
    deviceId: string,
    metadata: { revokedBy: string; reason: string }
  ): Promise<void>;
  countMasterDevices(userId: string): Promise<number>;
}
