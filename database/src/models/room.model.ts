import {
  Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, Unique,
  ForeignKey, BelongsTo, HasMany, HasOne, BelongsToMany,
} from 'sequelize-typescript';
import type { NonAttribute, Optional } from 'sequelize';
import { User } from './user.model.js';
import { Participant } from './participant.model.js';

export type RoomStatus = 'waiting' | 'live' | 'ended';

export interface RoomAttributes {
  id: string;
  roomCode: string;
  name: string | null;
  hostId: string;
  status: RoomStatus;
  maxParticipants: number;
  startedAt: Date | null;
  endedAt: Date | null;
}

export type RoomCreationAttributes = Optional<
  RoomAttributes,
  'id' | 'name' | 'status' | 'maxParticipants' | 'startedAt' | 'endedAt'
>;

@Table({ tableName: 'rooms', underscored: true, timestamps: true })
export class Room extends Model<RoomAttributes, RoomCreationAttributes> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(12))
  roomCode!: string;

  @Column(DataType.STRING(100))
  name!: string | null;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  hostId!: string;

  @AllowNull(false)
  @Default('waiting')
  @Column(DataType.ENUM('waiting', 'live', 'ended'))
  status!: RoomStatus;

  @AllowNull(false)
  @Default(10)
  @Column(DataType.INTEGER)
  maxParticipants!: number;

  @Column(DataType.DATE)
  startedAt!: Date | null;

  @Column(DataType.DATE)
  endedAt!: Date | null;

  // MANY-TO-ONE: the user who owns this room
  @BelongsTo(() => User, { foreignKey: 'hostId', onDelete: 'CASCADE' })
  host?: User;

  // ONE-TO-MANY: all membership rows in this room
  @HasMany(() => Participant, 'roomId')
  participants?: Participant[];

  // MANY-TO-MANY: users in this room
  @BelongsToMany(() => User, () => Participant, 'roomId', 'userId')
  members?: User[];
}
