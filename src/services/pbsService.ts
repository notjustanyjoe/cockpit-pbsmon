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
  
  memStr = memStr.toLowerCase().replace(/b$/, '');
  
  const match = memStr.match(/^(\d+)([kmgt])?b?$/i);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = (match[2] || '').toLowerCase();
  
  switch (unit) {
    case 't': return value * 1024;
    case 'g': return value;
    case 'm': return value / 1024;
    case 'k': return value / (1024 * 1024);
    default: return value / (1024 * 1024 * 1024);
  }
};

export const fetchJobs = async (): Promise<PBSJob[]> => {
  try {
    const jobList = await cockpit.spawn([QSTAT_PATH], {
      environ: ['PATH=/opt/pbs/bin:/usr/bin:/bin'],
      err: 'out'
    });

    const jobIds = jobList.split('\n')
      .slice(2)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.split(' ')[0]);

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
        
        const totalCPUs = parseInt(getValue('resources_available.ncpus')) || 0;
        const usedCPUs = state.includes('job-exclusive') ? totalCPUs : 0;
        
        const totalMemStr = getValue('resources_available.mem');
        const usedMemStr = getValue('resources_assigned.mem') || getValue('resources_used.mem');
        
        const totalMemory = parseMemoryValue(totalMemStr);
        let usedMemory = parseMemoryValue(usedMemStr);
        
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
    const userProcess = await cockpit.spawn(['whoami']);
    const username = userProcess.trim();
    const result: StorageInfo[] = [];

    // Check home directory
    try {
      const homeExists = await cockpit.script(`test -d /home/${username} && echo "exists"`);
      if (homeExists.trim() === "exists") {
        const homeFs = await cockpit.script(`
          df -B1 /home/${username} | tail -n1 | awk '{print $2, $3, $4}'
        `);
        const [total, used, available] = homeFs.trim().split(/\s+/).map(Number);

        result.push({
          path: `/home/${username}`,
          total,
          used,
          available,
          mountPoint: 'Home Directory'
        });
      }
    } catch (error) {
      console.warn('Home directory not accessible:', error);
    }

    // Check scratch directory
    try {
      const scratchExists = await cockpit.script(`test -d /scratch/${username} && echo "exists"`);
      if (scratchExists.trim() === "exists") {
        const scratchFs = await cockpit.script(`
          df -B1 /scratch/${username} | tail -n1 | awk '{print $2, $3, $4}'
        `);
        const [total, used, available] = scratchFs.trim().split(/\s+/).map(Number);

        result.push({
          path: `/scratch/${username}`,
          total,
          used,
          available,
          mountPoint: 'Scratch Space'
        });
      }
    } catch (error) {
      console.warn('Scratch directory not accessible:', error);
    }

    return result;
  } catch (error) {
    console.error('Error fetching storage info:', error);
    return [];
  }
};
