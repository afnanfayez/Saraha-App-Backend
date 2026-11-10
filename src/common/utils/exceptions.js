export const applicationException = ({
  message = 'Internal Server Error',
  cause = 500
}) => {
  throw new Error(message, { cause })
}

export const notFoundException = (message) =>
  applicationException({ message, cause: 404 })

export const unauthorizedException = (message) =>
  applicationException({ message, cause: 401 })

export const conflictException = (message) =>
  applicationException({ message, cause: 409 })

export const forbiddenException = (message) =>
  applicationException({ message, cause: 403 })

export const badRequestException = (message) =>
  applicationException({ message, cause: 400 })
