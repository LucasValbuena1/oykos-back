import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tax } from './tax.entity.js';
import { TaxesService } from './taxes.service.js';
import { TaxesController } from './taxes.controller.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Tax]), VehiclesModule],
  providers: [TaxesService],
  controllers: [TaxesController],
  exports: [TaxesService],
})
export class TaxesModule {}
