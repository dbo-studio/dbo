import { registerInlineAIProvider } from '@/components/base/SqlEditor/helpers/registerInlineAIProvider';
import type * as Monaco from 'monaco-editor';

/** Live data the completion providers read; set by whichever Mongo editor is mounted. */
export type MongoContext = {
  collections: string[];
  /** Field names of one collection (sampled by the server). */
  fields: (collection: string) => Promise<string[]>;
  /** Fields of the collection shown in the filter bar; the filter has no `db.<coll>` to read them from. */
  filterFields?: string[];
};

let context: MongoContext | undefined;
let registered = false;

export const setMongoContext = (next: MongoContext | undefined): void => {
  context = next;
};

const QUERY_OPERATORS = [
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$and', '$or', '$nor', '$not', '$exists', '$type',
  '$regex', '$options', '$expr', '$elemMatch', '$size', '$all', '$mod', '$text'
]; // prettier-ignore

const UPDATE_OPERATORS = ['$set', '$unset', '$inc', '$mul', '$min', '$max', '$push', '$pull', '$addToSet', '$pop', '$rename', '$currentDate']; // prettier-ignore

const STAGES = [
  '$match', '$group', '$project', '$sort', '$limit', '$skip', '$unwind', '$lookup', '$count', '$addFields',
  '$set', '$unset', '$sample', '$facet', '$bucket', '$replaceRoot', '$out', '$merge'
]; // prettier-ignore

const ACCUMULATORS = ['$sum', '$avg', '$min', '$max', '$first', '$last', '$push', '$addToSet', '$count']; // prettier-ignore

// label, snippet. Only methods the server runs are offered.
const METHODS: [string, string][] = [
  ['find', 'find({ $1 })'],
  ['findOne', 'findOne({ $1 })'],
  ['countDocuments', 'countDocuments({ $1 })'],
  ['aggregate', 'aggregate([\n\t{ $match: { $1 } }\n])'],
  ['distinct', 'distinct("$1")'],
  ['getIndexes', 'getIndexes()'],
  ['insertOne', 'insertOne({ $1 })'],
  ['insertMany', 'insertMany([\n\t{ $1 }\n])'],
  ['updateOne', 'updateOne({ $1 }, { $set: { } })'],
  ['updateMany', 'updateMany({ $1 }, { $set: { } })'],
  ['replaceOne', 'replaceOne({ $1 }, { })'],
  ['deleteOne', 'deleteOne({ $1 })'],
  ['deleteMany', 'deleteMany({ $1 })'],
  ['createIndex', 'createIndex({ $1: 1 })']
];

const CHAIN: [string, string][] = [
  ['sort', 'sort({ $1: 1 })'],
  ['limit', 'limit(${1:20})'],
  ['skip', 'skip(${1:0})'],
  ['count', 'count()']
];

const SHELL = ['show collections', 'show dbs', 'use '];

type Item = Monaco.languages.CompletionItem;

function build(
  monaco: typeof Monaco,
  range: Monaco.IRange,
  entries: {
    label: string;
    kind: Monaco.languages.CompletionItemKind;
    insert?: string;
    snippet?: boolean;
    detail?: string;
  }[]
): Item[] {
  const rule = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  return entries.map((e, i) => ({
    label: e.label,
    kind: e.kind,
    detail: e.detail,
    insertText: e.insert ?? e.label,
    insertTextRules: e.snippet ? rule : undefined,
    range,
    sortText: String(i).padStart(4, '0')
  }));
}

const operatorEntries = (monaco: typeof Monaco, names: string[], detail: string) =>
  names.map((label) => ({ label, kind: monaco.languages.CompletionItemKind.Operator, detail }));

const fieldEntries = (monaco: typeof Monaco, names: string[]) =>
  names.map((label) => ({ label, kind: monaco.languages.CompletionItemKind.Field, detail: 'field' }));

/** Filter bar: `{"age": {"$gt": 30}}`. */
function provideFilter(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  position: Monaco.Position
): Monaco.languages.CompletionList {
  if (!context?.filterFields) return { suggestions: [] };
  const w = model.getWordUntilPosition(position);
  const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: w.startColumn, endColumn: w.endColumn }; // prettier-ignore

  return {
    suggestions: build(monaco, range, [
      ...fieldEntries(monaco, context.filterFields),
      ...operatorEntries(monaco, QUERY_OPERATORS, 'query operator')
    ])
  };
}

/** Editor: `db.users.find({ ... }).sort({ ... })`. */
async function provideShell(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  position: Monaco.Position
): Promise<Monaco.languages.CompletionList> {
  if (!context) return { suggestions: [] };
  const w = model.getWordUntilPosition(position);
  const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: w.startColumn, endColumn: w.endColumn }; // prettier-ignore
  const before = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: w.startColumn }); // prettier-ignore
  const kinds = monaco.languages.CompletionItemKind;

  // `db.` -> collections
  if (/\bdb\.$/.test(before)) {
    return { suggestions: build(monaco, range, context.collections.map((label) => ({ label, kind: kinds.Class, detail: 'collection' }))) }; // prettier-ignore
  }

  // `db.users.` -> methods
  if (/\bdb\.\w+\.$/.test(before)) {
    return { suggestions: build(monaco, range, METHODS.map(([label, insert]) => ({ label, insert, snippet: true, kind: kinds.Method, detail: 'collection method' }))) }; // prettier-ignore
  }

  // `...find({}).` -> cursor chain
  if (/\)\s*\.$/.test(before)) {
    return { suggestions: build(monaco, range, CHAIN.map(([label, insert]) => ({ label, insert, snippet: true, kind: kinds.Method, detail: 'cursor' }))) }; // prettier-ignore
  }

  // Inside a call: field names of the collection the call is on, plus operators.
  const calls = [...before.matchAll(/\bdb\.(\w+)\.(\w+)\(/g)];
  const last = calls[calls.length - 1];
  if (last) {
    const fields = await context.fields(last[1]).catch(() => [] as string[]);
    const method = last[2];
    const ops = method === 'aggregate' ? [...STAGES, ...ACCUMULATORS] : method.startsWith('update') ? [...UPDATE_OPERATORS, ...QUERY_OPERATORS] : QUERY_OPERATORS; // prettier-ignore
    return { suggestions: build(monaco, range, [...fieldEntries(monaco, fields), ...operatorEntries(monaco, ops, 'operator')]) }; // prettier-ignore
  }

  // Start of the statement
  return {
    suggestions: build(monaco, range, [
      { label: 'db', kind: kinds.Keyword, insert: 'db.' },
      ...SHELL.map((label) => ({ label, kind: kinds.Keyword }))
    ])
  };
}

export function registerMongoCompletions(monaco: typeof Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.registerCompletionItemProvider('json', {
    triggerCharacters: ['"', '$'],
    provideCompletionItems: (model, position) => provideFilter(monaco, model, position)
  });

  monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.', '$', '"', '('],
    provideCompletionItems: (model, position) => provideShell(monaco, model, position)
  });

  // Ghost-text suggestions for shell statements, from the same assistant as the SQL editor's.
  registerInlineAIProvider(monaco, 'javascript');
}
