import { prismaClient } from '../server';
import { EncryptionService } from '../utils/encryption.util';
type User = Awaited<ReturnType<typeof prismaClient.user.upsert>>;

export class UserService {
  private prisma: typeof prismaClient;
  private encryptionService: EncryptionService;

  constructor() {
    this.prisma = prismaClient;
    // Inicia o serviço de criptografia com as variáveis de ambiente
    this.encryptionService = new EncryptionService(
      process.env['ENCRYPTION_MASTER_PASSWORD'] || 'default_password',
      process.env['ENCRYPTION_SALT'] || 'default_salt'
    );
  }

  /**
   * Encontra ou cria um usuário com base no e-mail fornecido.
   * O e-mail é criptografado antes de ser armazenado ou buscado.
   * @param plainTextEmail O e-mail em texto puro.
   * @param name O nome do usuário (opcional).
   * @returns O registro do usuário encontrado ou criado.
   */
  async findOrCreateUserByEmail(plainTextEmail: string, name?: string): Promise<User> {
    const encryptedEmail = this.encryptionService.encrypt(plainTextEmail);

    const user = await this.prisma.user.upsert({
      where: { email: encryptedEmail },
      update: {
        // Se o usuário já existe e um novo nome for fornecido, atualiza.
        ...(name && { name }),
      },
      create: {
        email: encryptedEmail,
        name,
      },
    });

    return user;
  }

  /**
   * Marca um usuário como doador.
   * @param userId O ID do usuário a ser atualizado.
   */
  async markUserAsDonor(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isDonor: true },
    });
  }
}
