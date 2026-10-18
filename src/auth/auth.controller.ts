import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ApiErrorResponses } from '../common/swagger/api-responses.decorator';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  PASSWORD_RESET_TTL_MINUTES,
  PasswordResetService,
} from './password-reset.service';
import {
  FORGOT_PASSWORD_LIMIT_PER_EMAIL,
  FORGOT_PASSWORD_LIMIT_PER_IP,
  FORGOT_PASSWORD_WINDOW_MINUTES,
} from './password-reset.throttle';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

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
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Solicita o link de redefinição de senha por e-mail',
    description:
      'Responde sempre 204, exista ou não um usuário ativo com o e-mail, para não revelar quais e-mails estão cadastrados. ' +
      `Se existir, envia um link válido por ${PASSWORD_RESET_TTL_MINUTES} minutos, de uso único; um pedido novo invalida os anteriores. ` +
      `Limite: ${FORGOT_PASSWORD_LIMIT_PER_IP} pedidos por IP e ${FORGOT_PASSWORD_LIMIT_PER_EMAIL} por e-mail a cada ${FORGOT_PASSWORD_WINDOW_MINUTES} minutos (429).`,
  })
  @ApiNoContentResponse({ description: 'Pedido recebido' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.TOO_MANY_REQUESTS)
  forgotPassword(@Body() dto: ForgotPasswordDto): void {
    this.passwordResetService.requestReset(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Define uma nova senha com o token recebido por e-mail',
    description:
      'O token expira e vale uma única vez. Após a redefinição, todos os tokens JWT emitidos antes deixam de valer. ' +
      'Token inválido, expirado ou já usado responde 400 com a mesma mensagem.',
  })
  @ApiNoContentResponse({ description: 'Senha redefinida' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.passwordResetService.resetPassword(dto);
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
