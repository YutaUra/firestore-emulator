import { produce } from "immer";
import { EventEmitter } from "node:events";
import { TypeSafeEventEmitter } from "typesafe-event-emitter";
import {
  Document as v1Document,
  Value as v1Value,
} from "@firestore-emulator/proto/dist/google/firestore/v1/document";
import {
  DocumentTransformFieldTransformServerValue,
  DocumentTransformFieldTransform as v1DocumentTransformFieldTransform,
  Write as v1Write,
  WriteResult as v1WriteResult,
} from "@firestore-emulator/proto/dist/google/firestore/v1/write";
import {
  StructuredQuery as v1StructuredQuery,
  StructuredQueryFieldFilterOperator as v1StructuredQueryFieldFilterOperator,
} from "@firestore-emulator/proto/dist/google/firestore/v1/query";
import { Timestamp } from "@firestore-emulator/proto/dist/google/protobuf/timestamp";
import { assertNever } from "assert-never";
import { FirestoreEmulatorError } from "../error/error";
import { Status } from "@grpc/grpc-js/build/src/constants";
import { NullValue } from "@firestore-emulator/proto/dist/google/protobuf/struct";

type Events = {
  "add-project": { project: FirestoreStateProject };
  "add-database": { database: FirestoreStateDatabase };
  "add-collection": { collection: FirestoreStateCollection };
  "add-document": { document: FirestoreStateDocument };
  "create-document": { document: FirestoreStateDocument };
  "update-document": { document: FirestoreStateDocument };
  "delete-document": { document: FirestoreStateDocument };
  "clear-all-projects": {};
};

export type ValueObjectType = ReturnType<typeof v1Value.prototype.toObject>;
export interface FirestoreStateDocumentBaseField {
  toJSON(): { type: string; value: unknown };
  toV1ValueObject(): ValueObjectType;
  eq(other: FirestoreStateDocumentFields): boolean;
  lt(other: FirestoreStateDocumentFields): boolean;
  lte(other: FirestoreStateDocumentFields): boolean;
  gt(other: FirestoreStateDocumentFields): boolean;
  gte(other: FirestoreStateDocumentFields): boolean;
}

export class FirestoreStateDocumentStringField
  implements FirestoreStateDocumentBaseField
{
  type = "string_value" as const;
  constructor(readonly value: string) {}

  toJSON() {
    return { type: this.type, value: this.value };
  }

  toV1ValueObject(): ValueObjectType {
    return { string_value: this.value };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentStringField &&
      this.value === other.value
    );
  }

  lt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentStringField &&
      this.value < other.value
    );
  }

  lte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentStringField &&
      this.value <= other.value
    );
  }

  gt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentStringField &&
      this.value > other.value
    );
  }

  gte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentStringField &&
      this.value >= other.value
    );
  }
}

export class FirestoreStateDocumentNullField
  implements FirestoreStateDocumentBaseField
{
  type = "null_value" as const;
  value = null;
  toJSON() {
    return { type: this.type, value: null } as const;
  }

  toV1ValueObject(): ValueObjectType {
    return { null_value: NullValue.NULL_VALUE };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return other.type === this.type;
  }

  lt(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  lte(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  gt(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  gte(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }
}

export class FirestoreStateDocumentBooleanField
  implements FirestoreStateDocumentBaseField
{
  type = "boolean_value" as const;
  constructor(readonly value: boolean) {}

  toJSON() {
    return { type: this.type, value: this.value };
  }

  toV1ValueObject(): ValueObjectType {
    return { boolean_value: this.value };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentBooleanField &&
      this.value === other.value
    );
  }

  lt(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  lte(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  gt(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  gte(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }
}

export class FirestoreStateDocumentIntegerField
  implements FirestoreStateDocumentBaseField
{
  type = "integer_value" as const;
  constructor(readonly value: number) {
    if (!Number.isInteger(value)) {
      throw new Error(`value must be integer. value=${value}`);
    }
  }

  toJSON() {
    return { type: this.type, value: this.value };
  }

  toV1ValueObject(): ValueObjectType {
    return { integer_value: this.value };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentIntegerField &&
      this.value === other.value
    );
  }

  lt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentIntegerField &&
      this.value < other.value
    );
  }

  lte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentIntegerField &&
      this.value <= other.value
    );
  }

  gt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentIntegerField &&
      this.value > other.value
    );
  }

  gte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentIntegerField &&
      this.value >= other.value
    );
  }
}

export class FirestoreStateDocumentDoubleField
  implements FirestoreStateDocumentBaseField
{
  type = "double_value" as const;
  constructor(readonly value: number) {}

  toJSON() {
    return { type: this.type, value: this.value };
  }

  toV1ValueObject(): ValueObjectType {
    return { double_value: this.value };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentDoubleField &&
      this.value === other.value
    );
  }

  lt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentDoubleField &&
      this.value < other.value
    );
  }

  lte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentDoubleField &&
      this.value <= other.value
    );
  }

  gt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentDoubleField &&
      this.value > other.value
    );
  }

  gte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentDoubleField &&
      this.value >= other.value
    );
  }
}

export class FirestoreStateDocumentTimestampField
  implements FirestoreStateDocumentBaseField
{
  type = "timestamp_value" as const;
  constructor(readonly value: { seconds: number; nanos: number }) {}

  static fromDate(date: Date) {
    return new FirestoreStateDocumentTimestampField({
      seconds: Math.floor(date.getTime() / 1000),
      nanos: (date.getTime() % 1000) * 1000000,
    });
  }

  toJSON() {
    return { type: this.type, value: this.value } as const;
  }

  toV1ValueObject(): ValueObjectType {
    return { timestamp_value: this.value };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentTimestampField &&
      this.value.seconds === other.value.seconds &&
      this.value.nanos === other.value.nanos
    );
  }

  lt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentTimestampField &&
      (this.value.seconds < other.value.seconds ||
        (this.value.seconds === other.value.seconds &&
          this.value.nanos < other.value.nanos))
    );
  }

  lte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentTimestampField &&
      (this.value.seconds < other.value.seconds ||
        (this.value.seconds === other.value.seconds &&
          this.value.nanos <= other.value.nanos))
    );
  }

  gt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentTimestampField &&
      (this.value.seconds > other.value.seconds ||
        (this.value.seconds === other.value.seconds &&
          this.value.nanos > other.value.nanos))
    );
  }

  gte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentTimestampField &&
      (this.value.seconds > other.value.seconds ||
        (this.value.seconds === other.value.seconds &&
          this.value.nanos >= other.value.nanos))
    );
  }
}

export class FirestoreStateDocumentBytesField
  implements FirestoreStateDocumentBaseField
{
  type = "bytes_value" as const;
  constructor(readonly value: Uint8Array) {}

  toJSON() {
    return { type: this.type, value: this.value } as const;
  }

  toV1ValueObject(): ValueObjectType {
    return { bytes_value: this.value };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentBytesField &&
      this.value.toString() === other.value.toString()
    );
  }

  lt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentBytesField &&
      this.value.toString() < other.value.toString()
    );
  }

  lte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentBytesField &&
      this.value.toString() <= other.value.toString()
    );
  }

  gt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentBytesField &&
      this.value.toString() > other.value.toString()
    );
  }

  gte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentBytesField &&
      this.value.toString() >= other.value.toString()
    );
  }
}

export class FirestoreStateDocumentReferenceField
  implements FirestoreStateDocumentBaseField
{
  type = "reference_value" as const;
  constructor(readonly value: string) {}

  toJSON() {
    return { type: this.type, value: this.value };
  }

  toV1ValueObject(): ValueObjectType {
    return { reference_value: this.value };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentReferenceField &&
      this.value === other.value
    );
  }

  lt(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  lte(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  gt(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  gte(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }
}

export class FirestoreStateDocumentGeoPointField
  implements FirestoreStateDocumentBaseField
{
  type = "geo_point_value" as const;
  constructor(readonly value: { latitude: number; longitude: number }) {}

  toJSON() {
    return { type: this.type, value: this.value };
  }

  toV1ValueObject(): ValueObjectType {
    return { geo_point_value: this.value };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentGeoPointField &&
      this.value.latitude === other.value.latitude &&
      this.value.longitude === other.value.longitude
    );
  }

  lt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentGeoPointField &&
      (this.value.latitude < other.value.latitude ||
        this.value.longitude < other.value.longitude)
    );
  }

  lte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentGeoPointField &&
      (this.value.latitude <= other.value.latitude ||
        this.value.longitude <= other.value.longitude)
    );
  }

  gt(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentGeoPointField &&
      (this.value.latitude > other.value.latitude ||
        this.value.longitude > other.value.longitude)
    );
  }

  gte(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentGeoPointField &&
      (this.value.latitude >= other.value.latitude ||
        this.value.longitude >= other.value.longitude)
    );
  }
}

export class FirestoreStateDocumentArrayField
  implements FirestoreStateDocumentBaseField
{
  type = "array_value" as const;
  constructor(readonly value: FirestoreStateDocumentFields[]) {}

  toJSON(): { type: string; value: unknown } {
    return {
      type: this.type,
      value: this.value.map((v) => v.toJSON()),
    };
  }

  toV1ValueObject(): ValueObjectType {
    return {
      array_value: { values: this.value.map((v) => v.toV1ValueObject()) },
    };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentArrayField &&
      this.value.length === other.value.length &&
      this.value.every((v, i) => {
        const item = other.value[i];
        if (!item) return false;
        return item.eq(v);
      })
    );
  }

  lt(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  lte(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  gt(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  gte(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }
}

export class FirestoreStateDocumentMapField
  implements FirestoreStateDocumentBaseField
{
  type = "map_value" as const;
  constructor(readonly value: Record<string, FirestoreStateDocumentFields>) {}

  toJSON(): { type: string; value: unknown } {
    return {
      type: this.type,
      value: Object.fromEntries(
        Object.entries(this.value).map(([k, v]) => [k, v.toJSON()])
      ),
    };
  }

  toV1ValueObject(): ValueObjectType {
    return {
      map_value: {
        fields: Object.fromEntries(
          Object.entries(this.value).map(([k, v]) => [k, v.toV1ValueObject()])
        ),
      },
    };
  }

  eq(other: FirestoreStateDocumentFields): boolean {
    return (
      other instanceof FirestoreStateDocumentMapField &&
      Object.keys(this.value).length === Object.keys(other.value).length &&
      Object.entries(this.value).every(([k, v]) => {
        const item = other.value[k];
        if (!item) return false;
        return item.eq(v);
      })
    );
  }

  lt(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  lte(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  gt(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }

  gte(_other: FirestoreStateDocumentFields): boolean {
    return false;
  }
}

export type FirestoreStateDocumentFields =
  | FirestoreStateDocumentStringField
  | FirestoreStateDocumentNullField
  | FirestoreStateDocumentBooleanField
  | FirestoreStateDocumentIntegerField
  | FirestoreStateDocumentDoubleField
  | FirestoreStateDocumentTimestampField
  | FirestoreStateDocumentBytesField
  | FirestoreStateDocumentReferenceField
  | FirestoreStateDocumentGeoPointField
  | FirestoreStateDocumentArrayField
  | FirestoreStateDocumentMapField;

export const convertV1DocumentField = (
  field: v1Value
): FirestoreStateDocumentFields => {
  if (field.has_string_value)
    return new FirestoreStateDocumentStringField(field.string_value);
  if (field.has_null_value) return new FirestoreStateDocumentNullField();
  if (field.has_boolean_value)
    return new FirestoreStateDocumentBooleanField(field.boolean_value);
  if (field.has_integer_value)
    return new FirestoreStateDocumentIntegerField(field.integer_value);
  if (field.has_double_value)
    return new FirestoreStateDocumentDoubleField(field.double_value);
  if (field.has_timestamp_value)
    return new FirestoreStateDocumentTimestampField({
      nanos: field.timestamp_value.nanos ?? 0,
      seconds: field.timestamp_value.seconds ?? 0,
    });
  if (field.has_bytes_value)
    return new FirestoreStateDocumentBytesField(field.bytes_value);
  if (field.has_reference_value)
    return new FirestoreStateDocumentReferenceField(field.reference_value);
  if (field.has_geo_point_value)
    return new FirestoreStateDocumentGeoPointField({
      latitude: field.geo_point_value.latitude ?? 0,
      longitude: field.geo_point_value.longitude ?? 0,
    });
  if (field.has_array_value)
    return new FirestoreStateDocumentArrayField(
      (field.array_value.values ?? []).map(convertV1DocumentField)
    );
  if (field.has_map_value)
    return new FirestoreStateDocumentMapField(
      Object.fromEntries(
        Array.from(field.map_value.fields.entries() ?? []).map(([k, v]) => [
          k,
          convertV1DocumentField(v),
        ])
      )
    );
  throw new Error(`unknown field type. field=${JSON.stringify(field)}`);
};

export const convertV1Value = (
  value: v1Value
): ReturnType<typeof v1Value.prototype.toObject> => {
  return convertV1DocumentField(value).toV1ValueObject();
};

export interface HasCollections {
  getCollection(collectionName: string): FirestoreStateCollection;
  getPath(): string;
}

type FirestoreStateDocumentMetadata =
  | {
      hasExist: false;
      createdAt: null;
      updatedAt: null;
    }
  | {
      hasExist: true;
      createdAt: Date;
      updatedAt: Date;
    };

export class FirestoreStateDocument implements HasCollections {
  metadata: FirestoreStateDocumentMetadata = {
    hasExist: false,
    createdAt: null,
    updatedAt: null,
  };
  constructor(
    private emitter: TypeSafeEventEmitter<Events>,
    readonly database: FirestoreStateDatabase,
    readonly parent: FirestoreStateCollection,
    readonly name: string,
    private fields: Record<string, FirestoreStateDocumentFields>,
    private collections: Record<string, FirestoreStateCollection>
  ) {}

  getCollection(collectionName: string) {
    this.collections = produce(this.collections, (draft) => {
      if (!(collectionName in draft)) {
        const collection = new FirestoreStateCollection(
          this.emitter,
          this.database,
          this,
          collectionName,
          {}
        );
        draft[collectionName] = collection;
        this.emitter.emit("add-collection", { collection });
      }
    });

    const collection = this.collections[collectionName];
    if (!collection) {
      throw new Error(`Collection<${collectionName}> not found.`);
    }
    return collection;
  }

  toV1Document(): v1Document {
    return v1Document.fromObject({
      create_time: this.metadata.hasExist
        ? Timestamp.fromObject({
            seconds: Math.floor(this.metadata.createdAt.getTime() / 1000),
            nanos: 0,
          })
        : undefined,
      update_time: this.metadata.hasExist
        ? Timestamp.fromObject({
            seconds: Math.floor(this.metadata.updatedAt.getTime() / 1000),
            nanos: 0,
          })
        : undefined,
      name: this.getPath(),
      fields: Object.fromEntries(
        Object.entries(this.fields).map(([key, field]) => [
          key,
          field.toV1ValueObject(),
        ])
      ),
    });
  }

  toV1DocumentObject(): ReturnType<typeof v1Document.prototype.toObject> {
    const document = this.toV1Document();
    return {
      name: document.name,
      create_time: document.create_time.toObject(),
      update_time: document.update_time.toObject(),
      fields: Object.fromEntries(
        Array.from(document.fields).map(([key, value]) => [
          key,
          convertV1Value(value),
        ])
      ),
    };
  }

  toJSON(): {
    path: string;
    fields: Record<string, ReturnType<FirestoreStateDocumentFields["toJSON"]>>;
    collections: Record<string, ReturnType<FirestoreStateCollection["toJSON"]>>;
  } {
    return {
      path: this.getPath(),
      fields: Object.fromEntries(
        Object.entries(this.fields).map(([key, field]) => [key, field.toJSON()])
      ),
      collections: Object.fromEntries(
        Object.entries(this.collections).map(([key, collection]) => [
          key,
          collection.toJSON(),
        ])
      ),
    };
  }

  create(date: Date, fields: Record<string, FirestoreStateDocumentFields>) {
    if (this.metadata.hasExist) {
      throw new Error("Document already exists.");
    }
    this.metadata = produce<
      FirestoreStateDocumentMetadata,
      FirestoreStateDocumentMetadata
    >(this.metadata, (draft) => {
      draft.hasExist = true;
      draft.createdAt = date;
      draft.updatedAt = date;
    });
    this.fields = produce(this.fields, (draft) => {
      for (const [key, field] of Object.entries(fields)) {
        draft[key] = field;
      }
    });
    this.emitter.emit("create-document", { document: this });
  }

  update(date: Date, fields: Record<string, FirestoreStateDocumentFields>) {
    if (!this.metadata.hasExist) {
      throw new Error("Document does not exist.");
    }
    this.metadata = produce<
      FirestoreStateDocumentMetadata,
      FirestoreStateDocumentMetadata
    >(this.metadata, (draft) => {
      draft.updatedAt = date;
    });
    this.fields = produce(this.fields, (draft) => {
      for (const [key, field] of Object.entries(fields)) {
        draft[key] = field;
      }
    });
    this.emitter.emit("update-document", { document: this });
  }

  set(date: Date, fields: Record<string, FirestoreStateDocumentFields>) {
    if (!this.metadata.hasExist) {
      this.metadata = produce<
        FirestoreStateDocumentMetadata,
        FirestoreStateDocumentMetadata
      >(this.metadata, (draft) => {
        draft.hasExist = true;
        draft.createdAt = date;
        draft.updatedAt = date;
      });
    } else {
      this.metadata = produce<
        FirestoreStateDocumentMetadata,
        FirestoreStateDocumentMetadata
      >(this.metadata, (draft) => {
        draft.updatedAt = date;
      });
    }

    this.fields = produce(this.fields, (draft) => {
      for (const [key, field] of Object.entries(fields)) {
        draft[key] = field;
      }
    });
    this.emitter.emit("update-document", { document: this });
  }

  delete() {
    if (!this.metadata.hasExist) {
      throw new Error("Document does not exist.");
    }
    this.metadata = produce<
      FirestoreStateDocumentMetadata,
      FirestoreStateDocumentMetadata
    >(this.metadata, (draft) => {
      draft.hasExist = false;
      draft.createdAt = null;
      draft.updatedAt = null;
    });
    this.fields = produce(this.fields, (draft) => {
      Object.keys(draft).forEach((key) => {
        delete draft[key];
      });
    });
    this.emitter.emit("delete-document", { document: this });
  }

  getField(path: string) {
    if (path.includes(".")) {
      throw new Error("Not implemented");
    }
    return this.fields[path];
  }

  getPath(): string {
    return `${this.parent.getPath()}/${this.name}`;
  }

  v1Transform(date: Date, transforms: v1DocumentTransformFieldTransform[]) {
    transforms.forEach((transform) => {
      const field = this.getField(transform.field_path);
      if (transform.has_increment) {
        if (transform.increment.has_integer_value) {
          if (!field) {
            return this.set(date, {
              [transform.field_path]: new FirestoreStateDocumentIntegerField(
                transform.increment.integer_value
              ),
            });
          } else if (field instanceof FirestoreStateDocumentIntegerField) {
            return this.set(date, {
              [transform.field_path]: new FirestoreStateDocumentIntegerField(
                field.value + transform.increment.integer_value
              ),
            });
          } else if (field instanceof FirestoreStateDocumentDoubleField) {
            return this.set(date, {
              [transform.field_path]: new FirestoreStateDocumentDoubleField(
                field.value + transform.increment.integer_value
              ),
            });
          } else {
            throw new Error(
              `Invalid transform: ${transform}. increment transform can only be applied to an integer or a double field`
            );
          }
        } else if (transform.increment.has_double_value) {
          if (!field) {
            return this.set(date, {
              [transform.field_path]: new FirestoreStateDocumentDoubleField(
                transform.increment.double_value
              ),
            });
          } else if (
            field instanceof FirestoreStateDocumentIntegerField ||
            field instanceof FirestoreStateDocumentDoubleField
          ) {
            return this.set(date, {
              [transform.field_path]: new FirestoreStateDocumentDoubleField(
                field.value + transform.increment.double_value
              ),
            });
          } else {
            throw new Error(
              `Invalid transform: ${transform}. increment transform can only be applied to an integer or a double field`
            );
          }
        }
        throw new Error(
          `Invalid transform: ${transform}. increment transform can only be applied to an integer or a double field`
        );
      }
      if (transform.has_remove_all_from_array) {
        const removeFields = transform.remove_all_from_array.values.map(
          convertV1DocumentField
        );
        if (field instanceof FirestoreStateDocumentArrayField) {
          const removedFields = field.value.filter(
            (value) =>
              !removeFields.some((removeField) => removeField.eq(value))
          );
          return this.set(date, {
            [transform.field_path]: new FirestoreStateDocumentArrayField(
              removedFields
            ),
          });
        }
      }
      if (transform.has_append_missing_elements) {
        const appendFields = transform.append_missing_elements.values.map(
          convertV1DocumentField
        );
        if (field instanceof FirestoreStateDocumentArrayField) {
          const appendedFields = [
            ...field.value,
            ...appendFields.filter(
              (appendField) =>
                !field.value.some((value) => value.eq(appendField))
            ),
          ];
          return this.set(date, {
            [transform.field_path]: new FirestoreStateDocumentArrayField(
              appendedFields
            ),
          });
        }
      }
      if (transform.has_set_to_server_value) {
        if (
          transform.set_to_server_value ===
          DocumentTransformFieldTransformServerValue.REQUEST_TIME
        ) {
          return this.set(date, {
            [transform.field_path]:
              FirestoreStateDocumentTimestampField.fromDate(date),
          });
        }
        if (
          transform.set_to_server_value ===
          DocumentTransformFieldTransformServerValue.SERVER_VALUE_UNSPECIFIED
        ) {
          throw new Error(
            `Invalid transform: ${transform}. set_to_server_value must be a valid value`
          );
        }
      }

      throw new Error(
        `Invalid transform: ${JSON.stringify(transform.toObject(), null, 4)}`
      );
    });
  }
}

export class FirestoreStateCollection {
  constructor(
    private emitter: TypeSafeEventEmitter<Events>,
    readonly database: FirestoreStateDatabase,
    readonly parent: HasCollections,
    readonly name: string,
    private documents: Record<string, FirestoreStateDocument>
  ) {}

  getDocument(documentName: string) {
    this.documents = produce(this.documents, (draft) => {
      if (!(documentName in draft)) {
        const document = new FirestoreStateDocument(
          this.emitter,
          this.database,
          this,
          documentName,
          {},
          {}
        );
        draft[documentName] = document;
        this.emitter.emit("add-document", { document });
      }
    });

    const document = this.documents[documentName];
    if (!document) {
      throw new Error(`Document<${documentName}> not found.`);
    }
    return document;
  }

  getAllDocuments() {
    return Object.values(this.documents);
  }

  toJSON() {
    return {
      path: this.getPath(),
      documents: Object.fromEntries(
        Object.entries(this.documents).map(([key, document]) => [
          key,
          document.toJSON(),
        ])
      ),
    };
  }

  getPath(): string {
    return `${this.parent.getPath()}/${this.name}`;
  }
}

export class FirestoreStateDatabase implements HasCollections {
  constructor(
    private emitter: TypeSafeEventEmitter<Events>,
    readonly project: FirestoreStateProject,
    readonly name: string,
    private collections: Record<string, FirestoreStateCollection>
  ) {}

  getCollection(collectionName: string) {
    this.collections = produce(this.collections, (draft) => {
      if (!(collectionName in draft)) {
        const collection = new FirestoreStateCollection(
          this.emitter,
          this,
          this,
          collectionName,
          {}
        );
        draft[collectionName] = collection;
        this.emitter.emit("add-collection", { collection });
      }
    });

    const collection = this.collections[collectionName];
    if (!collection) {
      throw new Error(`Collection<${collectionName}> not found.`);
    }
    return collection;
  }

  toJSON() {
    return {
      path: this.getPath(),
      collections: Object.fromEntries(
        Object.entries(this.collections).map(([key, collection]) => [
          key,
          collection.toJSON(),
        ])
      ),
    };
  }

  getPath(): string {
    return `${this.project.getPath()}/databases/${this.name}`;
  }
}

export class FirestoreStateProject {
  constructor(
    private emitter: TypeSafeEventEmitter<Events>,
    readonly name: string,
    private databases: Record<string, FirestoreStateDatabase>
  ) {}

  toJSON() {
    return {
      path: this.getPath(),
      databases: Object.fromEntries(
        Object.entries(this.databases).map(([key, database]) => [
          key,
          database.toJSON(),
        ])
      ),
    };
  }

  getPath(): string {
    return `projects/${this.name}`;
  }

  getDatabase(databaseName: string) {
    this.databases = produce(this.databases, (draft) => {
      if (!(databaseName in draft)) {
        const database = new FirestoreStateDatabase(
          this.emitter,
          this,
          databaseName,
          {}
        );
        draft[databaseName] = database;
        this.emitter.emit("add-database", { database });
      }
    });

    const database = this.databases[databaseName];
    if (!database) {
      throw new Error(`Database<${databaseName}> not found.`);
    }
    return database;
  }
}

export class FirestoreState {
  readonly emitter: TypeSafeEventEmitter<Events>;
  constructor(private projects: Record<string, FirestoreStateProject> = {}) {
    this.emitter = new EventEmitter();
  }

  toJSON() {
    return {
      projects: Object.fromEntries(
        Object.entries(this.projects).map(([key, project]) => [
          key,
          project.toJSON(),
        ])
      ),
    };
  }

  getProject(projectName: string) {
    this.projects = produce(this.projects, (draft) => {
      if (!(projectName in draft)) {
        const project = new FirestoreStateProject(
          this.emitter,
          projectName,
          {}
        );
        draft[projectName] = project;
        this.emitter.emit("add-project", { project });
      }
    });

    const project = this.projects[projectName];
    if (!project) {
      throw new Error(`Project<${projectName}> not found.`);
    }
    return project;
  }

  getCollection(path: string) {
    const [
      project,
      projectName,
      database,
      databaseName,
      documents,
      collectionName,
      ...rest
    ] = path.split("/");
    if (
      project !== "projects" ||
      typeof projectName !== "string" ||
      database !== "databases" ||
      typeof databaseName !== "string" ||
      documents !== "documents" ||
      typeof collectionName !== "string" ||
      rest.length % 2 !== 0
    ) {
      throw new Error(`Invalid path: ${path}`);
    }

    let current = this.getProject(projectName)
      .getDatabase(databaseName)
      .getCollection(collectionName);
    let next = rest;
    while (next.length > 0) {
      const [documentId, collectionName, ...rest] = next;
      if (
        typeof collectionName !== "string" ||
        typeof documentId !== "string"
      ) {
        throw new Error(`Invalid path: ${path}`);
      }
      current = current.getDocument(documentId).getCollection(collectionName);
      next = rest;
    }
    return current;
  }

  getDocument(path: string) {
    const [docId, ...rest] = path.split("/").reverse();
    const collection = this.getCollection(rest.slice().reverse().join("/"));

    if (typeof docId !== "string") {
      throw new Error(`Invalid path: ${path}`);
    }
    return collection.getDocument(docId);
  }

  clear() {
    this.projects = {};
    this.emitter.emit("clear-all-projects", {});
  }

  writeV1Document(
    writeTime: ReturnType<typeof Timestamp.prototype.toObject>,
    write: v1Write
  ): v1WriteResult {
    const date = new Date(
      (writeTime.seconds ?? 0) * 1000 + (writeTime.nanos ?? 0) / 1000 / 1000
    );
    if (write.delete) {
      const document = this.getDocument(write.delete);
      if (!document.metadata.hasExist) {
        throw new Error("Invalid write: document doesn't exist");
      }
      document.delete();
      return v1WriteResult.fromObject({
        update_time: writeTime,
        transform_results: [],
      });
    }
    if (write.update) {
      if (write.update.create_time) {
        throw new Error("update.create_time is not implemented");
      }
      if (write.update.update_time) {
        throw new Error("update.update_time is not implemented");
      }
      const { name, fields } = write.update;
      if (!name || !fields) {
        throw new Error("Invalid write");
      }
      const document = this.getDocument(name);
      if (write.current_document?.exists === false) {
        if (document.metadata.hasExist) {
          throw new Error(
            "Invalid write: current_document.exists doesn't match"
          );
        }

        document.create(
          new Date(
            (writeTime.seconds ?? 0) * 1000 +
              (writeTime.nanos ?? 0) / 1000 / 1000
          ),
          Object.fromEntries(
            Array.from(fields.entries()).map(([key, field]) => [
              key,
              convertV1DocumentField(field),
            ])
          )
        );
        document.v1Transform(date, write.update_transforms);
      } else if (write.current_document?.exists === true) {
        if (!document.metadata.hasExist) {
          throw new FirestoreEmulatorError(
            Status.NOT_FOUND,
            `no entity to update: app: "dev~${document.database.project.name}"
path <
  Element {
    type: "${document.parent.name}"
    name: "${document.name}"
  }
>
`
          );
        }

        document.update(
          new Date(
            (writeTime.seconds ?? 0) * 1000 +
              (writeTime.nanos ?? 0) / 1000 / 1000
          ),
          Object.fromEntries(
            Array.from(fields.entries())
              .filter(([key]) =>
                write.update_mask?.field_paths
                  ? write.update_mask.field_paths.includes(key)
                  : true
              )
              .map(([key, field]) => [key, convertV1DocumentField(field)])
          )
        );
        document.v1Transform(date, write.update_transforms);
      } else {
        document.set(date, {
          ...Object.fromEntries(
            Array.from(fields.entries())
              .filter(([key]) =>
                write.update_mask?.field_paths
                  ? write.update_mask.field_paths.includes(key)
                  : true
              )
              .map(([key, field]) => [key, convertV1DocumentField(field)])
          ),
        });
        document.v1Transform(date, write.update_transforms);
      }

      return v1WriteResult.fromObject({
        update_time: writeTime,
        transform_results: [],
      });
    }
    throw new Error("Invalid write");
  }

  v1Query(parent: string, query: v1StructuredQuery) {
    if (!query.from) {
      throw new Error("query.from is required");
    }
    if (query.from.length !== 1) {
      throw new Error("query.from.length must be 1");
    }
    const { collection_id } = query.from[0] ?? {};
    if (!collection_id) {
      throw new Error("collection_id is not supported");
    }
    const collectionName = `${parent}/${collection_id}`;
    const collection = this.getCollection(collectionName);
    let documents = collection.getAllDocuments();

    if (query.where) {
      if (query.where.has_field_filter) {
        if (
          !query.where.field_filter.has_field ||
          !query.where.field_filter.has_value
        ) {
          throw new Error("field and value is required");
        }
        const filterValue = convertV1DocumentField(
          query.where.field_filter.value
        );
        const filter = query.where.field_filter;
        documents = documents.filter((document) => {
          if (!filter.field?.field_path) {
            throw new Error("field_path is required");
          }
          const field = document.getField(filter.field.field_path);
          if (!field) return false;
          switch (filter.op) {
            case v1StructuredQueryFieldFilterOperator.EQUAL:
              return field.eq(filterValue);
            case v1StructuredQueryFieldFilterOperator.LESS_THAN:
              return field.lt(filterValue);
            case v1StructuredQueryFieldFilterOperator.LESS_THAN_OR_EQUAL:
              return field.lte(filterValue);
            case v1StructuredQueryFieldFilterOperator.GREATER_THAN:
              return field.gt(filterValue);
            case v1StructuredQueryFieldFilterOperator.GREATER_THAN_OR_EQUAL:
              return field.gte(filterValue);
            case v1StructuredQueryFieldFilterOperator.ARRAY_CONTAINS:
              return (
                field instanceof FirestoreStateDocumentArrayField &&
                field.value.some((value) => value.eq(filterValue))
              );
            case v1StructuredQueryFieldFilterOperator.ARRAY_CONTAINS_ANY:
              return (
                field instanceof FirestoreStateDocumentArrayField &&
                filterValue instanceof FirestoreStateDocumentArrayField &&
                field.value.some((value) =>
                  filterValue.value.some((filterValue) => value.eq(filterValue))
                )
              );
            case v1StructuredQueryFieldFilterOperator.IN:
              return (
                filterValue instanceof FirestoreStateDocumentArrayField &&
                filterValue.value.some((value) => field.eq(value))
              );
            case v1StructuredQueryFieldFilterOperator.NOT_EQUAL:
              return !field.eq(filterValue);
            case v1StructuredQueryFieldFilterOperator.NOT_IN:
              return (
                filterValue instanceof FirestoreStateDocumentArrayField &&
                filterValue.value.every((value) => !field.eq(value))
              );
            case v1StructuredQueryFieldFilterOperator.OPERATOR_UNSPECIFIED: {
              throw new Error(
                `Invalid query: op is not supported yet, ${
                  v1StructuredQueryFieldFilterOperator[filter.op]
                }`
              );
            }
            case undefined:
              throw new Error(`Invalid query: op is required`);
            default:
              assertNever(filter.op);
          }
        });
      }
    }

    return documents;
  }
}
