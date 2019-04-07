import {inject} from '@loopback/core';
import * as WebSocket from 'ws';
import {Script} from '../models/script.model';
import {SocketsService} from './sockets.service';
import * as uuid from 'uuid/v4';
import {Socket} from '../models/socket.model';
import {Logger} from 'winston';

export class WebsocketService {

    @inject('logger')
    private logger: Logger;

    @inject('services.sockets')
    private socketsService: SocketsService;

    @inject('config.job.id')
    private jobId: string;

    async createConnection(script: Script) {

        let socket = await this.socketsService.createSocket({id: uuid(), jobId: this.jobId});

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(script.target, {handshakeTimeout: 5000});

            ws.on('open', async () => {
                await this.open(socket);
                resolve(ws);
            });

            ws.on('error', async (err) => {
                await this.error(socket);
                reject(err);
            });

            ws.on('close', async () => {
                await this.close(socket);
            });
        });
    }

    private async open(socket: Socket) {
        this.logger.debug('Opened websocket');
        return await this.socketsService.updateSocket({...socket, connected: true, connectionTime: new Date()});
    }

    private async error(socket: Socket) {
        this.logger.debug('Websocket has error');
        return await this.socketsService.updateSocket({...socket, hasError: true, errorTime: new Date()});
    }

    private async close(socket: Socket) {
        this.logger.debug('Closing websocket now');
        return await this.socketsService.updateSocket({...socket, disconnectTime: new Date(), disconnected: true});
    }
}
