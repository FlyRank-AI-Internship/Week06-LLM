const queue = [];

export function enqueue(jobId) {
  queue.push(jobId);
}

export function dequeue() {
  return queue.shift();
}

export function queueSize() {
  return queue.length;
}