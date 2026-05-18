import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT Secret (use environment variable or fallback)
const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'movesbook-nextjs-jwt-secret-key-2024';
};

// Hash password using bcrypt for new users
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

// Hash password using SHA1 (for compatibility with old movesbook.net)
export const hashPasswordSHA1 = (password: string): string => {
  return crypto.createHash('sha1').update(password).digest('hex');
};

// Verify password - supports both SHA1 (old) and bcrypt (new)
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  if (/^[a-f0-9]+$/i.test(hashedPassword)) {
    const sha1Hash = hashPasswordSHA1(password);
    if (hashedPassword.length === 40) {
      const md5Hash = crypto.createHash('md5').update(password).digest('hex');
      const sha1OfMd5 = crypto.createHash('sha1').update(md5Hash).digest('hex');
      const md5OfSha1 = crypto.createHash('md5').update(sha1Hash).digest('hex');
      const sha1OfSha1 = crypto.createHash('sha1').update(sha1Hash).digest('hex');
      return [sha1Hash, sha1OfMd5, md5OfSha1, sha1OfSha1].includes(hashedPassword);
    }
    if (hashedPassword.length === 32) {
      const md5Hash = crypto.createHash('md5').update(password).digest('hex');
      return md5Hash === hashedPassword;
    }
  }
  
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    return false;
  }
};

// Generate JWT token
export const generateToken = (
  userId: string,
  email: string,
  username: string,
  userType: string,
  extra?: Record<string, unknown>,
): string => {
  const payload = {
    userId,
    email,
    username,
    userType,
    ...extra,
    iat: Math.floor(Date.now() / 1000),
  };
  
  const secret = getJwtSecret();
  
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '7d'
  });
};

// Verify JWT token
export const verifyToken = (token: string): any => {
  const secret = getJwtSecret();
  
  try {
    return jwt.verify(token, secret, {
      algorithms: ['HS256']
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Alternative: Export as default object
const auth = {
  hashPassword,
  hashPasswordSHA1,
  verifyPassword,
  generateToken,
  verifyToken
};
export default auth;
