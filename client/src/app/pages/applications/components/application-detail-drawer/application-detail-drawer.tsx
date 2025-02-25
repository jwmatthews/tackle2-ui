import * as React from "react";
import {
  TextContent,
  Text,
  Title,
  Tabs,
  Tab,
  TabTitleText,
  Spinner,
  Bullseye,
} from "@patternfly/react-core";
import spacing from "@patternfly/react-styles/css/utilities/Spacing/spacing";
import { Application, Task } from "@app/api/models";
import {
  IPageDrawerContentProps,
  PageDrawerContent,
} from "@app/shared/page-drawer-context";
import { ApplicationBusinessService } from "../application-business-service";
import { ApplicationTags } from "../application-tags";

export interface IApplicationDetailDrawerProps
  extends Pick<IPageDrawerContentProps, "onCloseClick"> {
  application: Application | null;
  task: Task | undefined | null;
  applications?: Application[];
  detailsTabMainContent: React.ReactNode;
  reportsTabContent?: React.ReactNode;
}

enum TabKey {
  Details = 0,
  Tags,
  Reports,
}

export const ApplicationDetailDrawer: React.FC<
  IApplicationDetailDrawerProps
> = ({
  onCloseClick,
  application,
  task,
  detailsTabMainContent,
  reportsTabContent = null,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState<TabKey>(
    TabKey.Details
  );

  return (
    <PageDrawerContent
      isExpanded={!!application}
      onCloseClick={onCloseClick}
      focusKey={application?.id}
      pageKey="app-inventory"
    >
      <TextContent>
        <Text component="small" className={spacing.mb_0}>
          Name
        </Text>
        <Title headingLevel="h2" size="lg" className={spacing.mtXs}>
          {application?.name}
        </Title>
      </TextContent>
      <Tabs
        activeKey={activeTabKey}
        onSelect={(_event, tabKey) => setActiveTabKey(tabKey as TabKey)}
        className={spacing.mtLg}
      >
        <Tab
          eventKey={TabKey.Details}
          title={<TabTitleText>Details</TabTitleText>}
        >
          <TextContent className={`${spacing.mtMd} ${spacing.mbMd}`}>
            <Text component="small">{application?.description}</Text>
            <Title headingLevel="h3" size="md">
              Business service
            </Title>
            <Text component="small">
              {application?.businessService && (
                <ApplicationBusinessService
                  id={application.businessService.id}
                />
              )}
            </Text>
          </TextContent>
          {detailsTabMainContent}
        </Tab>
        <Tab eventKey={TabKey.Tags} title={<TabTitleText>Tags</TabTitleText>}>
          {application && task?.state === "Running" ? (
            <Bullseye className={spacing.mtLg}>
              <Spinner size="xl">Loading...</Spinner>
            </Bullseye>
          ) : (
            application && <ApplicationTags application={application} />
          )}
        </Tab>
        {reportsTabContent && (
          <Tab
            eventKey={TabKey.Reports}
            title={<TabTitleText>Reports</TabTitleText>}
          >
            {task?.state === "Running" ? (
              <Bullseye className={spacing.mtLg}>
                <Spinner size="xl">Loading...</Spinner>
              </Bullseye>
            ) : (
              reportsTabContent
            )}
          </Tab>
        )}
      </Tabs>
    </PageDrawerContent>
  );
};
