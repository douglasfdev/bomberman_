import { Router } from 'express';
import { WooviService } from '../services/wooviService';
import { randomUUID } from 'node:crypto';

const router = Router();
const wooviService = new WooviService();

router.post('/generate-payment', async (req, res) => {
  const { amount, customerName, customerEmail } = req.body;

  try {
    const correlationID = randomUUID();
    const payload = {
      correlationID: correlationID,
      value: amount, // Valor em centavos
      type: 'DYNAMIC' as const,
      customer: {
        name: customerName,
        email: customerEmail,
      },
      comment: 'Pagamento de item do jogo'
    };

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
