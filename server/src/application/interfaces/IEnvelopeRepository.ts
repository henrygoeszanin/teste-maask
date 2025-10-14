import { Envelope } from "@/domain/entities/Envelope";

export interface IEnvelopeRepository {
  create(envelope: Envelope): Promise<Envelope>;
  findById(id: string): Promise<Envelope | null>;
  findByUserIdAndDeviceId(
    userId: string,
    deviceId: string
  ): Promise<Envelope | null>;
  findByUserId(userId: string): Promise<Envelope[]>;
  delete(id: string): Promise<void>;
  deleteByDeviceId(deviceId: string): Promise<void>;
}
