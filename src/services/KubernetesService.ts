import { inject } from '@loopback/core';
import ApiRoot = KubernetesClient.ApiRoot;
import { Logger } from 'winston';

export class KubernetesService {

    @inject('logger')
    private logger: Logger;

    @inject('config.job.id')
    private jobId: string;

    @inject('kubernetes.client')
    private kubernetesClient: ApiRoot;

    async shutdown() {
        this.logger.info('Shutting down self');
        await this.kubernetesClient.api.v1.namespaces('default').pod(`ws-flare-test-client-${this.jobId}`).delete();
    }
}
