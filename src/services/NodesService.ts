import { post, patch } from 'superagent';
import { inject } from '@loopback/context';
import { Node } from '../models/node.model';

export class NodesService {

    @inject('api.jobs')
    private jobsApi: string;

    @inject('config.job.id')
    private jobId: string;

    @inject('config.name')
    private name: string;

    async registerNode(): Promise<any> {
        return await post(`${this.jobsApi}/nodes`).send({jobId: this.jobId, name: this.name, running: true});
    }

    async saveTestResults(node: Node, successful: number, failed: number, dropped: number) {
        await patch(`${this.jobsApi}/nodes/${node.id}`).send({
            ...node,
            running: false,
            totalSuccessfulConnections: successful,
            totalFailedConnections: failed,
            totalDroppedConnections: dropped
        });
    }
}
