import { Router } from 'express';
import { io } from '../server'; // Importando o io exportado do server.ts

const router = Router();

router.post('/woovi-webhook', (req, res) => {
  const event = req.body;

  console.log('🔔 Webhook Woovi recebido:', event.event);

  if (event.event === 'OPENPIX:CHARGE_COMPLETED') {
    // Aqui você deve buscar o usuário pelo correlationID ou email no seu banco
    // Exemplo hipotético:
    const userEmail = event.data?.customer?.email; 
    
    if (userEmail) {
      console.log(`✅ Pagamento confirmado para: ${userEmail}`);
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
