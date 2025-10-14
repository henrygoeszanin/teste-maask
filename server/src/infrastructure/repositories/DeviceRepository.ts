import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/databases/connection";
import { devices } from "@/infrastructure/databases/schema";
import { Device, DeviceStatus } from "@/domain/entities/Devices";
import { IDeviceRepository } from "@/application/interfaces/IDeviceRepository";

export class DeviceRepository implements IDeviceRepository {
  async create(device: Device): Promise<Device> {
    const [created] = await db
      .insert(devices)
      .values({
        id: device.id,
        userId: device.userId,
        deviceName: device.deviceName,
        status: device.status,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<Device | null> {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1);

    return device ? this.mapToEntity(device) : null;
  }

  async findByDeviceName(deviceName: string): Promise<Device | null> {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceName, deviceName))
      .limit(1);

    return device ? this.mapToEntity(device) : null;
  }

  async findByUserId(userId: string, status?: DeviceStatus): Promise<Device[]> {
    if (status) {
      const results = await db
        .select()
        .from(devices)
        .where(and(eq(devices.userId, userId), eq(devices.status, status)));
      return results.map(this.mapToEntity);
    }

    const results = await db
      .select()
      .from(devices)
      .where(eq(devices.userId, userId));
    return results.map(this.mapToEntity);
  }

  async update(device: Device): Promise<Device> {
    const [updated] = await db
      .update(devices)
      .set({
        deviceName: device.deviceName,
        status: device.status,
        updatedAt: device.updatedAt,
      })
      .where(eq(devices.id, device.id))
      .returning();

    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await db.delete(devices).where(eq(devices.id, id));
  }

  private mapToEntity(row: typeof devices.$inferSelect): Device {
    return new Device(
      row.id,
      row.userId,
      row.deviceName,
      row.createdAt,
      row.updatedAt,
      row.status as DeviceStatus
    );
  }
}
