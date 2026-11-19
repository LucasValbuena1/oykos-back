import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Lucas Valbuena' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({
    example: '3001234567',
    description: 'Celular colombiano de 10 dígitos',
  })
  @IsOptional()
  @Matches(/^3\d{9}$/, {
    message: 'phone debe ser un celular de 10 dígitos que empiece por 3',
  })
  phone?: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @Length(12, 64)
  newPassword!: string;
}
