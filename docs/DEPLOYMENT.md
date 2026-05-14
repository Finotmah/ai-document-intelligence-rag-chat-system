# Deployment & Production Setup

How to deploy Unicollab to production and configure for scale.

## Pre-Deployment Checklist

- [ ] All tests passing: `npm run integration:test`
- [ ] Linting clean: `npm run lint`
- [ ] Environment variables set up
- [ ] Database backup taken
- [ ] Groq API key valid and quota adequate
- [ ] PostgreSQL pgvector extension installed
- [ ] SSL certificates (for HTTPS)
- [ ] Domain/DNS configured

## Environment Setup

### Production `.env.production`

```env
# Database (production PostgreSQL with pgvector)
DATABASE_URL=postgresql://prod_user:secure_password@prod-db.example.com:5432/UnicollabAi?sslmode=require

# Groq API
GROQ_API_KEY=your-production-groq-key

# Next.js
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://unicollab.example.com

# Monitoring (optional)
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

### Database User (PostgreSQL)

Create a dedicated production user:

```sql
-- As superuser
CREATE ROLE prod_user WITH LOGIN PASSWORD 'secure_password';

-- Grant permissions
GRANT CONNECT ON DATABASE UnicollabAi TO prod_user;
GRANT USAGE ON SCHEMA public TO prod_user;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO prod_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_chunks TO prod_user;

-- Grant index permissions
GRANT USAGE ON SCHEMA public TO prod_user;
```

## Deployment Options

### Option 1: Docker (Recommended)

Create a `Dockerfile` in project root:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Build
COPY . .
RUN npm run build

# Run
EXPOSE 3000
CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://prod_user:password@postgres:5432/UnicollabAi
      GROQ_API_KEY: ${GROQ_API_KEY}
      NODE_ENV: production
    depends_on:
      - postgres
  
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: UnicollabAi
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Deploy:

```bash
# Build and push to registry
docker build -t unicollab:latest .
docker push your-registry/unicollab:latest

# On production server
docker-compose up -d
```

### Option 2: Vercel (Next.js Native)

1. Push code to GitHub
2. Connect repo to Vercel: https://vercel.com
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `GROQ_API_KEY`
4. Deploy: `git push` (automatic)

**Note:** You'll need a separate PostgreSQL instance (e.g., AWS RDS, Supabase).

### Option 3: AWS ECS

Create `ecs-task-definition.json`:

```json
{
  "family": "unicollab",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "your-registry/unicollab:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-url"
        },
        {
          "name": "GROQ_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:groq-key"
        }
      ]
    }
  ]
}
```

Deploy with AWS CLI:

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
aws ecs create-service \
  --cluster production \
  --service-name unicollab \
  --task-definition unicollab \
  --desired-count 2
```

## Database Configuration

### PostgreSQL Production Setup

**Install pgvector extension:**

```bash
# On PostgreSQL server
sudo apt-get install postgresql-16-pgvector

# Or from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

**Connect and initialize:**

```bash
psql -U postgres -d UnicollabAi < db/schema.sql
```

**Verify schema:**

```sql
\dt  -- Should show documents, document_chunks
\di  -- Should show idx_document_chunks_embedding_ivfflat
```

### Connection Pooling (PgBouncer)

For production with many app instances:

```bash
# Install
sudo apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
UnicollabAi = host=localhost port=5432 dbname=UnicollabAi user=prod_user password=secure_password

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
```

Update app to use PgBouncer:

```typescript
// app/lib/phase3/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,  // Reduced since PgBouncer handles pooling
})
```

### pgvector Index Tuning

For large datasets, adjust ivfflat parameters:

```sql
-- For 10K+ chunks
DROP INDEX idx_document_chunks_embedding_ivfflat;
CREATE INDEX idx_document_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 300);

-- Verify index size
SELECT pg_size_pretty(pg_relation_size('idx_document_chunks_embedding_ivfflat'));
```

## Monitoring & Observability

### Logging

Set up centralized logging:

```typescript
// Create logger utility
// app/lib/logger.ts
export function log(level: string, message: string, data?: any) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    env: process.env.NODE_ENV
  }
  
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (e.g., DataDog, CloudWatch)
    fetch('https://logs.datadoghq.com/v1/input/...', {
      method: 'POST',
      body: JSON.stringify(entry)
    }).catch(err => console.error('Log error:', err))
  } else {
    console.log(JSON.stringify(entry))
  }
}
```

Use in code:

```typescript
import { log } from '@/app/lib/logger'

export async function POST(req: Request) {
  log('info', 'Ingest request received')
  
  try {
    const result = await ingestDocument(body)
    log('info', 'Ingest successful', { chunkCount: result.chunks.length })
    return Response.json(result)
  } catch (error) {
    log('error', 'Ingest failed', { error: error instanceof Error ? error.message : 'Unknown' })
    return Response.json({ error: '...' }, { status: 500 })
  }
}
```

### Monitoring Database

Add health check endpoint:

```typescript
// app/api/health/route.ts
import { getPool } from '@/app/lib/phase3/db'

export async function GET() {
  try {
    const pool = getPool()
    const result = await pool.query('SELECT 1')
    
    return Response.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 })
  }
}
```

Set up monitoring:

```bash
# Kubernetes liveness probe
spec:
  livenessProbe:
    httpGet:
      path: /api/health
      port: 3000
    initialDelaySeconds: 10
    periodSeconds: 30

# Docker health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

### Performance Monitoring

Track key metrics:

```typescript
// app/lib/metrics.ts
let retrievalCount = 0
let retrievalTotalMs = 0

export async function trackRetrieval<T>(
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    return await fn()
  } finally {
    const ms = Date.now() - start
    retrievalCount++
    retrievalTotalMs += ms
    
    if (retrievalCount % 100 === 0) {
      console.log(`Retrieval avg: ${(retrievalTotalMs / retrievalCount).toFixed(0)}ms`)
    }
  }
}
```

## Rate Limiting

Add rate limiting to prevent abuse:

```typescript
// app/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),  // 10 requests per minute
  analytics: true,
})

// In API route
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }
  
  // Process request...
}
```

## Security

### HTTPS/SSL

```nginx
# nginx.conf
server {
  listen 443 ssl http2;
  server_name unicollab.example.com;
  
  ssl_certificate /etc/ssl/certs/your-cert.crt;
  ssl_certificate_key /etc/ssl/private/your-key.key;
  
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

### API Authentication (Future)

Implement JWT:

```typescript
// app/lib/auth.ts
import jwt from 'jsonwebtoken'

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!)
  } catch {
    return null
  }
}

// In middleware
export async function middleware(req: Request) {
  const token = req.headers.get('authorization')?.split(' ')[1]
  
  if (!token || !verifyToken(token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

### Input Validation

Always validate:

```typescript
export async function POST(req: Request) {
  const body = await req.json()
  
  // Validate
  const errors = []
  if (!body.message || typeof body.message !== 'string') {
    errors.push('message must be a non-empty string')
  }
  if (body.message.length > 10000) {
    errors.push('message too long (max 10000 chars)')
  }
  
  if (errors.length > 0) {
    return Response.json({ errors }, { status: 400 })
  }
  
  // Process...
}
```

## Scaling

### Horizontal Scaling (Multiple App Instances)

With Docker:

```yaml
version: '3.8'
services:
  app:
    image: unicollab:latest
    deploy:
      replicas: 3  # 3 app instances
    environment:
      DATABASE_URL: ...  # Shared database
  
  nginx:
    image: nginx:latest
    ports:
      - "3000:3000"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
```

With Kubernetes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unicollab
spec:
  replicas: 3
  selector:
    matchLabels:
      app: unicollab
  template:
    metadata:
      labels:
        app: unicollab
    spec:
      containers:
      - name: app
        image: unicollab:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: unicollab-secrets
              key: database-url
```

### Vector Database Scaling

For > 1M chunks, consider:

1. **Milvus** (open-source vector DB)
   ```yaml
   version: '3.8'
   services:
     milvus:
       image: milvusdb/milvus:latest
       ports:
         - "19530:19530"
   ```

2. **Pinecone** (managed vector DB)
   ```typescript
   import { Pinecone } from '@pinecone-database/pinecone'
   
   const pinecone = new Pinecone({
     apiKey: process.env.PINECONE_API_KEY
   })
   ```

3. **Weaviate** (semantic search platform)
   ```yaml
   services:
     weaviate:
       image: semitechnologies/weaviate:latest
       environment:
         QUERY_DEFAULTS_LIMIT: 20
   ```

## Backup & Disaster Recovery

### Automated PostgreSQL Backups

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/unicollab"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec unicollab-pg pg_dump -U postgres UnicollabAi | \
  gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/backup_$DATE.sql.gz"
```

Schedule with cron:

```bash
# Run backup daily at 2 AM
0 2 * * * /path/to/backup.sh
```

### Restore from Backup

```bash
# Decompress and restore
gunzip -c /backups/unicollab/backup_20240514_020000.sql.gz | \
  docker exec -i unicollab-pg psql -U postgres UnicollabAi
```

## Performance Benchmarks

Typical production latencies (measured):

| Operation | Latency | Notes |
|-----------|---------|-------|
| PDF upload (10MB) | 5–10s | pdf-parse extraction |
| Semantic chunking | 1–2s | Text processing |
| Embedding generation (100 chunks) | 3–5s | Xenova transformer |
| Vector similarity search (1K chunks) | 50–100ms | ivfflat ANN |
| LLM response | 2–4s | Groq API latency |
| **Total end-to-end (upload + Q&A)** | **10–15s** | User perceives smooth experience |

### Optimization Tips

1. **Use CDN for static assets** (CSS, JS)
2. **Enable Gzip compression** in nginx
3. **Cache frequent questions** (Redis)
4. **Pre-embed common phrases** on startup
5. **Use smaller LLM** for drafts (mistral-7b vs llama-70b)

## Related Documentation

- [SETUP.md](SETUP.md) – Local development
- [DATABASE.md](DATABASE.md) – Database design
- [DEVELOPMENT.md](DEVELOPMENT.md) – Code patterns
- [ARCHITECTURE.md](ARCHITECTURE.md) – System overview
