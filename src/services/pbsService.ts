import { PBSJob, ClusterResource, StorageInfo } from '../types/pbs';
import cockpit from 'cockpit';

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

export const fetchStorageInfo = async (): Promise<StorageInfo[]> => {
  try {
    // First get the current user
    const userProcess = await cockpit.spawn(['whoami']);
    const username = userProcess.trim();

    // Create the script to check user-specific directories
    const script = `
      du -sb /home/${username} 2>/dev/null | cut -f1 && \
      df -B1 /home | tail -n1 | awk '{print $2, $3, $4}' && \
      (du -sb /scratch/${username} 2>/dev/null | cut -f1 || echo "0") && \
      (df -B1 /scratch 2>/dev/null | tail -n1 | awk '{print $2, $3, $4}' || echo "0 0 0")
    `;

    const output = await cockpit.script(script);
    const [
      homeUsed,
      homeTotal, homeTotalUsed, homeAvailable,
      scratchUsed,
      scratchTotal, scratchTotalUsed, scratchAvailable
    ] = output.trim().split('\n').map(line => line.trim().split(/\s+/)).flat().map(Number);

    const result: StorageInfo[] = [];

    // Add home directory info
    if (homeTotal > 0) {
      result.push({
        path: `/home/${username}`,
        total: homeTotal,
        used: homeUsed,
        available: homeAvailable,
        mountPoint: 'Home Directory'
      });
    }

    // Add scratch directory info if it exists
    if (scratchTotal > 0) {
      result.push({
        path: `/scratch/${username}`,
        total: scratchTotal,
        used: scratchUsed,
        available: scratchAvailable,
        mountPoint: 'Scratch Space'
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching storage info:', error);
    return [];
  }
};