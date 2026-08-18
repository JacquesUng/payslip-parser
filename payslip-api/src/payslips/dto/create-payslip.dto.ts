import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePayslipDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
