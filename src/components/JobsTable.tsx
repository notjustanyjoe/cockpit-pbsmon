import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@patternfly/react-table';
import {
  Card,
  CardTitle,
  CardBody,
  Label,
} from '@patternfly/react-core';
import { PBSJob } from '../types/pbs';

interface JobsTableProps {
  jobs: PBSJob[];
}

const getStatusColor = (status: PBSJob['status']) => {
  switch (status) {
    case 'running':
      return 'blue';
    case 'queued':
      return 'orange';
    case 'completed':
      return 'green';
    case 'error':
      return 'red';
    default:
      return 'grey';
  }
};

export const JobsTable: React.FC<JobsTableProps> = ({ jobs }) => {
  return (
    <Card>
      <CardTitle>Queue Status</CardTitle>
      <CardBody>
        <Table aria-label="PBS Jobs Table">
          <Thead>
            <Tr>
              <Th>Job ID</Th>
              <Th>Name</Th>
              <Th>Owner</Th>
              <Th>Queue</Th>
              <Th>Status</Th>
              <Th>Nodes</Th>
              <Th>NCPUs</Th>
              <Th>MPIProcs</Th>
              <Th>Walltime</Th>
              <Th>Start Time</Th>
            </Tr>
          </Thead>
          <Tbody>
            {jobs.map((job) => (
              <Tr key={job.id}>
                <Td>{job.id}</Td>
                <Td>{job.name}</Td>
                <Td>{job.owner}</Td>
                <Td>{job.queue}</Td>
                <Td>
                  <Label color={getStatusColor(job.status)}>{job.status}</Label>
                </Td>
                <Td>{job.nodes}</Td>
                <Td>{job.ncpus}</Td>
                <Td>{job.mpiprocs}</Td>
                <Td>{job.walltime}</Td>
                <Td>{job.startTime}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </CardBody>
    </Card>
  );
};
