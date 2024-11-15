
import React, { useEffect, useState } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import {
    Page,
    PageSection,
    PageSectionVariants,
    Title,
    Split,
    SplitItem,
  } from '@patternfly/react-core';
import { PBSJob, ClusterResource } from './types/pbs';
import { JobsTable } from './components/JobsTable';
import { ClusterStatus } from './components/ClusterStatus';
import { fetchJobs, fetchClusterResources } from './services/pbsService';
import cockpit from 'cockpit';

const _ = cockpit.gettext;

export const Application = () => {
    const [hostname, setHostname] = useState(_("Unknown"));
    const [jobs, setJobs] = useState<PBSJob[]>([]);
    const [resources, setResources] = useState<ClusterResource[]>([]);
    useEffect(() => {
        const hostname = cockpit.file('/etc/hostname');
        hostname.watch(content => setHostname(content?.trim() ?? ""));
        return hostname.close;
    }, []);

    useEffect(() => {
        const loadData = async () => {
          const [jobsData, resourcesData] = await Promise.all([
            fetchJobs(),
            fetchClusterResources(),
          ]);
          setJobs(jobsData);
          setResources(resourcesData);
        };
    
        loadData();
        const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    
        return () => clearInterval(interval);
    }, []);      
    return (
        <><Card>
            <CardTitle>PBS Cluster Monitor</CardTitle>
            <CardBody>
                <Alert
                    variant="info"
                    title={cockpit.format(_("Running on $0"), hostname)} />
            </CardBody>
        </Card>
        <Page>
            <PageSection>
                <ClusterStatus resources={resources} />
            </PageSection>
            <PageSection>
                <JobsTable jobs={jobs} />
            </PageSection>
        </Page>
        </>
    );
};
