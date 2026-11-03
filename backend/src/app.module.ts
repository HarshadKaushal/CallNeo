import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { User, Room, Participant } from '@callneo/database';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './Auth/auth.module.js';
import { RoomModule } from './Rooms/room.module.js';
import { MediasoupModule  } from './mediasoup/mediasoup.module.js';
import { CallModule } from './call/call.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'postgres',
        uri: config.getOrThrow<string>('DATABASE_URL'),
        models: [User, Room, Participant],
        synchronize: false, // migrations own the schema
        logging: false,
      }),
    }),
    AuthModule, // auth lives here now
    RoomModule,
    MediasoupModule,
    CallModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}