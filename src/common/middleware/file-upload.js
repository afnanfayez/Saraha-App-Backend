import multer from 'multer'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, resolve, sep } from 'node:path'
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type'
import { fileTypeEnum } from '../enums/file-type.enum.js'
import { badRequestException } from '../utils/exceptions.js'

const uploadRoot = resolve(process.cwd(), 'uploads')
const maxFileSize = 5 * 1024 * 1024

const normalizeMimeType = (mimeType) =>
  mimeType === fileTypeEnum.JPG ? fileTypeEnum.JPEG : mimeType

const resolveStorageFolder = (storageFolder) => {
  const directory = resolve(uploadRoot, String(storageFolder || 'general'))

  if (directory !== uploadRoot && !directory.startsWith(`${uploadRoot}${sep}`)) {
    badRequestException('Invalid upload folder')
  }

  return directory
}

const ensureStorageFolder = (storageFolder) => {
  const directory = resolveStorageFolder(storageFolder)
  mkdirSync(directory, { recursive: true })
  return directory
}

const createFilename = (originalname = 'upload') =>
  `${Date.now()}-${randomUUID()}-${basename(originalname)}`

const getUploadedFiles = (req) => {
  if (req.file) return [req.file]
  if (Array.isArray(req.files)) return req.files
  if (req.files && typeof req.files === 'object') {
    return Object.values(req.files).flat()
  }
  return []
}

const wrapMulterMiddleware = (middleware) => (req, res, next) =>
  middleware(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'File must be 5 MB or less'
        : error.message
      error = new Error(message, { cause: 400 })
    }

    return next(error)
  })

const createUploadMiddleware = ({
  storageType = 'disk',
  storageFolder = 'general',
  types = Object.values(fileTypeEnum)
} = {}) => {
  const storage = storageType === 'memory'
    ? multer.memoryStorage()
    : storageType === 'disk'
      ? multer.diskStorage({
          destination: (req, file, callback) => {
            try {
              callback(null, ensureStorageFolder(storageFolder))
            } catch (error) {
              callback(error)
            }
          },
          filename: (req, file, callback) => {
            callback(null, createFilename(file.originalname))
          }
        })
      : null

  if (!storage) badRequestException('Storage type must be disk or memory')

  const allowedTypes = new Set(types.map(normalizeMimeType))
  const uploader = multer({
    storage,
    limits: { fileSize: maxFileSize },
    fileFilter: (req, file, callback) => {
      if (allowedTypes.has(normalizeMimeType(file.mimetype))) {
        return callback(null, true)
      }

      try {
        badRequestException('Unsupported file type')
      } catch (error) {
        callback(error)
      }
    }
  })

  return {
    single: (fieldName) => wrapMulterMiddleware(uploader.single(fieldName)),
    array: (fieldName, maxCount = 1) =>
      wrapMulterMiddleware(uploader.array(fieldName, maxCount)),
    fields: (fields) => wrapMulterMiddleware(uploader.fields(fields.map(({ name, maxCount = 1 }) => ({
      name,
      maxCount
    })))),
    any: () => wrapMulterMiddleware(uploader.any()),
    none: () => wrapMulterMiddleware(uploader.none())
  }
}

export const uploadFiles = createUploadMiddleware

export const processFile = ({
  storageType = 'disk',
  storageFolder = 'general',
  types = Object.values(fileTypeEnum)
} = {}) => async (req, res, next) => {
  try {
    const files = getUploadedFiles(req)
    if (files.length === 0) return next()

    const allowedTypes = types.map(normalizeMimeType)

    const validationResults = await Promise.all(files.map(async (file) => {
      try {
        const detected = storageType === 'memory'
          ? await fileTypeFromBuffer(file.buffer)
          : await fileTypeFromFile(file.path)
        const detectedMimeType = normalizeMimeType(detected?.mime)

        return {
          file,
          valid: Boolean(detectedMimeType && allowedTypes.includes(detectedMimeType))
        }
      } catch {
        return { file, valid: false }
      }
    }))

    const invalidFiles = validationResults
      .filter(({ valid }) => !valid)
      .map(({ file }) => file)

    if (invalidFiles.length > 0) {
      if (storageType === 'disk') {
        for (const file of invalidFiles) {
          if (file.path && existsSync(file.path)) unlinkSync(file.path)
        }
      }
      badRequestException('Invalid file content')
    }

    if (storageType === 'memory') {
      const directory = ensureStorageFolder(storageFolder)
      await Promise.all(files.map(async (file) => {
        file.filename = createFilename(file.originalname)
        file.destination = directory
        file.path = resolve(directory, file.filename)
        writeFileSync(file.path, file.buffer)
      }))
    }

    return next()
  } catch (error) {
    return next(error)
  }
}
