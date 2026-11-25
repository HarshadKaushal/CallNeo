import { IsNotEmpty, IsUUID, IsString, MaxLength } from 'class-validator';

export class JoinCallDto {
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;

  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  userName!: string;
}
