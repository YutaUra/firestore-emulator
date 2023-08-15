import {
  ServerDuplexStream,
  ServerUnaryCall,
  ServerWritableStream,
  sendUnaryData,
} from "@grpc/grpc-js";
import {
  UnimplementedFirestoreService,
  GetDocumentRequest,
  ListDocumentsRequest,
  ListDocumentsResponse,
  UpdateDocumentRequest,
  DeleteDocumentRequest,
  BatchGetDocumentsRequest,
  BatchGetDocumentsResponse,
  BatchWriteRequest,
  BatchWriteResponse,
  BeginTransactionRequest,
  BeginTransactionResponse,
  CommitRequest,
  CommitResponse,
  CreateDocumentRequest,
  ListCollectionIdsRequest,
  ListCollectionIdsResponse,
  ListenRequest,
  ListenResponse,
  PartitionQueryRequest,
  PartitionQueryResponse,
  RollbackRequest,
  RunAggregationQueryRequest,
  RunAggregationQueryResponse,
  RunQueryRequest,
  RunQueryResponse,
  WriteRequest,
  WriteResponse,
} from "@firestore-emulator/proto/dist/google/firestore/v1/firestore";
import { FirestoreState } from "../../FirestoreState";
import { Document } from "@firestore-emulator/proto/dist/google/firestore/v1/document";
import { Empty } from "@firestore-emulator/proto/dist/google/protobuf/empty";
import { Timestamp } from "@firestore-emulator/proto/dist/google/protobuf/timestamp";
import { FirestoreEmulatorError } from "../../error/error";

export class FirestoreServiceV1Impl extends UnimplementedFirestoreService {
  #state: FirestoreState;
  constructor(state: FirestoreState) {
    super();

    this.#state = state;
  }
  override GetDocument(
    _call: ServerUnaryCall<GetDocumentRequest, Document>,
    _callback: sendUnaryData<Document>
  ): void {
    throw new Error("Method<GetDocument> not implemented.");
  }
  override ListDocuments(
    _call: ServerUnaryCall<ListDocumentsRequest, ListDocumentsResponse>,
    _callback: sendUnaryData<ListDocumentsResponse>
  ): void {
    throw new Error("Method<ListDocuments> not implemented.");
  }
  override UpdateDocument(
    _call: ServerUnaryCall<UpdateDocumentRequest, Document>,
    _callback: sendUnaryData<Document>
  ): void {
    throw new Error("Method<UpdateDocument> not implemented.");
  }
  override DeleteDocument(
    _call: ServerUnaryCall<DeleteDocumentRequest, Empty>,
    _callback: sendUnaryData<Empty>
  ): void {
    throw new Error("Method<DeleteDocument> not implemented.");
  }
  override BatchGetDocuments(
    call: ServerWritableStream<
      BatchGetDocumentsRequest,
      BatchGetDocumentsResponse
    >
  ): void {
    call.request.documents.forEach((documentPath) => {
      const document = this.#state.getDocument(documentPath);
      call.write(
        BatchGetDocumentsResponse.fromObject({
          read_time: Timestamp.fromObject({
            seconds: Math.floor(Date.now() / 1000),
            nanos: 0,
          }),
          found: document.metadata.hasExist
            ? document.toV1DocumentObject()
            : undefined,
          missing: document.metadata.hasExist ? undefined : documentPath,
        })
      );
    });

    call.end();
  }
  override BeginTransaction(
    _call: ServerUnaryCall<BeginTransactionRequest, BeginTransactionResponse>,
    callback: sendUnaryData<BeginTransactionResponse>
  ): void {
    callback(null, BeginTransactionResponse.fromObject({}));
  }
  override Commit(
    call: ServerUnaryCall<CommitRequest, CommitResponse>,
    callback: sendUnaryData<CommitResponse>
  ): void {
    const createTime = Timestamp.fromObject({
      seconds: Math.floor(Date.now() / 1000),
      nanos: 0,
    });
    try {
      const results = call.request.writes.map((write) => {
        return this.#state.writeV1Document(createTime.toObject(), write);
      });
      callback(
        null,
        CommitResponse.fromObject({
          commit_time: createTime,
          write_results: results.map((result) => result.toObject()),
        })
      );
    } catch (err) {
      console.error(err);

      if (err instanceof FirestoreEmulatorError) {
        callback(
          {
            message: err.message,
            code: err.code,
            name: "Error",
            cause: err,
          },
          null
        );
        return;
      }
      callback(
        {
          message: "Something went wrong",
          name: "Error",
          cause: err,
        },
        null
      );
    }

    throw new Error("Method<Commit> not implemented.");
  }
  override Rollback(
    _call: ServerUnaryCall<RollbackRequest, Empty>,
    callback: sendUnaryData<Empty>
  ): void {
    callback(null, Empty.fromObject({}));
  }
  override RunQuery(
    call: ServerWritableStream<RunQueryRequest, RunQueryResponse>
  ): void {
    const readTime = Timestamp.fromObject({
      seconds: Math.floor(Date.now() / 1000),
      nanos: 0,
    });
    const results = this.#state.v1Query(
      call.request.parent,
      call.request.structured_query
    );

    results.forEach((result, i, arr) => {
      call.write(
        RunQueryResponse.fromObject({
          done: i === arr.length - 1,
          read_time: readTime,
          document: result.toV1DocumentObject(),
          transaction: call.request.transaction,
          skipped_results: 0,
        })
      );
    });

    call.end();
  }
  override RunAggregationQuery(
    _call: ServerWritableStream<
      RunAggregationQueryRequest,
      RunAggregationQueryResponse
    >
  ): void {
    throw new Error("Method<RunAggregationQuery> not implemented.");
  }
  override PartitionQuery(
    _call: ServerUnaryCall<PartitionQueryRequest, PartitionQueryResponse>,
    _callback: sendUnaryData<PartitionQueryResponse>
  ): void {
    throw new Error("Method<PartitionQuery> not implemented.");
  }
  override Write(_call: ServerDuplexStream<WriteRequest, WriteResponse>): void {
    throw new Error("Method<Write> not implemented.");
  }
  override Listen(
    _call: ServerDuplexStream<ListenRequest, ListenResponse>
  ): void {
    throw new Error("Method<Listen> not implemented.");
  }
  override ListCollectionIds(
    _call: ServerUnaryCall<ListCollectionIdsRequest, ListCollectionIdsResponse>,
    _callback: sendUnaryData<ListCollectionIdsResponse>
  ): void {
    throw new Error("Method<ListCollectionIds> not implemented.");
  }
  override BatchWrite(
    _call: ServerUnaryCall<BatchWriteRequest, BatchWriteResponse>,
    _callback: sendUnaryData<BatchWriteResponse>
  ): void {
    throw new Error("Method<BatchWrite> not implemented.");
  }
  override CreateDocument(
    _call: ServerUnaryCall<CreateDocumentRequest, Document>,
    _callback: sendUnaryData<Document>
  ): void {
    throw new Error("Method<CreateDocument> not implemented.");
  }

  [name: string]: import("@grpc/grpc-js").UntypedHandleCall;
}
