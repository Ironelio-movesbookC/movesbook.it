import { NextRequest, NextResponse } from 'next/server';
import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken, hashPassword } from '@/lib/auth';
import mysql from 'mysql2/promise';

type LegacyDbConfig = {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
};

const getLegacyDbConfig = (): LegacyDbConfig | null => {
  const legacyUrl = process.env.LEGACY_DATABASE_URL || process.env.LEGACY_DB_URL;
  if (legacyUrl) {
    try {
      const parsed = new URL(legacyUrl);
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 3306,
        user: decodeURIComponent(parsed.username || ''),
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname.replace(/^\//, '')
      };
    } catch {
      return null;
    }
  }

  const prodLegacyUrl = process.env.PROD_DATABASE_URL || process.env.PROD_DB_URL;
  if (prodLegacyUrl) {
    try {
      const parsed = new URL(prodLegacyUrl);
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 3306,
        user: decodeURIComponent(parsed.username || ''),
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname.replace(/^\//, '')
      };
    } catch {
      return null;
    }
  }

  const host = process.env.LEGACY_DB_HOST;
  const user = process.env.LEGACY_DB_USER;
  const database = process.env.LEGACY_DB_NAME;
  if (!host || !user || !database) {
    return null;
  }

  return {
    host,
    port: Number(process.env.LEGACY_DB_PORT || 3306),
    user,
    password: process.env.LEGACY_DB_PASSWORD || undefined,
    database
  };
};

const isMysql = () => (process.env.DATABASE_URL || '').startsWith('mysql');

const ensureLegacyMappingTable = async () => {
  if (isMysql()) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS legacy_id_mappings (
        id VARCHAR(255) PRIMARY KEY,
        legacy_table VARCHAR(255),
        legacy_id INTEGER,
        new_id VARCHAR(255)
      )
    `);
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS legacy_id_mappings (
      id TEXT PRIMARY KEY,
      legacy_table TEXT,
      legacy_id INTEGER,
      new_id TEXT
    )
  `);
};

const upsertLegacyMapping = async (mappingId: string, legacyId: number, newId: string) => {
  if (isMysql()) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO legacy_id_mappings (id, legacy_table, legacy_id, new_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE legacy_table=VALUES(legacy_table), legacy_id=VALUES(legacy_id), new_id=VALUES(new_id)`,
      mappingId,
      'users',
      legacyId,
      newId
    );
    return;
  }

  await prisma.$executeRawUnsafe(
    `INSERT OR REPLACE INTO legacy_id_mappings (id, legacy_table, legacy_id, new_id)
     VALUES (?, ?, ?, ?)`,
    mappingId,
    'users',
    legacyId,
    newId
  );
};

const fetchLegacyUsersFromExternalDb = async (
  config: LegacyDbConfig,
  loginIdentifier: string,
  rawLoginIdentifier: string,
  adminOnly: boolean
): Promise<any[]> => {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database
  });

  try {
    let columns: string[] = [];
    try {
      const [rows] = await connection.execute<any[]>(
        'SELECT COLUMN_NAME as name FROM information_schema.COLUMNS WHERE table_name = ? AND table_schema = DATABASE()',
        ['users']
      );
      if (Array.isArray(rows)) {
        columns = rows
          .map((row: any) => row?.name || row?.COLUMN_NAME)
          .filter((value: any) => typeof value === 'string');
      }
    } catch {
      columns = [];
    }

    const optionalColumns = [
      'staff_alternative_password',
      'enabled_staff_alternative_password',
      'alternate_club_pass',
      'enable_login_as_club_admin'
    ];

    const selectedOptionalColumns = optionalColumns.filter((column) =>
      columns.length > 0 ? columns.includes(column) : false
    );

    const selectColumns = [
      'id',
      'username',
      'email',
      'password',
      'alternate_pass',
      'staff_password',
      ...selectedOptionalColumns,
      'role_id',
      'created',
      "COALESCE(firstname, '') as firstname",
      "COALESCE(lastname, '') as lastname"
    ];

    const adminFilter = adminOnly
      ? "AND (role_id IN (5, 6, 99) OR username = 'admin' OR email = 'lerkos000@gmail.com')"
      : '';

    const legacySql = `
      SELECT ${selectColumns.join(', ')}
      FROM users
      WHERE (TRIM(email) = ? OR TRIM(username) = ? OR lower(TRIM(email)) = lower(?) OR lower(TRIM(username)) = lower(?))
      AND (delete_status IS NULL OR lower(TRIM(delete_status)) = 'n')
      ${adminFilter}
      ORDER BY id DESC
    `;

    const [rows] = await connection.execute<any[]>(legacySql, [
      loginIdentifier,
      loginIdentifier,
      loginIdentifier,
      loginIdentifier
    ]);
    let legacyUser = Array.isArray(rows) ? rows : [];

    if (legacyUser.length === 0 && rawLoginIdentifier) {
      const exactSql = `
        SELECT ${selectColumns.join(', ')}
        FROM users
        WHERE (email = ? OR username = ?)
        AND delete_status = 'N'
        ${adminFilter}
        ORDER BY id DESC
        LIMIT 1
      `;
      const [exactRows] = await connection.execute<any[]>(exactSql, [
        rawLoginIdentifier,
        rawLoginIdentifier
      ]);
      legacyUser = Array.isArray(exactRows) ? exactRows : [];
    }

    return legacyUser;
  } finally {
    await connection.end();
  }
};

const hasLegacyUsersTable = async (): Promise<boolean> => {
  if (isMysql()) {
    try {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT 1 FROM information_schema.COLUMNS WHERE table_name = ? AND table_schema = DATABASE() LIMIT 1',
        'users'
      );
      if (Array.isArray(rows) && rows.length > 0) return true;
    } catch (error) {
    }
    return false;
  }

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1"
    );
    if (Array.isArray(rows) && rows.length > 0) return true;
  } catch (error) {
  }

  return false;
};

// Fallback admin credentials (used if no admin in database)
// Note: Password is hashed for security. Original password: Set via ADMIN_PASSWORD env var or default hashed value
const FALLBACK_ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@movesbook.com',
  // Bcrypt hashed admin password - for production, set ADMIN_PASSWORD_HASH in environment
  passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2a$12$XabKUB4Yas3AafvzbTWcWO2/oXZfsNb7VJvvi.LxJJxZlXRnkZNGW'
};

export async function POST(request: NextRequest) {
  try {
    const { username, email, identifier, password } = await request.json();

    // Support both email/username separately or combined in identifier field
    const rawLoginIdentifier = identifier || email || username || '';
    const loginIdentifier = rawLoginIdentifier.trim();

    // Debug logging (only in production to help diagnose issues)
    if (process.env.NODE_ENV === 'production') {
      console.log(`[Admin Login] Attempt: ${loginIdentifier?.substring(0, 20)}...`);
      console.log(`[Admin Login] Fallback admin username: ${FALLBACK_ADMIN.username}, email: ${FALLBACK_ADMIN.email}`);
    }

    // Validate input
    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { error: 'Email/Username and password are required' },
        { status: 400 }
      );
    }

    // First, check fallback admin credentials (for quick access)
    const isFallbackAdmin = loginIdentifier === FALLBACK_ADMIN.username || 
                            loginIdentifier === FALLBACK_ADMIN.email ||
                            loginIdentifier?.toLowerCase() === FALLBACK_ADMIN.username?.toLowerCase() ||
                            loginIdentifier?.toLowerCase() === FALLBACK_ADMIN.email?.toLowerCase();
    
    if (isFallbackAdmin) {
      if (process.env.NODE_ENV === 'production') {
        console.log(`[Admin Login] Checking fallback admin credentials...`);
      }
      
      // Verify password against hashed value
      const isPasswordValid = await verifyPassword(password, FALLBACK_ADMIN.passwordHash);
      
      if (process.env.NODE_ENV === 'production') {
        console.log(`[Admin Login] Fallback password valid: ${isPasswordValid}`);
      }
      
      if (isPasswordValid) {
        // Check if actual admin user exists in database (use real user ID if found)
        // Note: We don't filter by userType because the admin user might have ATHLETE type
        const realAdminUser = await prisma.user.findFirst({
          where: {
            OR: [
              { username: FALLBACK_ADMIN.username },
              { email: FALLBACK_ADMIN.email },
              { username: 'admin' },
              { email: 'lerkos000@gmail.com' }
            ]
          },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            userType: true
          }
        });

        if (realAdminUser) {
          // Use real admin user from database
          const token = generateToken(
            realAdminUser.id,
            realAdminUser.email,
            realAdminUser.username,
            realAdminUser.userType
          );

          return NextResponse.json({
            success: true,
            token,
            user: {
              id: realAdminUser.id,
              name: realAdminUser.name,
              username: realAdminUser.username,
              email: realAdminUser.email,
              userType: 'ADMIN',
              isSuperAdmin: true,
            },
          });
        } else {
          // Fallback: use 'admin' ID if no real user found (shouldn't happen in production)
          // Auto-create the admin user in the database so it exists for future logins
          let adminUserForResponse = {
            id: 'admin',
            name: 'Admin',
            username: FALLBACK_ADMIN.username,
            email: FALLBACK_ADMIN.email,
            userType: 'ADMIN'
          };

          try {
            console.log('[Admin Login] Creating admin user in database...');
            const newAdmin = await prisma.user.create({
              data: {
                username: FALLBACK_ADMIN.username,
                email: FALLBACK_ADMIN.email,
                password: FALLBACK_ADMIN.passwordHash,
                name: 'Admin',
                userType: 'ADMIN',
              }
            });
            
            adminUserForResponse = {
              id: newAdmin.id,
              name: newAdmin.name,
              username: newAdmin.username,
              email: newAdmin.email,
              userType: newAdmin.userType
            };
            console.log('[Admin Login] Successfully created admin user in database');
          } catch (error) {
            console.error('[Admin Login] Failed to auto-create admin user:', error);
            // Continue with synthetic user
          }

          const token = generateToken(
            adminUserForResponse.id, 
            adminUserForResponse.email, 
            adminUserForResponse.username, 
            adminUserForResponse.userType
          );

          return NextResponse.json({
            success: true,
            token,
            user: { ...adminUserForResponse, isSuperAdmin: true },
          });
        }
      }
    }

    // First, check if Super Admin exists in super_admins table - case-insensitive
    const superAdmin = await prisma.superAdmin.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { username: loginIdentifier },
          { email: loginIdentifier.toLowerCase() },
          { username: loginIdentifier.toLowerCase() }
        ],
        isActive: true
      }
    });

    if (superAdmin) {
      // Verify Super Admin password
      const isPasswordValid = await verifyPassword(password, superAdmin.password);
      
      if (isPasswordValid) {
        // Update last login
        const now = new Date();
        await prisma.superAdmin.update({
          where: { id: superAdmin.id },
          data: { lastLogin: now },
        });
        try {
          const { recordSuperAdminLoginLog } = await import('@/lib/loginLogSession');
          await recordSuperAdminLoginLog(superAdmin.id);
        } catch {
          /* login log optional */
        }

        // Generate admin token
        const token = generateToken(
          superAdmin.id,
          superAdmin.email,
          superAdmin.username,
          'ADMIN'
        );

        return NextResponse.json({
          success: true,
          token,
          user: {
            id: superAdmin.id,
            name: superAdmin.name || superAdmin.username,
            username: superAdmin.username,
            email: superAdmin.email,
            userType: 'ADMIN',
            isSuperAdmin: true
          }
        });
      }
    }

    // Operators and co-admins (staff_accounts)
    const staffAccount = await prisma.staffAccount.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { username: loginIdentifier },
          { email: loginIdentifier.toLowerCase() },
          { username: loginIdentifier.toLowerCase() },
        ],
      },
    });

    if (staffAccount) {
      let loginViaAlternatePassword = false;
      let isStaffPasswordValid = await verifyPassword(password, staffAccount.password);
      if (
        !isStaffPasswordValid &&
        staffAccount.alternatePassword
      ) {
        isStaffPasswordValid = await verifyPassword(password, staffAccount.alternatePassword);
        if (isStaffPasswordValid) {
          loginViaAlternatePassword = true;
        }
      }

      if (isStaffPasswordValid) {
        const now = new Date();
        await prisma.staffAccount.update({
          where: { id: staffAccount.id },
          data: { lastLogin: now },
        });
        try {
          const { recordStaffLoginLog } = await import('@/lib/loginLogSession');
          await recordStaffLoginLog(staffAccount.id);
        } catch {
          /* login log optional */
        }

        const staffUserType =
          staffAccount.kind === 'CO_ADMIN' ? 'STAFF_CO_ADMIN' : 'STAFF_OPERATOR';
        const tokenExtra =
          loginViaAlternatePassword && staffAccount.alternatePasswordOneAccessOnly
            ? { loginViaAlternatePassword: true }
            : undefined;
        const token = generateToken(
          staffAccount.id,
          staffAccount.email,
          staffAccount.username,
          staffUserType,
          tokenExtra,
        );

        return NextResponse.json({
          success: true,
          token,
          user: {
            id: staffAccount.id,
            name: `${staffAccount.name} ${staffAccount.surname}`.trim(),
            username: staffAccount.username,
            email: staffAccount.email,
            userType: staffUserType,
            isStaff: true,
            staffKind: staffAccount.kind,
            isSuperAdmin: false,
            loginViaAlternatePassword:
              loginViaAlternatePassword && staffAccount.alternatePasswordOneAccessOnly,
          },
        });
      }
    }

    // Try to find user in NEW database
    // First try with ADMIN userType, then try without userType filter for admin username/email (backward compatibility)
    if (process.env.NODE_ENV === 'production') {
      console.log(`[Admin Login] Searching for user with ADMIN userType...`);
    }
    
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { username: loginIdentifier },
          { email: loginIdentifier.toLowerCase() },
          { username: loginIdentifier.toLowerCase() }
        ],
        userType: 'ADMIN'
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        password: true,
        userType: true,
        createdAt: true,
      }
    });
    let passwordAlreadyVerified = false;

    if (process.env.NODE_ENV === 'production') {
      if (user) {
        console.log(`[Admin Login] Found user with ADMIN type: ${user.username} (${user.email}), userType: ${user.userType}`);
      } else {
        console.log(`[Admin Login] No user found with ADMIN type, trying without userType filter...`);
      }
    }
    if (user) {
      const isPasswordValid = await verifyPassword(password, user.password);
      if (isPasswordValid) {
        passwordAlreadyVerified = true;
      } else {
        user = null;
      }
    }
    if (!user) {
      const rawAdmin = await prisma.$queryRaw<any[]>`
        SELECT id, name, username, email, password, userType, createdAt
        FROM users_new
        WHERE (lower(email) = lower(${loginIdentifier}) OR lower(username) = lower(${loginIdentifier}))
        AND userType = 'ADMIN'
        LIMIT 1
      `;
      if (rawAdmin.length > 0) {
        user = rawAdmin[0];
        if (user) {
          const isPasswordValid = await verifyPassword(password, user.password);
          if (isPasswordValid) {
            passwordAlreadyVerified = true;
          } else {
            user = null;
          }
        }
      }
    }

    // If not found as ADMIN, try again for specific admin identifiers regardless of userType
    if (!user && (loginIdentifier === 'admin' || loginIdentifier === 'admin@movesbook.com' || loginIdentifier === 'lerkos000@gmail.com' ||
                  loginIdentifier?.toLowerCase() === 'admin' || loginIdentifier?.toLowerCase() === 'admin@movesbook.com' || loginIdentifier?.toLowerCase() === 'lerkos000@gmail.com')) {
      if (process.env.NODE_ENV === 'production') {
        console.log(`[Admin Login] Trying to find admin user without userType filter...`);
      }
      
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: loginIdentifier },
            { username: loginIdentifier },
            { email: loginIdentifier.toLowerCase() },
            { username: loginIdentifier.toLowerCase() }
          ]
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          password: true,
          userType: true,
          createdAt: true,
        }
      });
      
      if (process.env.NODE_ENV === 'production') {
        if (user) {
          console.log(`[Admin Login] Found user without userType filter: ${user.username} (${user.email}), userType: ${user.userType}`);
        } else {
          console.log(`[Admin Login] No user found even without userType filter`);
        }
      }
      if (user) {
        const isPasswordValid = await verifyPassword(password, user.password);
        if (isPasswordValid) {
          passwordAlreadyVerified = true;
        } else {
          user = null;
        }
      }
      if (!user) {
        const rawUser = await prisma.$queryRaw<any[]>`
          SELECT id, name, username, email, password, userType, createdAt
          FROM users_new
          WHERE lower(email) = lower(${loginIdentifier}) OR lower(username) = lower(${loginIdentifier})
          LIMIT 1
        `;
        if (rawUser.length > 0) {
          user = rawUser[0];
          if (user) {
            const isPasswordValid = await verifyPassword(password, user.password);
            if (isPasswordValid) {
              passwordAlreadyVerified = true;
            } else {
              user = null;
            }
          }
        }
      }
    }

    // If not found in new table, check LEGACY table (if it exists)
    if (!user) {
      try {
        let legacyUser: any[] = [];
        const legacyDbConfig = getLegacyDbConfig();
        if (legacyDbConfig) {
          try {
            legacyUser = await fetchLegacyUsersFromExternalDb(
              legacyDbConfig,
              loginIdentifier,
              rawLoginIdentifier,
              true
            );
          } catch (legacyDbError) {
            console.error('Legacy DB lookup failed:', legacyDbError);
          }
        }

        const legacyTableExists = await hasLegacyUsersTable();
        if (legacyUser.length === 0 && legacyTableExists) {
          try {
            let columnNames = new Set<string>();
            try {
              const columns = await prisma.$queryRawUnsafe<any[]>(
                'SELECT COLUMN_NAME as name FROM information_schema.COLUMNS WHERE table_name = ? AND table_schema = DATABASE()',
                'users'
              );
              if (Array.isArray(columns)) {
                for (const column of columns) {
                  const columnName = column?.name || column?.COLUMN_NAME;
                  if (columnName) columnNames.add(columnName);
                }
              }
            } catch (schemaError) {
              columnNames = new Set<string>();
            }

            const optionalColumns = [
              'alternate_pass',
              'staff_password',
              'staff_alternative_password',
              'enabled_staff_alternative_password',
              'alternate_club_pass',
              'enable_login_as_club_admin'
            ];

            const selectOptionalColumns = optionalColumns.map((column) =>
              columnNames.has(column) ? column : `NULL AS ${column}`
            );
            const firstNameExpr = columnNames.has('firstname') ? "COALESCE(firstname, '') as firstname" : "'' as firstname";
            const lastNameExpr = columnNames.has('lastname') ? "COALESCE(lastname, '') as lastname" : "'' as lastname";
            const createdExpr = columnNames.has('created') ? 'created' : 'CURRENT_TIMESTAMP as created';
            const roleExpr = columnNames.has('role_id') ? 'role_id' : 'NULL AS role_id';
            const deleteStatusClause = columnNames.has('delete_status')
              ? "AND (delete_status IS NULL OR lower(TRIM(delete_status)) = 'n')"
              : '';
            const roleClause = columnNames.has('role_id')
              ? "AND (role_id IN (5, 6, 99) OR username = 'admin' OR email = 'lerkos000@gmail.com')"
              : "AND (username = 'admin' OR email = 'lerkos000@gmail.com')";

            const selectColumns = [
              'id',
              'username',
              'email',
              'password',
              ...selectOptionalColumns,
              roleExpr,
              createdExpr,
              firstNameExpr,
              lastNameExpr
            ];

            const legacySql = `
              SELECT ${selectColumns.join(', ')}
              FROM users
              WHERE (TRIM(email) = ? OR TRIM(username) = ? OR lower(TRIM(email)) = lower(?) OR lower(TRIM(username)) = lower(?))
              ${deleteStatusClause}
              ${roleClause}
              ORDER BY id DESC
            `;

            legacyUser = await prisma.$queryRawUnsafe<any[]>(
              legacySql,
              loginIdentifier,
              loginIdentifier,
              loginIdentifier,
              loginIdentifier
            );
          } catch (legacyQueryError: any) {
            legacyUser = [];
          }

          if (legacyUser.length === 0 && rawLoginIdentifier) {
            try {
              legacyUser = await prisma.$queryRawUnsafe<any[]>(
                `SELECT id, username, email, password, NULL AS alternate_pass, NULL AS staff_password,
                        NULL AS role_id, '' AS firstname, '' AS lastname, CURRENT_TIMESTAMP AS created
                 FROM users
                 WHERE (email = ? OR username = ?)
                 ORDER BY id DESC
                 LIMIT 1`,
                rawLoginIdentifier,
                rawLoginIdentifier
              );
            } catch (legacyExactError: any) {
            }
          }
        }

        if (legacyUser.length > 0) {
          let matchedLegacy = null;
          let passwordForNewUser = '';
          let passwordSource = 'none';
          for (const candidate of legacyUser) {
            let isPasswordValid = false;
            let candidatePasswordForNewUser = candidate.password || '';
            if (candidate.password) {
              isPasswordValid = await verifyPassword(password, candidate.password);
              if (isPasswordValid) passwordSource = 'main';
            }
            if (!isPasswordValid && candidate.alternate_pass) {
              isPasswordValid = await verifyPassword(password, candidate.alternate_pass);
              if (isPasswordValid) passwordSource = 'alternate';
            }
            if (!isPasswordValid && candidate.staff_password) {
              isPasswordValid = password === candidate.staff_password;
              if (isPasswordValid) passwordSource = 'staff';
            }
            if (!isPasswordValid && candidate.staff_alternative_password && (candidate.enabled_staff_alternative_password === 1 || candidate.enabled_staff_alternative_password === '1')) {
              isPasswordValid = await verifyPassword(password, candidate.staff_alternative_password);
              if (isPasswordValid) passwordSource = 'staff_alternative';
            }
            if (!isPasswordValid && candidate.alternate_club_pass && (candidate.enable_login_as_club_admin === 1 || candidate.enable_login_as_club_admin === '1')) {
              isPasswordValid = await verifyPassword(password, candidate.alternate_club_pass);
              if (isPasswordValid) passwordSource = 'club_alternate';
            }
            if (isPasswordValid) {
              matchedLegacy = candidate;
              if (passwordSource === 'alternate') {
                candidatePasswordForNewUser = candidate.alternate_pass || candidate.password || '';
              } else if (passwordSource === 'staff') {
                candidatePasswordForNewUser = await hashPassword(password);
              } else if (passwordSource === 'staff_alternative') {
                candidatePasswordForNewUser = candidate.staff_alternative_password || candidate.password || '';
              } else if (passwordSource === 'club_alternate') {
                candidatePasswordForNewUser = candidate.alternate_club_pass || candidate.password || '';
              }
              passwordForNewUser = candidatePasswordForNewUser;
              break;
            }
          }

          if (matchedLegacy) {
            passwordAlreadyVerified = true;
            const legacy = matchedLegacy;
            const legacyEmail = legacy.email ? legacy.email.trim() : '';
            const legacyUsername = legacy.username ? legacy.username.trim() : '';
            const name = `${legacy.firstname || ''} ${legacy.lastname || ''}`.trim() || legacy.username;
            
            let mappedUserType: UserType = UserType.GROUP_ADMIN;
            if (legacy.role_id === 99 || legacy.username === 'admin' || legacy.email === 'lerkos000@gmail.com') {
              mappedUserType = UserType.ADMIN;
            } else if (legacy.role_id === 6) {
              mappedUserType = UserType.ADMIN;
            }
  
            const newId = `legacy_${legacy.id}_${Date.now()}`;
            
            try {
              console.log(`[Admin Login] Migrating legacy user ${legacy.username} to new database...`);
              user = await prisma.user.create({
                data: {
                  id: newId,
                  email: legacyEmail || `user${legacy.id}@movesbook.temp`,
                  username: legacyUsername || `user${legacy.id}`,
                  password: passwordForNewUser || '',
                  name: name,
                  userType: mappedUserType,
                  createdAt: legacy.created ? new Date(legacy.created) : new Date(),
                  updatedAt: new Date(),
                }
              });

              await ensureLegacyMappingTable();
              await upsertLegacyMapping(`${newId}_map`, legacy.id, newId);
              
              console.log(`[Admin Login] Successfully migrated ${legacy.username}`);
            } catch (e) {
              console.error(`[Admin Login] Migration failed for ${legacy.username}:`, e);
              // Fallback to in-memory object
              user = {
                id: `legacy_${legacy.id}`,
                name: name,
                username: legacyUsername || legacy.username,
                email: legacyEmail || legacy.email,
                password: passwordForNewUser || legacy.password,
                userType: mappedUserType,
                createdAt: new Date(),
              };
            }
          }
        }
      } catch (legacyError: any) {
        // Legacy table doesn't exist or query failed - that's okay, just skip it
        console.log('Legacy users table not found or inaccessible (this is normal for new installations)');
      }
    }

    if (user) {
      if (!passwordAlreadyVerified) {
        // User found in database - verify password
        if (process.env.NODE_ENV === 'production') {
          console.log(`[Admin Login] Verifying password for user: ${user.username}`);
          console.log(`[Admin Login] Password hash type: ${user.password.length === 40 ? 'SHA1' : user.password.startsWith('$2') ? 'bcrypt' : 'Unknown'} (length: ${user.password.length})`);
        }
        
        const isPasswordValid = await verifyPassword(password, user.password);
        
        if (process.env.NODE_ENV === 'production') {
          console.log(`[Admin Login] Password verification result: ${isPasswordValid}`);
        }
        
        if (!isPasswordValid) {
          if (process.env.NODE_ENV === 'production') {
            console.log(`[Admin Login] ❌ Password verification failed - returning 401`);
          }
          return NextResponse.json(
            { error: 'Invalid email/username or password' },
            { status: 401 }
          );
        }
      }

      // Auto-upgrade disabled - keeping SHA1 passwords as-is

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Generate JWT token
      const token = generateToken(
        user.id,
        user.email,
        user.username,
        user.userType
      );

      const panelAdmin =
        userWithoutPassword.userType === 'ADMIN' ||
        ['admin@movesbook.com', 'admin'].includes(
          String(userWithoutPassword.email ?? '').toLowerCase(),
        ) ||
        String(userWithoutPassword.username ?? '').toLowerCase() === 'admin';

      return NextResponse.json({
        success: true,
        token,
        user: panelAdmin
          ? {
              ...userWithoutPassword,
              userType: 'ADMIN',
              isSuperAdmin: true,
            }
          : userWithoutPassword,
      });
    }

    // Invalid credentials
    if (process.env.NODE_ENV === 'production') {
      console.log(`[Admin Login] ❌ No user found and fallback failed - returning 401`);
    }
    
    return NextResponse.json(
      { error: 'Invalid email/username or password' },
      { status: 401 }
    );

  } catch (error: any) {
    console.error('Admin login error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
