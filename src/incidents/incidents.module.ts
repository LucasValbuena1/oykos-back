import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident, IncidentLog } from './incident.entities.js';
import { IncidentsService } from './incidents.service.js';
import { IncidentsController } from './incidents.controller.js';
import { ServicesModule } from '../services/services.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Incident, IncidentLog]), ServicesModule],
  providers: [IncidentsService],
  controllers: [IncidentsController],
})
export class IncidentsModule {}
