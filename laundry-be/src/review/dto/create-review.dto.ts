import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  serviceRating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  serviceComment?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  shipperRating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  shipperComment?: string;
}
