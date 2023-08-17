export const isNotNull = <T>(value: T): value is NonNullable<T> => value != null
