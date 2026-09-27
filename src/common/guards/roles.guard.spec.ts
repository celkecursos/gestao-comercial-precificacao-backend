import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const contextFor = (role?: Role) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { id: 1, role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  afterEach(() => jest.restoreAllMocks());

  it('libera rotas sem @Roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextFor(Role.User))).toBe(true);
  });

  it('libera usuário com o papel exigido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Admin]);
    expect(guard.canActivate(contextFor(Role.Admin))).toBe(true);
  });

  it('bloqueia usuário sem o papel exigido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Admin]);
    expect(() => guard.canActivate(contextFor(Role.User))).toThrow(
      ForbiddenException,
    );
  });
});
