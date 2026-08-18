import { Response } from 'express';

export function writeResponseToNodeResponse(res: Response, html: string): void {
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}
