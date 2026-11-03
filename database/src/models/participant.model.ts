import {
  Table, Column, Model, DataType, PrimaryKey, Default, AllowNull,
  ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import type { NonAttribute, Optional } from 'sequelize';
import { User } from './user.model.js';
import { Room } from './room.model.js';


export interface ParticipantAttributes {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: Date;
  leftAt: Date | null;
}

export type ParticipantCreationAttributes = Optional<
  ParticipantAttributes,
  'id' | 'joinedAt' | 'leftAt'
>;

@Table({ tableName: 'participants', underscored: true, timestamps: true })
export class Participant extends Model<ParticipantAttributes, ParticipantCreationAttributes> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Room)
  @AllowNull(false)
  @Column(DataType.UUID)
  roomId!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  joinedAt!: Date;

  @Column(DataType.DATE)
  leftAt!: Date | null;

  @BelongsTo(() => Room, { foreignKey: 'roomId', onDelete: 'CASCADE' })
  room?: Room;

  @BelongsTo(() => User, { foreignKey: 'userId', onDelete: 'CASCADE' })
  user?: User;
}


