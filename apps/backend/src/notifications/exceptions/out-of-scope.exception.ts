import { HttpException, HttpStatus } from '@nestjs/common';

// 405 is unusual for this purpose (normally "wrong HTTP method"), but
// TASK2.md explicitly specifies it for "out of group/ownership scope".
export class OutOfScopeException extends HttpException {
  constructor(message = 'Out of scope') {
    super(message, HttpStatus.METHOD_NOT_ALLOWED);
  }
}