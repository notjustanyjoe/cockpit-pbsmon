import React, { useState } from 'react';
import {
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  Title,
  Label,
  Progress,
  ProgressSize,
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
} from '@patternfly/react-core';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { ClusterResource } from '../types/pbs';

interface ClusterStatusProps {
  resources: ClusterResource[];
}

type NodeStatus = 'all' | 'busy' | 'free' | 'down' | 'offline';

const getNodeStatusColor = (status: ClusterResource['status']) => {
  switch (status) {
    case 'busy':
      return 'blue';
    case 'free':
      return 'green';
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

  const handleStatusClick = (status: NodeStatus) => {
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  const filteredNodes = selectedStatus === 'all' 
    ? resources 
    : selectedStatus 
      ? resources.filter(node => node.status === selectedStatus)
      : [];

  // Show only first 6 nodes when collapsed
  const displayedNodes = isExpanded ? filteredNodes : filteredNodes.slice(0, 6);

  const StatusLabel: React.FC<{ 
    status: NodeStatus; 
    count: number; 
    color: string;
    label: string;
  }> = ({ status, count, color, label }) => (
    <Label
      color={color}
      onClick={() => handleStatusClick(status)}
      className={`cursor-pointer transition-all duration-200 ${
        selectedStatus === status ? 'ring-2 ring-blue-400' : ''
      }`}
      isHoverable
    >
      {`${count} ${label}`}
    </Label>
  );

  return (
    <Card>
      <CardTitle>Cluster Overview</CardTitle>
      <CardBody>
        <Grid hasGutter>
          <GridItem span={12}>
            <div className="mb-4">
              <Title headingLevel="h3" size="md" className="mb-2">
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
                        <Title headingLevel="h4" size="sm" className="text-sm">
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
                                <Label key={jobId} color="blue" isCompact className="text-xs">
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
