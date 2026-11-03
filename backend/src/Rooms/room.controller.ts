import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomService } from './room.service.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { JoinRoomDto } from './dto/join-room.dto.js';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomsService: RoomService) {}

  // POST /rooms
  @Post()
  create(@Body() body: CreateRoomDto) {
    return this.roomsService.createRoom(body);
  }

  // POST /rooms/:id/join
  @Post(':id/join')
  join(@Param('id') roomId: string, @Body() body: JoinRoomDto) {
    return this.roomsService.joinRoom(roomId, body.userId);
  }

  //Get /rooms/code/:roomCode
  @Get('code/:roomCode')
  getByCode(@Param('roomCode') roomCode: string){
    return this.roomsService.getRoomByCode(roomCode);
  }
}
