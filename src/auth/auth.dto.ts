import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'nuevo@oykos.co' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Oykos-Demo-2026!', minLength: 12, maxLength: 64 })
  @IsString()
  @Length(12, 64)
  password!: string;

  @ApiProperty({ example: 'Felipe Ardila' })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @Matches(/^3\d{9}$/, {
    message: 'phone debe ser un celular de 10 dígitos que empiece por 3',
  })
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'lucas@oykos.co' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Oykos-Demo-2026!' })
  @IsString()
  @Length(1, 64)
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @Length(10, 200)
  refreshToken!: string;
}

export class TokenPairDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ example: 900 }) expiresIn: number;
}
