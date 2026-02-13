import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { SurveyCreatorComponent, SurveyCreator } from 'survey-creator-react';
import { initializeSurveyJS } from '../lib/surveyjs-license';
import 'survey-core/survey-core.min.css';
import 'survey-creator-core/survey-creator-core.min.css';

export interface SurveyEditorRef {
  getJson: () => string | null;
}

interface SurveyEditorProps {
  initialJson?: string;
  onSave: (json: string) => void;
}

const SurveyEditor = forwardRef<SurveyEditorRef, SurveyEditorProps>(({ initialJson, onSave }, ref) => {
  const [creator, setCreator] = useState<SurveyCreator | null>(null);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useImperativeHandle(
    ref,
    () => ({
      getJson: () => {
        if (!creator) return null;
        return JSON.stringify(creator.JSON);
      },
    }),
    [creator],
  );

  useEffect(() => {
    initializeSurveyJS();

    const instance = new SurveyCreator({
      showSidebar: false,
      showJSONEditorTab: true,
      showLogicTab: false,
      showThemeTab: false,
      showSaveButton: true,
      autoSaveEnabled: true,
      expandCollapseButtonVisibility: 'never',
      showCreatorThemeSettings: false,
      allowZoom: false,
    });

    if (initialJson) {
      try {
        instance.JSON = JSON.parse(initialJson);
      } catch {
        // Ignore invalid JSON and keep an empty survey.
      }
    }

    instance.saveSurveyFunc = (
      saveNo: number,
      callback: (no: number, success: boolean) => void,
    ) => {
      try {
        onSaveRef.current(JSON.stringify(instance.JSON));
        callback(saveNo, true);
      } catch {
        callback(saveNo, false);
      }
    };

    setCreator(instance);

    return () => {
      setCreator(null);
    };
  }, [initialJson]);

  if (!creator) {
    return <div className="h-[65vh] min-h-[480px] animate-pulse rounded-lg border bg-muted/40" />;
  }

  return (
    <div className="space-y-2">
      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700">
        To mark correct answers: Select a question → find &apos;Correct Answer&apos; in the right
        sidebar under &apos;General&apos;.
      </p>
      <div className="survey-creator-container" style={{ height: '70vh', minHeight: 500 }}>
        <SurveyCreatorComponent creator={creator} />
      </div>
    </div>
  );
});

SurveyEditor.displayName = 'SurveyEditor';
export default SurveyEditor;
