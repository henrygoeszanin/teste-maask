import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/databases/connection";
import { envelopes } from "@/infrastructure/databases/schema";
import {
  Envelope,
  EnvelopeEncryptionMetadata,
} from "@/domain/entities/Envelope";
import { IEnvelopeRepository } from "@/application/interfaces/IEnvelopeRepository";

export class EnvelopeRepository implements IEnvelopeRepository {
  async create(envelope: Envelope): Promise<Envelope> {
    const [created] = await db
      .insert(envelopes)
      .values({
        id: envelope.id,
        userId: envelope.userId,
        deviceId: envelope.deviceId,
        envelopeCiphertext: envelope.envelopeCiphertext,
        encryptionMetadata: envelope.encryptionMetadata,
        createdAt: envelope.createdAt,
        updatedAt: envelope.updatedAt,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<Envelope | null> {
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(eq(envelopes.id, id))
      .limit(1);

    return envelope ? this.mapToEntity(envelope) : null;
  }

  async findByUserIdAndDeviceId(
    userId: string,
    deviceId: string
  ): Promise<Envelope | null> {
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(
        and(eq(envelopes.userId, userId), eq(envelopes.deviceId, deviceId))
      )
      .limit(1);

    return envelope ? this.mapToEntity(envelope) : null;
  }

  async findByUserId(userId: string): Promise<Envelope[]> {
    const results = await db
      .select()
      .from(envelopes)
      .where(eq(envelopes.userId, userId));

    return results.map(this.mapToEntity);
  }

  async delete(id: string): Promise<void> {
    await db.delete(envelopes).where(eq(envelopes.id, id));
  }

  async deleteByDeviceId(deviceId: string): Promise<void> {
    await db.delete(envelopes).where(eq(envelopes.deviceId, deviceId));
  }

  private mapToEntity(row: typeof envelopes.$inferSelect): Envelope {
    return new Envelope(
      row.id,
      row.userId,
      row.deviceId,
      row.envelopeCiphertext,
      row.encryptionMetadata as EnvelopeEncryptionMetadata,
      row.createdAt,
      row.updatedAt
    );
  }
}
