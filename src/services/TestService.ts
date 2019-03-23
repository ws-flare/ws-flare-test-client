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

    async runTest(): Promise<{ successful: number, failed: number, dropped: number }> {
        this.logger.info('Running test');
        const {sockets, successful, failed, dropped} = await this.startConnections();

        this.logger.info(`Total successful: ${successful}`);
        this.logger.info(`Total successful: ${failed}`);
        this.logger.info(`Total successful: ${dropped}`);
        this.logger.info('Shutting down sockets');
        await this.shutdownConnections(sockets);

        this.logger.info('All sockets have been shut down');

        return {successful, failed, dropped};
    }

    private async startConnections(): Promise<{ sockets: WebSocket[], successful: number, failed: number, dropped: number }> {

        let successful = 0;
        let failed = 0;
        let dropped = 0;

        return await new Promise((resolve) => {

            this.logger.info(`Simulating ${this.totalSimulatedUsers} users`);

            timesLimit(this.totalSimulatedUsers, 50, (n, next) => {
                this.websocketService.createConnection()
                    .then((ws: any) => {
                        successful += 1;

                        ws.on('close', () => {
                            dropped += 1;
                            successful -= 1;
                        });

                        next(null, ws)
                    })
                    .catch(err => {
                        failed += 1;
                        next(err)
                    });
            }, (err, sockets: WebSocket[]) => {
                this.logger.info('All sockets have connected');
                this.logger.info(`Waiting for ${this.runTime} seconds`);
                this.waitForTimeout().then(() => resolve({sockets, successful, failed, dropped}));
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
