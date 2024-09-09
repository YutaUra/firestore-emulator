import type { Document } from '@firestore-emulator/proto/dist/google/firestore/v1/document'
import type {
  GetDocumentRequest,
  ListDocumentsRequest,
  ListDocumentsResponse,
  UpdateDocumentRequest,
  DeleteDocumentRequest,
  BatchGetDocumentsRequest,
  BatchWriteRequest,
  BatchWriteResponse,
  BeginTransactionRequest,
  CommitRequest,
  CreateDocumentRequest,
  ListCollectionIdsRequest,
  ListCollectionIdsResponse,
  ListenResponse,
  PartitionQueryRequest,
  PartitionQueryResponse,
  RollbackRequest,
  RunAggregationQueryRequest,
  RunAggregationQueryResponse,
  RunQueryRequest,
  WriteRequest,
  WriteResponse,
} from '@firestore-emulator/proto/dist/google/firestore/v1/firestore'
import {
  UnimplementedFirestoreService,
  BatchGetDocumentsResponse,
  BeginTransactionResponse,
  CommitResponse,
  ListenRequest,
  RunQueryResponse,
} from '@firestore-emulator/proto/dist/google/firestore/v1/firestore'
import { Empty } from '@firestore-emulator/proto/dist/google/protobuf/empty'
import { UntypedHandleCall } from '@grpc/grpc-js'
import type {
  ServerDuplexStream,
  ServerUnaryCall,
  ServerWritableStream,
  sendUnaryData,
} from '@grpc/grpc-js'

import type { FirestoreState } from '../../FirestoreState'
import { TimestampFromDate, TimestampFromNow } from '../../FirestoreState'
import { FirestoreEmulatorError } from '../../error/error'

export class FirestoreServiceV1Impl extends UnimplementedFirestoreService {
  #state: FirestoreState
  constructor(state: FirestoreState) {
    super()

    this.#state = state
  }
  override GetDocument(
    _call: ServerUnaryCall<GetDocumentRequest, Document>,
    _callback: sendUnaryData<Document>,
  ): void {
    console.error('Method<GetDocument> not implemented.')
    throw new Error('Method<GetDocument> not implemented.')
  }
  override ListDocuments(
    _call: ServerUnaryCall<ListDocumentsRequest, ListDocumentsResponse>,
    _callback: sendUnaryData<ListDocumentsResponse>,
  ): void {
    console.error('Method<ListDocuments> not implemented.')
    throw new Error('Method<ListDocuments> not implemented.')
  }
  override UpdateDocument(
    _call: ServerUnaryCall<UpdateDocumentRequest, Document>,
    _callback: sendUnaryData<Document>,
  ): void {
    console.error('Method<UpdateDocument> not implemented.')
    throw new Error('Method<UpdateDocument> not implemented.')
  }
  override DeleteDocument(
    _call: ServerUnaryCall<DeleteDocumentRequest, Empty>,
    _callback: sendUnaryData<Empty>,
  ): void {
    console.error('Method<DeleteDocument> not implemented.')
    throw new Error('Method<DeleteDocument> not implemented.')
  }
  override BatchGetDocuments(
    call: ServerWritableStream<
      BatchGetDocumentsRequest,
      BatchGetDocumentsResponse
    >,
  ): void {
    const date = TimestampFromNow()
    const tx = call.request.has_new_transaction
      ? Uint8Array.from([17, 2, 0, 0, 0, 0, 0, 0, 0])
      : null
    if (tx) {
      call.write(
        BatchGetDocumentsResponse.fromObject({
          transaction: tx,
        }),
      )
    }
    call.request.documents.forEach((documentPath) => {
      const document = this.#state.getDocument(documentPath)
      call.write(
        BatchGetDocumentsResponse.fromObject({
          found: document.metadata.hasExist
            ? document.toV1DocumentObject()
            : undefined,
          missing: document.metadata.hasExist ? undefined : documentPath,
          read_time: date,
        }),
      )
    })

    call.end()
  }
  override BeginTransaction(
    _call: ServerUnaryCall<BeginTransactionRequest, BeginTransactionResponse>,
    callback: sendUnaryData<BeginTransactionResponse>,
  ): void {
    callback(
      null,
      BeginTransactionResponse.fromObject({
        // dummy transaction id
        transaction: Uint8Array.from([17, 2, 0, 0, 0, 0, 0, 0, 0]),
      }),
    )
  }

  override Commit(
    call: ServerUnaryCall<CommitRequest, CommitResponse>,
    callback: sendUnaryData<CommitResponse>,
  ): void {
    const date = new Date()
    try {
      const results = call.request.writes.map((write) => {
        return this.#state.writeV1Document(date, write)
      })
      callback(
        null,
        CommitResponse.fromObject({
          commit_time: TimestampFromDate(date),
          write_results: results.map((result) => result.toObject()),
        }),
      )
    } catch (err) {
      if (err instanceof FirestoreEmulatorError) {
        callback(
          {
            cause: err,
            code: err.code,
            message: err.message,
            name: 'Error',
          },
          null,
        )
        return
      }
      console.error(err)
      callback(
        {
          cause: err,
          message: 'Something went wrong',
          name: 'Error',
        },
        null,
      )
    }
  }
  override Rollback(
    _call: ServerUnaryCall<RollbackRequest, Empty>,
    callback: sendUnaryData<Empty>,
  ): void {
    callback(null, Empty.fromObject({}))
  }
  override RunQuery(
    call: ServerWritableStream<RunQueryRequest, RunQueryResponse>,
  ): void {
    const date = new Date()
    const results = this.#state.v1Query(
      call.request.parent,
      call.request.structured_query,
    )

    if (results.length > 0) {
      results.forEach((result, i, arr) => {
        call.write(
          RunQueryResponse.fromObject({
            document: result.toV1DocumentObject(),
            done: i === arr.length - 1,
            read_time: TimestampFromDate(date),
            skipped_results: 0,
            transaction: call.request.transaction,
          }),
        )
      })
    } else {
      call.write(
        RunQueryResponse.fromObject({
          done: true,
          read_time: TimestampFromDate(date),
          skipped_results: 0,
          transaction: call.request.transaction,
        }),
      )
    }

    call.end()
  }
  override RunAggregationQuery(
    _call: ServerWritableStream<
      RunAggregationQueryRequest,
      RunAggregationQueryResponse
    >,
  ): void {
    console.error('Method<RunAggregationQuery> not implemented.')
    throw new Error('Method<RunAggregationQuery> not implemented.')
  }
  override PartitionQuery(
    _call: ServerUnaryCall<PartitionQueryRequest, PartitionQueryResponse>,
    _callback: sendUnaryData<PartitionQueryResponse>,
  ): void {
    console.error('Method<PartitionQuery> not implemented.')
    throw new Error('Method<PartitionQuery> not implemented.')
  }
  override Write(_call: ServerDuplexStream<WriteRequest, WriteResponse>): void {
    console.error('Method<Write> not implemented.')
    throw new Error('Method<Write> not implemented.')
  }
  override Listen(
    call: ServerDuplexStream<ListenRequest, ListenResponse>,
  ): void {
    call.once('data', (request) => {
      if (!(request instanceof ListenRequest)) {
        console.error('Invalid request type')
        call.end()
        throw new Error('Invalid request type')
      }
      this.#state.v1Listen(
        request,
        (value) => {
          call.write(value)
        },
        (handler) => {
          call.once('end', handler)
        },
      )
    })
  }
  override ListCollectionIds(
    _call: ServerUnaryCall<ListCollectionIdsRequest, ListCollectionIdsResponse>,
    _callback: sendUnaryData<ListCollectionIdsResponse>,
  ): void {
    console.error('Method<ListCollectionIds> not implemented.')
    throw new Error('Method<ListCollectionIds> not implemented.')
  }
  override BatchWrite(
    _call: ServerUnaryCall<BatchWriteRequest, BatchWriteResponse>,
    _callback: sendUnaryData<BatchWriteResponse>,
  ): void {
    console.error('Method<BatchWrite> not implemented.')
    throw new Error('Method<BatchWrite> not implemented.')
  }
  override CreateDocument(
    _call: ServerUnaryCall<CreateDocumentRequest, Document>,
    _callback: sendUnaryData<Document>,
  ): void {
    console.error('Method<CreateDocument> not implemented.')
    throw new Error('Method<CreateDocument> not implemented.')
  }

  [name: string]: UntypedHandleCall
}
