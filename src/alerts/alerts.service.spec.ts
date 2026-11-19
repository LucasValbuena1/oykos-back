import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  AlertsService,
  MAX_ACTIVE_RULES_PER_HOUSEHOLD,
} from './alerts.service.js';
import { AlertRule, AppNotification } from './alert.entities.js';
import { ServicesService } from '../services/services.service.js';
import { HouseholdsService } from '../households/households.service.js';
import {
  lucas,
  mockHouseholds,
  mockRepo,
  type MockRepo,
} from '../../test/helpers.js';
import type { Invoice } from '../invoices/invoice.entity.js';

describe('AlertsService', () => {
  let service: AlertsService;
  let rules: MockRepo;
  let notifications: MockRepo;

  beforeEach(async () => {
    rules = mockRepo();
    notifications = mockRepo();
    const module = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(AlertRule), useValue: rules },
        {
          provide: getRepositoryToken(AppNotification),
          useValue: notifications,
        },
        {
          provide: ServicesService,
          useValue: {
            findOwned: vi.fn(async (id: number) => ({ id, householdId: 1 })),
          },
        },
        { provide: HouseholdsService, useValue: mockHouseholds() },
      ],
    }).compile();
    service = module.get(AlertsService);
  });

  const invoice = {
    id: 10,
    serviceId: 1,
    consumption: 300,
    amount: 250000,
  } as Invoice;

  it('crea una notificación por cada umbral superado', async () => {
    rules.findBy.mockResolvedValue([
      { id: 1, thresholdType: 'valor', threshold: 220000 },
      { id: 2, thresholdType: 'consumo', threshold: 500 },
    ]);
    const created = await service.evaluate(invoice);
    expect(created).toHaveLength(1);
    expect(notifications.save).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 1, invoiceId: 10, value: 250000 }),
    );
  });

  it('no repite la notificación si la factura ya la generó', async () => {
    rules.findBy.mockResolvedValue([
      { id: 1, thresholdType: 'consumo', threshold: 100 },
    ]);
    notifications.existsBy.mockResolvedValue(true);
    expect(await service.evaluate(invoice)).toEqual([]);
  });

  it('409 si el servicio ya tiene una regla de ese tipo', async () => {
    rules.existsBy.mockResolvedValue(true);
    await expect(
      service.createRule(
        { serviceId: 1, thresholdType: 'valor', threshold: 1 },
        lucas,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it(`409 al superar ${MAX_ACTIVE_RULES_PER_HOUSEHOLD} reglas activas`, async () => {
    rules.count.mockResolvedValue(MAX_ACTIVE_RULES_PER_HOUSEHOLD);
    await expect(
      service.createRule(
        { serviceId: 1, thresholdType: 'valor', threshold: 1 },
        lucas,
      ),
    ).rejects.toThrow(/máximo/);
  });

  it('crea la regla con canal app por defecto', async () => {
    const rule = await service.createRule(
      { serviceId: 1, thresholdType: 'valor', threshold: 1 },
      lucas,
    );
    expect(rule).toMatchObject({ channel: 'app', active: true });
  });

  it('reactivar una regla revisa el límite; editar y borrar', async () => {
    rules.findOne.mockResolvedValue({
      id: 1,
      active: false,
      service: { householdId: 1 },
    });
    rules.count.mockResolvedValue(MAX_ACTIVE_RULES_PER_HOUSEHOLD);
    await expect(
      service.updateRule(1, { active: true }, lucas),
    ).rejects.toThrow(ConflictException);
    rules.count.mockResolvedValue(0);
    await expect(
      service.updateRule(1, { threshold: 5 }, lucas),
    ).resolves.toMatchObject({ threshold: 5 });
    await service.removeRule(1, lucas);
    expect(rules.remove).toHaveBeenCalled();
    rules.findOne.mockResolvedValue(null);
    await expect(service.findOwnedRule(9, lucas)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lista reglas y notificaciones y marca como leída', async () => {
    await service.findRules(1, lucas);
    await service.findNotifications(1, lucas);
    expect(rules.find).toHaveBeenCalled();
    expect(notifications.find).toHaveBeenCalled();
    notifications.findOne.mockResolvedValue({
      id: 3,
      read: false,
      rule: { service: { householdId: 1 } },
    });
    await expect(service.markRead(3, lucas)).resolves.toMatchObject({
      read: true,
    });
    notifications.findOne.mockResolvedValue(null);
    await expect(service.markRead(4, lucas)).rejects.toThrow(NotFoundException);
  });
});
