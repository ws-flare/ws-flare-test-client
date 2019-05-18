import { inject } from '@loopback/core';
import ApiRoot = KubernetesClient.ApiRoot;
import { Logger } from 'winston';

/**
 * Service for interacting with the Kubernetes API
 */
export class KubernetesService {

    @inject('logger')
    private logger: Logger;

    @inject('config.nodeId')
    private nodeId: string;

    @inject('kubernetes.client')
    private kubernetesClient: ApiRoot;

    /**
     * Shutdown the running pod once tests have completed
     */
    async shutdown() {
        this.logger.info('Shutting down self');
        await this.kubernetesClient.api.v1.namespaces('default').pod(`ws-flare-test-client-${this.nodeId}`).delete();
    }
}
