export interface StorageStrategy {
  uploadFile(file: Express.Multer.File, folder: string): Promise<string>;
}
