import { PBSJob, ClusterResource, StorageInfo } from '../types/pbs';
import cockpit from 'cockpit';

const PBS_PATH = '/opt/pbs/bin';
const QSTAT_PATH = `${PBS_PATH}/qstat`;
const PBSNODES_PATH = `${PBS_PATH}/pbsnodes`;

const parseNodeStatus = (state: string): ClusterResource['status'] => {
  if (state.includes('down') || state.includes('offline')) return 'down';
  if (state.includes('offline')) return 'offline';
  if (state.includes('job-exclusive')) return 'busy';
  return 'free';
};

const parseMemoryValue = (memStr: string): number => {
  if (!memStr) return 0;
  
  // Remove any trailing 'b' and convert to lowercase
  memStr = memStr.toLowerCase().replace(/b$/, '');
  
  // Handle PBS format (e.g., "16gb" or "1024mb")
  const match = memStr.match(/^(\d+)([kmgt])?b?$/i);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = (match[2] || '').toLowerCase();
  
  // Convert to GB
  switch (unit) {
    case 't': return value * 1024;
    case 'g': return value;
    case 'm': return value / 1024;
    case 'k': return value / (1024 * 1024);
    default: return value / (1024 * 1024 * 1024); // bytes
  }
};

export const fetchJobs = async (): Promise<PBSJob[]> => {
  try {
    // First get list of all jobs
    const jobList = await cockpit.spawn([QSTAT_PATH], {
      environ: ['PATH=/opt/pbs/bin:/usr/bin:/bin'],
      err: 'out'
    });

    // Parse job IDs from the output
    const jobIds = jobList.split('\n')
      .slice(2) // Skip header lines
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.split(' ')[0]);

    // Get detailed info for each job
    const jobDetails = await Promise.all(
      jobIds.map(async (jobId) => {
        try {
          const output = await cockpit.spawn([QSTAT_PATH, '-f', jobId], {
            environ: ['PATH=/opt/pbs/bin:/usr/bin:/bin'],
            err: 'out'
          });

          const lines = output.split('\n').map(line => line.trim());
          const getValue = (key: string): string => {
            const line = lines.find(l => l.startsWith(key + ' = '));
            return line ? line.split(' = ')[1] : '';
          };

          return {
            id: jobId,
            name: getValue('Job_Name'),
            owner: getValue('Job_Owner').split('@')[0],
            queue: getValue('queue'),
            status: getValue('job_state').toLowerCase() as PBSJob['status'],
            nodes: parseInt(getValue('Resource_List.nodect')) || 0,
            ncpus: parseInt(getValue('Resource_List.ncpus')) || 0,
            mpiprocs: parseInt(getValue('Resource_List.mpiprocs')) || 0,
            walltime: getValue('Resource_List.walltime'),
            startTime: getValue('stime') || 'N/A'
          };
        } catch (error) {
          console.error(`Error fetching details for job ${jobId}:`, error);
          return null;
        }
      })
    );

    return jobDetails.filter((job): job is PBSJob => job !== null);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
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
        
        // CPU resources
        const totalCPUs = parseInt(getValue('resources_available.ncpus')) || 0;
        const usedCPUs = state.includes('job-exclusive') ? totalCPUs : 0;
        
        // Memory resources
        const totalMemStr = getValue('resources_available.mem');
        const usedMemStr = getValue('resources_assigned.mem') || getValue('resources_used.mem');
        
        const totalMemory = parseMemoryValue(totalMemStr);
        let usedMemory = parseMemoryValue(usedMemStr);
        
        // If node is job-exclusive but no memory usage reported, assume full usage
        if (state.includes('job-exclusive') && usedMemory === 0) {
          usedMemory = totalMemory;
        }

        return {
          nodeName,
          status: parseNodeStatus(state),
          totalCPUs,
          usedCPUs,
          totalMemory,
          usedMemory,
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
