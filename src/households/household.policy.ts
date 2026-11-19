import { Policy, type PolicyBefore } from '@nestjs/authorization';
import type { User } from '../users/user.entity.js';
import type { Household } from './household.entity.js';

/**
 * Reglas de acceso a un hogar. Todo lo demás (servicios, facturas, vehículos,
 * impuestos, alertas, incidentes, reportes) cuelga de un hogar, así que se
 * autoriza con esta misma policy.
 */
@Policy()
export class HouseholdPolicy implements PolicyBefore<User> {
  before(user: User | null) {
    if (user?.role === 'admin') return true;
  }

  /** Solo el dueño ve y modifica su hogar y lo que cuelga de él. */
  manage(user: User | null, household: Household) {
    return user !== null && household.ownerId === user.id;
  }

  /** Listar todos los hogares de la plataforma: solo admin (lo resuelve before). */
  listAll(_user: User | null) {
    return false;
  }
}
