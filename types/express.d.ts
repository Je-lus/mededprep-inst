import type { Organization } from '@prisma/client';

export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthStudent {
  id: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}

declare module 'express-serve-static-core' {
  interface Request {
    orgId: string;
    org: Organization;
    user?: AuthUser;
    student?: AuthStudent;
  }
}
