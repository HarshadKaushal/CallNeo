import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User, Participant,Room } from '@callneo/database';
import { RoomController} from './room.controller.js';
import { RoomService } from './room.service.js';


@Module({
  imports: [
    //so for features we need to make these model injectable in RoomService
    SequelizeModule.forFeature([Room,Participant,User]),
  ],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
