import { IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReceivedItemDto {
  @ApiProperty()
  @IsUUID()
  purchase_item_id: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  quantity_received: number;
}

export class ReceivePurchaseDto {
  @ApiProperty({ type: [ReceivedItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivedItemDto)
  items: ReceivedItemDto[];
}
