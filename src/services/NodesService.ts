import { post, patch } from 'superagent';
import { inject } from '@loopback/context';
import { Node } from '../models/node.model';
import { retry } from 'async';
import { Logger } from 'winston';
import { Connection } from 'amqplib';

export class NodesService {

    @inject('logger')
    private logger: Logger;

    @inject('api.jobs')
    private jobsApi: string;

    @inject('config.job.id')
    private jobId: string;

    @inject('config.name')
    private name: string;

    @inject('queue.node.complete')
    private nodeCompleteQueue: string;

    @inject('amqp.conn')
    private amqpConn: Connection;

    async registerNode(): Promise<any> {
        return await post(`${this.jobsApi}/nodes`).send({jobId: this.jobId, name: this.name, running: true});
    }

    async saveTestResults(node: Node, successful: number, failed: number, dropped: number) {
        await new Promise((resolve) => {
            retry({times: 200, interval: 5000}, done => {
                this.logger.info('Recording test results');

                patch(`${this.jobsApi}/nodes/${node.id}`).send({
                    ...node,
                    running: false,
                    totalSuccessfulConnections: successful,
                    totalFailedConnections: failed,
                    totalDroppedConnections: dropped
                })
                    .then(() => done())
                    .catch((err) => done(err));

            }, () => resolve());
        });
    }

    async sendTestCompleteMessage() {
        const nodeCompleteChannel = await this.amqpConn.createChannel();

        await nodeCompleteChannel.assertQueue(this.nodeCompleteQueue);

        await nodeCompleteChannel.sendToQueue(this.nodeCompleteQueue, new Buffer((JSON.stringify({done: true}))));

        await nodeCompleteChannel.close();
    }
}
