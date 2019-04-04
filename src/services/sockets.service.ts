import { inject } from '@loopback/core';
import { post, put } from 'superagent';
import { Socket } from '../models/socket.model';
import { Logger } from 'winston';

export class SocketsService {

    @inject('logger')
    private logger: Logger;

    @inject('api.jobs')
    private jobsApi: string;

    async createSocket(socket: Socket): Promise<Socket> {
        try {
            this.logger.debug('Creating socket');
            let res = await post(`${this.jobsApi}/sockets`).send(socket);

            this.logger.debug(res.body);
            return res.body;
        } catch (error) {
            this.logger.error(error);
            return socket;
        }
    }

    async updateSocket(socket: Socket) {
        try {
            this.logger.debug('Creating socket');
            let res = await put(`${this.jobsApi}/sockets/${socket.id}`).send(socket);

            this.logger.debug(res.body);
            return res.body;
        } catch (error) {
            this.logger.error(error);
            return socket;
        }
    }
}
