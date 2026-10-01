import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '@prisma/client';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsEnum(OrderType)
  orderType: OrderType;

  @IsString()
  @IsOptional()
  pickupAddressId?: string;

  @IsString()
  @IsOptional()
  deliveryAddressId?: string;

  @IsDateString()
  @IsOptional()
  pickupWindowStart?: string;

  @IsDateString()
  @IsOptional()
  pickupWindowEnd?: string;

  @IsDateString()
  @IsOptional()
  deliveryWindowStart?: string;

  @IsDateString()
  @IsOptional()
  deliveryWindowEnd?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  pickupContactName?: string;

  @IsString()
  @IsOptional()
  pickupContactPhone?: string;

  @IsString()
  @IsOptional()
  deliveryContactName?: string;

  @IsString()
  @IsOptional()
  deliveryContactPhone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
