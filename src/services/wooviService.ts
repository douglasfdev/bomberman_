import axios from 'axios';

interface WooviCustomer {
  name: string;
  email: string;
  phone?: string;
  taxID?: string;
}

export interface CreateChargePayload {
  correlationID: string;
  value: number; // Em centavos
  type: 'DYNAMIC' | 'FIXED';
  customer?: WooviCustomer;
  comment?: string;
}

export class WooviService {
  private readonly apiKey = process.env['WOOVI_API_KEY'] || '';
  private readonly baseUrl = `${process.env['WOOVI_API_BASE_URL'] || 'https://api.woovi.com'}/api/v1/charge`;

  async createCharge(payload: CreateChargePayload) {
    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': this.apiKey || '',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao chamar API Woovi:', error.response?.data || error.message);
      throw new Error('Falha ao gerar cobrança Pix');
    }
  }
}
