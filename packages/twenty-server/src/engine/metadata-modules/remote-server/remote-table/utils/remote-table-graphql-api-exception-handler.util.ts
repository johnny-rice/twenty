import {
  RemoteTableException,
  RemoteTableExceptionCode,
} from 'src/engine/metadata-modules/remote-server/remote-table/remote-table.exception';
import {
  UserInputError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from 'src/engine/utils/graphql-errors.util';

export const remoteTableGraphqlApiExceptionHandler = (error: Error) => {
  if (error instanceof RemoteTableException) {
    switch (error.code) {
      case RemoteTableExceptionCode.REMOTE_TABLE_NOT_FOUND:
      case RemoteTableExceptionCode.NO_OBJECT_METADATA_FOUND:
      case RemoteTableExceptionCode.NO_FOREIGN_TABLES_FOUND:
      case RemoteTableExceptionCode.NO_FIELD_METADATA_FOUND:
        throw new NotFoundError(error.message);
      case RemoteTableExceptionCode.INVALID_REMOTE_TABLE_INPUT:
        throw new UserInputError(error.message);
      case RemoteTableExceptionCode.REMOTE_TABLE_ALREADY_EXISTS:
        throw new ConflictError(error.message);
      default:
        throw new InternalServerError(error.message);
    }
  }

  throw error;
};
