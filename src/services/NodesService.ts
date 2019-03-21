import { post } from 'superagent';
import { inject } from '@loopback/context';

export class NodesService {

    @inject('api.jobs')
    private jobsApi: string;

    @inject('config.job.id')
    private jobId: string;

    @inject('config.name')
    private name: string;

    async registerNode() {
        await post(`${this.jobsApi}/nodes`).send({jobId: this.jobId, name: this.name});
    }
}
