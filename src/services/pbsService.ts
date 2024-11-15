import { PBSJob, ClusterResource, StorageInfo } from '../types/pbs';
import cockpit from 'cockpit';

const PBS_PATH = '/opt/pbs/bin/qstat';

export const fetchJobs = async (): Promise<PBSJob[]> => {
  try {
    const basicOutput = await cockpit.spawn([PBS_PATH, '-f'], {
      environ: ['PATH=/opt/pbs/bin:/usr/bin:/bin'],
      err: 'out'
    });
    
    const jobSections = basicOutput.split('\nJob Id: ').filter(section => section.trim());
    
    const jobs = jobSections.map(section => {
      try {
        const jobId = section.split('\n')[0].trim().replace(/^Job Id: /, '');
        
        const getValue = (key: string): string => {
          const match = section.match(new RegExp(`${key}\\s*=\\s*([^,\\n]+)`));
          return match ? match[1].trim() : '';
        };

        const name = getValue('Job_Name');
        const owner = getValue('Job_Owner').split('@')[0];
        const queue = getValue('queue');
        const status = getValue('job_state');
        const nodeCount = getValue('Resource_List.nodect');
        const ncpusStr = getValue('Resource_List.ncpus');
        const mpiprocsStr = getValue('Resource_List.mpiprocs');
        const walltime = getValue('Resource_List.walltime');
        const stime = getValue('stime');
        
        const nodes = parseInt(nodeCount) || 0;
        const ncpus = parseInt(ncpusStr) || 0;
        const mpiprocs = parseInt(mpiprocsStr) || 0;

        return {
          id: jobId,
          name: name || 'N/A',
          owner: owner || 'N/A',
          queue: queue || 'N/A',
          status: parseStatus(status || 'U'),
          nodes,
          ncpus,
          mpiprocs,
          walltime: walltime || 'N/A',
          startTime: stime || 'N/A'
        };
      } catch (error) {
        console.error('Error parsing job section:', error);
        return null;
      }
    });

    return jobs.filter((job): job is PBSJob => job !== null);
  } catch (error) {
    console.error('Error fetching PBS jobs:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    return [];
  }
};

const parseStatus = (statusCode: string): PBSJob['status'] => {
  switch (statusCode.toUpperCase()) {
    case 'R':
      return 'running';
    case 'Q':
      return 'queued';
    case 'C':
      return 'completed';
    case 'E':
      return 'error';
    default:
      return 'queued';
  }
};

export const fetchClusterResources = async (): Promise<ClusterResource[]> => {
  // Keeping mock data for now
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
    const userProcess = await cockpit.spawn(['whoami']);
    const username = userProcess.trim();

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

    if (homeTotal > 0) {
      result.push({
        path: `/home/${username}`,
        total: homeTotal,
        used: homeUsed,
        available: homeAvailable,
        mountPoint: 'Home Directory'
      });
    }

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
