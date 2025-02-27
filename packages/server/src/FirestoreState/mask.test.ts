import { describe, expect, it } from "vitest";

import {
  type FirestoreStateDocumentFields,
  FirestoreStateDocumentMapField,
  FirestoreStateDocumentStringField,
} from "./field";
import { updateFields } from "./mask";

function toJSON(fields: Record<string, FirestoreStateDocumentFields>) {
  return Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, v.toJSON()]),
  );
}

describe("updateFields", () => {
  describe("updateMask is empty", () => {
    it("replaces the field, keep other fields", () => {
      const currentValue: Record<string, FirestoreStateDocumentFields> = {
        animal: new FirestoreStateDocumentStringField("cat"),
        cake: new FirestoreStateDocumentStringField("cheese"),
        color: new FirestoreStateDocumentStringField("blue"),
      };

      const fields: Record<string, FirestoreStateDocumentFields> = {
        cake: new FirestoreStateDocumentStringField("chocolate"),
      };

      const newValue = updateFields(currentValue, fields, []);

      expect(toJSON(newValue)).toEqual({
        animal: {
          type: "string_value",
          value: "cat",
        },
        cake: {
          type: "string_value",
          value: "chocolate",
        },
        color: {
          type: "string_value",
          value: "blue",
        },
      });
    });

    it("replaces the field, do not keep nested fields", () => {
      const currentValue: Record<string, FirestoreStateDocumentFields> = {
        favorites: new FirestoreStateDocumentMapField({
          animal: new FirestoreStateDocumentStringField("cat"),
          cake: new FirestoreStateDocumentStringField("cheese"),
          color: new FirestoreStateDocumentStringField("blue"),
        }),
      };

      const fields: Record<string, FirestoreStateDocumentFields> = {
        favorites: new FirestoreStateDocumentMapField({
          cake: new FirestoreStateDocumentStringField("chocolate"),
        }),
      };

      const newValue = updateFields(currentValue, fields, []);

      expect(toJSON(newValue)).toEqual({
        favorites: {
          type: "map_value",
          value: {
            cake: {
              type: "string_value",
              value: "chocolate",
            },
          },
        },
      });
    });
  });

  describe("updateMask is set, shallow fields", () => {
    it("updates only fields in the mask", () => {
      const currentValue: Record<string, FirestoreStateDocumentFields> = {
        animal: new FirestoreStateDocumentStringField("cat"),
        cake: new FirestoreStateDocumentStringField("cheese"),
        color: new FirestoreStateDocumentStringField("blue"),
      };

      const fields: Record<string, FirestoreStateDocumentFields> = {
        animal: new FirestoreStateDocumentStringField("dog"),
        cake: new FirestoreStateDocumentStringField("chocolate"),
        color: new FirestoreStateDocumentStringField("pink"),
      };

      const newValue = updateFields(currentValue, fields, ["animal"]);

      expect(toJSON(newValue)).toEqual({
        animal: {
          type: "string_value",
          value: "dog",
        },
        cake: {
          type: "string_value",
          value: "cheese",
        },
        color: {
          type: "string_value",
          value: "blue",
        },
      });
    });
  });

  describe("updateMask is set, nested fields", () => {
    it("replaces map field", () => {
      const currentValue: Record<string, FirestoreStateDocumentFields> = {
        favorites: new FirestoreStateDocumentMapField({
          animal: new FirestoreStateDocumentStringField("cat"),
          cake: new FirestoreStateDocumentStringField("cheese"),
          color: new FirestoreStateDocumentStringField("blue"),
        }),
      };

      const fields: Record<string, FirestoreStateDocumentFields> = {
        favorites: new FirestoreStateDocumentMapField({
          cake: new FirestoreStateDocumentStringField("chocolate"),
        }),
      };

      const newValue = updateFields(currentValue, fields, ["favorites"]);

      expect(toJSON(newValue)).toEqual({
        favorites: {
          type: "map_value",
          value: {
            cake: {
              type: "string_value",
              value: "chocolate",
            },
          },
        },
      });
    });

    it("merges map field", () => {
      const currentValue: Record<string, FirestoreStateDocumentFields> = {
        favorites: new FirestoreStateDocumentMapField({
          animal: new FirestoreStateDocumentStringField("cat"),
          cake: new FirestoreStateDocumentStringField("cheese"),
          color: new FirestoreStateDocumentStringField("blue"),
        }),
      };

      const fields: Record<string, FirestoreStateDocumentFields> = {
        favorites: new FirestoreStateDocumentMapField({
          cake: new FirestoreStateDocumentStringField("chocolate"),
        }),
      };

      const newValue = updateFields(currentValue, fields, ["favorites.cake"]);

      expect(toJSON(newValue)).toEqual({
        favorites: {
          type: "map_value",
          value: {
            animal: {
              type: "string_value",
              value: "cat",
            },
            cake: {
              type: "string_value",
              value: "chocolate",
            },
            color: {
              type: "string_value",
              value: "blue",
            },
          },
        },
      });
    });
  });
});
