Integration test

Run the test locally against a running dev server (Next.js) and PostgreSQL + pgvector that the app uses.

Usage:

```bash
# start your dev server in another terminal
npm run dev

# in this workspace, run the integration test
npm run integration:test
```

You can override the server base URL:

```bash
BASE_URL=http://localhost:3000 npm run integration:test
```
