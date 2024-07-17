import { LanguageIdEnum } from 'monaco-sql-languages';

/** import worker files */
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import PGSQLWorker from 'monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker';

/** define MonacoEnvironment.getWorker  */
self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === LanguageIdEnum.PG) {
      return new PGSQLWorker();
    }
    return new EditorWorker();
  }
};
