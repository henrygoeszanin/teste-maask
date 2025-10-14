// files (arquivo cifrado no storage; servidor guarda metadata + FEK cifrado por MDK)

import { ulid } from "ulid";
import { randomUUID } from "crypto";

export interface EncryptionMetadata {
  algorithm: string;
  iv: string;
  authTag: string;
}

export class File {
  constructor(
    public id: string,
    public userId: string,
    public fileId: string,
    public fileName: string,
    public sizeBytes: number,
    public storagePath: string,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(
    userId: string,
    fileName: string,
    sizeBytes: number,
    storagePath: string
  ): File {
    return new File(
      ulid(), // id
      userId,
      randomUUID(), // fileId (UUID único)
      fileName,
      sizeBytes,
      storagePath,
      new Date(), // createdAt
      new Date() // updatedAt
    );
  }
}
