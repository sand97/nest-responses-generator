import { ApiProperty } from '@nestjs/swagger';

export class UsersServiceCreateResponse {
  @ApiProperty({ example: 1, type: 'number' })
  id: number;

  @ApiProperty({ example: "example name", type: 'string' })
  firstname: string;

  @ApiProperty({ example: "example name", type: 'string' })
  lastname: string;

  @ApiProperty({ example: "user@example.com", type: 'string' })
  email: string;

  @ApiProperty({ example: "user", type: 'string' })
  role: string;
}

export class UsersServiceFindAllResponseItem {
  @ApiProperty({ example: 1, type: 'number' })
  id: number;

  @ApiProperty({ example: "example name", type: 'string' })
  lastname: string;

  @ApiProperty({ example: "user@example.com", type: 'string' })
  email: string;

  @ApiProperty({ example: "user", type: 'string' })
  role: string;
}

// Use [UsersServiceFindAllResponseItem] in @ApiOkResponse for array responses
export const UsersServiceFindAllResponse = UsersServiceFindAllResponseItem;

export class UsersServiceFindOneResponse {
  @ApiProperty({ example: 1, type: 'number' })
  id: number;

  @ApiProperty({ example: "example name", type: 'string' })
  firstname: string;

  @ApiProperty({ example: "example name", type: 'string' })
  lastname: string;

  @ApiProperty({ example: "user@example.com", type: 'string' })
  email: string;

  @ApiProperty({ example: "user", type: 'string' })
  role: string;
}

export class UsersServiceUpdateResponse {
  @ApiProperty({ example: 1, type: 'number' })
  id: number;

  @ApiProperty({ example: "example name", type: 'string' })
  firstname: string;

  @ApiProperty({ example: "example name", type: 'string' })
  lastname: string;

  @ApiProperty({ example: "user@example.com", type: 'string' })
  email: string;

  @ApiProperty({ example: "user", type: 'string' })
  role: string;
}

export class UsersServiceRemoveResponse {
  @ApiProperty({ example: true, type: 'boolean' })
  deleted: boolean;
}

export class UsersServiceFindAllPaginatedResponseMeta {
  @ApiProperty({ example: "example value", type: 'string' })
  page: string;

  @ApiProperty({ example: "example value", type: 'string' })
  limit: string;

  @ApiProperty({ example: "example value", type: 'string' })
  total: string;
}

export class UsersServiceFindAllPaginatedResponse {
  @ApiProperty({ example: "example value", type: 'string' })
  data: string;

  @ApiProperty({ type: UsersServiceFindAllPaginatedResponseMeta })
  meta: UsersServiceFindAllPaginatedResponseMeta;
}

export const UsersServiceResponse = {
  create: UsersServiceCreateResponse,
  findAll: UsersServiceFindAllResponse,
  findOne: UsersServiceFindOneResponse,
  update: UsersServiceUpdateResponse,
  remove: UsersServiceRemoveResponse,
  findAllPaginated: UsersServiceFindAllPaginatedResponse,
} as const;

export type UsersServiceResponseType = typeof UsersServiceResponse;