import { Application, CoreBindings } from '@loopback/core';
import { Context, inject } from '@loopback/context';
import { Connection, ConsumeMessage } from 'amqplib';

export class Server extends Context implements Server {
    private _listening: boolean = false;

    @inject('amqp.conn')
    private amqpConn: Connection;

    @inject('queue.job.create')
    private createJobQueue: string;

    constructor(@inject(CoreBindings.APPLICATION_INSTANCE) public app?: Application) {
        super(app);
    }

    get listening() {
        return this._listening;
    }

    async start(): Promise<void> {
        const createJobChannel = await this.amqpConn.createChannel();

        await createJobChannel.assertQueue(this.createJobQueue);

        await createJobChannel.consume(this.createJobQueue, async (message: ConsumeMessage) => {
            const parsed = JSON.parse((message).content.toString());
        }, {noAck: true});
    }

    async stop(): Promise<void> {
        await this.amqpConn.close();
    }
}
