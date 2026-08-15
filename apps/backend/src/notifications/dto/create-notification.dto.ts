import {
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  body: string;

  // Exactly one of userId / groupId must be present — enforced in the service,
  // not here, since "at least one of two fields" isn't a single built-in decorator.
  @ValidateIf((dto) => !dto.groupId)
  @IsString()
  userId?: string;

  @ValidateIf((dto) => !dto.userId)
  @IsString()
  groupId?: string;
}