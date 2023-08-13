import { produce } from "immer";
import { EventEmitter } from "node:events";
import { TypeSafeEventEmitter } from "typesafe-event-emitter";
import { Document as v1Document } from "@firestore-emulator/proto/dist/google/firestore/v1/document";
import {
  Write as v1Write,
  WriteResult as v1WriteResult,
} from "@firestore-emulator/proto/dist/google/firestore/v1/write";
import {
  StructuredQuery as v1StructuredQuery,
  StructuredQueryFieldFilterOperator as v1StructuredQueryFieldFilterOperator,
} from "@firestore-emulator/proto/dist/google/firestore/v1/query";
import { Timestamp } from "@firestore-emulator/proto/dist/google/protobuf/timestamp";
import { assertNever } from "assert-never";

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

export type FirestoreStateDocumentFieldTypes = {
  string_value: string;
};

export type FirestoreStateDocumentFieldType =
  keyof FirestoreStateDocumentFieldTypes;

export interface FirestoreStateDocumentField<
  V extends FirestoreStateDocumentFieldType
> {
  type: V;
  toJSON(): FirestoreStateDocumentFieldTypes[V];
}

export class FirestoreStateDocumentStringField
  implements FirestoreStateDocumentField<"string_value">
{
  type: "string_value" = "string_value";
  constructor(readonly value: string) {}

  toJSON() {
    return this.value;
  }
}

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
    readonly parent: FirestoreStateCollection,
    readonly name: string,
    private fields: Record<
      string,
      FirestoreStateDocumentField<FirestoreStateDocumentFieldType>
    >,
    private collections: Record<string, FirestoreStateCollection>
  ) {}

  getCollection(collectionName: string) {
    this.collections = produce(this.collections, (draft) => {
      if (!(collectionName in draft)) {
        const collection = new FirestoreStateCollection(
          this.emitter,
          this.parent.parent,
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
        Object.entries(this.fields).map(([key, field]) => {
          switch (field.type) {
            case "string_value": {
              return [
                key,
                // v1document.google.firestore.v1.Value.fromObject({
                //   string_value: field.toJSON(),
                // }).toObject(),
                {
                  string_value: field.toJSON(),
                },
              ];
            }
            default:
              assertNever(field.type);
          }
        })
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
        Array.from(document.fields).map(([key, value]) => {
          if (value.has_string_value) {
            return [key, { string_value: value.string_value }];
          }
          throw new Error("Not implemented");
        })
      ),
    };
  }

  toJSON(): {
    path: string;
    fields: Record<
      string,
      ReturnType<
        FirestoreStateDocumentField<FirestoreStateDocumentFieldType>["toJSON"]
      >
    >;
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

  create(
    date: Date,
    fields: Record<
      string,
      FirestoreStateDocumentField<FirestoreStateDocumentFieldType>
    >
  ) {
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

  update(
    date: Date,
    fields: Record<
      string,
      FirestoreStateDocumentField<FirestoreStateDocumentFieldType>
    >
  ) {
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

  set(
    date: Date,
    fields: Record<
      string,
      FirestoreStateDocumentField<FirestoreStateDocumentFieldType>
    >
  ) {
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
}

export class FirestoreStateCollection {
  constructor(
    private emitter: TypeSafeEventEmitter<Events>,
    readonly parent: HasCollections,
    readonly name: string,
    private documents: Record<string, FirestoreStateDocument>
  ) {}

  getDocument(documentName: string) {
    this.documents = produce(this.documents, (draft) => {
      if (!(documentName in draft)) {
        const document = new FirestoreStateDocument(
          this.emitter,
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
      const [collectionName, documentId, ...rest] = next;
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
    const collection = this.getCollection(rest.reverse().join("/"));

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
    write: ReturnType<typeof v1Write.prototype.toObject>
  ): v1WriteResult {
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
    if (write.update_transforms && write.update_transforms.length > 0) {
      throw new Error("update_transforms is not implemented");
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
            Object.entries(fields).map(([key, field]) => {
              if (field.string_value) {
                return [
                  key,
                  new FirestoreStateDocumentStringField(field.string_value),
                ];
              }
              throw new Error(
                `Invalid write: field type is not supported, ${field}`
              );
            })
          )
        );
      } else if (write.current_document?.exists === true) {
        if (!document.metadata.hasExist) {
          throw new Error(
            "Invalid write: current_document.exists doesn't match"
          );
        }
        document.update(
          new Date(
            (writeTime.seconds ?? 0) * 1000 +
              (writeTime.nanos ?? 0) / 1000 / 1000
          ),
          Object.fromEntries(
            Object.entries(fields)
              .filter(([key]) =>
                write.update_mask?.field_paths
                  ? write.update_mask.field_paths.includes(key)
                  : true
              )
              .map(([key, field]) => {
                if (field.string_value) {
                  return [
                    key,
                    new FirestoreStateDocumentStringField(field.string_value),
                  ];
                }
                throw new Error(
                  `Invalid write: field type is not supported, ${field}`
                );
              })
          )
        );
      } else {
        document.set(
          new Date(
            (writeTime.seconds ?? 0) * 1000 +
              (writeTime.nanos ?? 0) / 1000 / 1000
          ),
          Object.fromEntries(
            Object.entries(fields)
              .filter(([key]) =>
                write.update_mask?.field_paths
                  ? write.update_mask.field_paths.includes(key)
                  : true
              )
              .map(([key, field]) => {
                if (field.string_value) {
                  return [
                    key,
                    new FirestoreStateDocumentStringField(field.string_value),
                  ];
                }
                throw new Error(
                  `Invalid write: field type is not supported, ${field}`
                );
              })
          )
        );
      }

      return v1WriteResult.fromObject({
        update_time: writeTime,
        transform_results: [],
      });
    }
    throw new Error("Invalid write");
  }

  v1Query(
    parent: string,
    query: ReturnType<typeof v1StructuredQuery.prototype.toObject>
  ) {
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
      if (query.where.field_filter) {
        const filter = query.where.field_filter;
        documents = documents.filter((document) => {
          if (!filter.field?.field_path) {
            throw new Error("field_path is required");
          }
          const field = document.getField(filter.field.field_path);
          if (!field) return false;
          switch (filter.op) {
            case v1StructuredQueryFieldFilterOperator.EQUAL: {
              switch (field.type) {
                case "string_value":
                  return field.toJSON() === filter.value?.string_value;
                default:
                  assertNever(field.type);
              }
            }
            case v1StructuredQueryFieldFilterOperator.ARRAY_CONTAINS:
            case v1StructuredQueryFieldFilterOperator.ARRAY_CONTAINS_ANY:
            case v1StructuredQueryFieldFilterOperator.GREATER_THAN:
            case v1StructuredQueryFieldFilterOperator.GREATER_THAN_OR_EQUAL:
            case v1StructuredQueryFieldFilterOperator.IN:
            case v1StructuredQueryFieldFilterOperator.LESS_THAN:
            case v1StructuredQueryFieldFilterOperator.LESS_THAN_OR_EQUAL:
            case v1StructuredQueryFieldFilterOperator.NOT_EQUAL:
            case v1StructuredQueryFieldFilterOperator.NOT_IN:
            case v1StructuredQueryFieldFilterOperator.OPERATOR_UNSPECIFIED:
              throw new Error(
                `Invalid query: op is not supported yet, ${filter.op}`
              );
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
