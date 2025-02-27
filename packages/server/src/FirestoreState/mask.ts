import { produce } from "immer";

import {
  type FirestoreStateDocumentFields,
  FirestoreStateDocumentMapField,
} from "./field";

function getNestedUpdateMask(updateMask: string[], key: string): string[] {
  return updateMask
    .filter((m) => m.startsWith(`${key}.`))
    .map((m) => m.substring(key.length + 1));
}

function isUpdatable(updateMask: string[], key: string): boolean {
  return updateMask.length === 0 || updateMask.includes(key);
}

export function updateFields(
  current: Record<string, FirestoreStateDocumentFields>,
  fields: Record<string, FirestoreStateDocumentFields>,
  updateMask: string[],
): Record<string, FirestoreStateDocumentFields> {
  return produce(current, (draft) => {
    for (const [key, field] of Object.entries(fields)) {
      const updatable = isUpdatable(updateMask, key);
      const nestedUpdateMask = getNestedUpdateMask(updateMask, key);
      if (updatable) {
        draft[key] = field;
      } else if (
        field.type === "map_value" &&
        (draft[key] == null || draft[key].type === "map_value")
      ) {
        draft[key] = new FirestoreStateDocumentMapField(
          updateFields(draft[key]?.value ?? {}, field.value, nestedUpdateMask),
        );
      }
    }
  });
}
