import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { FindLoansQueryDto } from './dto/find-loans-query.dto';
import { LoanStatus } from './entities/loan.entity';
import { LoansService } from './loans.service';

@ApiTags('loans')
@ApiBearerAuth()
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({
    summary:
      'Crear préstamo. Recibe userId, itemId y dueAt. loanedAt se asigna con la fecha del servidor.',
  })
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar préstamos. Filtros opcionales: userId, itemId y status. Si el usuario es member, solo ve sus préstamos.',
  })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'status', enum: LoanStatus, required: false })
  findAll(@Query() query: FindLoansQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.loansService.findAll(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un préstamo' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.loansService.findOne(id, actor);
  }

  @Patch(':id/return')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({
    summary: 'Marcar préstamo como devuelto. Calcula multa automáticamente. No recibe body.',
  })
  @ApiParam({ name: 'id', type: 'string' })
  returnLoan(@Param('id') id: string) {
    return this.loansService.returnLoan(id);
  }

  @Patch(':id/mark-lost')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Marcar préstamo como perdido' })
  @ApiParam({ name: 'id', type: 'string' })
  markLost(@Param('id') id: string) {
    return this.loansService.markLost(id);
  }
}
