/**
 * Object Form / tree action names added for core-schema objects, with the Safe Mode
 * reason the backend must report. Drops are destructive; creates, edits and refreshes
 * are plain DDL. A name missing from sqlguard.ClassifyAction would fall back to the
 * generic reason (see UNCLASSIFIED_REASON), so the reason proves the action is classified.
 */
export const DESTRUCTIVE_REASON = /destructive DDL requires confirmation/i;
export const DDL_REASON = /DDL requires confirmation under Safe Mode/i;
export const UNCLASSIFIED_REASON = /this query requires confirmation under Safe Mode/i;

export const SAFE_MODE_OBJECT_ACTIONS: ReadonlyArray<{ action: string; reason: RegExp }> = [
  { action: "createType", reason: DDL_REASON },
  { action: "editType", reason: DDL_REASON },
  { action: "dropType", reason: DESTRUCTIVE_REASON },
  { action: "createSequence", reason: DDL_REASON },
  { action: "editSequence", reason: DDL_REASON },
  // dropSequence / dropIndex are classified as plain DDL by sqlguard.ClassifyAction.
  { action: "dropSequence", reason: DDL_REASON },
  { action: "createFunction", reason: DDL_REASON },
  { action: "editFunction", reason: DDL_REASON },
  { action: "dropFunction", reason: DESTRUCTIVE_REASON },
  { action: "createProcedure", reason: DDL_REASON },
  { action: "editProcedure", reason: DDL_REASON },
  { action: "dropProcedure", reason: DESTRUCTIVE_REASON },
  { action: "editMaterializedView", reason: DDL_REASON },
  { action: "refreshMaterializedView", reason: DDL_REASON },
  { action: "refreshMaterializedViewNoData", reason: DDL_REASON },
  { action: "dropMaterializedView", reason: DESTRUCTIVE_REASON },
];
