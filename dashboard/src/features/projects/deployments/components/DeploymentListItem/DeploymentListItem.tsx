import { NavLink } from '@/components/common/NavLink';
import type { DeploymentStatus } from '@/components/presentational/StatusCircle';
import { StatusCircle } from '@/components/presentational/StatusCircle';
import { useCurrentWorkspaceAndProject } from '@/features/projects/common/hooks/useCurrentWorkspaceAndProject';
import { DeploymentDurationLabel } from '@/features/projects/deployments/components/DeploymentDurationLabel';
import { Avatar } from '@/ui/v1/Avatar';
import { Button } from '@/ui/v2/Button';
import { Chip } from '@/ui/v2/Chip';
import { ArrowCounterclockwiseIcon } from '@/ui/v2/icons/ArrowCounterclockwiseIcon';
import { ChevronRightIcon } from '@/ui/v2/icons/ChevronRightIcon';
import { ListItem } from '@/ui/v2/ListItem';
import { Tooltip } from '@/ui/v2/Tooltip';
import { getToastStyleProps } from '@/utils/constants/settings';
import { getServerError } from '@/utils/getServerError';
import type { DeploymentRowFragment } from '@/utils/__generated__/graphql';
import {
  GetAllWorkspacesAndProjectsDocument,
  useInsertDeploymentMutation,
} from '@/utils/__generated__/graphql';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import type { MouseEvent } from 'react';
import { toast } from 'react-hot-toast';
import { twMerge } from 'tailwind-merge';

export interface DeploymentListItemProps {
  /**
   * Deployment data.
   */
  deployment: DeploymentRowFragment;
  /**
   * Determines whether or not the deployment is live.
   */
  isLive?: boolean;
  /**
   * Determines whether or not the redeploy button should be shown for the
   * deployment.
   */
  showRedeploy?: boolean;
  /**
   * Determines whether or not the redeploy button is disabled.
   */
  disableRedeploy?: boolean;
}

export default function DeploymentListItem({
  deployment,
  isLive,
  showRedeploy,
  disableRedeploy,
}: DeploymentListItemProps) {
  const { currentWorkspace, currentProject } = useCurrentWorkspaceAndProject();

  const relativeDateOfDeployment = deployment.deploymentStartedAt
    ? formatDistanceToNowStrict(parseISO(deployment.deploymentStartedAt), {
        addSuffix: true,
      })
    : '';

  const [insertDeployment, { loading }] = useInsertDeploymentMutation({
    refetchQueries: [{ query: GetAllWorkspacesAndProjectsDocument }],
  });
  const { commitMessage } = deployment;

  async function redeployDeployment(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();

    const insertDeploymentPromise = insertDeployment({
      variables: {
        object: {
          appId: currentProject?.id,
          commitMessage: deployment.commitMessage,
          commitSHA: deployment.commitSHA,
          commitUserAvatarUrl: deployment.commitUserAvatarUrl,
          commitUserName: deployment.commitUserName,
          deploymentStatus: 'SCHEDULED',
        },
      },
    });

    await toast.promise(
      insertDeploymentPromise,
      {
        loading: 'Scheduling deployment...',
        success: 'Deployment has been scheduled successfully.',
        error: getServerError('An error occurred when scheduling deployment.'),
      },
      getToastStyleProps(),
    );
  }

  return (
    <ListItem.Root>
      <ListItem.Button
        className="grid grid-flow-col items-center justify-between gap-2 rounded-none p-2"
        component={NavLink}
        href={`/${currentWorkspace.slug}/${currentProject.slug}/deployments/${deployment.id}`}
        aria-label={commitMessage || 'No commit message'}
      >
        <div className="grid grid-flow-col items-center justify-center gap-2 self-center">
          <ListItem.Avatar>
            <Avatar
              name={deployment.commitUserName}
              avatarUrl={deployment.commitUserAvatarUrl}
              className="h-8 w-8 shrink-0"
            />
          </ListItem.Avatar>

          <ListItem.Text
            primary={
              commitMessage?.trim() || (
                <span className="truncate pr-1 font-normal italic">
                  No commit message
                </span>
              )
            }
            secondary={relativeDateOfDeployment}
          />
        </div>

        <div className="grid grid-flow-col items-center justify-end gap-2">
          {showRedeploy && (
            <Tooltip
              title={
                disableRedeploy || loading
                  ? 'Deployments cannot be re-triggered when a deployment is in progress.'
                  : ''
              }
              hasDisabledChildren={disableRedeploy || loading}
              disableHoverListener={!disableRedeploy}
            >
              <Button
                disabled={disableRedeploy || loading}
                size="small"
                color="secondary"
                variant="outlined"
                onClick={redeployDeployment}
                startIcon={
                  <ArrowCounterclockwiseIcon className={twMerge('h-4 w-4')} />
                }
                className="rounded-full py-1 px-2 text-xs"
                aria-label="Redeploy"
              >
                Redeploy
              </Button>
            </Tooltip>
          )}

          {isLive && (
            <div className="hidden w-12 justify-end sm:flex">
              <Chip size="small" color="success" label="Live" />
            </div>
          )}

          <div className="hidden w-16 text-right font-mono text-sm- font-medium sm:block">
            {deployment.commitSHA.substring(0, 7)}
          </div>

          <div className="text-right font-mono text-sm- font-medium sm:w-20">
            <DeploymentDurationLabel
              startedAt={deployment.deploymentStartedAt}
              endedAt={deployment.deploymentEndedAt}
            />
          </div>

          <StatusCircle
            status={deployment.deploymentStatus as DeploymentStatus}
          />

          <ChevronRightIcon className="h-4 w-4" />
        </div>
      </ListItem.Button>
    </ListItem.Root>
  );
}
