export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return res.status(400).json({
        error: details[0]?.message || 'Invalid input',
        details,
      });
    }
    req.body = result.data;
    next();
  };
}
