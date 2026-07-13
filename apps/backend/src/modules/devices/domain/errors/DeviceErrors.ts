import { ErrorCodes } from '@veyonix/shared-config';
import { AppError } from '@shared/errors/AppError';

export class DeviceNotFoundError extends AppError {
  constructor(deviceId: string) {
    super({
      code: ErrorCodes.DEVICE_NOT_FOUND,
      message: `Device '${deviceId}' was not found.`,
      statusCode: 404,
      isOperational: true,
    });
  }
}

export class DeviceAlreadyEnrolledError extends AppError {
  constructor(macAddress: string) {
    super({
      code: ErrorCodes.DEVICE_ALREADY_ENROLLED,
      message: `A device with MAC address '${macAddress}' is already enrolled.`,
      statusCode: 409,
      isOperational: true,
    });
  }
}

export class DeviceOfflineError extends AppError {
  constructor(deviceId: string) {
    super({
      code: ErrorCodes.DEVICE_OFFLINE,
      message: `Device '${deviceId}' is currently offline and cannot receive commands.`,
      statusCode: 422,
      isOperational: true,
    });
  }
}

export class DeviceCertificateExpiredError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.DEVICE_CERTIFICATE_EXPIRED,
      message: 'Device certificate has expired. Please re-enroll the device.',
      statusCode: 401,
      isOperational: true,
    });
  }
}
