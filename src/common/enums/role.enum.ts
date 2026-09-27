/**
 * Papéis de acesso do sistema.
 * Para criar um novo papel, adicione-o aqui e use @Roles(...) nas rotas.
 * O papel é armazenado como texto (varchar), portanto não exige migration.
 */
export enum Role {
  Admin = 'ADMIN',
  User = 'USER',
}
