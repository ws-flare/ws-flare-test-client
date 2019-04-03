import * as WebSocket from 'ws';
import { Script } from '../models/script.model';

export class WebsocketService {

    async createConnection(script: Script) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(script.target, {handshakeTimeout: 5000});

            ws.on('open', () => {
                resolve(ws);
            });

            ws.on('error', (err) => reject(err))
        });
    }
}
