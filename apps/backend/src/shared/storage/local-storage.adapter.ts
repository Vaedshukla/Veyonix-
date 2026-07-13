import * as fs from 'fs/promises';
import * as path from 'path';

import { StorageProvider } from './storage.interface';
import { env } from '@config/index';

export class LocalStorageAdapter implements StorageProvider {
  private readonly basePath: string;

  constructor() {
    this.basePath = path.resolve(env.STORAGE_LOCAL_PATH);
  }

  async upload(key: string, data: Buffer, _contentType: string): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    const dir = path.dirname(fullPath);
    
    // Ensure parent directory exists
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, data);

    return `file://${fullPath}`;
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, key);
    return fs.readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.unlink(fullPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async getSignedUrl(key: string, _ttlSeconds: number): Promise<string> {
    // Local storage returns direct file URI protocol representation
    const fullPath = path.join(this.basePath, key);
    return `file://${fullPath}`;
  }
}
