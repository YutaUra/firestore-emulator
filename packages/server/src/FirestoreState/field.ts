import { Value as v1Value } from "@firestore-emulator/proto/dist/google/firestore/v1/document";

import { NullValue } from "@firestore-emulator/proto/dist/google/protobuf/struct";

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
