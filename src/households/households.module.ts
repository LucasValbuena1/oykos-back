import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Household } from './household.entity.js';
import { HouseholdsService } from './households.service.js';
import { HouseholdsController } from './households.controller.js';
import { HouseholdPolicy } from './household.policy.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Household])],
  providers: [HouseholdsService, HouseholdPolicy],
  controllers: [HouseholdsController],
  exports: [HouseholdsService],
})
export class HouseholdsModule {}
