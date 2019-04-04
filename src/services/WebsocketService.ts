import { inject } from '@loopback/core';
import * as WebSocket from 'ws';
import { Script } from '../models/script.model';
import { SocketsService } from './sockets.service';
import * as uuid from 'uuid/v4';
import { Socket } from '../models/socket.model';

export class WebsocketService {

    @inject('services.sockets')
    private socketsService: SocketsService;

    @inject('config.job.id')
    private jobId: string;

    async createConnection(script: Script) {

        const socket = await this.socketsService.createSocket({id: uuid(), jobId: this.jobId});

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(script.target, {handshakeTimeout: 5000});

            ws.on('open', async () => {
                await this.open(socket);
                resolve(ws);
            });

            ws.on('error', async (err) => {
                await this.error(socket);
                reject(err)
            });

            ws.on('close', () => this.close(socket));
        });
    }

    private async open(socket: Socket) {
        await this.socketsService.updateSocket({...socket, connected: true, connectionTime: new Date()});
    }

    private async error(socket: Socket) {
        await this.socketsService.updateSocket({...socket, hasError: true, errorTime: new Date()});
    }

    private async close(socket: Socket) {
        await this.socketsService.updateSocket({...socket, disconnectTime: new Date()});
    }
}
