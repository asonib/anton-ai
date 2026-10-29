import { AppException } from './AppException';

export class ResourceNotFoundException extends AppException {
  constructor(resource = 'Resource', id?: string) {
    super(id ? `${resource} '${id}' was not found` : `${resource} was not found`, 404, 'RESOURCE_NOT_FOUND');
  }
}
