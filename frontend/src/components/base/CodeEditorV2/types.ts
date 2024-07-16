export type CodeEditorProps = {
  database: string;
  schema: string;
  value: string;
  onChange: (value: string) => void;
};

export type CodeEditorSettingType = {
  database: string;
  schema: string;
};
