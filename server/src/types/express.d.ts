import { UserRole } from '@prisma/client';

export interface RequestUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  studentNo: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}
