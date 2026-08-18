import { Router } from 'express';
import { CreateChargePayload, WooviService } from '../services/wooviService';
import { randomUUIDv7 } from 'node:crypto';
import { EncryptionService } from '../utils/encryption.util';
import { TransactionService } from '../services/transaction.service';

const router = Router();
const wooviService = new WooviService();

// Instâncias de serviço (Em um app real, use Injeção de Dependência ou um Singleton)
const encryptionService = new EncryptionService(
  process.env.ENCRYPTION_MASTER_PASSWORD || 'default_password',
  process.env.ENCRYPTION_SALT || 'default_salt'
);
const transactionService = new TransactionService();

router.post('/generate-payment', async (req, res) => {
  const { amount, customerName, customerEmail, identification } = req.body;
  const user = (req as any).user; // Obtido via Passport middleware

  try {
    const correlationID = randomUUIDv7();
    const payload = {
      correlationID: correlationID,
      value: amount,
      type: 'DYNAMIC' as const,
      customer: {
        name: customerName,
        email: customerEmail,
        taxID: identification
      },
      comment: 'Pagamento de item do jogo'
    } satisfies CreateChargePayload;

    // --- LÓGICA DE PERSISTÊNCIA CIFRADA ---
    // Se houver um usuário logado e uma identificação (CPF) fornecida, salvamos de forma segura
    if (user && identification) {
      await transactionService.createSecureTransaction(
        user.id,
        identification,
        (data) => encryptionService.encrypt(data),
        { 
          correlationID, 
          amount, 
          customerEmail, 
          customerName 
        }
      );
    }
    // ---------------------------------------

    const charge = await wooviService.createCharge(payload);

    res.status(201).json({
      success: true,
      correlationID: payload.correlationID,
      chargeData: charge
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
