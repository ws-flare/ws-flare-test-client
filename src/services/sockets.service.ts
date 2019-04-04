import { inject } from '@loopback/core';
import { post, put } from 'superagent';
import { Socket } from '../models/socket.model';

export class SocketsService {

    @inject('api.jobs')
    private jobsApi: string;

    async createSocket(socket: Socket): Promise<Socket> {
        let res = await post(`${this.jobsApi}/sockets`).send(socket);

        return res.body;
    }

    async updateSocket(socket: Socket) {
        let res = await put(`${this.jobsApi}/sockets`).send(socket);

        return res.body;
    }
}
