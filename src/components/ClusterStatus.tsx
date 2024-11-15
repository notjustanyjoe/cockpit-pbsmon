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

export const ClusterStatus: React.FC<ClusterStatusProps> = ({ resources }) => {
  const totalNodes = resources.length;
  const busyNodes = resources.filter((node) => node.status === 'busy').length;
  const downNodes = resources.filter((node) => node.status === 'down').length;
  const offlineNodes = resources.filter((node) => node.status === 'offline').length;
  const availableNodes = totalNodes - busyNodes - downNodes - offlineNodes;

  return (
    <Card>
      <CardTitle>Cluster Overview</CardTitle>
      <CardBody>
        <Grid hasGutter>
          <GridItem span={12}>
            <Title headingLevel="h3" size="md">
              Node Status
            </Title>
            <div className="space-y-4">
              <div>
                <Label color="blue">{busyNodes} Busy</Label>{' '}
                <Label color="green">{availableNodes} Available</Label>{' '}
                <Label color="red">{downNodes} Down</Label>{' '}
                <Label color="grey">{offlineNodes} Offline</Label>
              </div>
              <Progress
                value={(busyNodes / totalNodes) * 100}
                title="Node Usage"
                size={ProgressSize.lg}
                label={`${busyNodes} busy nodes out of ${totalNodes} total nodes`}
              />
            </div>
          </GridItem>
        </Grid>
      </CardBody>
    </Card>
  );
};
