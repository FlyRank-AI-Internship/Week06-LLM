const jobs = new Map();

export function createJob(job) {
  jobs.set(job.id, job);
  return job;
}

export function getJob(id) {
  return jobs.get(id);
}

export function updateJob(id, updates) {
  const current = jobs.get(id);

  if (!current) {
    return null;
  }

  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, updated);

  return updated;
}

export function hasJob(id) {
  return jobs.has(id);
}