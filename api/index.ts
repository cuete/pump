// Entry point for Azure Functions v4
// Import all function modules to ensure app.http() registrations are executed
import './routines';
import './exercises';

// No need to export anything - the app.http() calls in imported modules
// register the functions with the Azure Functions runtime
