import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreSettings } from './entities/store-settings.entity';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(StoreSettings)
    private readonly repo: Repository<StoreSettings>,
  ) {}

  async get(): Promise<StoreSettings> {
    let settings = await this.repo.findOne({ where: { setting_id: 1 } });
    if (!settings) {
      settings = await this.repo.save(
        this.repo.create({ store_name: 'Mueblería El Castor' }),
      );
    }
    return settings;
  }

  async update(dto: UpdateStoreSettingsDto): Promise<StoreSettings> {
    const settings = await this.get();
    settings.store_name = dto.store_name;
    return this.repo.save(settings);
  }
}
