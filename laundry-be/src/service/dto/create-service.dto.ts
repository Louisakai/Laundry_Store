import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @IsString()
  unit: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
