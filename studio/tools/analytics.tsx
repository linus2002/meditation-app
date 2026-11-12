import { Card, Flex, Stack, Text } from '@sanity/ui';
import { ChartUpwardIcon } from '@sanity/icons';
import type { Tool } from 'sanity';

/**
 * An "Analytics" tab in the Studio that shows a shared PostHog dashboard.
 *
 * The numbers live in PostHog; this only displays them. In PostHog, open the
 * dashboard, choose Share -> Embed, and put the iframe's src URL in
 * studio/.env as SANITY_STUDIO_POSTHOG_DASHBOARD_URL.
 *
 * Anyone with that link can see the dashboard, so it should hold totals only:
 * never session replays or anything about one person. Those stay behind
 * PostHog's own sign-in.
 */
const dashboardUrl = process.env.SANITY_STUDIO_POSTHOG_DASHBOARD_URL;

function AnalyticsTool() {
  if (!dashboardUrl) {
    return (
      <Flex align="center" justify="center" height="fill" padding={5}>
        <Card padding={5} radius={3} shadow={1} style={{ maxWidth: 520 }}>
          <Stack gap={4}>
            <Text size={3} weight="semibold">
              No dashboard connected yet
            </Text>
            <Text muted>
              In PostHog, open the dashboard you want here, choose Share, turn on sharing and copy
              the embed URL. Add it to studio/.env as SANITY_STUDIO_POSTHOG_DASHBOARD_URL, then
              restart the Studio.
            </Text>
          </Stack>
        </Card>
      </Flex>
    );
  }

  return (
    <iframe
      src={dashboardUrl}
      title="PostHog dashboard"
      style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}

export const analyticsTool: Tool = {
  name: 'analytics',
  title: 'Analytics',
  icon: ChartUpwardIcon,
  component: AnalyticsTool,
};
