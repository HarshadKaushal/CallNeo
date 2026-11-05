import {Body, Controller, Post, HttpCode, HttpStatus} from '@nestjs/common'
import {AuthService} from './auth.service.js'
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js'
  
  @Controller('auth')
  export class AuthController {
    constructor(private readonly authService: AuthService) {}
  
    @Post('signup')
    signup(@Body() body: SignupDto){ 
      //if we are here then the validation pipeline has already checked the body.
      return this.authService.signup(
        body.name, 
        body.email,
        body.password);
    }
  
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(
      @Body() 
      body: LoginDto){
      return this.authService.login(
        body.email, 
        body.password);
    }
  }