import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { useCallback, useState } from 'react';
import { WorkBook } from 'xlsx-ugnis';

import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { ImportedRow } from '@/spreadsheet-import/types';
import { exceedsMaxRecords } from '@/spreadsheet-import/utils/exceedsMaxRecords';
import { mapWorkbook } from '@/spreadsheet-import/utils/mapWorkbook';
import { CircularProgressBar } from '@/ui/feedback/progress-bar/components/CircularProgressBar';
import { SnackBarVariant } from '@/ui/feedback/snack-bar-manager/components/SnackBar';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { Modal } from '@/ui/layout/modal/components/Modal';

import { Columns, MatchColumnsStep } from './MatchColumnsStep/MatchColumnsStep';
import { SelectHeaderStep } from './SelectHeaderStep/SelectHeaderStep';
import { SelectSheetStep } from './SelectSheetStep/SelectSheetStep';
import { UploadStep } from './UploadStep/UploadStep';
import { ValidationStep } from './ValidationStep/ValidationStep';

const StyledProgressBarContainer = styled(Modal.Content)`
  align-items: center;
  display: flex;
  justify-content: center;
`;

export enum StepType {
  upload = 'upload',
  selectSheet = 'selectSheet',
  selectHeader = 'selectHeader',
  matchColumns = 'matchColumns',
  validateData = 'validateData',
  loading = 'loading',
}
export type StepState =
  | {
      type: StepType.upload;
    }
  | {
      type: StepType.selectSheet;
      workbook: WorkBook;
    }
  | {
      type: StepType.selectHeader;
      data: ImportedRow[];
    }
  | {
      type: StepType.matchColumns;
      data: ImportedRow[];
      headerValues: ImportedRow;
    }
  | {
      type: StepType.validateData;
      data: any[];
      importedColumns: Columns<string>;
    }
  | {
      type: StepType.loading;
    };

interface UploadFlowProps {
  nextStep: () => void;
  prevStep: () => void;
}

export const UploadFlow = ({ nextStep, prevStep }: UploadFlowProps) => {
  const theme = useTheme();
  const { initialStepState } = useSpreadsheetImportInternal();
  const [state, setState] = useState<StepState>(
    initialStepState || { type: StepType.upload },
  );
  const [previousState, setPreviousState] = useState<StepState>(
    initialStepState || { type: StepType.upload },
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const {
    maxRecords,
    uploadStepHook,
    selectHeaderStepHook,
    matchColumnsStepHook,
    selectHeader,
  } = useSpreadsheetImportInternal();
  const { enqueueSnackBar } = useSnackBar();

  const errorToast = useCallback(
    (description: string) => {
      enqueueSnackBar(description, {
        title: 'Error',
        variant: SnackBarVariant.Error,
      });
    },
    [enqueueSnackBar],
  );

  const onBack = useCallback(() => {
    setState(previousState);
    prevStep();
  }, [prevStep, previousState]);

  switch (state.type) {
    case StepType.upload:
      return (
        <UploadStep
          onContinue={async (workbook, file) => {
            setUploadedFile(file);
            const isSingleSheet = workbook.SheetNames.length === 1;
            if (isSingleSheet) {
              if (
                maxRecords > 0 &&
                exceedsMaxRecords(
                  workbook.Sheets[workbook.SheetNames[0]],
                  maxRecords,
                )
              ) {
                errorToast(
                  `Too many records. Up to ${maxRecords.toString()} allowed`,
                );
                return;
              }
              try {
                const mappedWorkbook = await uploadStepHook(
                  mapWorkbook(workbook),
                );

                if (selectHeader) {
                  setState({
                    type: StepType.selectHeader,
                    data: mappedWorkbook,
                  });
                } else {
                  // Automatically select first row as header
                  const trimmedData = mappedWorkbook.slice(1);

                  const { importedRows: data, headerRow: headerValues } =
                    await selectHeaderStepHook(mappedWorkbook[0], trimmedData);

                  setState({
                    type: StepType.matchColumns,
                    data,
                    headerValues,
                  });
                }
              } catch (e) {
                errorToast((e as Error).message);
              }
            } else {
              setState({ type: StepType.selectSheet, workbook });
            }
            setPreviousState(state);
            nextStep();
          }}
        />
      );
    case StepType.selectSheet:
      return (
        <SelectSheetStep
          sheetNames={state.workbook.SheetNames}
          onContinue={async (sheetName) => {
            if (
              maxRecords > 0 &&
              exceedsMaxRecords(state.workbook.Sheets[sheetName], maxRecords)
            ) {
              errorToast(
                `Too many records. Up to ${maxRecords.toString()} allowed`,
              );
              return;
            }
            try {
              const mappedWorkbook = await uploadStepHook(
                mapWorkbook(state.workbook, sheetName),
              );
              setState({
                type: StepType.selectHeader,
                data: mappedWorkbook,
              });
              setPreviousState(state);
            } catch (e) {
              errorToast((e as Error).message);
            }
          }}
          onBack={onBack}
        />
      );
    case StepType.selectHeader:
      return (
        <SelectHeaderStep
          importedRows={state.data}
          onContinue={async (...args) => {
            try {
              const { importedRows: data, headerRow: headerValues } =
                await selectHeaderStepHook(...args);
              setState({
                type: StepType.matchColumns,
                data,
                headerValues,
              });
              setPreviousState(state);
              nextStep();
            } catch (e) {
              errorToast((e as Error).message);
            }
          }}
          onBack={onBack}
        />
      );
    case StepType.matchColumns:
      return (
        <MatchColumnsStep
          data={state.data}
          headerValues={state.headerValues}
          onContinue={async (values, rawData, columns) => {
            try {
              const data = await matchColumnsStepHook(values, rawData, columns);
              setState({
                type: StepType.validateData,
                data,
                importedColumns: columns,
              });
              setPreviousState(state);
              nextStep();
            } catch (e) {
              errorToast((e as Error).message);
            }
          }}
          onBack={onBack}
        />
      );
    case StepType.validateData:
      if (!uploadedFile) {
        throw new Error('File not found');
      }
      return (
        <ValidationStep
          initialData={state.data}
          importedColumns={state.importedColumns}
          file={uploadedFile}
          onSubmitStart={() =>
            setState({
              type: StepType.loading,
            })
          }
          onBack={() => {
            onBack();
            setPreviousState(initialStepState || { type: StepType.upload });
          }}
        />
      );
    case StepType.loading:
    default:
      return (
        <StyledProgressBarContainer>
          <CircularProgressBar
            size={80}
            barWidth={8}
            barColor={theme.font.color.primary}
          />
        </StyledProgressBarContainer>
      );
  }
};
