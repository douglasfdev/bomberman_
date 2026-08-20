import { Router } from 'express';
import { io } from '../server';
import { UserService } from '../services/userService';
import { SkinService } from '../services/skinService';
import { prismaClient } from '../services/prisma';

const router = Router();
const userService = new UserService();
const skinService = new SkinService();
const prisma = prismaClient;

router.post('/woovi-webhook', async (req: any, res: any) => {
  res.status(200).send('Recebido');
  const event = req.body;

  // Foco exclusivo no evento que confirma o pagamento
  if (event?.event === 'OPENPIX:CHARGE_COMPLETED') {
    const charge = event.data?.charge;
    const correlationId = charge?.correlationID;

    // Garante que o ID de correlação existe no payload do webhook
    if (!correlationId) {
      console.warn('Webhook de pagamento recebido sem correlationID.');
      return res.status(200).send('correlationID ausente.');
    }

    console.log(`✅ Webhook de pagamento confirmado recebido para ID: ${correlationId}`);

    try {
      // 1. Atualiza o pagamento de 'PENDING' para 'COMPLETED' de forma idempotente.
      //    A query busca por um pagamento que tenha o correlationId E o status PENDING.
      //    Se o webhook for processado uma segunda vez, não encontrará nada e não fará nada.
      const { count } = await prisma.payment.updateMany({
        where: {
          correlationId: correlationId,
          status: 'PENDING',
        },
        data: {
          status: 'COMPLETED',
        },
      });

      // 2. Se a atualização ocorreu (count > 0), significa que este é o primeiro processamento.
      if (count > 0) {
        // 3. Busca o pagamento recém-atualizado para obter o ID do usuário e o propósito.
        const payment = await prisma.payment.findUnique({
          where: { correlationId },
          select: { id: true, userId: true, purpose: true, value: true },
        });

        if (payment) {
          // 4. Verifica o propósito do pagamento para determinar a ação
          if (payment.purpose === 'skin_basic' || payment.purpose === 'skin_premium') {
            // Compra de skin — faz upgrade do tier
            const tier = payment.purpose === 'skin_basic' ? 'BASIC' : 'PREMIUM';
            await skinService.upgradeTier(payment.userId, tier as 'BASIC' | 'PREMIUM', payment.id, payment.value);
            console.log(`🎭 Usuário ${payment.userId} fez upgrade para tier ${tier}.`);

            // Notifica o frontend via Socket.io
            io.to(payment.userId).emit('skin_tier_upgraded', {
              tier,
              isDonor: true,
              provider: 'woovi',
            });

            // Também emite o evento padrão de pagamento aprovado
            io.to(payment.userId).emit('payment_approved', {
              isDonor: true,
              provider: 'woovi',
            });
            console.log(`🔌 Notificação de upgrade de skin enviada para a sala do usuário: ${payment.userId}`);
          } else {
            // Doação padrão — marca como doador
            await userService.markUserAsDonor(payment.userId);
            console.log(`👤 Usuário ${payment.userId} marcado como doador.`);

            // 5. Notifica o frontend via Socket.io em uma sala segura baseada no ID do usuário.
            //    (O frontend deve ser instruído a entrar na sala com seu ID de usuário).
            io.to(payment.userId).emit('payment_approved', {
              isDonor: true,
              provider: 'woovi',
            });
            console.log(`🔌 Notificação de pagamento enviado para a sala do usuário: ${payment.userId}`);
          }
        }
      } else {
        console.log(`👍 Webhook para ${correlationId} já foi processado anteriormente. Ignorando.`);
      }

    } catch (err) {
      console.error('Erro ao processar webhook de pagamento confirmado:', err);
      // Retornar 500 para que a Woovi possa tentar reenviar.
      return res.status(200).send('Erro interno ao processar webhook.');
    }
  }

  // Responde OK para qualquer outro tipo de evento para acusar o recebimento.
  res.status(200).send('OK');
});

export default router;
