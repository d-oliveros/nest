import async from 'async';

// This will process the tasks in series
// API docs: https://github.com/caolan/async#queue
export default async.queue((task, callback) => task(callback), 1);
