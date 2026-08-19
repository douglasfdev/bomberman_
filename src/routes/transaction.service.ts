import { prismaClient } from 'src/server';

// Interface para o payload do nosso novo método
interface SuccessfulPaymentPayload {
  correlationId: string;
  value: number;
  provider: string;
  encryptedEmail: string;
  encryptedTaxId: string;
  customerName?: string;
}

export class TransactionService {
  private prisma: typeof prismaClient;

  constructor() {
    this.prisma = prismaClient;
  }

  /**
   * Registra uma transação de pagamento bem-sucedida no banco de dados.
   * Utiliza `upsert` para garantir idempotência: se a transação já existir
   * (baseado no correlationId), ela é atualizada; senão, é criada.
   * Isso evita duplicidade caso o webhook seja recebido mais de uma vez.
   *
   * @param payload Os dados do pagamento confirmado.
   */
  async recordSuccessfulPayment(payload: SuccessfulPaymentPayload): Promise<void> {
    const { correlationId, ...data } = payload;

    await this.prisma.payment.upsert({
      where: {
        correlationId: correlationId,
      },
      update: {
        status: 'COMPLETED',
        ...data,
      },
      create: {
        correlationId: correlationId,
        status: 'COMPLETED',
        ...data,
      },
    });
  }

  async createSecureTransaction(
    userId: string,
    dataToEncrypt: string,
    encryptFn: (data: string) => string,
    metadata: object
  ): Promise<void> {
    const encryptedData = encryptFn(dataToEncrypt);

    await this.prisma.transaction.create({
      data: {
        userId,
        encryptedData,
        metadata,
      },
    });
  }
}