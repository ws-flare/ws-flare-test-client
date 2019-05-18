/**
 * Describes the attributes of a Socket model
 */
export interface Socket {
    id?: string;
    jobId: string;
    connected?: boolean;
    disconnected?: boolean;
    hasError?: boolean;
    connectionTime?: Date;
    disconnectTime?: Date;
    errorTime?: Date;
    timeToConnection?: string;
}
