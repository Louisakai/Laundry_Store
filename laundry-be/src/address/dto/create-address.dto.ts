import { IsString, IsNumber, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  label: string;

  @IsString()
  addressLine: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsIn(['store'])
  @IsOptional()
  owner?: 'store';
}
