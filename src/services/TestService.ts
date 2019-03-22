import { inject } from '@loopback/core';
import { WebsocketService } from './WebsocketService';
import { Logger } from 'winston';
import { timesLimit } from 'async';

export class TestService {

    @inject('logger')
    private logger: Logger;

    @inject('services.websocket')
    private websocketService: WebsocketService;

    @inject('task.totalSimulatedUsers')
    private totalSimulatedUsers: number;

    @inject('task.runTime')
    private runTime: number;

    async runTest() {
        this.logger.info('Running test');
        const webSockets: WebSocket[] = await this.startConnections();

        this.logger.info(`Waiting for ${this.runTime} seconds`);
        await this.waitForTimeout();

        this.logger.info('Shutting down sockets');
        await this.shutdownConnections(webSockets);

        this.logger.info('All sockets have been shut down');
    }

    private async startConnections(): Promise<WebSocket[]> {
        return await new Promise((resolve) => {

            this.logger.info(`Simulating ${this.totalSimulatedUsers} users`);

            timesLimit(this.totalSimulatedUsers, 50, (n, next) => {
                this.websocketService.createConnection()
                    .then(ws => next(null, ws))
                    .catch(err => next(err))
            }, (err, sockets: WebSocket[]) => {
                this.logger.info('All sockets have connected');
                resolve(sockets);
            });
        });
    }

    private async shutdownConnections(webSockets: WebSocket[]) {
        await new Promise((resolve) => {
            timesLimit(webSockets.length, 50, (n, next) => {
                if (webSockets[n]) {
                    webSockets[n].close();
                }
                next();
            }, () => resolve());
        });
    }

    private async waitForTimeout() {
        await new Promise(resolve => setTimeout(() => resolve(), this.runTime))
    }
}
