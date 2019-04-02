import { inject } from '@loopback/core';
import { WebsocketService } from './WebsocketService';
import { Logger } from 'winston';
import { timesLimit } from 'async';
import { Script } from '../models/script.model';

export class TestService {

    @inject('logger')
    private logger: Logger;

    @inject('services.websocket')
    private websocketService: WebsocketService;

    async runTest(script: Script): Promise<{ successful: number, failed: number, dropped: number }> {
        this.logger.info('Waiting for start timeout');
        await this.waitForTimeout(script.start);

        this.logger.info('Running test');
        const {sockets, successful, failed, dropped} = await this.startConnections(script);

        this.logger.info(`Total successful: ${successful}`);
        this.logger.info(`Total successful: ${failed}`);
        this.logger.info(`Total successful: ${dropped}`);
        this.logger.info('Shutting down sockets');
        await this.shutdownConnections(sockets);

        this.logger.info('All sockets have been shut down');

        return {successful, failed, dropped};
    }

    private async startConnections(script: Script):
        Promise<{ sockets: WebSocket[], successful: number, failed: number, dropped: number }> {

        let successful = 0;
        let failed = 0;
        let dropped = 0;

        return await new Promise((resolve) => {

            this.logger.info(`Simulating ${script.totalSimulators} users`);

            timesLimit(script.totalSimulators, 50, (n, next) => {
                this.websocketService.createConnection(script)
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
                this.logger.info(`Waiting for ${script.timeout} seconds`);
                this.waitForTimeout(script.timeout).then(() => resolve({sockets, successful, failed, dropped}));
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

    private async waitForTimeout(timeout: number) {
        await new Promise(resolve => setTimeout(() => resolve(), timeout))
    }
}
