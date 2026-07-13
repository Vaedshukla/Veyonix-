import { FastifyInstance } from 'fastify';
import { createAuthMiddleware, AuthMiddlewareDeps } from '../../identity/presentation/middlewares/authenticate.middleware';

export interface DeviceRoutesDeps {
  authMiddlewareDeps: AuthMiddlewareDeps;
}

export async function deviceRoutes(fastify: FastifyInstance, deps?: DeviceRoutesDeps) {
  const container = (fastify as any).container;
  
  const agentApiController = container.resolve('agentApiController');
  const adminDevicesController = container.resolve('adminDevicesController');
  
  const requireDeviceAuthMiddleware = container.resolve('requireDeviceAuth');
  
  // Create authenticate middleware if deps are provided
  const authenticateMiddleware = deps?.authMiddlewareDeps 
    ? createAuthMiddleware(deps.authMiddlewareDeps) 
    : container.resolve('authenticateMiddleware');

  // Agent API
  fastify.post('/api/v1/agent/enroll', agentApiController.enroll.bind(agentApiController));
  fastify.post('/api/v1/agent/auth', agentApiController.auth.bind(agentApiController));
  fastify.post('/api/v1/agent/heartbeat', { preHandler: [requireDeviceAuthMiddleware] }, agentApiController.heartbeat.bind(agentApiController));

  // Admin Devices API
  fastify.post('/api/v1/organizations/:orgId/devices/tokens', { preHandler: [authenticateMiddleware] }, adminDevicesController.generateToken.bind(adminDevicesController));
  fastify.get('/api/v1/organizations/:orgId/devices', { preHandler: [authenticateMiddleware] }, adminDevicesController.listDevices.bind(adminDevicesController));
  fastify.post('/api/v1/organizations/:orgId/devices/:deviceId/assign', { preHandler: [authenticateMiddleware] }, adminDevicesController.assignDevice.bind(adminDevicesController));
}
