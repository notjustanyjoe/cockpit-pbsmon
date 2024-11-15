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
import { HardDrive } from 'lucide-react';
import { StorageInfo } from '../types/pbs';

interface UserStorageProps {
  storageInfo: StorageInfo[];
}

const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const UserStorage: React.FC<UserStorageProps> = ({ storageInfo }) => {
  return (
    <Card>
      <CardTitle>
        <div className="flex items-center gap-2">
          <HardDrive size={20} />
          <span>User Storage Utilization</span>
        </div>
      </CardTitle>
      <CardBody>
        <Grid hasGutter>
          {storageInfo.map((storage) => (
            <GridItem key={storage.mountPoint} span={6}>
              <Card>
                <CardBody>
                  <Title headingLevel="h3" size="md" className="mb-4">
                    {storage.mountPoint}
                  </Title>
                  <Progress
                    value={(storage.used / storage.total) * 100}
                    title="Storage Usage"
                    size={ProgressSize.lg}
                    label={`${formatBytes(storage.used)} / ${formatBytes(storage.total)}`}
                  />
                  <div className="mt-2 text-sm text-gray-600">
                    Available: {formatBytes(storage.available)}
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </CardBody>
    </Card>
  );
};
