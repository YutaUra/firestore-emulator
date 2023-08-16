import { produce } from "immer";
import { EventEmitter } from "node:events";
import { TypeSafeEventEmitter } from "typesafe-event-emitter";
import { Document as v1Document } from "@firestore-emulator/proto/dist/google/firestore/v1/document";
import {
  DocumentTransformFieldTransformServerValue,
  DocumentTransformFieldTransform as v1DocumentTransformFieldTransform,
  Write as v1Write,
  WriteResult as v1WriteResult,
} from "@firestore-emulator/proto/dist/google/firestore/v1/write";
import {
  StructuredQuery as v1StructuredQuery,
  StructuredQueryFieldFilterOperator as v1StructuredQueryFieldFilterOperator,
  StructuredQueryCompositeFilterOperator as v1StructuredQueryCompositeFilterOperator,
  StructuredQueryFieldFilter as v1StructuredQueryFieldFilter,
  StructuredQueryDirection as v1StructuredQueryDirection,
} from "@firestore-emulator/proto/dist/google/firestore/v1/query";
import { Timestamp } from "@firestore-emulator/proto/dist/google/protobuf/timestamp";
import { assertNever } from "assert-never";
import { FirestoreEmulatorError } from "../error/error";
import { Status } from "@grpc/grpc-js/build/src/constants";
import {
  TargetChangeTargetChangeType as v1TargetChangeTargetChangeType,
  ListenRequest as v1ListenRequest,
  ListenResponse as v1ListenResponse,
} from "@firestore-emulator/proto/dist/google/firestore/v1/firestore";
import {
  FirestoreStateDocumentArrayField,
  FirestoreStateDocumentDoubleField,
  FirestoreStateDocumentFields,
  FirestoreStateDocumentIntegerField,
  FirestoreStateDocumentTimestampField,
  convertV1DocumentField,
  convertV1Value,
} from "./field";
import { isNotNull } from "../utils";

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

  hasChild(): boolean {
    for (const collection of Object.values(this.collections)) {
      if (collection.hasChild()) return true;
    }
    return false;
  }

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
            nanos: this.metadata.createdAt.getMilliseconds() * 1000 * 1000,
          })
        : undefined,
      update_time: this.metadata.hasExist
        ? Timestamp.fromObject({
            seconds: Math.floor(this.metadata.updatedAt.getTime() / 1000),
            nanos: this.metadata.updatedAt.getMilliseconds() * 1000 * 1000,
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
        Object.entries(this.collections)
          .filter(([, collection]) => collection.hasChild())
          .map(([key, collection]) => [key, collection.toJSON()])
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
    const isCreate = !this.metadata.hasExist;
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
    if (isCreate) {
      this.emitter.emit("create-document", { document: this });
    } else {
      this.emitter.emit("update-document", { document: this });
    }
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
      }
    });

    const document = this.documents[documentName];
    if (!document) {
      throw new Error(`Document<${documentName}> not found.`);
    }
    return document;
  }

  hasChild(): boolean {
    for (const document of Object.values(this.documents)) {
      if (document.metadata.hasExist) return true;
      if (document.hasChild()) return true;
    }
    return false;
  }

  getAllDocuments() {
    return Object.values(this.documents);
  }

  toJSON() {
    return {
      path: this.getPath(),
      documents: Object.fromEntries(
        Object.entries(this.documents)
          .filter(
            ([, document]) => document.metadata.hasExist || document.hasChild()
          )
          .map(([key, document]) => [key, document.toJSON()])
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
    return `${this.project.getPath()}/databases/${this.name}/documents`;
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

export const TimestampFromDate = (date: Date) =>
  Timestamp.fromObject({
    seconds: Math.floor(date.getTime() / 1000),
    nanos: (date.getTime() % 1000) * 1000 * 1000,
  });
export const DateFromTimestamp = (timestamp: Timestamp) =>
  new Date(timestamp.seconds * 1000 + timestamp.nanos / 1000 / 1000);

export const TimestampFromNow = () => TimestampFromDate(new Date());

const v1FilterDocuments = (
  field: FirestoreStateDocumentFields,
  filter: v1StructuredQueryFieldFilter
) => {
  const filterValue = convertV1DocumentField(filter.value);
  if (!filter.field?.field_path) {
    throw new Error("field_path is required");
  }
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
};

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

  writeV1Document(date: Date, write: v1Write): v1WriteResult {
    const writeTime = TimestampFromDate(date);
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
          date,
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
          date,
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
    let docs = collection.getAllDocuments().filter((v) => v.metadata.hasExist);

    if (query.order_by) {
      docs = docs.slice().sort((aDocument, bDocument) => {
        for (const { field, direction } of query.order_by) {
          const a = aDocument.getField(field.field_path);
          const b = bDocument.getField(field.field_path);
          if (!a || !b) {
            if (a && !b) return -1;
            if (!a && b) return 1;
            continue;
          }
          if (a.eq(b)) continue;
          if (direction === v1StructuredQueryDirection.ASCENDING) {
            if (a.lt(b)) return -1;
            if (b.lt(a)) return 1;
          } else if (direction === v1StructuredQueryDirection.DESCENDING) {
            if (a.lt(b)) return 1;
            if (b.lt(a)) return -1;
          }
        }
        return 0;
      });
    }

    if (query.has_where) {
      if (query.where.has_field_filter) {
        const filter = query.where.field_filter;

        docs = docs.filter((document) => {
          if (!filter.field?.field_path) {
            throw new Error("field_path is required");
          }
          const field = document.getField(filter.field.field_path);
          if (!field) return false;
          return v1FilterDocuments(field, filter);
        });
      }
      if (query.where.has_composite_filter) {
        switch (query.where.composite_filter.op) {
          case v1StructuredQueryCompositeFilterOperator.AND:
          case v1StructuredQueryCompositeFilterOperator.OR:
            break;
          case v1StructuredQueryCompositeFilterOperator.OPERATOR_UNSPECIFIED:
            throw new Error(`Invalid query: op is required`);
          default:
            assertNever(query.where.composite_filter.op);
        }

        docs = docs.filter((document) => {
          if (
            query.where.composite_filter.op ===
            v1StructuredQueryCompositeFilterOperator.AND
          ) {
            return query.where.composite_filter.filters.every((filter) => {
              if (!filter.has_field_filter) {
                console.error(`composite_filter only supports field_filter`);
                throw new Error(`composite_filter only supports field_filter`);
              }
              const field = document.getField(
                filter.field_filter.field.field_path
              );
              if (!field) return false;
              return v1FilterDocuments(field, filter.field_filter);
            });
          } else if (
            query.where.composite_filter.op ===
            v1StructuredQueryCompositeFilterOperator.OR
          ) {
            return query.where.composite_filter.filters.some((filter) => {
              if (!filter.has_field_filter) {
                console.error(`composite_filter only supports field_filter`);
                throw new Error(`composite_filter only supports field_filter`);
              }
              const field = document.getField(
                filter.field_filter.field.field_path
              );
              if (!field) return false;
              return v1FilterDocuments(field, filter.field_filter);
            });
          } else {
            // this is unreachable
            return false;
          }
        });
      }
    }

    if (query.has_limit) {
      docs = docs.slice(0, query.limit.value);
    }

    return docs;
  }

  v1Listen(
    listen: v1ListenRequest,
    callback: (response: v1ListenResponse) => void,
    onEnd: (handler: () => void) => void
  ) {
    if (listen.has_remove_target) {
      console.error(`remove_target is not implemented`);
      throw new Error(`remove_target is not implemented`);
    }
    if (listen.has_add_target) {
      const sendNewDocuments = (docs: FirestoreStateDocument[]) => {
        for (const doc of docs) {
          callback(
            v1ListenResponse.fromObject({
              document_change: {
                target_ids: [listen.add_target.target_id],
                document: doc.toV1DocumentObject(),
              },
            })
          );
        }
        callback(
          v1ListenResponse.fromObject({
            target_change: {
              target_ids: [listen.add_target.target_id],
              target_change_type: v1TargetChangeTargetChangeType.CURRENT,
              read_time: TimestampFromNow().toObject(),
            },
          })
        );
        callback(
          v1ListenResponse.fromObject({
            target_change: {
              target_ids: [],
              target_change_type: v1TargetChangeTargetChangeType.NO_CHANGE,
              read_time: TimestampFromNow().toObject(),
            },
          })
        );
      };

      if (listen.add_target.has_query) {
        let currentDocumentsPaths: string[] = [];
        callback(
          v1ListenResponse.fromObject({
            target_change: {
              target_change_type: v1TargetChangeTargetChangeType.ADD,
              target_ids: [listen.add_target.target_id],
            },
          })
        );

        const docs = this.v1Query(
          listen.add_target.query.parent,
          listen.add_target.query.structured_query
        );
        currentDocumentsPaths = docs.map((v) => v.getPath());
        sendNewDocuments(docs);

        const handleOnUpdate = async () => {
          await new Promise((resolve) => setImmediate(resolve));
          const nextDocuments = this.v1Query(
            listen.add_target.query.parent,
            listen.add_target.query.structured_query
          );
          const newDocumentsPaths = nextDocuments.map((v) => v.getPath());
          const hasCreate = newDocumentsPaths.some(
            (v) => !currentDocumentsPaths.includes(v)
          );
          const hasDelete = currentDocumentsPaths.some(
            (v) => !newDocumentsPaths.includes(v)
          );
          const hasUpdate =
            !hasCreate &&
            !hasDelete &&
            newDocumentsPaths.length === currentDocumentsPaths.length &&
            newDocumentsPaths.every((v) => currentDocumentsPaths.includes(v)) &&
            currentDocumentsPaths.every((v) => newDocumentsPaths.includes(v));

          const hasChange = hasDelete || hasCreate || hasUpdate;

          if (!hasChange) {
            // pass
            return;
          }
          callback(
            v1ListenResponse.fromObject({
              target_change: {
                target_ids: [listen.add_target.target_id],
                target_change_type: v1TargetChangeTargetChangeType.RESET,
                read_time: TimestampFromNow().toObject(),
              },
            })
          );
          currentDocumentsPaths = nextDocuments.map((v) => v.getPath());
          sendNewDocuments(nextDocuments);
        };
        this.emitter.on("create-document", handleOnUpdate);
        onEnd(() => this.emitter.off("create-document", handleOnUpdate));

        this.emitter.on("update-document", handleOnUpdate);
        onEnd(() => this.emitter.off("update-document", handleOnUpdate));
        this.emitter.on("delete-document", handleOnUpdate);
        onEnd(() => this.emitter.off("delete-document", handleOnUpdate));
      } else if (listen.add_target.has_documents) {
        callback(
          v1ListenResponse.fromObject({
            target_change: {
              target_change_type: v1TargetChangeTargetChangeType.ADD,
              target_ids: [listen.add_target.target_id],
            },
          })
        );

        sendNewDocuments(
          listen.add_target.documents.documents
            .map((path) => {
              const document = this.getDocument(path);
              if (!document.metadata.hasExist) {
                return null;
              }
              return document;
            })
            .filter(isNotNull)
        );

        const handleOnUpdate = async ({
          document,
        }: {
          document: FirestoreStateDocument;
        }) => {
          await new Promise((resolve) => setImmediate(resolve));
          const hasChange = listen.add_target.documents.documents.includes(
            document.getPath()
          );
          if (!hasChange) {
            // pass
            return;
          }
          callback(
            v1ListenResponse.fromObject({
              target_change: {
                target_ids: [listen.add_target.target_id],
                target_change_type: v1TargetChangeTargetChangeType.RESET,
                read_time: TimestampFromNow().toObject(),
              },
            })
          );
          sendNewDocuments(
            listen.add_target.documents.documents
              .map((path) => {
                const document = this.getDocument(path);
                if (!document.metadata.hasExist) {
                  return null;
                }
                return document;
              })
              .filter(isNotNull)
          );
        };
        this.emitter.on("create-document", handleOnUpdate);
        onEnd(() => this.emitter.off("create-document", handleOnUpdate));

        this.emitter.on("update-document", handleOnUpdate);
        onEnd(() => this.emitter.off("update-document", handleOnUpdate));
        this.emitter.on("delete-document", handleOnUpdate);
        onEnd(() => this.emitter.off("delete-document", handleOnUpdate));
      }
    }
  }
}
