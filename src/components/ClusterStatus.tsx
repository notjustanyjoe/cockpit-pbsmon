import React, { useState } from 'react';
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
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Filter, ChevronUp, ChevronDown, Server } from 'lucide-react';
import { ClusterResource } from '../types/pbs';

type NodeStatus = 'all' | 'busy' | 'free' | 'down' | 'offline';
type StatusColor = 'blue' | 'green' | 'red' | 'grey' | 'purple';

interface ClusterStatusProps {
  resources: ClusterResource[];
}

const getNodeStatusColor = (status: ClusterResource['status']): StatusColor => {
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<NodeStatus | null>(null);
  
  const totalNodes = resources.length;
  const busyNodes = resources.filter((node) => node.status === 'busy').length;
  const downNodes = resources.filter((node) => node.status === 'down').length;
  const offlineNodes = resources.filter((node) => node.status === 'offline').length;
  const availableNodes = totalNodes - busyNodes - downNodes - offlineNodes;

  // Calculate total CPU and memory usage
  const totalCPUs = resources.reduce((acc, node) => acc + node.totalCPUs, 0);
  const usedCPUs = resources.reduce((acc, node) => acc + node.usedCPUs, 0);
  const totalMemory = resources.reduce((acc, node) => acc + node.totalMemory, 0);
  const usedMemory = resources.reduce((acc, node) => acc + node.usedMemory, 0);

  const handleStatusClick = (status: NodeStatus) => {
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  const filteredNodes = selectedStatus === 'all' 
    ? resources 
    : selectedStatus 
      ? resources.filter(node => node.status === selectedStatus)
      : [];

  const displayedNodes = isExpanded ? filteredNodes : filteredNodes.slice(0, 6);

  const StatusLabel: React.FC<{ 
    status: NodeStatus; 
    count: number; 
    color: StatusColor;
    label: string;
  }> = ({ status, count, color, label }) => (
    <Label
      color={color}
      onClick={() => handleStatusClick(status)}
      className={`cursor-pointer transition-all duration-200 ${
        selectedStatus === status ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      {`${count} ${label}`}
    </Label>
  );

  return (
    <Card>
      <CardTitle>
        <div className="flex items-center gap-2">
          <Server size={20} />
          <span>Cluster Overview</span>
        </div>
      </CardTitle>
      <CardBody>
        <Grid hasGutter>
          <GridItem span={12}>
            <Grid hasGutter className="mb-6">
              <GridItem span={6}>
                <Card isFlat>
                  <CardBody>
                    <Title headingLevel="h4" size="md" className="mb-2">
                      CPU Usage
                    </Title>
                    <Progress
                      value={(usedCPUs / totalCPUs) * 100}
                      title="CPU Usage"
                      size={ProgressSize.lg}
                      label={`${usedCPUs} / ${totalCPUs} CPUs`}
                    />
                  </CardBody>
                </Card>
              </GridItem>
              <GridItem span={6}>
                <Card isFlat>
                  <CardBody>
                    <Title headingLevel="h4" size="md" className="mb-2">
                      Memory Usage
                    </Title>
                    <Progress
                      value={(usedMemory / totalMemory) * 100}
                      title="Memory Usage"
                      size={ProgressSize.lg}
                      label={`${usedMemory.toFixed(0)} / ${totalMemory.toFixed(0)} GB`}
                    />
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>

            <div className="mb-6">
              <Title headingLevel="h3" size="lg" className="mb-2">
                Node Status Summary
              </Title>
              <div className="flex gap-4">
                <StatusLabel 
                  status="all" 
                  count={totalNodes} 
                  color="purple" 
                  label="All Nodes" 
                />
                <StatusLabel 
                  status="busy" 
                  count={busyNodes} 
                  color="blue" 
                  label="Busy" 
                />
                <StatusLabel 
                  status="free" 
                  count={availableNodes} 
                  color="green" 
                  label="Available" 
                />
                <StatusLabel 
                  status="down" 
                  count={downNodes} 
                  color="red" 
                  label="Down" 
                />
                <StatusLabel 
                  status="offline" 
                  count={offlineNodes} 
                  color="grey" 
                  label="Offline" 
                />
              </div>
            </div>
          </GridItem>

          {!selectedStatus ? (
            <GridItem span={12}>
              <EmptyState>
                <EmptyStateIcon icon={Filter} className="text-gray-500" />
                <Title headingLevel="h4" size="lg">No Status Selected</Title>
                <EmptyStateBody>
                  Please select a node status to filter the view
                </EmptyStateBody>
              </EmptyState>
            </GridItem>
          ) : (
            <>
              {displayedNodes.map((node) => (
                <GridItem key={node.nodeName} span={2}>
                  <Card isFlat className="h-full">
                    <CardBody className="p-3">
                      <div className="flex justify-between items-center mb-2">
                        <Title headingLevel="h4" size="md" className="text-sm">
                          {node.nodeName}
                        </Title>
                        <Label color={getNodeStatusColor(node.status)} className="text-xs">
                          {node.status}
                        </Label>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-gray-600">CPU</div>
                          <Progress
                            value={(node.usedCPUs / node.totalCPUs) * 100}
                            title="CPU Usage"
                            size={ProgressSize.sm}
                            label={`${node.usedCPUs}/${node.totalCPUs}`}
                            className="text-xs"
                          />
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-600">Memory</div>
                          <Progress
                            value={(node.usedMemory / node.totalMemory) * 100}
                            title="Memory Usage"
                            size={ProgressSize.sm}
                            label={`${node.usedMemory.toFixed(0)}/${node.totalMemory.toFixed(0)}GB`}
                            className="text-xs"
                          />
                        </div>

                        {node.jobs.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-600">Jobs</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {node.jobs.map((jobId) => (
                                <Label key={jobId} color="blue" className="text-xs">
                                  {jobId}
                                </Label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </GridItem>
              ))}

              {filteredNodes.length > 6 && (
                <GridItem span={12}>
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="link"
                      onClick={() => setIsExpanded(!isExpanded)}
                      icon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    >
                      {isExpanded ? 'Show Less' : `Show All ${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Nodes (${filteredNodes.length})`}
                    </Button>
                  </div>
                </GridItem>
              )}
            </>
          )}
        </Grid>
      </CardBody>
    </Card>
  );
};
