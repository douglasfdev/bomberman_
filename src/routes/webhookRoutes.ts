import { Router } from 'express';
import { io } from '../server'; // Importando o io exportado do server.ts
import { EncryptionService } from '../utils/encryption.util';
import { TransactionService } from './transaction.service';
import { UserService } from '../services/userService'; // 1. Importar o UserService

const router = Router();
const transactionService = new TransactionService();
const userService = new UserService(); // 2. Instanciar o serviço
const encryptionService = new EncryptionService( // (Mantido como está)
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
        // Passo 1: Criptografar e registrar a transação (lógica atual)
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

        // Passo 2: Encontrar o usuário pelo e-mail e marcá-lo como doador
        await userService.findOrCreateAndMarkAsDonor(customer.email, customer.name);
        console.log(`👤 Usuário ${customer.email} marcado como doador no banco de dados.`);

        // Passo 3: Notificar o frontend via Socket.io que o pagamento foi aprovado
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
