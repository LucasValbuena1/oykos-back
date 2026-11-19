import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertRule, AppNotification } from './alert.entities.js';
import { AlertsService } from './alerts.service.js';
import { AlertsController } from './alerts.controller.js';
import { ServicesModule } from '../services/services.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertRule, AppNotification]),
    ServicesModule,
  ],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
