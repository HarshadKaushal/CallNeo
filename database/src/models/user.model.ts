import { 
  Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, Unique, 
  IsEmail, HasMany, BelongsToMany} from 'sequelize-typescript';
import type {Optional} from 'sequelize';
import {Room} from './room.model';
import {Participant} from './participant.model';

export interface UserAttributes{
  id: string;
  name:string;
  email:string;
  passwordHashed:string;
}

export type UserCreationAttributes = Optional<UserAttributes, 'id'>;

@Table({ tableName: 'users', underscored: true, timestamps:true})
export class User extends Model<UserAttributes, UserCreationAttributes> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  name!: string;

  @AllowNull(false)
  @Unique
  @IsEmail
  @Column(DataType.STRING(255))
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  passwordHashed!: string;

  // ONE-TO-MANY: rooms this user created/hosts
  @HasMany(() => Room, 'hostId')
  hostedRooms?: Room[];

  // ONE-TO-MANY: every room membership (row in participant model where this user is )
  @HasMany(() => Participant, 'userId')
  participations?: Participant[];

  // MANY-TO-MANY: rooms this user has joined
  @BelongsToMany(() => Room, () => Participant, 'userId', 'roomId')
  rooms?: Room[];
}
