import { ApplicationConfig } from '@loopback/core';
import { OrchestrationApplication } from './application';

const {PORT, USER_API, PROJECTS_API, JOBS_API, AMQP_URL, AMQP_PORT, AMQP_USER, AMQP_PWD, JOB_ID, NODE_ID, NODE_NAME, URI, TOTAL_SIMULATED_USERS, RUN_TIME} = process.env;

export async function main(options: ApplicationConfig = {}): Promise<OrchestrationApplication> {
    options.port = options.port || PORT;
    options.config = {
        jobId: JOB_ID,
        name: NODE_NAME,
        nodeId: NODE_ID
    };
    options.task = {
        uri: URI,
        totalSimulatedUsers: TOTAL_SIMULATED_USERS,
        runTime: RUN_TIME
    };
    options.apis = {
        userApi: USER_API,
        projectsApi: PROJECTS_API,
        jobsApi: JOBS_API
    };
    options.amqp = {
        url: AMQP_URL,
        port: (options.amqp || {}).port || AMQP_PORT,
        user: AMQP_USER,
        pwd: AMQP_PWD
    };

    const app = new OrchestrationApplication(options);

    await app.start();

    console.log(`Server is running on port ${app.options.port}`);
    return app;
}
