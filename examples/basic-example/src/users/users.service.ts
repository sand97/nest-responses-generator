import { Injectable } from '@nestjs/common';
import { User, CreateUserDto, UpdateUserDto } from '../common/dto/user.dto';

@Injectable()
export class UsersService {
  create(createUserDto: CreateUserDto): User {
    return {
      id: 1,
      firstname: createUserDto.firstname,
      lastname: createUserDto.lastname,
      email: createUserDto.email,
      role: createUserDto.role,
    };
  }

  findAll(): User[] {
    return [
      {
        id: 1,
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@example.com',
        role: 'admin',
      },
      {
        id: 2,
        firstname: 'Jane',
        lastname: 'Smith',
        email: 'jane.smith@example.com',
        role: 'user',
      },
    ];
  }

  findOne(id: number): User {
    return {
      id,
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@example.com',
      role: 'admin',
    };
  }

  update(id: number, updateUserDto: UpdateUserDto): User {
    return {
      id,
      firstname: updateUserDto.firstname || 'John',
      lastname: updateUserDto.lastname || 'Doe',
      email: updateUserDto.email || 'john.doe@example.com',
      role: updateUserDto.role || 'admin',
    };
  }

  remove(id: number): { deleted: boolean } {
    return { deleted: true };
  }

  findAllPaginated(
    page: number = 1,
    limit: number = 10
  ): {
    data: User[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const users = this.findAll();
    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = users.slice(startIndex, endIndex);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
