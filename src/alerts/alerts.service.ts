import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule, AppNotification } from './alert.entities.js';
import { ServicesService } from '../services/services.service.js';
import { HouseholdsService } from '../households/households.service.js';
import type { Invoice } from '../invoices/invoice.entity.js';
import type { CreateAlertRuleDto, UpdateAlertRuleDto } from './alerts.dto.js';
import type { User } from '../users/user.entity.js';

/** Máximo de reglas activas por hogar, para que las alertas sigan siendo útiles. */
export const MAX_ACTIVE_RULES_PER_HOUSEHOLD = 10;

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertRule) private readonly rules: Repository<AlertRule>,
    @InjectRepository(AppNotification)
    private readonly notifications: Repository<AppNotification>,
    private readonly services: ServicesService,
    private readonly households: HouseholdsService,
  ) {}

  async findRules(householdId: number, user: User) {
    await this.households.findOwned(householdId, user);
    return this.rules.find({
      where: { service: { householdId } },
      relations: { service: true },
      order: { id: 'ASC' },
    });
  }

  async findOwnedRule(id: number, user: User) {
    const rule = await this.rules.findOne({
      where: { id },
      relations: { service: true },
    });
    if (!rule) throw new NotFoundException(`La regla ${id} no existe`);
    await this.households.findOwned(rule.service!.householdId, user);
    return rule;
  }

  async createRule(dto: CreateAlertRuleDto, user: User) {
    const service = await this.services.findOwned(dto.serviceId, user);
    if (
      await this.rules.existsBy({
        serviceId: dto.serviceId,
        thresholdType: dto.thresholdType,
      })
    ) {
      throw new ConflictException(
        `El servicio ya tiene una alerta por ${dto.thresholdType}`,
      );
    }
    await this.ensureActiveLimit(service.householdId);
    return this.rules.save(
      this.rules.create({
        ...dto,
        channel: dto.channel ?? 'app',
        active: true,
      }),
    );
  }

  async updateRule(id: number, dto: UpdateAlertRuleDto, user: User) {
    const rule = await this.findOwnedRule(id, user);
    if (dto.active === true && !rule.active)
      await this.ensureActiveLimit(rule.service!.householdId);
    Object.assign(rule, dto);
    return this.rules.save(rule);
  }

  async removeRule(id: number, user: User) {
    const rule = await this.findOwnedRule(id, user);
    await this.rules.remove(rule);
  }

  /** Revisa las reglas activas del servicio de la factura y crea una notificación por cada umbral superado. */
  async evaluate(invoice: Invoice): Promise<AppNotification[]> {
    const rules = await this.rules.findBy({
      serviceId: invoice.serviceId,
      active: true,
    });
    const created: AppNotification[] = [];
    for (const rule of rules) {
      const value =
        rule.thresholdType === 'consumo' ? invoice.consumption : invoice.amount;
      if (value <= rule.threshold) continue;
      if (
        await this.notifications.existsBy({
          ruleId: rule.id,
          invoiceId: invoice.id,
        })
      )
        continue;
      created.push(
        await this.notifications.save(
          this.notifications.create({
            ruleId: rule.id,
            invoiceId: invoice.id,
            value,
            read: false,
          }),
        ),
      );
    }
    return created;
  }

  async findNotifications(householdId: number, user: User) {
    await this.households.findOwned(householdId, user);
    return this.notifications.find({
      where: { rule: { service: { householdId } } },
      relations: { rule: { service: true }, invoice: true },
      order: { createdAt: 'DESC' },
    });
  }

  async markRead(id: number, user: User) {
    const n = await this.notifications.findOne({
      where: { id },
      relations: { rule: { service: true } },
    });
    if (!n) throw new NotFoundException(`La notificación ${id} no existe`);
    await this.households.findOwned(n.rule!.service!.householdId, user);
    n.read = true;
    return this.notifications.save(n);
  }

  private async ensureActiveLimit(householdId: number) {
    const active = await this.rules.count({
      where: { active: true, service: { householdId } },
    });
    if (active >= MAX_ACTIVE_RULES_PER_HOUSEHOLD) {
      throw new ConflictException(
        `Un hogar puede tener máximo ${MAX_ACTIVE_RULES_PER_HOUSEHOLD} alertas activas`,
      );
    }
  }
}
