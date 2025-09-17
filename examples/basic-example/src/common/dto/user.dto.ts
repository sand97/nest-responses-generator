export interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
}

export class CreateUserDto {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  role: string;
}

export class UpdateUserDto {
  firstname?: string;
  lastname?: string;
  email?: string;
  role?: string;
}
