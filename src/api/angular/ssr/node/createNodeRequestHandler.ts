import { Request, Response } from 'express';
import { AngularNodeAppEngine } from './AngularNodeAppEngine';
import { writeResponseToNodeResponse } from './writeResponseToNodeResponse';

export function createNodeRequestHandler(engine: AngularNodeAppEngine) {
  return async (req: Request, res: Response) => {
    const url = req.url;
    try {
      const html = await engine.render(url);
      writeResponseToNodeResponse(res, html);
    } catch (error) {
      console.error('Erro no handler de requisição Node/SSR:', error);
      res.status(500).send('Erro interno ao processar a requisição SSR.');
    }
  };
}
