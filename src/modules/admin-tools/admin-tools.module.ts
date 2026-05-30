import { Module } from '@nestjs/common';
import { CleanupSeedController } from './cleanup-seed.controller';
import { CleanupSeedService } from './cleanup-seed.service';

@Module({
  controllers: [CleanupSeedController],
  providers: [CleanupSeedService],
})
export class AdminToolsModule {}
