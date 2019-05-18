import {inject} from '@loopback/core';
import {post, patch} from 'superagent';
import {Socket} from '../models/socket.model';
import {Logger} from 'winston';

/**
 * Service for communicating with the ws-flare-jobs-api
 */
export class SocketsService {

    @inject('logger')
    private logger: Logger;

    @inject('api.jobs')
    private jobsApi: string;

    /**
     * Stores web socket information in the ws-flare-jobs-api database
     *
     * @param socket - Socket data
     */
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

    /**
     * Updates a socket model stored in ws-flare-jobs-api database
     *
     * @param socket - The socket to update
     */
    async updateSocket(socket: Socket) {
        try {
            this.logger.debug('Updating socket');
            let res = await patch(`${this.jobsApi}/sockets/${socket.id}`).send(socket);

            this.logger.debug(res.body);
            return res.body;
        } catch (error) {
            this.logger.error(error);
            return socket;
        }
    }
}
