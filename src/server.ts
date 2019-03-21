import { Application, CoreBindings } from '@loopback/core';
import { Context, inject } from '@loopback/context';
import { Connection, ConsumeMessage } from 'amqplib';
import { NodesService } from './services/NodesService';
import { TestService } from './services/TestService';

export class Server extends Context implements Server {
    private _listening: boolean = false;

    @inject('amqp.conn')
    private amqpConn: Connection;

    @inject('queue.job.start')
    private startTestQueue: string;

    @inject('config.job.id')
    private jobId: string;

    @inject('services.nodes')
    private nodesService: NodesService;

    @inject('services.test')
    private testService: TestService;

    constructor(@inject(CoreBindings.APPLICATION_INSTANCE) public app?: Application) {
        super(app);
    }

    get listening() {
        return this._listening;
    }

    async start(): Promise<void> {
        const createJobChannel = await this.amqpConn.createChannel();

        const queue = `${this.startTestQueue}.${this.jobId}`;

        await createJobChannel.assertQueue(queue);

        await this.nodesService.registerNode();

        await createJobChannel.consume(queue, async (message: ConsumeMessage) => {
            const parsed = JSON.parse((message).content.toString());
            console.log('Starting test phase');
            console.log(parsed);

            await this.testService.runTest();
        }, {noAck: true});
    }

    async stop(): Promise<void> {
        await this.amqpConn.close();
    }
}
