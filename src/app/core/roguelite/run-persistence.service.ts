import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RunDTO, DraftDTO, ChoicePayload, EndRunPayload, CardDTO, EnemyArchetypeDTO } from '../models/run.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RunPersistenceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/roguelite`;

  async startRun(): Promise<RunDTO> {
    const run = await firstValueFrom(this.http.post<RunDTO>(`${this.baseUrl}/runs`, {}));
    return run;
  }

  async getRun(runId: string): Promise<RunDTO | null> {
    try {
      return await firstValueFrom(this.http.get<RunDTO>(`${this.baseUrl}/runs/${runId}`));
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async getDraft(runId: string, phase: number): Promise<DraftDTO> {
    return firstValueFrom(this.http.get<DraftDTO>(`${this.baseUrl}/runs/${runId}/draft?phase=${phase}`));
  }

  async applyChoice(runId: string, payload: ChoicePayload): Promise<{ choice: any; upgrade: any }> {
    return firstValueFrom(this.http.post<{ choice: any; upgrade: any }>(`${this.baseUrl}/runs/${runId}/choice`, payload));
  }

  async endRun(runId: string, payload: EndRunPayload): Promise<RunDTO> {
    return firstValueFrom(this.http.post<RunDTO>(`${this.baseUrl}/runs/${runId}/end`, payload));
  }

  async getHistory(limit: number, offset: number): Promise<RunDTO[]> {
    return firstValueFrom(this.http.get<RunDTO[]>(`${this.baseUrl}/runs/history/list?limit=${limit}&offset=${offset}`));
  }

  async getCardPool(): Promise<CardDTO[]> {
    return firstValueFrom(this.http.get<CardDTO[]>(`${this.baseUrl}/cards/pool`));
  }

  async getEnemyArchetypes(): Promise<EnemyArchetypeDTO[]> {
    return firstValueFrom(this.http.get<EnemyArchetypeDTO[]>(`${this.baseUrl}/enemies/archetypes`));
  }
}