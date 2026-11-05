import { 
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel} from '@nestjs/sequelize';
import { Participant, Room, User } from '@callneo/database';
import { CreateRoomDto } from './dto/create-room.dto.js';

@Injectable()
export class RoomService {
    constructor(
        @InjectModel(Room) private readonly rooms: typeof Room,
        @InjectModel(Participant) private readonly participants: typeof Participant,
        @InjectModel(User) private readonly users: typeof User,
    ) {}

    async createRoom(dto: CreateRoomDto) {
        //first we make sure that the host user actually exists
        const host = await this.users.findByPk(dto.hostId);
        if(!host){
            throw new NotFoundException('Host user not found');
        }

        //roomCode must be unique
        const code = dto.roomCode.trim().toUpperCase();
        const taken = await this.rooms.findOne({
            where: {roomCode:code}
        });
        if(taken){
            throw new ConflictException('Room code already in use');
        }

        //crete the room and hostid marks the creator
        const room = await this.rooms.create({
            roomCode: code,
            hostId: host.id,
        });

        //also we add the host as a participant only 
        await this.participants.create({
            roomId: room.id,
            userId: host.id,
          });

        return {
            ok: true,
            room: {
                id: room.id,
                roomCode: room.roomCode,
                name: room.name,
                hostId: room.hostId,
                status: room.status,
            },
        };
    }

    async joinRoom(roomId: string, userId: string) {
        const room = await this.rooms.findByPk(roomId);
        if(!room){
            throw new NotFoundException('Room not found');
        }

        const user = await this.users.findByPk(userId);
        if(!user){
            throw new NotFoundException('User not found');
        }

        //Already joined? unique index on (room_id, user_id) would also catch this
        const existing = await this.participants.findOne({
            where: {roomId:room.id, userId: user.id},
        });
        if (existing){
            //if they left earlier, we can clear the leftAt here later
            return{
                ok: true,
                message: 'Already in this room',
                participantId: existing.id,
            };
        }

        const participant = await this.participants.create({
            roomId: room.id,
            userId: user.id,
        });

        return {
            ok:true,
            participant:{
                id:participant.id,
                roomId:participant.roomId,
                userId:participant.userId,
                joinedAt:participant.joinedAt,
            },
        };
    }

    async getRoom(roomId: string){
        //load the related data into association property names
        const room = await this.rooms.findByPk(roomId,{
            include: ['host','members'],
        });

        if (!room){
            throw new NotFoundException('Room not found');
        }
        return {
            ok:true,
            room:{  
                id: room.id,
                roomCode: room.roomCode,
                name: room.name,
                status: room.status,
                hostId: room.hostId,
                //host comes from belongsto on room
                host: room.host
                ? {
                    id: room.host.id,
                    name: room.host.name,
                    email: room.host.email
                } : null,
                //members comes from belongstomany throught participant
                members: (room.members ??[]).map((u)=>({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                })),
            },
        };
    }

    async getRoomByCode (roomCode:string){
        const code = roomCode.trim().toUpperCase();
        const room = await this.rooms.findOne({ // gets the complete row by roomcode.
            where: {roomCode:code},
        });

        if(!room){
            throw new NotFoundException('Room not found');
        }

        return {
            ok: true,
            room: {
                id: room.id,
                roomCode: room.roomCode,
                name: room.name,
                status: room.status,
                hostId: room.hostId,
            },
        };
  
    }

    async isParticipant(roomId: string, userId:string) : Promise<boolean> {
        const participant = await this.participants.findOne({
            where: {roomId,userId},
        });
        return participant !== null;
    }
}