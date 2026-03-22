import path from 'path';
import { defineConfig } from 'prisma/config';

// Prisma 7 configuration — datasource URL moved here from schema.prisma
export default defineConfig({
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  datasource: {
    url: `file:${path.join(__dirname, 'prisma/medaxis.db')}`,
  },
});
