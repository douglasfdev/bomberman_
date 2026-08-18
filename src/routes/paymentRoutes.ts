import { Router } from 'express';
import { CreateChargePayload, WooviService } from '../services/wooviService';
import { randomUUIDv7, scrypt } from 'node:crypto';

const router = Router();
const wooviService = new WooviService();

router.post('/generate-payment', async (req, res) => {
  const { amount, customerName, customerEmail, identification } = req.body;

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
