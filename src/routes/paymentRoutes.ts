import { Router } from 'express';
import { CreateChargePayload, WooviService } from '../services/wooviService';
import { randomUUID } from 'node:crypto'; // Usar randomUUID padrão
import { UserService } from '../services/userService';
import { prismaClient } from '../server';

const router = Router();
const wooviService = new WooviService();
const userService = new UserService();
const prisma = prismaClient;

router.post('/generate-payment', async (req : any, res : any) => {
  const { amount, customerName, customerEmail } = req.body;

  // Validação básica dos dados de entrada
  if (!amount || !customerName || !customerEmail) {
    return res.status(400).json({ success: false, error: 'Dados do cliente e valor são obrigatórios.' });
  }

  try {
    // 1. Encontra ou cria o usuário de forma segura
    const user = await userService.findOrCreateUserByEmail(customerEmail, customerName);

    // 2. Gera um ID de correlação único para a transação
    const correlationID = randomUUID();

    // 3. Cria um registro de pagamento PENDENTE no nosso banco de dados
    //    Este registro conecta o usuário à transação antes mesmo de ela ser paga.
    await prisma.payment.create({
      data: {
        correlationId: correlationID,
        value: amount, // Assumindo que 'amount' já está em centavos
        status: 'PENDING',
        userId: user.id,
      }
    });

    // 4. Prepara e envia a cobrança para a Woovi com os dados em texto puro
    const wooviPayload: CreateChargePayload = {
      correlationID: correlationID,
      value: amount,
      customer: {
        name: customerName,
        email: customerEmail,
      },
      type: 'DYNAMIC'
    };

    const charge = await wooviService.createCharge(wooviPayload);

    // 5. Retorna os dados da cobrança para o frontend renderizar o QR Code
    res.status(201).json({
      success: true,
      correlationID: correlationID,
      chargeData: {
        brCode: charge.brCode,
        qrCodeImage: charge.qrCodeImage,
      }
    });

  } catch (error: any) {
    console.error('Erro ao gerar pagamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
