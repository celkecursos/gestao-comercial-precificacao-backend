import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ApiErrorResponses } from '../common/swagger/api-responses.decorator';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { PasswordResetMessageDto } from './dto/password-reset-message.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica com e-mail e senha e retorna um JWT' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicita o envio de um link para redefinição de senha',
    description:
      'A resposta é sempre genérica para não revelar se o e-mail está cadastrado.',
  })
  @ApiOkResponse({ type: PasswordResetMessageDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.TOO_MANY_REQUESTS)
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    return this.authService.forgotPassword(dto.email, request.ip ?? 'unknown');
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Redefine a senha usando um token válido e de uso único',
  })
  @ApiOkResponse({ type: PasswordResetMessageDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Encerra a sessão, invalidando todos os tokens do usuário',
  })
  @ApiNoContentResponse({ description: 'Sessão encerrada' })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED)
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o usuário autenticado' })
  @ApiOkResponse({ type: User })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza nome e/ou e-mail do próprio usuário' })
  @ApiOkResponse({ type: User })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.CONFLICT,
  )
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Patch('password')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Altera a própria senha e retorna um novo token',
    description:
      'Tokens emitidos anteriormente deixam de ser válidos após a troca de senha.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }
}
