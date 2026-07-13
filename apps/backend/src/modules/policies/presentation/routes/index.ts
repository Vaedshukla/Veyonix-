import { FastifyInstance } from 'fastify';

export async function policyRoutes(app: FastifyInstance): Promise<void> {
  const container = app.container.cradle as any;

  // Controllers
  const adminController = container.adminPolicyController;
  const agentController = container.agentPolicyController;

  // Admin Routes (Would normally be protected by admin middleware)
  app.post('/', adminController.createPolicy.bind(adminController));
  app.get('/', adminController.listPolicies.bind(adminController));
  app.get('/:id', adminController.getPolicy.bind(adminController));

  // Agent Routes (Protected by device middleware in actual implementation)
  app.get('/device/current', agentController.fetchPolicy.bind(agentController));
}
