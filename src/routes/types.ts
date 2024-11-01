export type Status = 'idle' | 'running' | 'paused' | 'complete';
export type EventType = 'fetch' | 'setTimeout' | 'DOM' | 'promise' | 'requestAnimationFrame' | 'database' | 'imageLoad';

export type QueueItem = {
    id: number;
    text: string;
    type: EventType;
    duration: number;
}

export type ScheduledEvent = {
    callback: () => void;
    remainingDelay: number;
    timer: NodeJS.Timeout | null;
    startTime?: number;
}
