import { build } from '../src/server.js';

let app: any;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await build();
    await app.ready();
  }
  app.server.emit('request', req, res);
}
