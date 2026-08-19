import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Interface para a resposta esperada do seu backend
export interface PixChargeResponse {
  success: boolean;
  correlationID: string;
  chargeData: {
    brCode: string; // O código Pix Copia e Cola
    qrCodeImage: string; // A imagem do QR Code em base64
  };
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  // Ajuste a URL para o endereço do seu backend
  private backendUrl = '/api/payments'; // Usando rota relativa para SSR

  constructor(private http: HttpClient) { }

  generatePixCharge(payload: { amount: number; customerName: string; customerEmail: string; identification: string }): Observable<PixChargeResponse> {
    return this.http.post<PixChargeResponse>(`${this.backendUrl}/generate-payment`, payload);
  }
}