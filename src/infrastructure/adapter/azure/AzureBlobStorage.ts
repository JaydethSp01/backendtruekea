import { BlobServiceClient } from "@azure/storage-blob";
import { IBlobStorage } from "../../../domain/ports/IBlobStorage";
import config from "../../config/default";

export class AzureBlobStorage implements IBlobStorage {
  private containerClient;
  private enabled: boolean;

  constructor() {
    const conn = (config.azure.connectionString || "").trim();
    this.enabled = conn.length > 0 && conn !== "secret";
    if (this.enabled) {
      const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
      this.containerClient = blobServiceClient.getContainerClient(
        config.azure.containerName
      );
    }
  }

  async upload(fileName: string, fileBuffer: Buffer): Promise<string> {
    if (!this.enabled) {
      // Modo dev/local: no dependemos de Azure para pruebas E2E.
      return "https://via.placeholder.com/150";
    }
    const container = this.containerClient;
    if (!container) {
      throw new Error("Azure Blob Storage no está inicializado");
    }
    const blockBlobClient = container.getBlockBlobClient(fileName);
    await blockBlobClient.uploadData(fileBuffer);
    return blockBlobClient.url;
  }

  async delete(fileName: string): Promise<void> {
    if (!this.enabled) return;
    const container = this.containerClient;
    if (!container) return;
    const blockBlobClient = container.getBlockBlobClient(fileName);
    await blockBlobClient.deleteIfExists();
  }
}
