<script lang="ts">
    import {fade} from 'svelte/transition';
    import type {EventType, QueueItem, ScheduledEvent, Status} from "./types";
    import Spinner from "./Spinner.svelte";

    let callStack: QueueItem[] = [];
    let webAPI: QueueItem[] = [];
    let callbackQueue: QueueItem[] = [];
    let microTaskQueue: QueueItem[] = [];
    let output: string[] = [];
    let status: Status = 'idle';
    let uniqueId = 0;

    // Store all scheduled events
    let scheduledEvents: ScheduledEvent[] = [];

    function getNextId(): number {
        return uniqueId++;
    }

    function reset(): void {
        status = 'idle';
        callStack = [];
        webAPI = [];
        callbackQueue = [];
        microTaskQueue = [];
        output = [];
        // Clear all scheduled events
        scheduledEvents.forEach(event => {
            if (event.timer) clearTimeout(event.timer);
        });
        scheduledEvents = [];
    }

    function getEventColor(type: EventType): string {
        const colors = {
            fetch: 'bg-blue-100',
            setTimeout: 'bg-green-100',
            DOM: 'bg-yellow-100',
            promise: 'bg-purple-100',
            requestAnimationFrame: 'bg-pink-100',
            database: 'bg-orange-100',
            imageLoad: 'bg-teal-100'
        };
        return colors[type] || 'bg-white';
    }

    function addToCallStack(item: QueueItem): void {
        callStack = [...callStack, { ...item, id: getNextId() }];
    }

    function removeFromCallStack(text: string): void {
        callStack = callStack.filter(item => item.text !== text);
    }

    function scheduleEvent(callback: () => void, delay: number): void {
        const event: ScheduledEvent = {
            callback,
            remainingDelay: delay,
            timer: null,
            startTime: Date.now()
        };

        event.timer = setTimeout(() => {
            callback();
            scheduledEvents = scheduledEvents.filter(e => e !== event);
        }, delay);
        scheduledEvents = [...scheduledEvents, event];
    }

    function pauseExecution(): void {
        if (status !== 'running') return;

        status = 'paused';

        // Clear all active timeouts and calculate remaining times
        scheduledEvents.forEach(event => {
            if (event.timer) {
                clearTimeout(event.timer);
                event.timer = null;
                if (event.startTime) {
                    const elapsedTime = Date.now() - event.startTime;
                    event.remainingDelay = Math.max(0, event.remainingDelay - elapsedTime);
                }
            }
        });

        output = [...output, '⏸️ Execution paused'];
    }

    function resumeExecution(): void {
        if (status !== 'paused') return;

        status = 'running';

        // Reschedule all pending events with their remaining delays
        scheduledEvents.forEach(event => {
            if (!event.timer) {
                event.timer = setTimeout(() => {
                    event.callback();
                    scheduledEvents = scheduledEvents.filter(e => e !== event);
                }, event.remainingDelay);
                event.startTime = Date.now();
            }
        });

        output = [...output, '▶️ Execution resumed'];
    }

    function simulateEventLoop(): void {
        reset();
        status = 'running';

        // Add main() to call stack
        addToCallStack({ id: getNextId(), text: 'main()', type: 'DOM', duration: 0 });
        output = [...output, '1. Starting main execution'];

        // Simulate a large image load (3000ms)
        scheduleEvent(() => {
            addToCallStack({ id: getNextId(), text: 'loadImage()', type: 'imageLoad', duration: 3000 });
            output = [...output, '2. Starting image load (3000ms)'];
        }, 500);

        // Move image load to Web API
        scheduleEvent(() => {
            removeFromCallStack('loadImage()');
            webAPI = [...webAPI, { id: getNextId(), text: 'Loading large image', type: 'imageLoad', duration: 3000 }];
            output = [...output, '3. Image load moved to Web API'];
        }, 1000);

        // Start database query (2500ms)
        scheduleEvent(() => {
            addToCallStack({ id: getNextId(), text: 'dbQuery()', type: 'database', duration: 2500 });
            output = [...output, '4. Starting database query (2500ms)'];
        }, 1500);

        // Move database query to Web API
        scheduleEvent(() => {
            removeFromCallStack('dbQuery()');
            webAPI = [...webAPI, { id: getNextId(), text: 'Database query running', type: 'database', duration: 2500 }];
            output = [...output, '5. Database query moved to Web API'];
        }, 2000);

        // Add Promise resolution
        scheduleEvent(() => {
            addToCallStack({ id: getNextId(), text: 'Promise.resolve()', type: 'promise', duration: 0 });
            output = [...output, '6. Creating Promise'];

            // Move to microtask queue immediately
            scheduleEvent(() => {
                microTaskQueue = [...microTaskQueue, { id: getNextId(), text: 'Promise callback', type: 'promise', duration: 0 }];
                output = [...output, '7. Promise moved to microtask queue'];
            }, 200);
        }, 2500);

        // Database query completes
        scheduleEvent(() => {
            webAPI = webAPI.filter(item => item.type !== 'database');
            callbackQueue = [...callbackQueue, { id: getNextId(), text: 'Database callback', type: 'database', duration: 0 }];
            output = [...output, '8. Database query complete, callback queued'];
        }, 4500);

        // Image load completes
        scheduleEvent(() => {
            webAPI = webAPI.filter(item => item.type !== 'imageLoad');
            callbackQueue = [...callbackQueue, { id: getNextId(), text: 'Image load callback', type: 'imageLoad', duration: 0 }];
            output = [...output, '9. Image load complete, callback queued'];
        }, 5000);

        // Process microtask queue (Promise)
        scheduleEvent(() => {
            const microtask = microTaskQueue[0];
            microTaskQueue = [];
            addToCallStack(microtask);
            output = [...output, '10. Processing Promise callback'];
        }, 5500);

        // Process callback queue (Database)
        scheduleEvent(() => {
            const dbCallback = callbackQueue[0];
            callbackQueue = callbackQueue.slice(1);
            addToCallStack(dbCallback);
            output = [...output, '11. Processing database callback'];
        }, 6000);

        // Process callback queue (Image)
        scheduleEvent(() => {
            const imageCallback = callbackQueue[0];
            callbackQueue = callbackQueue.slice(1);
            addToCallStack(imageCallback);
            output = [...output, '12. Processing image callback'];
        }, 6500);

        // Complete execution
        scheduleEvent(() => {
            callStack = [];
            status = 'complete';
            output = [...output, '13. Execution complete'];
        }, 7000);
    }
</script>

<div class="max-w-6xl mx-auto p-6 space-y-6">
    <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900">JavaScript Event Loop Visualization</h2>
        <div class="space-x-4">
            <button
                    on:click={simulateEventLoop}
                    disabled={status === 'running' || status === 'paused'}
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Run
            </button>
            <button
                    on:click={status === 'paused' ? resumeExecution : pauseExecution}
                    disabled={status === 'idle' || status === 'complete'}
                    class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {status === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button
                    on:click={reset}
                    class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
                Reset
            </button>
        </div>
    </div>

    <Spinner />
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <!-- Call Stack -->
        <div class="border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Call Stack</h3>
            <div class="min-h-[200px] bg-gray-50 p-2 rounded-lg">
                {#each [...callStack].reverse() as item (item.id)}
                    <div
                            transition:fade
                            class="p-3 mb-2 rounded-md shadow-sm border border-gray-100 {getEventColor(item.type)}"
                    >
                        {item.text}
                    </div>
                {/each}
            </div>
        </div>

        <!-- Web APIs -->
        <div class="border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Web APIs</h3>
            <div class="min-h-[200px] bg-gray-50 p-2 rounded-lg">
                {#each webAPI as item (item.id)}
                    <div
                            transition:fade
                            class="p-3 mb-2 rounded-md shadow-sm border border-gray-100 {getEventColor(item.type)}"
                    >
                        {item.text}
                        <div class="text-xs text-gray-500 mt-1">Duration: {item.duration}ms</div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Microtask Queue -->
        <div class="border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Microtask Queue</h3>
            <div class="min-h-[200px] bg-gray-50 p-2 rounded-lg">
                {#each microTaskQueue as item (item.id)}
                    <div
                            transition:fade
                            class="p-3 mb-2 rounded-md shadow-sm border border-gray-100 {getEventColor(item.type)}"
                    >
                        {item.text}
                    </div>
                {/each}
            </div>
        </div>

        <!-- Callback Queue -->
        <div class="border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Callback Queue</h3>
            <div class="min-h-[200px] bg-gray-50 p-2 rounded-lg">
                {#each callbackQueue as item (item.id)}
                    <div
                            transition:fade
                            class="p-3 mb-2 rounded-md shadow-sm border border-gray-100 {getEventColor(item.type)}"
                    >
                        {item.text}
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Console Output -->
    <div class="border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Console Output</h3>
        <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-[200px] overflow-y-auto">
            {#each [...output].reverse() as line}
                <div transition:fade class="mb-1">
                    {line}
                </div>
            {/each}
        </div>
    </div>
</div>