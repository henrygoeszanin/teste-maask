// MDK -> Master Decryption Key apenas descriptografada na memória do device, nunca armazenada em disco.
// Envelope -> Envoltório que contém a MDK criptografada com a chave pública do dispositivo.

import { ulid } from "ulid";

export interface EnvelopeEncryptionMetadata {
  algorithm: string; // "RSA-OAEP"
  hashFunction: string; // "SHA-256"
}

export class Envelope {
  constructor(
    public id: string,
    public userId: string,
    public deviceId: string, // id do device que possui este envelope
    public envelopeCiphertext: string, // MDK cifrada com public_key do device
    public encryptionMetadata: EnvelopeEncryptionMetadata,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(
    userId: string,
    deviceId: string,
    envelopeCiphertext: string,
    encryptionMetadata: EnvelopeEncryptionMetadata
  ): Envelope {
    return new Envelope(
      ulid(), // id
      userId,
      deviceId,
      envelopeCiphertext,
      encryptionMetadata,
      new Date(), // createdAt
      new Date() // updatedAt
    );
  }
}
