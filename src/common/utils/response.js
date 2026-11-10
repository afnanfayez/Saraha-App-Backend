export const successResponse = ({
  res,
  status = 200,
  message = 'Done',
  data
}) => {
  return res.status(status).json({ message, status, data })
}
