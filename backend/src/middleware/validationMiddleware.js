export function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return res.status(400).json({
          success: false,
          error: {
            message: `Validation failed: ${errorMessages}`,
            details: err.errors,
          },
        });
      }
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid request data format.' },
      });
    }
  };
}
