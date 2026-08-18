import { renderModule } from '@angular/platform-server';
// O caminho abaixo é uma suposição baseada em uma estrutura padrão de projeto Angular
import { AppServerModule } from '../../../../src/app/app-server.module';

export class AngularNodeAppEngine {
  async render(url: string): Promise<string> {
    try {
      return await renderModule(AppServerModule, { url });
    } catch (error) {
      console.error('Erro ao renderizar o módulo Angular no servidor:', error);
      throw error;
    }
  }
}
