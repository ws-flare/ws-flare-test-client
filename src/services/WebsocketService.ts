import {inject} from '@loopback/core';
import * as WebSocket from 'ws';
import {Script} from '../models/script.model';
import {SocketsService} from './sockets.service';
import * as uuid from 'uuid/v4';
import {Socket} from '../models/socket.model';

export class WebsocketService {

    @inject('services.sockets')
    private socketsService: SocketsService;

    @inject('config.job.id')
    private jobId: string;

    async createConnection(script: Script) {

        let socket = await this.socketsService.createSocket({id: uuid(), jobId: this.jobId});

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(script.target, {handshakeTimeout: 5000});

            ws.on('open', async () => {
                socket = {...socket, ...await this.open(socket)};
                resolve(ws);
            });

            ws.on('error', async (err) => {
                socket = {...socket, ...await this.error(socket)};
                reject(err)
            });

            ws.on('close', async () => {
                socket = {...socket, ...await this.close(socket)}
            });
        });
    }

    private async open(socket: Socket) {
        return await this.socketsService.updateSocket({...socket, connected: true, connectionTime: new Date()});
    }

    private async error(socket: Socket) {
        return await this.socketsService.updateSocket({...socket, hasError: true, errorTime: new Date()});
    }

    private async close(socket: Socket) {
        return await this.socketsService.updateSocket({...socket, disconnectTime: new Date()});
    }
}
