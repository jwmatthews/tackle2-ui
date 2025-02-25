import * as React from "react";
import {
  ActionGroup,
  Alert,
  AlertActionCloseButton,
  Button,
  ButtonVariant,
  FileUpload,
  Form,
  MultipleFileUpload,
  MultipleFileUploadMain,
  MultipleFileUploadStatus,
  MultipleFileUploadStatusItem,
  Radio,
} from "@patternfly/react-core";
import UploadIcon from "@patternfly/react-icons/dist/esm/icons/upload-icon";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import Resizer from "react-image-file-resizer";

import {
  HookFormPFGroupController,
  HookFormPFTextInput,
} from "@app/shared/components/hook-form-pf-fields";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { Identity, IReadFile, Ref, Ruleset, Rule } from "@app/api/models";
import { parseRules } from "@app/common/CustomRules/rules-utils";
import {
  useCreateFileMutation,
  useCreateRulesetMutation,
  useFetchRulesets,
  useUpdateRulesetMutation,
} from "@app/queries/rulesets";
import { AxiosError, AxiosResponse } from "axios";
import spacing from "@patternfly/react-styles/css/utilities/Spacing/spacing";
import { OptionWithValue, SimpleSelect } from "@app/shared/components";
import {
  IdentityDropdown,
  toIdentityDropdown,
  toOptionLike,
} from "@app/utils/model-utils";
import { useFetchIdentities } from "@app/queries/identities";
import useRuleFiles from "@app/common/CustomRules/useRuleFiles";
import { duplicateNameCheck } from "@app/utils/utils";
import { customRulesFilesSchema } from "../applications/analysis-wizard/schema";

export interface CustomTargetFormProps {
  ruleset?: Ruleset;
  onSaved: (response: AxiosResponse<Ruleset>) => void;
  onCancel: () => void;
}

export interface CustomTargetFormValues {
  id: number;
  name: string;
  description?: string;
  imageID: number | null;
  customRulesFiles: IReadFile[];
  rulesKind: string;
  repositoryType?: string;
  sourceRepository?: string;
  branch?: string;
  rootPath?: string;
  associatedCredentials?: string;
}

export const CustomTargetForm: React.FC<CustomTargetFormProps> = ({
  ruleset: initialRuleset,
  onSaved,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [ruleset, setRuleset] = useState(initialRuleset);

  const [filename, setFilename] = React.useState("default.png");

  const [isImageFileRejected, setIsImageFileRejected] = useState(false);

  const resizeFile = (file: File) =>
    new Promise<File>((resolve) => {
      const extension = file?.name?.split(".")[1];
      Resizer.imageFileResizer(
        file,
        80,
        80,
        extension,
        100,
        0,
        (uri) => {
          resolve(uri as File);
        },
        "file"
      );
    });

  const repositoryTypeOptions: OptionWithValue<string>[] = [
    {
      value: "git",
      toString: () => `Git`,
    },
    {
      value: "svn",
      toString: () => `Subversion`,
    },
  ];

  const { identities } = useFetchIdentities();

  const sourceIdentityOptions = identities
    .filter((identity) => identity.kind === "source")
    .map((sourceIdentity) => {
      return {
        value: sourceIdentity.name,
        toString: () => sourceIdentity.name,
      };
    });

  const toOptionWithValue = (
    value: IdentityDropdown
  ): OptionWithValue<IdentityDropdown> => ({
    value,
    toString: () => value?.name || "",
  });

  const { rulesets } = useFetchRulesets();

  const validationSchema: yup.SchemaOf<CustomTargetFormValues> = yup
    .object()
    .shape({
      id: yup.number().defined(),
      name: yup
        .string()
        .trim()
        .required(t("validation.required"))
        .min(3, t("validation.minLength", { length: 3 }))
        .max(120, t("validation.maxLength", { length: 120 }))
        .test(
          "Duplicate name",
          "A custom target with this name already exists. Use a different name.",
          (value) => duplicateNameCheck(rulesets, ruleset || null, value || "")
        ),
      description: yup.string(),
      imageID: yup.number().defined(),
      rulesKind: yup.string().defined(),
      customRulesFiles: yup
        .array()
        .of(customRulesFilesSchema)
        .when("rulesKind", {
          is: "manual",
          then: yup
            .array()
            .of(customRulesFilesSchema)
            .min(1, "At least 1 valid custom rule file must be uploaded."),
          otherwise: (schema) => schema,
        }),
      repositoryType: yup.mixed<string>().when("rulesKind", {
        is: "repository",
        then: yup.mixed<string>().required(),
      }),
      sourceRepository: yup.mixed<string>().when("rulesKind", {
        is: "repository",
        then: yup
          .string()
          .required("This value is required")
          .min(3, t("validation.minLength", { length: 3 }))
          .max(120, t("validation.maxLength", { length: 120 })),
      }),
      branch: yup.mixed<string>().when("rulesKind", {
        is: "repository",
        then: yup.mixed<string>(),
      }),
      rootPath: yup.mixed<string>().when("rulesKind", {
        is: "repository",
        then: yup.mixed<string>(),
      }),
      associatedCredentials: yup.mixed<any>().when("rulesKind", {
        is: "repository",
        then: yup.mixed<any>(),
      }),
    });

  const getInitialCustomRulesFilesData = () =>
    ruleset?.rules?.map((ruleset): IReadFile => {
      const emptyFile = new File(["empty"], ruleset.name, {
        type: "placeholder",
      });
      return {
        fileName: ruleset.name,
        fullFile: emptyFile,
        loadResult: "success",
        loadPercentage: 100,
      };
    }) || [];

  const methods = useForm<CustomTargetFormValues>({
    defaultValues: {
      id: ruleset?.id || 0,
      name: ruleset?.name || "",
      description: ruleset?.description || "",
      imageID: ruleset?.image?.id || 1,
      customRulesFiles: getInitialCustomRulesFilesData(),
      rulesKind: !ruleset
        ? "manual"
        : !!ruleset?.rules?.length
        ? "manual"
        : "repository",
      associatedCredentials: ruleset?.identity?.name,
      repositoryType: ruleset?.repository?.kind,
      sourceRepository: ruleset?.repository?.url,
      branch: ruleset?.repository?.branch,
      rootPath: ruleset?.repository?.path,
    },
    resolver: yupResolver(validationSchema),
    mode: "onChange",
  });

  const {
    handleSubmit,
    formState: { isSubmitting, isValidating, isValid, isDirty },
    getValues,
    setValue,
    control,
    watch,
    setFocus,
    clearErrors,
    trigger,
    reset,
    register,
  } = methods;

  useEffect(() => {
    setRuleset(initialRuleset);
    if (initialRuleset?.image?.id === 1) {
      setFilename("default.png");
    } else {
      setFilename(initialRuleset?.image?.name || "default.png");
    }
    return () => {
      setRuleset(undefined);
      setFilename("default.png");
    };
  }, []);

  const watchAllFields = watch();
  const values = getValues();

  const {
    ruleFiles,
    handleFileDrop,
    showStatus,
    uploadError,
    setUploadError,
    setStatus,
    getloadPercentage,
    getloadResult,
    successfullyReadFileCount,
    handleFile,
    removeFiles,
  } = useRuleFiles(null, values.customRulesFiles, methods);

  const onSubmit = (formValues: CustomTargetFormValues) => {
    let rules: Rule[] = [];

    ruleFiles.forEach((file) => {
      if (file.data && file?.fullFile?.type !== "placeholder") {
        const { source, target, fileID, allLabels } = parseRules(file);
        const newRule: Rule = {
          name: file.fileName,
          labels: allLabels,
          file: {
            id: fileID ? fileID : 0,
          },
        };
        rules = [...rules, newRule];
      } else {
        const matchingExistingRule = ruleset?.rules.find(
          (ruleset) => ruleset.name === file.fileName
        );
        if (matchingExistingRule) {
          rules = [...rules, matchingExistingRule];
        }
      }
    });
    const matchingSourceCredential = identities.find(
      (identity) => identity.name === formValues.associatedCredentials
    );

    const payload: Ruleset = {
      id: formValues.id ? formValues.id : undefined,
      name: formValues.name.trim(),
      description: formValues?.description?.trim() || "",
      image: { id: formValues.imageID ? formValues.imageID : 1 },
      custom: true,
      rules: rules,
      ...(formValues.rulesKind === "repository" && {
        repository: {
          kind: formValues?.repositoryType,
          url: formValues?.sourceRepository?.trim(),
          branch: formValues?.branch?.trim(),
          path: formValues?.rootPath?.trim(),
        },
      }),
      ...(formValues.associatedCredentials &&
        matchingSourceCredential &&
        formValues.rulesKind === "repository" && {
          identity: {
            id: matchingSourceCredential.id,
            name: matchingSourceCredential.name,
          },
        }),
    };
    if (ruleset) {
      updateRuleset({ ...payload });
    } else {
      createRuleset(payload);
    }
  };

  const onCreateImageFileSuccess = (response: any) => {
    setValue("imageID", response?.id);
    setFocus("imageID");
    clearErrors("imageID");
    trigger("imageID");
  };

  const onCreateImageFileFailure = (error: AxiosError) => {
    setValue("imageID", 1);
  };

  const { mutate: createImageFile } = useCreateFileMutation(
    onCreateImageFileSuccess,
    onCreateImageFileFailure
  );

  const onCreaterulesuccess = (response: any) => {
    onSaved(response);
    reset();
  };

  const onCreateRulesetFailure = (error: AxiosError) => {};

  const { mutate: createRuleset } = useCreateRulesetMutation(
    onCreaterulesuccess,
    onCreateRulesetFailure
  );

  const onUpdaterulesuccess = (response: any) => {
    onSaved(response);
    reset();
  };

  const onUpdateRulesetFailure = (error: AxiosError) => {};

  const { mutate: updateRuleset } = useUpdateRulesetMutation(
    onUpdaterulesuccess,
    onUpdateRulesetFailure
  );

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <HookFormPFTextInput
        control={control}
        name="name"
        label="Name"
        fieldId="name"
        isRequired
      />
      <HookFormPFTextInput
        control={control}
        name="description"
        label="Description"
        fieldId="description"
      />
      <HookFormPFGroupController
        control={control}
        name="imageID"
        label={t("terms.image")}
        fieldId="custom-migration-target-upload-image"
        helperText="Upload a png or jpeg file (Max size: 1 MB)"
        renderInput={({ field: { onChange, name }, fieldState: { error } }) => (
          <FileUpload
            id="custom-migration-target-upload-image"
            name={name}
            value={filename}
            filename={filename}
            filenamePlaceholder="Drag and drop a file or upload one"
            dropzoneProps={{
              accept: ".png, .jpeg, .jpg",
              maxSize: 1000000,
              onDropRejected: (event) => {
                const currentFile = event[0];
                if (currentFile.size > 1000000) {
                  methods.setError("imageID", {
                    type: "custom",
                    message: "Max image file size of 1 MB exceeded.",
                  });
                }
                setIsImageFileRejected(true);
              },
            }}
            validated={isImageFileRejected || error ? "error" : "default"}
            onChange={async (fileContents, fileName, event) => {
              const image = await resizeFile(fileContents as File);
              setFilename(image.name);
              const formFile = new FormData();
              formFile.append("file", fileContents);

              const newImageFile: IReadFile = {
                fileName: fileName,
                fullFile: fileContents as File,
              };

              createImageFile({
                formData: formFile,
                file: newImageFile,
              });
            }}
            onClearClick={() => {
              onChange();
              setFilename("default.png");
              setValue("imageID", 1);
              setIsImageFileRejected(false);
            }}
            browseButtonText="Upload"
          />
        )}
      />
      <HookFormPFGroupController
        control={control}
        name="rulesKind"
        label="Custom rules"
        fieldId="type-select"
        isRequired
        renderInput={({ field: { value, name, onChange } }) => (
          <>
            <Radio
              id="manual"
              name="Upload manually"
              isChecked={value === "manual"}
              onChange={() => {
                onChange("manual");
              }}
              label="Upload manually"
              className={spacing.mbXs}
            />
            <Radio
              id="repository"
              name="repository"
              isChecked={value === "repository"}
              onChange={() => {
                onChange("repository");
              }}
              label="Retrieve from a repository"
              className={spacing.mbXs}
            />
          </>
        )}
      />

      {values?.rulesKind === "manual" && (
        <>
          {uploadError !== "" && (
            <Alert
              className={`${spacing.mtMd} ${spacing.mbMd}`}
              variant="danger"
              isInline
              title={uploadError}
              actionClose={
                <AlertActionCloseButton onClose={() => setUploadError("")} />
              }
            />
          )}
          <MultipleFileUpload
            onFileDrop={handleFileDrop}
            dropzoneProps={{
              accept: ".yml, .yaml",
            }}
            {...register("customRulesFiles")}
          >
            <MultipleFileUploadMain
              titleIcon={<UploadIcon />}
              titleText="Drag and drop files here"
              titleTextSeparator="or"
              infoText="Accepted file types: .yml, .yaml."
            />
            {showStatus && (
              <MultipleFileUploadStatus
                statusToggleText={`${successfullyReadFileCount} of ${ruleFiles.length} files uploaded`}
                statusToggleIcon={setStatus()}
              >
                {ruleFiles.map((file) => (
                  <MultipleFileUploadStatusItem
                    file={file.fullFile}
                    key={file.fileName}
                    customFileHandler={(file) => handleFile(file)}
                    onClearClick={() => removeFiles([file.fileName])}
                    progressValue={getloadPercentage(file.fileName)}
                    progressVariant={getloadResult(file.fileName)}
                  />
                ))}
              </MultipleFileUploadStatus>
            )}
          </MultipleFileUpload>
        </>
      )}
      {values?.rulesKind === "repository" && (
        <>
          <HookFormPFGroupController
            control={control}
            name="repositoryType"
            label="Repository type"
            fieldId="repo-type-select"
            isRequired
            renderInput={({ field: { value, name, onChange } }) => (
              <SimpleSelect
                id="repo-type-select"
                toggleId="repo-type-select-toggle"
                toggleAriaLabel="Repository type select dropdown toggle"
                aria-label={name}
                value={
                  value ? toOptionLike(value, repositoryTypeOptions) : undefined
                }
                options={repositoryTypeOptions}
                onChange={(selection) => {
                  const selectionValue = selection as OptionWithValue<string>;
                  onChange(selectionValue.value);
                }}
              />
            )}
          />
          <HookFormPFTextInput
            control={control}
            name="sourceRepository"
            label="Source repository"
            fieldId="sourceRepository"
            isRequired
          />
          <HookFormPFTextInput
            control={control}
            name="branch"
            label="Branch"
            fieldId="branch"
          />
          <HookFormPFTextInput
            control={control}
            name="rootPath"
            label="Root path"
            fieldId="rootPath"
          />
          <HookFormPFGroupController
            control={control}
            name="associatedCredentials"
            label="Associated credentials"
            fieldId="credentials-select"
            renderInput={({ field: { value, name, onBlur, onChange } }) => (
              <SimpleSelect
                variant="typeahead"
                id="associated-credentials-select"
                toggleId="associated-credentials-select-toggle"
                toggleAriaLabel="Associated credentials dropdown toggle"
                aria-label={name}
                value={
                  value ? toOptionLike(value, sourceIdentityOptions) : undefined
                }
                options={sourceIdentityOptions}
                onChange={(selection) => {
                  const selectionValue = selection as OptionWithValue<Ref>;
                  onChange(selectionValue.value);
                }}
                onClear={() => onChange("")}
              />
            )}
          />
        </>
      )}

      <ActionGroup>
        <Button
          type="submit"
          aria-label="submit"
          id="identity-form-submit"
          variant={ButtonVariant.primary}
          isDisabled={!isValid || isSubmitting || isValidating || !isDirty}
        >
          {!ruleset ? t("actions.create") : t("actions.save")}
        </Button>
        <Button
          type="button"
          id="cancel"
          aria-label="cancel"
          variant={ButtonVariant.link}
          isDisabled={isSubmitting || isValidating}
          onClick={onCancel}
        >
          {t("actions.cancel")}
        </Button>
      </ActionGroup>
    </Form>
  );
};
