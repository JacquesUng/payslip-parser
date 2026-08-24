import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ListPayslipsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}
