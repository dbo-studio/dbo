import type { StandardSchemaV1Issue } from '@tanstack/react-form';

export type FormErrorProps = {
  errors: (string | StandardSchemaV1Issue | null | undefined)[];
  mb?: number;
};
