import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '@callneo/database';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  // Make User injectable in this module's services
  imports: [SequelizeModule.forFeature([User])],

  controllers: [AuthController],
  providers: [AuthService],

  // export later if another module needs AuthService
  exports: [AuthService],
})
export class AuthModule {}
