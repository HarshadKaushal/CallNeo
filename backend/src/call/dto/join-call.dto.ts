import { IsNotEmpty, IsUUID } from 'class-validator';

export class JoinCallDto {
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;

  @IsUUID()
  userId!: string;
}
