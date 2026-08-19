import { Router } from 'express';
import { io } from '../server'; // Importando o io exportado do server.ts
import { EncryptionService } from '../utils/encryption.util';
import { TransactionService } from './transaction.service';

const router = Router();
const transactionService = new TransactionService();
const encryptionService = new EncryptionService(
  process.env['ENCRYPTION_MASTER_PASSWORD'] || 'default_password',
  process.env['ENCRYPTION_SALT'] || 'default_salt'
);

router.post('/woovi-webhook', async (req, res) => {
  const event = req.body;

  console.log('🔔 Webhook Woovi recebido:', event.event);

  if (event.event === 'OPENPIX:CHARGE_COMPLETED') {
    const customer = event.data?.customer;
    const charge = event.data?.charge;

    // Garante que temos os dados essenciais para registrar o pagamento
    if (customer?.email && customer?.taxID && charge?.correlationID) {
      console.log(`✅ Pagamento confirmado para: ${customer.email} (ID: ${charge.correlationID})`);

      try {
        // 1. Criptografar os dados sensíveis usando o serviço de criptografia
        const encryptedEmail = encryptionService.encrypt(customer.email);
        const encryptedTaxID = encryptionService.encrypt(customer.taxID);

        // 2. Chamar o serviço de transação para persistir os dados de forma idempotente.
        //    Este método deve ser implementado no seu `transaction.service.ts`
        //    para interagir com o Prisma e salvar/atualizar a transação.
        await transactionService.recordSuccessfulPayment({
          correlationId: charge.correlationID,
          value: charge.value,
          provider: 'woovi',
          encryptedEmail: encryptedEmail,
          encryptedTaxId: encryptedTaxID,
          customerName: customer.name,
        });

        // 3. Notificar o frontend via Socket.io que o pagamento foi aprovado
        io?.to(customer.email).emit('payment_approved', {
          isDonor: true,
          provider: 'woovi'
        });

      } catch (err) {
        console.error('Erro ao processar webhook de pagamento confirmado:', err);
        // Dependendo da sua estratégia, você pode querer retornar um status 500
        // para que a Woovi tente reenviar o webhook.
      }
    }
  }

  if (event.event === 'OPENPIX:CHARGE_CREATED') {
    console.log('ℹ️ Cobrança Woovi criada.');
  }

  res.status(200).send('OK');
});

export default router;
