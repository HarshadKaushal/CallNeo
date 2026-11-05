import { IsString, IsUUID, MaxLength, MinLength} from "class-validator";
export class CreateRoomDto{
    //who is creating the room
    @IsUUID()
    hostId!: string;

    //short code people trying to join
    @IsString()
    @MinLength(4)
    @MaxLength(12)
    roomCode!: string;
  
}