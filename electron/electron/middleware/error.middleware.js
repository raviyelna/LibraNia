export function errorHandler(err, req, res, next) {
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({
        success: false,
        error: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}
