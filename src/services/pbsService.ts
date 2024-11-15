import { PBSJob, ClusterResource } from '../types/pbs';

// Mock data - replace with actual PBS API calls in production
export const fetchJobs = async (): Promise<PBSJob[]> => {
  // Simulated API response
  return [
    {
      id: 'job.123',
      name: 'molecular_sim',
      owner: 'researcher1',
      queue: 'batch',
      status: 'running',
      nodes: 4,
      walltime: '24:00:00',
      submissionTime: '2024-03-15T10:00:00',
      startTime: '2024-03-15T10:05:00',
      progress: 45
    },
    {
      id: 'job.124',
      name: 'data_analysis',
      owner: 'researcher2',
      queue: 'gpu',
      status: 'queued',
      nodes: 2,
      walltime: '12:00:00',
      submissionTime: '2024-03-15T11:00:00'
    }
  ];
};

export const fetchClusterResources = async (): Promise<ClusterResource[]> => {
  // Simulated API response
  return [
    {
      nodeName: 'compute-01',
      status: 'busy',
      totalCPUs: 64,
      usedCPUs: 48,
      totalMemory: 256,
      usedMemory: 128,
      jobs: ['job.123']
    },
    {
      nodeName: 'compute-02',
      status: 'free',
      totalCPUs: 64,
      usedCPUs: 0,
      totalMemory: 256,
      usedMemory: 0,
      jobs: []
    }
  ];
};