import { produce } from "immer";

import {
  type FirestoreStateDocumentFields,
  FirestoreStateDocumentMapField,
} from "./field";

/**
 * If the key contains a ".", it will be wrapped with "\`" characters.
 * For example, if the key is `user.name`, it will be transformed into `` `user.name` ``.
 */
function escapeKey(key: string): string {
  return key.includes(".") ? `\`${key}\`` : key;
}

function getNestedUpdateMask(updateMask: string[], key: string): string[] {
  const escapedKey = escapeKey(key);
  return updateMask
    .filter((m) => m.startsWith(`${escapedKey}.`))
    .map((m) => m.substring(escapedKey.length + 1));
}

function isUpdatable(updateMask: string[], key: string): boolean {
  return updateMask.length === 0 || updateMask.includes(escapeKey(key));
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
