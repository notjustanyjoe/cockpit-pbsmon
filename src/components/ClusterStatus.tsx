import React from 'react';
import {
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  Progress,
  ProgressSize,
  Title,
  Label,
} from '@patternfly/react-core';
import { ClusterResource } from '../types/pbs';

interface ClusterStatusProps {
  resources: ClusterResource[];
}

const getNodeStatusColor = (status: ClusterResource['status']) => {
  switch (status) {
    case 'free':
      return 'green';
    case 'busy':
      return 'blue';
    case 'down':
      return 'red';
    case 'offline':
      return 'grey';
    default:
      return 'grey';
  }
};

export const ClusterStatus: React.FC<ClusterStatusProps> = ({ resources }) => {
  const totalNodes = resources.length;
  const busyNodes = resources.filter((node) => node.status === 'busy').length;
  const totalCPUs = resources.reduce((acc, node) => acc + node.totalCPUs, 0);
  const usedCPUs = resources.reduce((acc, node) => acc + node.usedCPUs, 0);

  return (
    <Card>
      <CardTitle>Cluster Overview</CardTitle>
      <CardBody>
        <Grid hasGutter>
          <GridItem span={6}>
            <Title headingLevel="h3" size="md">
              Node Usage ({busyNodes}/{totalNodes})
            </Title>
            <Progress
              value={(busyNodes / totalNodes) * 100}
              title="Node Usage"
              size={ProgressSize.lg}
            />
          </GridItem>
          <GridItem span={6}>
            <Title headingLevel="h3" size="md">
              CPU Usage ({usedCPUs}/{totalCPUs})
            </Title>
            <Progress
              value={(usedCPUs / totalCPUs) * 100}
              title="CPU Usage"
              size={ProgressSize.lg}
            />
          </GridItem>
          {resources.map((node) => (
            <GridItem key={node.nodeName} span={4}>
              <Card>
                <CardTitle>{node.nodeName}</CardTitle>
                <CardBody>
                  <Label color={getNodeStatusColor(node.status)}>
                    {node.status}
                  </Label>
                  <Progress
                    value={(node.usedCPUs / node.totalCPUs) * 100}
                    title="CPU Usage"
                    size={ProgressSize.sm}
                  />
                  <Progress
                    value={(node.usedMemory / node.totalMemory) * 100}
                    title="Memory Usage"
                    size={ProgressSize.sm}
                  />
                  <div>Active Jobs: {node.jobs.length}</div>
                </CardBody>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </CardBody>
    </Card>
  );
};