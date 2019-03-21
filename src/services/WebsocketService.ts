import { inject } from '@loopback/core';
import * as WebSocket from 'ws';

export class WebsocketService {

    @inject('task.uri')
    private uri: string;

    async createConnection() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.uri);

            ws.on('open', () => {
                resolve(ws);
            });

            ws.on('error', (err) => reject(err))
        });
    }
}
