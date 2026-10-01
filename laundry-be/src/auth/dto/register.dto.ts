import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  fullName: string;

  @Matches(/^(0\d{9,10})$/, { message: 'Số điện thoại không hợp lệ' })
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
