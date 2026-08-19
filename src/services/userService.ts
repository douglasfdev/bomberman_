import { prismaClient } from '../server';

export class UserService {
  private prisma: typeof prismaClient;

  constructor() {
    this.prisma = prismaClient;
  }

  async findOrCreateAndMarkAsDonor(email: string, name?: string): Promise<void> {
    await this.prisma.user.upsert({
      where: { email },
      update: { isDonor: true },
      create: {
        email,
        name,
        isDonor: true,
      },
    });
  }
}