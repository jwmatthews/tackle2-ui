import * as React from "react";
import {
  Button,
  ButtonVariant,
  Modal,
  PageSection,
  PageSectionVariants,
  Text,
  TextContent,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import { useTranslation } from "react-i18next";
import {
  AppPlaceholder,
  AppTableActionButtons,
  ConditionalRender,
  ConfirmDialog,
  ToolbarBulkSelector,
} from "@app/shared/components";
import {
  FilterToolbar,
  FilterType,
} from "@app/shared/components/FilterToolbar";
import {
  useDeleteTrackerMutation,
  useFetchTrackers,
} from "@app/queries/trackers";
import {
  Tbody,
  Tr,
  Td,
  Thead,
  Th,
  TableComposable,
} from "@patternfly/react-table";

import { useLocalTableControls } from "@app/shared/hooks/table-controls";
import { SimplePagination } from "@app/shared/components/simple-pagination";
import {
  ConditionalTableBody,
  TableHeaderContentWithControls,
  TableRowContentWithControls,
} from "@app/shared/components/table-controls";
import { TrackerForm } from "./tracker-form";
import { Tracker, Ref } from "@app/api/models";
import { NotificationsContext } from "@app/shared/notifications-context";
import { getAxiosErrorMessage } from "@app/utils/utils";
import { AxiosError } from "axios";
import { useFetchTickets } from "@app/queries/tickets";
import TrackerStatus from "./components/tracker-status";

export const JiraTrackers: React.FC = () => {
  const { t } = useTranslation();
  const { pushNotification } = React.useContext(NotificationsContext);

  const [trackerModalState, setTrackerModalState] = React.useState<
    "create" | Tracker | null
  >(null);
  const isTrackerModalOpen = trackerModalState !== null;
  const trackerToUpdate =
    trackerModalState !== "create" ? trackerModalState : null;

  const [trackerToDeleteState, setTrackerToDeleteState] =
    React.useState<Tracker | null>(null);

  const isConfirmDialogOpen = trackerToDeleteState !== null;

  const { trackers, isFetching, fetchError, refetch } = useFetchTrackers();

  const { tickets } = useFetchTickets();

  const includesTracker = (id: number) =>
    tickets.map((ticket) => ticket.tracker.id).includes(id);

  const onDeleteTrackerSuccess = (name: string) => {
    pushNotification({
      title: t("toastr.success.deleted", {
        what: name,
        type: t("terms.instance"),
      }),
      variant: "success",
    });
  };

  const onDeleteTrackerError = (error: AxiosError) => {
    pushNotification({
      title: getAxiosErrorMessage(error),
      variant: "danger",
    });
    refetch();
  };

  const { mutate: deleteTracker } = useDeleteTrackerMutation(
    onDeleteTrackerSuccess,
    onDeleteTrackerError
  );

  const tableControls = useLocalTableControls({
    idProperty: "name",
    items: trackers,
    columnNames: {
      name: `${t("terms.instance")} name`,
      url: "URL",
      kind: `${t("terms.instance")} type`,
      connection: "Connection",
    },
    isSelectable: true,
    filterCategories: [
      {
        key: "name",
        title: t("terms.name"),
        type: FilterType.search,
        placeholderText:
          t("actions.filterBy", {
            what: t("terms.name").toLowerCase(),
          }) + "...",
        getItemValue: (item) => {
          return item?.name || "";
        },
      },
    ],
    getSortValues: (tracker) => ({
      name: tracker.name || "",
      url: "", // TODO
    }),
    sortableColumns: ["name", "url"],
    hasPagination: true,
    isLoading: isFetching,
  });
  const {
    currentPageItems,
    numRenderedColumns,
    selectionState: { selectedItems },
    propHelpers: {
      toolbarProps,
      toolbarBulkSelectorProps,
      filterToolbarProps,
      paginationToolbarItemProps,
      paginationProps,
      tableProps,
      getThProps,
      getTdProps,
    },
  } = tableControls;

  return (
    <>
      <PageSection variant={PageSectionVariants.light}>
        <TextContent>
          <Text component="h1">{t("terms.jiraConfig")}</Text>
        </TextContent>
      </PageSection>
      <PageSection>
        <ConditionalRender
          when={isFetching && !(trackers || fetchError)}
          then={<AppPlaceholder />}
        >
          <div
            style={{
              backgroundColor: "var(--pf-global--BackgroundColor--100)",
            }}
          >
            <Toolbar {...toolbarProps}>
              <ToolbarContent>
                <ToolbarBulkSelector {...toolbarBulkSelectorProps} />
                <FilterToolbar {...filterToolbarProps} />
                <ToolbarGroup variant="button-group">
                  {/* <RBAC
                    allowedPermissions={[]}
                    rbacType={RBAC_TYPE.Scope}
                  > */}
                  <ToolbarItem>
                    <Button
                      type="button"
                      id="create-Tracker"
                      aria-label="Create new tracker"
                      variant={ButtonVariant.primary}
                      onClick={() => setTrackerModalState("create")}
                    >
                      {t("actions.createNew")}
                    </Button>
                  </ToolbarItem>
                  {/* </RBAC> */}
                  {/* {jiraDropdownItems.length ? (
                    <ToolbarItem>
                      <KebabDropdown
                        dropdownItems={migrationWaveDropdownItems}
                      ></KebabDropdown>
                    </ToolbarItem>
                  ) : (
                    <></>
                  )} */}
                </ToolbarGroup>
                <ToolbarItem {...paginationToolbarItemProps}>
                  <SimplePagination
                    idPrefix="jira-Tracker-table"
                    isTop
                    paginationProps={paginationProps}
                  />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
            <TableComposable {...tableProps} aria-label="Jira trackers table">
              <Thead>
                <Tr>
                  <TableHeaderContentWithControls {...tableControls}>
                    <Th {...getThProps({ columnKey: "name" })} />
                    <Th {...getThProps({ columnKey: "url" })} />
                    <Th {...getThProps({ columnKey: "kind" })} />
                    <Th {...getThProps({ columnKey: "connection" })} />
                  </TableHeaderContentWithControls>
                </Tr>
              </Thead>
              <ConditionalTableBody
                isLoading={isFetching}
                isError={!!fetchError}
                isNoData={trackers.length === 0}
                numRenderedColumns={numRenderedColumns}
              >
                <Tbody>
                  {currentPageItems?.map((tracker, rowIndex) => (
                    <Tr key={tracker.name}>
                      <TableRowContentWithControls
                        {...tableControls}
                        item={tracker}
                        rowIndex={rowIndex}
                      >
                        <Td width={10} {...getTdProps({ columnKey: "name" })}>
                          {tracker.name}
                        </Td>
                        <Td width={20} {...getTdProps({ columnKey: "url" })}>
                          {tracker.url}
                        </Td>
                        <Td width={10} {...getTdProps({ columnKey: "kind" })}>
                          {tracker.kind}
                        </Td>
                        <Td width={10} {...getTdProps({ columnKey: "kind" })}>
                          <TrackerStatus connected={tracker.connected} />
                        </Td>
                        <Td width={20}>
                          <AppTableActionButtons
                            onEdit={() => setTrackerModalState(tracker)}
                            onDelete={() => {
                              includesTracker(tracker.id)
                                ? pushNotification({
                                    title: t(
                                      "This instance contains issues associated with applications and cannot be deleted"
                                    ),
                                    variant: "danger",
                                  })
                                : setTrackerToDeleteState(tracker);
                            }}
                          />
                        </Td>
                      </TableRowContentWithControls>
                    </Tr>
                  ))}
                </Tbody>
              </ConditionalTableBody>
            </TableComposable>
          </div>
        </ConditionalRender>
      </PageSection>
      <Modal
        title={
          trackerToUpdate
            ? t("dialog.title.update", {
                what: t("terms.instance").toLowerCase(),
              })
            : t("dialog.title.new", {
                what: t("terms.instance").toLowerCase(),
              })
        }
        variant="medium"
        isOpen={isTrackerModalOpen}
        onClose={() => {
          setTrackerModalState(null);
        }}
      >
        <TrackerForm
          tracker={trackerToUpdate ? trackerToUpdate : undefined}
          onClose={() => setTrackerModalState(null)}
        />
      </Modal>
      <ConfirmDialog
        title={t("dialog.title.delete", {
          what: t("terms.instance").toLowerCase(),
        })}
        isOpen={isConfirmDialogOpen}
        titleIconVariant={"warning"}
        message={t("dialog.message.delete")}
        confirmBtnVariant={ButtonVariant.danger}
        confirmBtnLabel={t("actions.delete")}
        cancelBtnLabel={t("actions.cancel")}
        onCancel={() => setTrackerToDeleteState(null)}
        onClose={() => setTrackerToDeleteState(null)}
        onConfirm={() => {
          if (trackerToDeleteState) {
            deleteTracker({ tracker: trackerToDeleteState });
          }
          setTrackerToDeleteState(null);
        }}
      />
    </>
  );
};
