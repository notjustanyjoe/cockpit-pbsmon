export interface PBSJob {
  id: string;
  name: string;
  owner: string;
  queue: string;
  status: 'queued' | 'running' | 'completed' | 'error';
  nodes: number;
  walltime: string;
  submissionTime: string;
  startTime?: string;
  progress?: number;
}

export interface ClusterResource {
  nodeName: string;
  status: 'free' | 'busy' | 'down' | 'offline';
  totalCPUs: number;
  usedCPUs: number;
  totalMemory: number;
  usedMemory: number;
  jobs: string[];
}

export interface StorageInfo {
  path: string;
  total: number;
  used: number;
  available: number;
  mountPoint: string;
}