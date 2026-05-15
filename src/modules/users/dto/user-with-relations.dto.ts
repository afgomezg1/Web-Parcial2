import { ApiProperty } from '@nestjs/swagger';
import { UserBasicDto } from './user-basic.dto';

export class UserWithRelationsDto extends UserBasicDto {
  @ApiProperty({ example: 'Relaciones futuras: loans, reservations, fines, etc.' })
  relationsNote!: string;
}
