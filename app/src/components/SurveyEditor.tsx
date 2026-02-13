import { forwardRef, useImperativeHandle } from 'react';

export interface SurveyEditorRef {
  getJson: () => string | null;
}

interface SurveyEditorProps {
  initialJson?: string;
  onSave: (json: string) => void;
}

const SurveyEditor = forwardRef<SurveyEditorRef, SurveyEditorProps>(
  ({ initialJson, onSave: _onSave }, ref) => {
    useImperativeHandle(ref, () => ({
      getJson: () => initialJson || null,
    }), [initialJson]);
    return <div className="p-4 border rounded">SurveyEditor — TODO</div>;
  },
);

SurveyEditor.displayName = 'SurveyEditor';
export default SurveyEditor;
