import { prismaClient } from '../services/prisma';

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
    const { correlationId, value, provider, encryptedEmail, encryptedTaxId, customerName } = payload;

    await this.prisma.payment.upsert({
      where: {
        correlationId: correlationId,
      },
      update: {
        status: 'COMPLETED',
        value: value,
        provider: provider,
      },
      create: {
        correlationId: correlationId,
        status: 'COMPLETED',
        value: value,
        provider: provider,
        user: {
          connectOrCreate: {
            create: {
              name: customerName,
              email: encryptedEmail,
              identification: encryptedTaxId,
            },
            where: {
              email: encryptedEmail,
            },
          },
        }
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

    // TODO: The 'Transaction' model does not exist in 'prisma/schema.prisma'.
    // This method needs to be reviewed. The original code was:
    // await this.prisma.transaction.create({
    //   data: {
    //     userId,
    //     encryptedData,
    //     metadata,
    //   },
    // });
    console.log(`Secure transaction data for user ${userId}: ${encryptedData}`, metadata);
    return Promise.resolve();
  }
}