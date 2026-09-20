export const UserRole = {
  ADMIN: 'ADMIN',
  COORDINATOR: 'COORDINATOR',
  DRIVER: 'DRIVER',
  PARENT: 'PARENT',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]
