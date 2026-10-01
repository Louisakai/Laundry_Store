import {
  IsArray,
  ValidateNested,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WeighItemDto {
  @IsString()
  orderItemId: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}

export class WeighOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeighItemDto)
  items: WeighItemDto[];
}
