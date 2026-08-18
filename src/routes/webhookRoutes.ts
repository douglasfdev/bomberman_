import { Router } from 'express';
import { io } from '../server'; // Importando o io exportado do server.ts
import { EncryptionService } from '../utils/encryption.util';
import { TransactionService } from '../services/transaction.service';

const router = Router();
const transactionService = new TransactionService();
const encryptionService = new EncryptionService(
  process.env.ENCRYPTION_MASTER_PASSWORD || 'default_password',
  process.env.ENCRYPTION_SALT || 'default_salt'
);

router.post('/woovi-webhook', async (req, res) => {
  const event = req.body;

  console.log('🔔 Webhook Woovi recebido:', event.event);

  if (event.event === 'OPENPIX:CHARGE_COMPLETED') {
    const userEmail = event.data?.customer?.email; 
    
    if (userEmail) {
      console.log(`✅ Pagamento confirmado para: ${userEmail}`);
      
      // --- LÓGICA DE PERSISTÊNCIA CIFRADA ---
      // Registramos o evento do webhook de forma segura para auditoria
      try {
        await transactionService.createSecureTransaction(
          userEmail,
          'WEBHOOK_EVENT_LOG', // Identificador do tipo de dado
          (data) => encryptionService.encrypt(data),
          { 
            event: event.event, 
            provider: 'woovi',
            payload: event.data // O payload completo do evento fica guardado no metadata (não cifrado)
          }
        );
      } catch (err) {
        console.error('Erro ao salvar log de transação no webhook:', err);
      }
      // ---------------------------------------

      // Notifica o frontend via Socket.io
      io?.to(userEmail).emit('payment_approved', { 
        isDonor: true, 
        provider: 'woovi' 
      });
    }
  }

  if (event.event === 'OPENPIX:CHARGE_CREATED') {
    console.log('ℹ️ Cobrança Woovi criada.');
  }

  res.status(200).send('OK');
});

export default router;
