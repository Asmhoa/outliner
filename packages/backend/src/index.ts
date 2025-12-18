import { app, PORT } from './app';

// Start the server only if this file is run directly (not imported)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export { app, PORT };
