import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL')
  },
  experimental: {
    externalTables: true
  },
  tables: {
    external: [
      'admins',
      'adminsettings',
      'admin_setting_for_users',
      'legacy_id_mappings',
      'users'
    ]
  }
});
