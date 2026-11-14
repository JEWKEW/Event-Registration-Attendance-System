import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

// Pre-computed dummy bcrypt hash (cost 12) for constant-time comparison on unknown email
const DUMMY_HASH = '$2b$12$e8iVfR6X/0fB9gM0yYhM0OFXoOq4q1VzL3j6o8J2fL4K6P0Z5Q6Gy';

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  studentNo: string | null;
}

export class AuthService {
  /**
   * Authenticates user with email and password.
   * Protects against timing attacks by evaluating a dummy bcrypt hash when email is unknown.
   */
  async login(rawEmail: string, password: string): Promise<SafeUser> {
    const email = rawEmail.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Timing attack mitigation
      await bcrypt.compare(password, DUMMY_HASH);
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      studentNo: user.student_no
    };
  }

  /**
   * Retrieves fresh user details by session userId.
   */
  async getMe(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required.');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      studentNo: user.student_no
    };
  }
}

export const authService = new AuthService();
