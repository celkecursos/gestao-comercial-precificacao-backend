import { ObjectLiteral, Repository } from 'typeorm';

export type RepositoryMock<T extends ObjectLiteral> = {
  [K in keyof Repository<T>]?: jest.Mock;
};

/**
 * Cria um mock de Repository do TypeORM para testes unitários de services.
 * `create` e `merge` reproduzem o comportamento real (montagem do objeto em memória).
 */
export function createRepositoryMock<
  T extends ObjectLiteral,
>(): RepositoryMock<T> {
  return {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    count: jest.fn(),
    create: jest.fn((data: Partial<T>) => ({ ...data })),
    merge: jest.fn((target: T, ...sources: Partial<T>[]) =>
      Object.assign(target, ...sources),
    ),
    save: jest.fn((entity: T) => Promise.resolve({ id: 1, ...entity })),
    update: jest.fn(),
    increment: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}
