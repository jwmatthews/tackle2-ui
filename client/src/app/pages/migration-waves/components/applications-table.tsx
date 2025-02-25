import React from "react";
import { Application, MigrationWave } from "@app/api/models";
import { useTranslation } from "react-i18next";
import TrashIcon from "@patternfly/react-icons/dist/esm/icons/trash-icon";
import {
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import {
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@patternfly/react-table";
import alignment from "@patternfly/react-styles/css/utilities/Alignment/alignment";
import { useLocalTableControls } from "@app/shared/hooks/table-controls";
import {
  ConditionalTableBody,
  TableHeaderContentWithControls,
  TableRowContentWithControls,
} from "@app/shared/components/table-controls";
import { SimplePagination } from "@app/shared/components/simple-pagination";

export interface IWaveApplicationsTableProps {
  migrationWave: MigrationWave;
  applications: Application[];
  removeApplication: (migrationWave: MigrationWave, id: number) => void;
}

export const WaveApplicationsTable: React.FC<IWaveApplicationsTableProps> = ({
  migrationWave,
  applications,
  removeApplication,
}) => {
  const { t } = useTranslation();

  const tableControls = useLocalTableControls({
    idProperty: "name",
    items: applications,
    columnNames: {
      appName: "Name",
      description: "Description",
      businessService: "Business service",
      owner: "Owner",
    },
    hasActionsColumn: true,
    getSortValues: (app) => ({
      appName: app.name || "",
      businessService: app.businessService?.name || "",
      owner: app.owner?.name || "",
    }),
    sortableColumns: ["appName", "businessService", "owner"],
    hasPagination: true,
    variant: "compact",
  });
  const {
    currentPageItems,
    numRenderedColumns,
    propHelpers: {
      toolbarProps,
      paginationToolbarItemProps,
      paginationProps,
      tableProps,
      getThProps,
      getTdProps,
    },
  } = tableControls;

  return (
    <>
      <Toolbar {...toolbarProps}>
        <ToolbarContent>
          <ToolbarItem {...paginationToolbarItemProps}>
            <SimplePagination
              idPrefix={`expanded-migration-wave-${migrationWave.name}-apps-table`}
              isTop
              paginationProps={paginationProps}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <TableComposable
        {...tableProps}
        aria-label={`Applications table for migration wave ${migrationWave.name}`}
      >
        <Thead>
          <Tr>
            <TableHeaderContentWithControls {...tableControls}>
              <Th {...getThProps({ columnKey: "appName" })} />
              <Th {...getThProps({ columnKey: "description" })} />
              <Th {...getThProps({ columnKey: "businessService" })} />
              <Th {...getThProps({ columnKey: "owner" })} />
            </TableHeaderContentWithControls>
          </Tr>
        </Thead>
        <ConditionalTableBody
          isNoData={applications.length === 0}
          numRenderedColumns={numRenderedColumns}
        >
          <Tbody>
            {currentPageItems?.map((app, rowIndex) => (
              <Tr key={app.name}>
                <TableRowContentWithControls
                  {...tableControls}
                  item={app}
                  rowIndex={rowIndex}
                >
                  <Td width={15} {...getTdProps({ columnKey: "appName" })}>
                    {app.name}
                  </Td>
                  <Td width={15} {...getTdProps({ columnKey: "description" })}>
                    {app.description}
                  </Td>
                  <Td
                    width={15}
                    {...getTdProps({ columnKey: "businessService" })}
                  >
                    {app?.businessService?.name}
                  </Td>
                  <Td width={15} {...getTdProps({ columnKey: "owner" })}>
                    {app?.owner?.name}
                  </Td>
                  <Td className={alignment.textAlignRight}>
                    <Button
                      type="button"
                      variant="plain"
                      onClick={() => removeApplication(migrationWave, app.id)}
                    >
                      <TrashIcon />
                    </Button>
                  </Td>
                </TableRowContentWithControls>
              </Tr>
            ))}
          </Tbody>
        </ConditionalTableBody>
      </TableComposable>
    </>
  );
};
