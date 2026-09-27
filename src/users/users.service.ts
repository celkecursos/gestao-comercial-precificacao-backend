import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { Role } from '../common/enums/role.enum';
import { PasswordService } from '../common/security/password.service';
import { toPaginatedResult, toSkipTake } from '../common/utils/pagination.util';
import { containsText } from '../common/utils/search.util';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly passwordService: PasswordService,
  ) {}

  async findAll(query: QueryUsersDto): Promise<PaginatedResult<User>> {
    const filters: FindOptionsWhere<User> = {};
    if (query.role) filters.role = query.role;
    if (query.active !== undefined) filters.active = query.active;

    const where = query.search
      ? [
          { ...filters, name: containsText(query.search) },
          { ...filters, email: containsText(query.search) },
        ]
      : filters;

    const [data, total] = await this.usersRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      ...toSkipTake(query),
    });
    return toPaginatedResult(data, total, query);
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  /** Retorna o usuário com o hash da senha (usado apenas na autenticação). */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  /** Retorna o usuário com o hash da senha (usado apenas na autenticação). */
  async findOneWithPassword(id: number): Promise<User> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    await this.ensureEmailIsAvailable(dto.email);

    const user = this.usersRepository.create({
      ...dto,
      role: dto.role ?? Role.User,
      password: await this.passwordService.hash(dto.password),
    });
    const saved = await this.usersRepository.save(user);
    return this.findOne(saved.id);
  }

  /**
   * Atualiza um usuário. `actingUserId` é o usuário que executa a ação, usado para impedir
   * que um administrador remova o próprio acesso (papel ou status).
   */
  async update(
    id: number,
    dto: UpdateUserDto,
    actingUserId?: number,
  ): Promise<User> {
    const user = await this.findOne(id);

    if (id === actingUserId) {
      if (dto.role !== undefined && dto.role !== user.role) {
        throw new BadRequestException(
          'Você não pode alterar o seu próprio papel.',
        );
      }
      if (dto.active === false) {
        throw new BadRequestException('Você não pode desativar a si mesmo.');
      }
    }

    if (dto.email && dto.email !== user.email) {
      await this.ensureEmailIsAvailable(dto.email, id);
    }

    const { password, ...data } = dto;
    this.usersRepository.merge(user, data);
    await this.usersRepository.save(user);

    if (password) await this.updatePassword(id, password);

    return this.findOne(id);
  }

  setActive(id: number, active: boolean, actingUserId?: number) {
    return this.update(id, { active }, actingUserId);
  }

  async remove(id: number, actingUserId?: number): Promise<void> {
    if (id === actingUserId) {
      throw new BadRequestException('Você não pode excluir a si mesmo.');
    }
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  /**
   * Define uma nova senha e invalida os tokens já emitidos para o usuário.
   * Ponto único de alteração de senha — deve ser reutilizado por novos fluxos
   * (ex.: recuperação de senha).
   */
  async updatePassword(id: number, newPassword: string): Promise<void> {
    const hash = await this.passwordService.hash(newPassword);
    await this.usersRepository.update(id, { password: hash });
    await this.incrementTokenVersion(id);
  }

  /** Invalida todos os tokens JWT emitidos para o usuário. */
  async incrementTokenVersion(id: number): Promise<void> {
    await this.usersRepository.increment({ id }, 'tokenVersion', 1);
  }

  count(): Promise<number> {
    return this.usersRepository.count();
  }

  private async ensureEmailIsAvailable(
    email: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.usersRepository.findOneBy({ email });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }
  }
}
