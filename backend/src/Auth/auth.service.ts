import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '@callneo/database';
import * as bcrypt from 'bcrypt';

  @Injectable()
  export class AuthService {
    //inject the sequelize User model class here
    constructor(
        @InjectModel(User) private readonly users: typeof User,
    ) {}

  
    async signup(name:string, email:string, password:string) {
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        const existing =  await this.users.findOne({
            where: {email:cleanEmail},
        });
        if(existing){
            throw new ConflictException('Email is already registered');
        }
        //if not registered we hash the password. 10 is the cost factor 
        const passwordHashed = await bcrypt.hash(password,10);

        // now we are ready to insert a row into postgres "users"
        const user = await this.users.create({
            name: cleanName,
            email: cleanEmail,
            passwordHashed,
        })

        //now we return to client, NO HASHED PASSWORD
        return{
            ok: true,
            user : {
                id: user.id,
                name: user.name,
                email: user.email,
            }
        }
    }
    async login(email:string, password:string) {
        const cleanEmail = email.trim().toLowerCase();

        const user = await this.users.findOne({
            where: {email: cleanEmail},
        });
        
        //we are throwing the same error for both cases to handle attackers
        if(!user) {
            throw new UnauthorizedException('Invalid email or password');
        }
        const match = await bcrypt.compare(password, user.passwordHashed);
        if(!match){
            throw new UnauthorizedException('Invalid email or password');
        }

        return {
            ok: true,
            user: {
                id:user.id,
                name: user.name,
                email: user.email,
            },
        };
    }
  }