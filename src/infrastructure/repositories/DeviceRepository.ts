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
        deviceId: device.deviceId,
        publicKey: device.publicKey,
        publicKeyFormat: device.publicKeyFormat,
        keyFingerprint: device.keyFingerprint,
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

  async findByDeviceId(deviceId: string): Promise<Device | null> {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceId, deviceId))
      .limit(1);

    return device ? this.mapToEntity(device) : null;
  }

  async findByUserId(userId: string, status?: DeviceStatus): Promise<Device[]> {
    const query = db.select().from(devices).where(eq(devices.userId, userId));

    if (status) {
      const results = await db
        .select()
        .from(devices)
        .where(and(eq(devices.userId, userId), eq(devices.status, status)));
      return results.map(this.mapToEntity);
    }

    const results = await query;
    return results.map(this.mapToEntity);
  }

  async update(device: Device): Promise<Device> {
    const [updated] = await db
      .update(devices)
      .set({
        publicKey: device.publicKey,
        publicKeyFormat: device.publicKeyFormat,
        keyFingerprint: device.keyFingerprint,
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
      row.deviceId,
      row.publicKey,
      row.publicKeyFormat,
      row.keyFingerprint,
      row.status as DeviceStatus,
      row.createdAt,
      row.updatedAt
    );
  }
}
