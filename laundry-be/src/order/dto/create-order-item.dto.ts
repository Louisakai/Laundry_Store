import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  serviceId: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;
}
