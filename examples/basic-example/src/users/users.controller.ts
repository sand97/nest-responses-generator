import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from '../common/dto/user.dto';
import { InferredAPIResponse } from '../generated/responses';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user with the provided information',
  })
  @InferredAPIResponse({ description: 'User created successfully' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users', description: 'Retrieves a list of all users' })
  @InferredAPIResponse({ description: 'List of users retrieved successfully' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('paginated')
  @ApiOperation({
    summary: 'Get paginated users',
    description: 'Retrieves a paginated list of users',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @InferredAPIResponse({ description: 'Paginated users retrieved successfully' })
  findAllPaginated(
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number
  ) {
    return this.usersService.findAllPaginated(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieves a specific user by their ID' })
  @ApiParam({ name: 'id', type: Number, description: "User's ID" })
  @InferredAPIResponse({ description: 'User retrieved successfully' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user', description: 'Updates a user by their ID' })
  @ApiParam({ name: 'id', type: Number, description: "User's ID" })
  @InferredAPIResponse({ description: 'User updated successfully' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user', description: 'Deletes a user by their ID' })
  @ApiParam({ name: 'id', type: Number, description: "User's ID" })
  @InferredAPIResponse({ description: 'User deleted successfully' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}