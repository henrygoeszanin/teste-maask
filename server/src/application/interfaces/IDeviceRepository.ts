import { Device, DeviceStatus } from "@/domain/entities/Devices";

export interface IDeviceRepository {
  create(device: Device): Promise<Device>;
  findById(id: string): Promise<Device | null>;
  findByDeviceName(deviceName: string): Promise<Device | null>;
  findByUserId(userId: string, status?: DeviceStatus): Promise<Device[]>;
  update(device: Device): Promise<Device>;
  delete(id: string): Promise<void>;
}
