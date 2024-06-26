import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Container } from '@/components/layout/Container';
import { LoadingScreen } from '@/components/presentational/LoadingScreen';
import { MaintenanceAlert } from '@/components/presentational/MaintenanceAlert';
import { Box } from '@/components/ui/v2/Box';
import { Button } from '@/components/ui/v2/Button';
import { Text } from '@/components/ui/v2/Text';
import { WorkspaceAndProjectList } from '@/features/projects/common/components/WorkspaceAndProjectList';
import { WorkspaceSidebar } from '@/features/projects/common/components/WorkspaceSidebar';
import {
  useGetAllWorkspacesAndProjectsQuery,
  type GetAllWorkspacesAndProjectsQuery,
} from '@/utils/__generated__/graphql';
import { NetworkStatus } from '@apollo/client';
import { darken } from '@mui/system';
import { useUserData } from '@nhost/nextjs';
import NavLink from 'next/link';
import { useState, type ReactElement } from 'react';

export default function IndexPage() {
  const user = useUserData();
  const [, setPollInterval] = useState(1_000);

  // keep polling for workspaces until there is a workspace available.
  // We do this because when a user signs up a workspace is created automatically
  // and the serverless function can take some time to complete.
  const { data, startPolling, stopPolling, networkStatus } =
    useGetAllWorkspacesAndProjectsQuery({
      skip: !user,
      notifyOnNetworkStatusChange: true,
      onError: () => {
        // When there's an error (graphql, network error) apply an exponential backoff strategy
        setPollInterval((prevInterval) => {
          const newInterval = Math.min(60_000, prevInterval * 2);
          startPolling(newInterval);
          return newInterval;
        });
      },
      onCompleted: (queryData: GetAllWorkspacesAndProjectsQuery) => {
        if (!queryData?.workspaces.length) {
          setPollInterval(1000);
          startPolling(1000);
        } else {
          setPollInterval(0);
          stopPolling();
        }
      },
    });

  // keep showing loading indicator while polling
  const loading = networkStatus === NetworkStatus.loading;

  const numberOfProjects = data?.workspaces.reduce(
    (projectCount, currentWorkspace) =>
      projectCount + currentWorkspace.projects.length,
    0,
  );

  if ((!data && loading) || !user) {
    return <LoadingScreen />;
  }

  if (numberOfProjects === 0) {
    return (
      <Container className="grid grid-cols-1 gap-8 md:grid-cols-4 md:pt-8">
        <Box className="noapps col-span-1 h-80 rounded-md text-center md:col-span-3">
          <div className="pt-12">
            <Text
              className="text-center text-2xl font-semibold"
              sx={{ color: 'common.white' }}
            >
              Welcome to Nhost!
            </Text>

            <Text className="mt-2" sx={{ color: 'common.white' }}>
              Let&apos;s set up your first backend - the Nhost way.
            </Text>

            <div className="inline-block pt-10">
              <NavLink href="/new" passHref legacyBehavior>
                <Button
                  sx={{
                    backgroundColor: (theme) =>
                      `${theme.palette.common.white} !important`,
                    color: (theme) =>
                      `${theme.palette.common.black} !important`,
                    '&:hover': {
                      backgroundColor: (theme) =>
                        `${darken(theme.palette.common.white, 0.1)} !important`,
                    },
                  }}
                  disabled={data?.workspaces?.length === 0}
                >
                  Create Your First Project
                </Button>
              </NavLink>
            </div>
          </div>
        </Box>

        <WorkspaceSidebar workspaces={data?.workspaces || []} />
      </Container>
    );
  }

  return (
    <Container className="grid grid-cols-1 gap-8 md:grid-cols-4">
      <WorkspaceAndProjectList
        workspaces={data?.workspaces || []}
        className="col-span-1 md:col-span-3"
      />

      <WorkspaceSidebar workspaces={data?.workspaces || []} />
    </Container>
  );
}

IndexPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <AuthenticatedLayout
      title="Dashboard"
      contentContainerProps={{ className: 'flex w-full flex-col px-4' }}
    >
      <Container className="py-0">
        <MaintenanceAlert />
      </Container>

      {page}
    </AuthenticatedLayout>
  );
};
