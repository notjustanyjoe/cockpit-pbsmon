import { PBSJob, ClusterResource, StorageInfo } from '../types/pbs';
import cockpit from 'cockpit';

const PBS_PATH = '/opt/pbs/bin/qstat';
const PBSNODES_PATH = '/opt/pbs/bin/pbsnodes';

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

const parseNodeStatus = (state: string): ClusterResource['status'] => {
  if (state.includes('down')) return 'down';
  if (state.includes('offline')) return 'offline';
  if (state.includes('job-exclusive')) return 'busy';
  return 'free';
};

export const fetchClusterResources = async (): Promise<ClusterResource[]> => {
  try {
    const output = await cockpit.spawn([PBSNODES_PATH, '-a'], {
      environ: ['PATH=/opt/pbs/bin:/usr/bin:/bin'],
      err: 'out'
    });

    const nodesSections = output.split('\n\n').filter(section => section.trim());
    
    const nodes = nodesSections.map(section => {
      try {
        const lines = section.split('\n');
        const nodeName = lines[0].trim();
        
        const getValue = (key: string): string => {
          const line = lines.find(l => l.trim().startsWith(key));
          return line ? line.split('=')[1].trim() : '';
        };

        const state = getValue('state');
        const jobs = getValue('jobs').split(',').filter(Boolean);
        const resources = getValue('resources_available.ncpus');
        const resourcesUsed = getValue('resources_used.ncpus');
        const memTotal = getValue('resources_available.mem');
        const memUsed = getValue('resources_used.mem');

        // Convert memory strings (e.g., "64gb" to number in GB)
        const parseMemory = (memStr: string): number => {
          const num = parseFloat(memStr.replace(/[^0-9.]/g, ''));
          const unit = memStr.replace(/[0-9.]/g, '').toLowerCase();
          switch (unit) {
            case 'tb': return num * 1024;
            case 'gb': return num;
            case 'mb': return num / 1024;
            case 'kb': return num / (1024 * 1024);
            default: return num;
          }
        };

        return {
          nodeName,
          status: parseNodeStatus(state),
          totalCPUs: parseInt(resources) || 0,
          usedCPUs: parseInt(resourcesUsed) || 0,
          totalMemory: parseMemory(memTotal),
          usedMemory: parseMemory(memUsed),
          jobs
        };
      } catch (error) {
        console.error('Error parsing node section:', error);
        return null;
      }
    });

    return nodes.filter((node): node is ClusterResource => node !== null);
  } catch (error) {
    console.error('Error fetching cluster resources:', error);
    return [];
  }
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
