import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Incident, IncidentLog, TRANSITIONS } from './incident.entities.js';
import { ServicesService } from '../services/services.service.js';
import { HouseholdsService } from '../households/households.service.js';
import { today } from '../common/dates.js';
import type {
  ChangeIncidentStatusDto,
  CreateIncidentDto,
  IncidentsQueryDto,
  UpdateIncidentDto,
} from './incidents.dto.js';
import type { User } from '../users/user.entity.js';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidents: Repository<Incident>,
    @InjectRepository(IncidentLog)
    private readonly logs: Repository<IncidentLog>,
    private readonly services: ServicesService,
    private readonly households: HouseholdsService,
  ) {}

  async findAll(q: IncidentsQueryDto, user: User) {
    await this.households.findOwned(q.householdId, user);
    return this.incidents.find({
      where: {
        service: { householdId: q.householdId },
        ...(q.status ? { status: q.status } : {}),
      },
      relations: { service: true, log: true },
      order: { createdAt: 'DESC', log: { id: 'ASC' } },
    });
  }

  async findOwned(id: number, user: User) {
    const incident = await this.incidents.findOne({
      where: { id },
      relations: { service: true, log: true },
      order: { log: { id: 'ASC' } },
    });
    if (!incident) throw new NotFoundException(`El incidente ${id} no existe`);
    await this.households.findOwned(incident.service!.householdId, user);
    return incident;
  }

  async create(dto: CreateIncidentDto, user: User) {
    await this.services.findOwned(dto.serviceId, user);
    if (dto.startedAt > today())
      throw new BadRequestException(
        'El incidente no puede empezar en el futuro',
      );
    const open = await this.incidents.existsBy({
      serviceId: dto.serviceId,
      type: dto.type,
      status: In(['abierto', 'en_gestion']),
    });
    if (open)
      throw new ConflictException(
        `Ya hay un incidente de ${dto.type} abierto para este servicio`,
      );

    const code = await this.nextCode(Number(today().slice(0, 4)));
    const incident = this.incidents.create({
      ...dto,
      filingNumber: dto.filingNumber ?? null,
      code,
      status: 'abierto',
      closedAt: null,
      log: [
        this.logs.create({
          status: 'abierto',
          comment: 'Se registra el incidente.',
        }),
      ],
    });
    return this.incidents.save(incident);
  }

  /** Cambia el estado siguiendo el ciclo de vida y deja el cambio en la bitácora. */
  async changeStatus(id: number, dto: ChangeIncidentStatusDto, user: User) {
    const incident = await this.findOwned(id, user);
    if (!TRANSITIONS[incident.status].includes(dto.status)) {
      throw new ConflictException(
        `No se puede pasar de ${incident.status} a ${dto.status}`,
      );
    }
    if (dto.filingNumber) incident.filingNumber = dto.filingNumber;
    incident.status = dto.status;
    if (dto.status === 'cerrado') {
      const closedAt = dto.closedAt ?? today();
      if (closedAt > today())
        throw new BadRequestException(
          'La fecha de solución no puede ser futura',
        );
      if (closedAt < incident.startedAt)
        throw new BadRequestException(
          'La fecha de solución es anterior al inicio del incidente',
        );
      incident.closedAt = new Date(`${closedAt}T12:00:00`);
    } else {
      incident.closedAt = null;
    }
    await this.logs.save(
      this.logs.create({
        incidentId: incident.id,
        status: dto.status,
        comment: dto.comment,
      }),
    );
    const { log: _log, ...rest } = incident;
    await this.incidents.save(rest);
    return this.findOwned(id, user);
  }

  /** Corrige la descripción o el radicado de un incidente que no está cerrado. */
  async update(id: number, dto: UpdateIncidentDto, user: User) {
    const incident = await this.findOwned(id, user);
    if (incident.status === 'cerrado')
      throw new ConflictException('Un incidente cerrado no se puede modificar');
    if (dto.description !== undefined)
      incident.description = dto.description.trim();
    if (dto.filingNumber !== undefined)
      incident.filingNumber = dto.filingNumber || null;
    const { log: _log, ...rest } = incident;
    await this.incidents.save(rest);
    return this.findOwned(id, user);
  }

  async remove(id: number, user: User) {
    const incident = await this.findOwned(id, user);
    if (incident.status !== 'abierto')
      throw new ConflictException(
        'Solo se puede borrar un incidente que sigue abierto',
      );
    await this.incidents.remove(incident);
  }

  private async nextCode(year: number) {
    const count = await this.incidents
      .createQueryBuilder('i')
      .where('i.code LIKE :p', { p: `INC-${year}-%` })
      .getCount();
    return `INC-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
